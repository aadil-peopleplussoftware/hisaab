using System.Text;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.MarketAi.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hisaab.Infrastructure.Services;

public class PortfolioSentinelAgent : IPortfolioSentinelAgent
{
    private readonly IApplicationDbContext _context;
    private readonly IStockMarketService _stockMarketService;
    private readonly ILogger<PortfolioSentinelAgent> _logger;

    public PortfolioSentinelAgent(
        IApplicationDbContext context,
        IStockMarketService stockMarketService,
        ILogger<PortfolioSentinelAgent> logger)
    {
        _context = context;
        _stockMarketService = stockMarketService;
        _logger = logger;
    }

    public async Task<List<PortfolioTargetHitAlertDto>> CheckPortfolioTargetsAndStopLossAsync(
        Guid? targetUserId = null,
        CancellationToken ct = default)
    {
        _logger.LogInformation("🛡️ [AGENT 2: PORTFOLIO SENTINEL] Checking live portfolio holdings against target profit and stop-loss...");

        var query = _context.StockHoldings
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(h => !h.IsArchived && !h.IsDeleted);

        if (targetUserId.HasValue && targetUserId.Value != Guid.Empty)
        {
            query = query.Where(h => h.UserId == targetUserId.Value);
        }

        var holdings = await query.ToListAsync(ct);
        if (holdings.Count == 0)
        {
            _logger.LogInformation("🛡️ [AGENT 2: PORTFOLIO SENTINEL] No active stock holdings found to monitor.");
            return new List<PortfolioTargetHitAlertDto>();
        }

        var tickers = holdings.Select(h => h.Ticker).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var quotes = await _stockMarketService.GetQuotesAsync(tickers, ct);

        var triggeredAlerts = new List<PortfolioTargetHitAlertDto>();
        var fourHoursAgo = DateTime.UtcNow.AddHours(-4);

        // Fetch recent alert logs to avoid spamming the user repeatedly for the same holding
        var recentLogs = await _context.MarketAgentAlertLogs
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(l => l.CreatedAtUtc >= fourHoursAgo)
            .ToListAsync(ct);

        foreach (var holding in holdings)
        {
            if (!quotes.TryGetValue(holding.Ticker, out var quote))
            {
                continue;
            }

            decimal cmp = quote.CurrentPrice;
            if (cmp <= 0) continue;

            decimal profitPerShare = Math.Round(cmp - holding.BuyPrice, 2);
            decimal totalProfit = Math.Round(profitPerShare * holding.Quantity, 2);
            decimal profitPct = holding.BuyPrice > 0 ? Math.Round((profitPerShare / holding.BuyPrice) * 100m, 1) : 0m;

            bool isTargetHit = false;
            bool isStopLossHit = false;
            string alertType = "";
            string verdictLabel = "";
            string actionHindi = "";

            // 1. Check Target Profit Hit (e.g. ₹1000 profit/share or Target Price hit)
            if (holding.TargetProfitPerShare.HasValue && profitPerShare >= holding.TargetProfitPerShare.Value)
            {
                isTargetHit = true;
                alertType = "TARGET_PROFIT_HIT";
                verdictLabel = $"🎯 TARGET PROFIT HIT (+₹{profitPerShare:N0}/share)";
                actionHindi = $"Shabash! {holding.CompanyName} me aapka per-share profit target ₹{holding.TargetProfitPerShare.Value:N0} hit ho gaya hai (Current Profit: ₹{profitPerShare:N2}/share, Total: +₹{totalProfit:N2}). AI Golden Rule: Abhi 50% shares sell karke profit lock karein, aur baaki 50% par Trailing Stop-Loss lagayein taaki market aur upar jaye to aur bada fayda ho!";
            }
            else if (holding.TargetPrice.HasValue && cmp >= holding.TargetPrice.Value)
            {
                isTargetHit = true;
                alertType = "TARGET_PRICE_REACHED";
                verdictLabel = $"🎯 TARGET PRICE REACHED (₹{holding.TargetPrice.Value:N2})";
                actionHindi = $"{holding.CompanyName} ka target price ₹{holding.TargetPrice.Value:N2} achieve ho gaya hai! Safe traders abhi 50-70% profit book karein.";
            }
            // 2. Check Stop-Loss / Downside Risk Breached
            else if (holding.StopLossPrice.HasValue && cmp <= holding.StopLossPrice.Value)
            {
                isStopLossHit = true;
                alertType = "STOP_LOSS_BREACHED";
                verdictLabel = $"🛑 STOP-LOSS BREACHED (₹{holding.StopLossPrice.Value:N2})";
                actionHindi = $"Alert! {holding.CompanyName} CMP ₹{cmp:N2} aapke stop-loss level ₹{holding.StopLossPrice.Value:N2} se niche chala gaya hai. Capital safe rakhne ke liye bina intezar kiye disciplined exit karein.";
            }

            if (!isTargetHit && !isStopLossHit)
            {
                continue;
            }

            // Deduplication check: Has this exact alert type been dispatched for this holding within last 4 hours?
            bool alreadySentRecently = recentLogs.Any(l =>
                l.UserId == holding.UserId &&
                l.Ticker.Equals(holding.Ticker, StringComparison.OrdinalIgnoreCase) &&
                l.AlertType == alertType);

            if (alreadySentRecently)
            {
                _logger.LogInformation("🛡️ [AGENT 2: DEDUPLICATION] Skipping duplicate alert for {Ticker} ({AlertType}) within cooldown.",
                    holding.Ticker, alertType);
                continue;
            }

            // Build Formatted WhatsApp Message
            var wa = new StringBuilder();
            if (isTargetHit)
            {
                wa.AppendLine("🎉 *HISAAB AI TARGET PROFIT HIT ALERT!*");
                wa.AppendLine($"📈 *Stock:* {holding.CompanyName} ({holding.Ticker.Replace(".NS", "")})");
                wa.AppendLine($"💰 *Current Price (CMP):* ₹{cmp:N2}");
                wa.AppendLine($"🎯 *Target Profit:* ₹{holding.TargetProfitPerShare ?? (holding.TargetPrice - holding.BuyPrice):N0} / share (ACHIEVED)");
                wa.AppendLine($"💵 *Current Profit Per Share:* +₹{profitPerShare:N2} (+{profitPct:N1}%)");
                wa.AppendLine($"💼 *Total Profit on {holding.Quantity} Shares:* +₹{totalProfit:N2}");
                wa.AppendLine();
                wa.AppendLine("💡 *AI Action Recommendation:*");
                wa.AppendLine(actionHindi);
            }
            else
            {
                wa.AppendLine("🛑 *HISAAB AI STOP-LOSS / RISK ALERT!*");
                wa.AppendLine($"📉 *Stock:* {holding.CompanyName} ({holding.Ticker.Replace(".NS", "")})");
                wa.AppendLine($"⚠️ *Current Price (CMP):* ₹{cmp:N2}");
                wa.AppendLine($"🛑 *Stop-Loss Floor:* ₹{holding.StopLossPrice:N2} (BREACHED)");
                wa.AppendLine($"🔻 *Current P&L:* ₹{totalProfit:N2} ({profitPct:N1}%)");
                wa.AppendLine();
                wa.AppendLine("🛡️ *AI Action Recommendation:*");
                wa.AppendLine(actionHindi);
            }

            // Build Formatted HTML Email
            var emailBg = isTargetHit ? "#f0fdf4" : "#fff1f2";
            var emailBorder = isTargetHit ? "#10b981" : "#ef4444";
            var emailHeadBg = isTargetHit ? "linear-gradient(135deg, #059669, #10b981)" : "linear-gradient(135deg, #dc2626, #f43f5e)";
            var emailTitle = isTargetHit ? "🎯 Target Profit Hit Alert" : "🛑 Stop-Loss Breached Alert";

            var emailHtml = $@"
<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;"">
  <div style=""background: {emailHeadBg}; padding: 20px 24px; color: #ffffff;"">
    <h1 style=""margin: 0; font-size: 20px; font-weight: 800;"">{emailTitle}</h1>
    <p style=""margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;"">{holding.CompanyName} ({holding.Ticker.Replace(".NS", "")}) • Live Alert</p>
  </div>
  <div style=""padding: 24px;"">
    <div style=""background: {emailBg}; border: 1.5px solid {emailBorder}; border-radius: 8px; padding: 16px; margin-bottom: 20px;"">
      <div style=""font-size: 14px; font-weight: 800; color: {(isTargetHit ? "#047857" : "#b91c1c")}; margin-bottom: 8px;"">{verdictLabel}</div>
      <table style=""width: 100%; font-size: 13px; border-collapse: collapse;"">
        <tr>
          <td style=""padding: 4px 0; color: #64748b;"">Current Market Price (CMP):</td>
          <td style=""padding: 4px 0; text-align: right; font-weight: 700; font-size: 15px;"">₹{cmp:N2}</td>
        </tr>
        <tr>
          <td style=""padding: 4px 0; color: #64748b;"">Your Buy Price:</td>
          <td style=""padding: 4px 0; text-align: right; font-weight: 600;"">₹{holding.BuyPrice:N2}</td>
        </tr>
        <tr>
          <td style=""padding: 4px 0; color: #64748b;"">Profit / Share:</td>
          <td style=""padding: 4px 0; text-align: right; font-weight: 700; color: {(profitPerShare >= 0 ? "#10b981" : "#ef4444")};"">{(profitPerShare >= 0 ? "+" : "")}₹{profitPerShare:N2} ({(profitPct >= 0 ? "+" : "")}{profitPct:N1}%)</td>
        </tr>
        <tr>
          <td style=""padding: 4px 0; color: #64748b;"">Total Position P&L ({holding.Quantity} shares):</td>
          <td style=""padding: 4px 0; text-align: right; font-weight: 800; font-size: 16px; color: {(totalProfit >= 0 ? "#10b981" : "#ef4444")};"">{(totalProfit >= 0 ? "+" : "")}₹{totalProfit:N2}</td>
        </tr>
      </table>
    </div>
    <div style=""background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px;"">
      <strong style=""font-size: 12px; color: #0b57d0; display: block; margin-bottom: 6px;"">💡 AI EXPERT STRATEGY:</strong>
      <p style=""margin: 0; font-size: 13px; color: #0f172a; line-height: 1.5;"">{actionHindi}</p>
    </div>
  </div>
  <div style=""background: #f1f5f9; padding: 12px 24px; text-align: center; font-size: 11px; color: #64748b;"">
    Hisaab Finance OS • Real-Time Portfolio Sentinel Agent
  </div>
</div>";

            triggeredAlerts.Add(new PortfolioTargetHitAlertDto(
                HoldingId: holding.Id,
                UserId: holding.UserId,
                Ticker: holding.Ticker,
                CompanyName: holding.CompanyName,
                BuyPrice: holding.BuyPrice,
                Quantity: holding.Quantity,
                CurrentPrice: cmp,
                TargetProfitPerShare: holding.TargetProfitPerShare,
                CurrentProfitPerShare: profitPerShare,
                TotalProfit: totalProfit,
                ProfitPercentage: profitPct,
                TargetPrice: holding.TargetPrice,
                StopLossPrice: holding.StopLossPrice,
                AlertType: alertType,
                VerdictLabel: verdictLabel,
                RecommendedActionHindi: actionHindi,
                FormattedWhatsAppMessage: wa.ToString(),
                FormattedHtmlEmail: emailHtml
            ));
        }

        _logger.LogInformation("✅ [AGENT 2: PORTFOLIO SENTINEL] Monitored {Count} holdings. Found {Triggers} triggered alerts.",
            holdings.Count, triggeredAlerts.Count);

        return triggeredAlerts;
    }
}
