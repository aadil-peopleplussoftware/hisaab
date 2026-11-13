using System.Text;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.MarketAi.DTOs;
using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hisaab.Infrastructure.Services;

public class MyAssistantAgent : IMyAssistantAgent
{
    private readonly IApplicationDbContext _context;
    private readonly IStockMarketService _stockMarketService;
    private readonly ILogger<MyAssistantAgent> _logger;

    public MyAssistantAgent(
        IApplicationDbContext context,
        IStockMarketService stockMarketService,
        ILogger<MyAssistantAgent> logger)
    {
        _context = context;
        _stockMarketService = stockMarketService;
        _logger = logger;
    }

    public async Task<MyAssistantOverviewDto> GetOverviewAsync(Guid? userId, CancellationToken ct = default)
    {
        var uid = userId ?? Guid.Empty;
        var ist = MarketAgentWorkerService.GetIndianStandardTime();
        int hour = ist.Hour;
        int minute = ist.Minute;
        bool isMarketOpen = ((hour == 9 && minute >= 15) || (hour > 9 && hour < 15) || (hour == 15 && minute <= 30))
            && ist.DayOfWeek != DayOfWeek.Saturday && ist.DayOfWeek != DayOfWeek.Sunday;

        string marketStatusText = isMarketOpen
            ? "🟢 Indian Market is LIVE (09:15 - 15:30 IST)"
            : "🔴 Indian Market is Closed (Next Session: 09:15 AM IST)";

        string nextEvent;
        if (!isMarketOpen)
        {
            nextEvent = "Market Opening Bell at 09:15 AM IST";
        }
        else
        {
            nextEvent = "Market Closing Bell at 03:30 PM IST";
        }

        // Fetch User Holdings
        var query = _context.StockHoldings
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(h => !h.IsArchived && !h.IsDeleted);

        if (uid != Guid.Empty)
        {
            query = query.Where(h => h.UserId == uid || h.UserId == Guid.Empty);
        }

        var holdings = await query.OrderByDescending(h => h.CreatedAtUtc).ToListAsync(ct);
        var tickers = holdings.Select(h => h.Ticker).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var quotes = await _stockMarketService.GetQuotesAsync(tickers, ct);

        var holdingDtos = new List<MyAssistantStockItemDto>();
        decimal totalInvested = 0m;
        decimal totalCurrentVal = 0m;
        decimal totalDayGain = 0m;
        int targetHits = 0;
        int slHits = 0;

        foreach (var h in holdings)
        {
            quotes.TryGetValue(h.Ticker, out var q);

            decimal cmp = q?.CurrentPrice ?? h.BuyPrice;
            decimal open = q?.OpenPrice ?? (q?.PreviousClose ?? cmp);
            decimal prevClose = q?.PreviousClose ?? h.BuyPrice;
            decimal dayChg = q?.DayChange ?? (cmp - prevClose);
            decimal dayChgPct = q?.DayChangePercent ?? (prevClose > 0 ? (dayChg / prevClose) * 100m : 0m);
            decimal dayHigh = q?.DayHigh ?? cmp;
            decimal dayLow = q?.DayLow ?? cmp;

            decimal profitPerShare = Math.Round(cmp - h.BuyPrice, 2);
            decimal totalPnl = Math.Round(profitPerShare * h.Quantity, 2);
            decimal pnlPct = h.BuyPrice > 0 ? Math.Round((profitPerShare / h.BuyPrice) * 100m, 2) : 0m;

            decimal invested = Math.Round(h.BuyPrice * h.Quantity, 2);
            decimal curVal = Math.Round(cmp * h.Quantity, 2);
            decimal stockDayGain = Math.Round(dayChg * h.Quantity, 2);

            totalInvested += invested;
            totalCurrentVal += curVal;
            totalDayGain += stockDayGain;

            // Distances
            decimal distToTarget = 0m;
            decimal distToTargetPct = 0m;
            if (h.TargetPrice.HasValue && h.TargetPrice.Value > 0)
            {
                distToTarget = Math.Round(h.TargetPrice.Value - cmp, 2);
                distToTargetPct = cmp > 0 ? Math.Round((distToTarget / cmp) * 100m, 2) : 0m;
            }
            else if (h.TargetProfitPerShare.HasValue)
            {
                var targetP = h.BuyPrice + h.TargetProfitPerShare.Value;
                distToTarget = Math.Round(targetP - cmp, 2);
                distToTargetPct = cmp > 0 ? Math.Round((distToTarget / cmp) * 100m, 2) : 0m;
            }

            decimal distToSl = 0m;
            decimal distToSlPct = 0m;
            if (h.StopLossPrice.HasValue && h.StopLossPrice.Value > 0)
            {
                distToSl = Math.Round(cmp - h.StopLossPrice.Value, 2);
                distToSlPct = cmp > 0 ? Math.Round((distToSl / cmp) * 100m, 2) : 0m;
            }

            // Determine status
            string status = "SAFE";
            if ((h.TargetPrice.HasValue && cmp >= h.TargetPrice.Value) ||
                (h.TargetProfitPerShare.HasValue && profitPerShare >= h.TargetProfitPerShare.Value))
            {
                status = "TARGET_HIT";
                targetHits++;
            }
            else if (h.StopLossPrice.HasValue && cmp <= h.StopLossPrice.Value)
            {
                status = "STOP_LOSS_BREACHED";
                slHits++;
            }
            else if (distToTarget > 0 && distToTargetPct <= 1.5m)
            {
                status = "NEAR_TARGET";
            }
            else if (distToSl > 0 && distToSlPct <= 1.5m)
            {
                status = "NEAR_STOP_LOSS";
            }

            holdingDtos.Add(new MyAssistantStockItemDto(
                h.Id,
                h.Ticker,
                h.CompanyName,
                h.Exchange,
                h.BuyPrice,
                h.Quantity,
                cmp,
                open,
                prevClose,
                dayChg,
                dayChgPct,
                dayHigh,
                dayLow,
                h.TargetPrice,
                h.TargetProfitPerShare,
                h.StopLossPrice,
                profitPerShare,
                totalPnl,
                pnlPct,
                distToTarget,
                distToTargetPct,
                distToSl,
                distToSlPct,
                status,
                h.Notes,
                h.PurchaseDate
            ));
        }

        // Fetch User Settings
        var setting = await _context.MarketAgentUserSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.UserId == uid || s.UserId == Guid.Empty, ct);

        var settingDto = new MarketAgentUserSettingDto(
            setting?.WhatsAppPhoneNumber ?? "+91 98765 43210",
            setting?.EmailAddress ?? "investor@example.com",
            setting?.EnablePreMarketScan ?? true,
            setting?.EnableTargetHitAlerts ?? true,
            setting?.EnableStopLossAlerts ?? true,
            setting?.EnableEmailDispatch ?? true,
            setting?.EnableWhatsAppDispatch ?? true,
            setting?.PreMarketScanTime ?? "08:45",
            setting?.LastPreMarketReportDate,
            setting?.EnableMarketOpenAlerts ?? true,
            setting?.EnableMarketCloseAlerts ?? true,
            setting?.LastMarketOpenReportDate,
            setting?.LastMarketCloseReportDate,
            setting?.WhatsAppProvider ?? "CallMeBot",
            setting?.WhatsAppApiKey,
            setting?.WhatsAppInstanceId,
            setting?.WhatsAppWebhookUrl,
            setting?.EnableTelegramDispatch ?? false,
            setting?.TelegramBotToken,
            setting?.TelegramChatId,
            setting?.EnableDiscordDispatch ?? false,
            setting?.DiscordWebhookUrl,
            setting?.EnableNtfyDispatch ?? false,
            setting?.NtfyTopic,
            setting?.NtfyServerUrl ?? "https://ntfy.sh"
        );

        // Fetch Recent Alert Logs
        var recentLogs = await _context.MarketAgentAlertLogs
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(l => uid == Guid.Empty || l.UserId == uid)
            .OrderByDescending(l => l.CreatedAtUtc)
            .Take(15)
            .ToListAsync(ct);

        var tz = TimeZoneInfo.FindSystemTimeZoneById(OperatingSystem.IsWindows() ? "India Standard Time" : "Asia/Kolkata");
        var logDtos = recentLogs.Select(l =>
        {
            var lIst = TimeZoneInfo.ConvertTimeFromUtc(l.CreatedAtUtc, tz);
            return new MarketAgentAlertLogDto(
                l.Id, l.Ticker, l.CompanyName, l.AlertType, l.Title, l.Message,
                l.TriggerPrice, l.TargetPrice, l.ProfitOrLossAmount,
                l.WhatsAppStatus, l.EmailStatus, l.WhatsAppClickUrl,
                l.CreatedAtUtc, lIst.ToString("dd MMM yyyy, hh:mm tt"),
                l.TelegramStatus, l.DiscordStatus, l.NtfyStatus
            );
        }).ToList();

        return new MyAssistantOverviewDto(
            CurrentTimeIst: ist.ToString("dd MMM yyyy, hh:mm:ss tt") + " IST",
            IsMarketOpen: isMarketOpen,
            MarketStatusText: marketStatusText,
            NextScheduledEventIst: nextEvent,
            TotalInvested: Math.Round(totalInvested, 2),
            TotalCurrentValue: Math.Round(totalCurrentVal, 2),
            TotalUnrealizedProfit: Math.Round(totalCurrentVal - totalInvested, 2),
            TotalDayGainLoss: Math.Round(totalDayGain, 2),
            TotalStocksTracked: holdings.Count,
            TargetsHitCount: targetHits,
            StopLossHitCount: slHits,
            AlertsDispatchedToday: MarketAgentWorkerService.TotalAlertsDispatchedSession,
            Holdings: holdingDtos,
            Settings: settingDto,
            RecentLogs: logDtos
        );
    }

    public async Task<MarketOpenDailyReportDto> GenerateMarketOpenReportAsync(Guid? userId, CancellationToken ct = default)
    {
        var ist = MarketAgentWorkerService.GetIndianStandardTime();
        var todayStr = ist.ToString("yyyy-MM-dd");
        var timeStr = ist.ToString("hh:mm tt");

        var query = _context.StockHoldings
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(h => !h.IsArchived && !h.IsDeleted);

        if (userId.HasValue && userId.Value != Guid.Empty)
        {
            query = query.Where(h => h.UserId == userId.Value || h.UserId == Guid.Empty);
        }

        var holdings = await query.ToListAsync(ct);
        if (holdings.Count == 0)
        {
            return new MarketOpenDailyReportDto(
                todayStr,
                timeStr,
                0,
                new List<MarketOpenStockItemDto>(),
                "Aapke My Assistant portfolio me abhi koi active shares add nahi hain.",
                "🔔 *HISAAB MY ASSISTANT — MARKET OPEN REPORT*\n━━━━━━━━━━━━━━━━━━━━\nPortfolio me abhi koi shares add nahi hain. Naye shares add karein!",
                "<p>Portfolio me koi shares add nahi hain.</p>"
            );
        }

        var tickers = holdings.Select(h => h.Ticker).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var quotes = await _stockMarketService.GetQuotesAsync(tickers, ct);

        var stockItems = new List<MarketOpenStockItemDto>();
        var waSb = new StringBuilder();
        waSb.AppendLine($"🔔 *HISAAB MY ASSISTANT — MARKET OPEN REPORT (09:15 AM)*");
        waSb.AppendLine($"📅 Date: {ist:dd MMM yyyy} | Time: {timeStr} IST");
        waSb.AppendLine("━━━━━━━━━━━━━━━━━━━━");
        waSb.AppendLine("🇮🇳 *Indian Stock Market Khul Chuka Hai!*");
        waSb.AppendLine("Aapke add kiye gaye shares ke *OPENING PRICES* ye rahe:\n");

        var emailRowsSb = new StringBuilder();

        foreach (var h in holdings)
        {
            quotes.TryGetValue(h.Ticker, out var q);
            decimal cmp = q?.CurrentPrice ?? h.BuyPrice;
            decimal prevClose = q?.PreviousClose ?? h.BuyPrice;
            decimal open = q?.OpenPrice ?? (prevClose > 0 ? prevClose : cmp);
            decimal gapPct = prevClose > 0 ? Math.Round(((open - prevClose) / prevClose) * 100m, 2) : 0m;

            string gapStatus = gapPct >= 0.3m ? "GAP_UP" : (gapPct <= -0.3m ? "GAP_DOWN" : "FLAT");
            string gapEmoji = gapPct >= 0 ? "🟢" : "🔴";
            string gapSign = gapPct >= 0 ? "+" : "";

            stockItems.Add(new MarketOpenStockItemDto(
                h.Ticker,
                h.CompanyName,
                h.BuyPrice,
                h.Quantity,
                open,
                prevClose,
                gapPct,
                cmp,
                h.TargetPrice,
                h.StopLossPrice,
                gapStatus
            ));

            waSb.AppendLine($"• *{h.CompanyName} ({h.Ticker.Replace(".NS", "")})*");
            waSb.AppendLine($"  ↳ 🌅 *Open Price:* ₹{open:N2} ({gapEmoji} {gapSign}{gapPct:N2}% vs Prev Close ₹{prevClose:N2})");
            waSb.AppendLine($"  ↳ 🎯 Target: ₹{(h.TargetPrice.HasValue ? h.TargetPrice.Value.ToString("N2") : "Not Set")} | 🛡️ SL: ₹{(h.StopLossPrice.HasValue ? h.StopLossPrice.Value.ToString("N2") : "Not Set")}");
            waSb.AppendLine();

            emailRowsSb.Append($@"
            <tr style='border-bottom: 1px solid #f1f5f9;'>
              <td style='padding: 10px 12px; font-weight: 700; color: #1e293b;'>{h.CompanyName}<br><span style='font-size: 11px; color: #64748b;'>{h.Ticker}</span></td>
              <td style='padding: 10px 12px; color: #475569;'>₹{h.BuyPrice:N2}</td>
              <td style='padding: 10px 12px; font-weight: 700; color: #0f172a;'>₹{open:N2}</td>
              <td style='padding: 10px 12px; font-weight: 700; color: {(gapPct >= 0 ? "#16a34a" : "#dc2626")};'>{gapSign}{gapPct:N2}%</td>
              <td style='padding: 10px 12px; color: #0284c7;'>₹{(h.TargetPrice.HasValue ? h.TargetPrice.Value.ToString("N2") : "-")}</td>
              <td style='padding: 10px 12px; color: #e11d48;'>₹{(h.StopLossPrice.HasValue ? h.StopLossPrice.Value.ToString("N2") : "-")}</td>
            </tr>");
        }

        waSb.AppendLine("━━━━━━━━━━━━━━━━━━━━");
        waSb.AppendLine("💡 *Assistant Advice:* Agar koi share Target ke paas open hua hai to 50% profit book karke rest par Trailing Stop-Loss lagayein.");
        waSb.AppendLine("📲 _Hisaab My Assistant Real-Time Sentinel Active_");

        string briefHindi = $"Market 09:15 AM par open ho chuka hai! Aapke {holdings.Count} tracked shares ke opening prices live record kar liye gaye hain.";

        string emailHtml = $@"
<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;"">
  <div style=""background: linear-gradient(135deg, #0b57d0, #4f46e5); padding: 22px 26px; color: #ffffff;"">
    <h1 style=""margin: 0; font-size: 20px; font-weight: 800;"">🔔 Hisaab Assistant — Market Opening Bell (09:15 AM)</h1>
    <p style=""margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;"">Date: {ist:dd MMM yyyy} | Tracked Equities: {holdings.Count}</p>
  </div>
  <div style=""padding: 24px;"">
    <div style=""background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px; margin-bottom: 20px;"">
      <strong style=""color: #1e40af;"">🌅 Morning Market Pulse:</strong>
      <p style=""margin: 4px 0 0 0; font-size: 13px; color: #1e3a8a;"">{briefHindi}</p>
    </div>
    <table style=""width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;"">
      <thead>
        <tr style=""background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569;"">
          <th style=""padding: 10px 12px;"">Share</th>
          <th style=""padding: 10px 12px;"">Buy Price</th>
          <th style=""padding: 10px 12px;"">Open Price</th>
          <th style=""padding: 10px 12px;"">Gap %</th>
          <th style=""padding: 10px 12px;"">Target</th>
          <th style=""padding: 10px 12px;"">Stop Loss</th>
        </tr>
      </thead>
      <tbody>
        {emailRowsSb}
      </tbody>
    </table>
  </div>
  <div style=""background: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;"">
    Hisaab Autonomous Stock Assistant • Real-Time Sentinel Active
  </div>
</div>";

        return new MarketOpenDailyReportDto(
            todayStr,
            timeStr,
            holdings.Count,
            stockItems,
            briefHindi,
            waSb.ToString(),
            emailHtml
        );
    }

    public async Task<MarketCloseDailyReportDto> GenerateMarketCloseReportAsync(Guid? userId, CancellationToken ct = default)
    {
        var ist = MarketAgentWorkerService.GetIndianStandardTime();
        var todayStr = ist.ToString("yyyy-MM-dd");
        var timeStr = ist.ToString("hh:mm tt");

        var query = _context.StockHoldings
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(h => !h.IsArchived && !h.IsDeleted);

        if (userId.HasValue && userId.Value != Guid.Empty)
        {
            query = query.Where(h => h.UserId == userId.Value || h.UserId == Guid.Empty);
        }

        var holdings = await query.ToListAsync(ct);
        if (holdings.Count == 0)
        {
            return new MarketCloseDailyReportDto(
                todayStr,
                timeStr,
                0,
                0m,
                0m,
                new List<MarketCloseStockItemDto>(),
                "Aapke portfolio me koi active shares nahi hain.",
                "🌆 *HISAAB MY ASSISTANT — MARKET CLOSE REPORT*\n━━━━━━━━━━━━━━━━━━━━\nPortfolio me abhi koi shares add nahi hain.",
                "<p>Portfolio me koi shares add nahi hain.</p>"
            );
        }

        var tickers = holdings.Select(h => h.Ticker).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var quotes = await _stockMarketService.GetQuotesAsync(tickers, ct);

        var stockItems = new List<MarketCloseStockItemDto>();
        decimal totalDayGainLoss = 0m;
        decimal totalOverallGainLoss = 0m;

        var waSb = new StringBuilder();
        waSb.AppendLine($"🌆 *HISAAB MY ASSISTANT — MARKET CLOSE REPORT (03:30 PM)*");
        waSb.AppendLine($"📅 Date: {ist:dd MMM yyyy} | Time: {timeStr} IST");
        waSb.AppendLine("━━━━━━━━━━━━━━━━━━━━");
        waSb.AppendLine("🇮🇳 *Indian Stock Market Aaj Ka Session Samapt Hua!*");
        waSb.AppendLine("Aapke add kiye gaye shares ke *CLOSING PRICES* aur Performance:\n");

        var emailRowsSb = new StringBuilder();

        foreach (var h in holdings)
        {
            quotes.TryGetValue(h.Ticker, out var q);
            decimal closePrice = q?.CurrentPrice ?? h.BuyPrice;
            decimal prevClose = q?.PreviousClose ?? h.BuyPrice;
            decimal dayChg = q?.DayChange ?? (closePrice - prevClose);
            decimal dayChgPct = q?.DayChangePercent ?? (prevClose > 0 ? (dayChg / prevClose) * 100m : 0m);

            decimal profitPerShare = Math.Round(closePrice - h.BuyPrice, 2);
            decimal totalPnl = Math.Round(profitPerShare * h.Quantity, 2);
            decimal pnlPct = h.BuyPrice > 0 ? Math.Round((profitPerShare / h.BuyPrice) * 100m, 2) : 0m;
            decimal dayGain = Math.Round(dayChg * h.Quantity, 2);

            totalDayGainLoss += dayGain;
            totalOverallGainLoss += totalPnl;

            stockItems.Add(new MarketCloseStockItemDto(
                h.Ticker,
                h.CompanyName,
                h.BuyPrice,
                h.Quantity,
                closePrice,
                dayChg,
                dayChgPct,
                totalPnl,
                pnlPct,
                dayGain
            ));

            string pnlEmoji = totalPnl >= 0 ? "🟢" : "🔴";
            string pnlSign = totalPnl >= 0 ? "+" : "";
            string daySign = dayChg >= 0 ? "+" : "";

            waSb.AppendLine($"• *{h.CompanyName} ({h.Ticker.Replace(".NS", "")})*");
            waSb.AppendLine($"  ↳ 🌆 *Close Price:* ₹{closePrice:N2} ({daySign}{dayChgPct:N2}% today)");
            waSb.AppendLine($"  ↳ {pnlEmoji} *Total P&L:* {pnlSign}₹{totalPnl:N2} ({pnlSign}{pnlPct:N2}%)");
            waSb.AppendLine();

            emailRowsSb.Append($@"
            <tr style='border-bottom: 1px solid #f1f5f9;'>
              <td style='padding: 10px 12px; font-weight: 700; color: #1e293b;'>{h.CompanyName}<br><span style='font-size: 11px; color: #64748b;'>{h.Ticker}</span></td>
              <td style='padding: 10px 12px; color: #475569;'>₹{h.BuyPrice:N2}</td>
              <td style='padding: 10px 12px; font-weight: 700; color: #0f172a;'>₹{closePrice:N2}</td>
              <td style='padding: 10px 12px; font-weight: 700; color: {(dayChg >= 0 ? "#16a34a" : "#dc2626")};'>{daySign}{dayChgPct:N2}%</td>
              <td style='padding: 10px 12px; font-weight: 700; color: {(totalPnl >= 0 ? "#16a34a" : "#dc2626")};'>{pnlSign}₹{totalPnl:N2} ({pnlSign}{pnlPct:N2}%)</td>
            </tr>");
        }

        string overallSign = totalOverallGainLoss >= 0 ? "+" : "";
        string daySignTot = totalDayGainLoss >= 0 ? "+" : "";

        waSb.AppendLine("━━━━━━━━━━━━━━━━━━━━");
        waSb.AppendLine($"📊 *Today's Day Net Gain/Loss:* {daySignTot}₹{totalDayGainLoss:N2}");
        waSb.AppendLine($"💰 *Overall Portfolio P&L:* {overallSign}₹{totalOverallGainLoss:N2}");
        waSb.AppendLine("📲 _Hisaab My Assistant Closing Bell Dispatch_");

        string briefHindi = $"Market close ho gaya hai. Aaj ka total portfolio day change {daySignTot}₹{totalDayGainLoss:N2} raha, aur overall total profit/loss {overallSign}₹{totalOverallGainLoss:N2} hai.";

        string emailHtml = $@"
<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;"">
  <div style=""background: linear-gradient(135deg, #1e293b, #334155); padding: 22px 26px; color: #ffffff;"">
    <h1 style=""margin: 0; font-size: 20px; font-weight: 800;"">🌆 Hisaab Assistant — Market Closing Bell Summary (03:30 PM)</h1>
    <p style=""margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;"">Date: {ist:dd MMM yyyy} | Day P&L: {daySignTot}₹{totalDayGainLoss:N2}</p>
  </div>
  <div style=""padding: 24px;"">
    <div style=""display: flex; gap: 12px; margin-bottom: 20px;"">
      <div style=""flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;"">
        <span style=""font-size: 12px; color: #64748b;"">Today's Day Gain/Loss</span>
        <div style=""font-size: 18px; font-weight: 800; color: {(totalDayGainLoss >= 0 ? "#16a34a" : "#dc2626")};"">{daySignTot}₹{totalDayGainLoss:N2}</div>
      </div>
      <div style=""flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;"">
        <span style=""font-size: 12px; color: #64748b;"">Total Portfolio Net Profit</span>
        <div style=""font-size: 18px; font-weight: 800; color: {(totalOverallGainLoss >= 0 ? "#16a34a" : "#dc2626")};"">{overallSign}₹{totalOverallGainLoss:N2}</div>
      </div>
    </div>
    <table style=""width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;"">
      <thead>
        <tr style=""background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569;"">
          <th style=""padding: 10px 12px;"">Share</th>
          <th style=""padding: 10px 12px;"">Buy Price</th>
          <th style=""padding: 10px 12px;"">Close Price</th>
          <th style=""padding: 10px 12px;"">Day Change</th>
          <th style=""padding: 10px 12px;"">Total P&L</th>
        </tr>
      </thead>
      <tbody>
        {emailRowsSb}
      </tbody>
    </table>
  </div>
  <div style=""background: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;"">
    Hisaab Autonomous Stock Assistant • Session Closed
  </div>
</div>";

        return new MarketCloseDailyReportDto(
            todayStr,
            timeStr,
            holdings.Count,
            totalDayGainLoss,
            totalOverallGainLoss,
            stockItems,
            briefHindi,
            waSb.ToString(),
            emailHtml
        );
    }

    public async Task<List<PortfolioTargetHitAlertDto>> CheckTargetAndStopLossBreachesAsync(Guid? userId, bool forceCheck = false, CancellationToken ct = default)
    {
        _logger.LogInformation("🛡️ [MY ASSISTANT] Checking holdings for Target Hit or Stop Loss breach (Force: {Force})...", forceCheck);

        var query = _context.StockHoldings
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(h => !h.IsArchived && !h.IsDeleted);

        if (userId.HasValue && userId.Value != Guid.Empty)
        {
            query = query.Where(h => h.UserId == userId.Value || h.UserId == Guid.Empty);
        }

        var holdings = await query.ToListAsync(ct);
        if (holdings.Count == 0) return new List<PortfolioTargetHitAlertDto>();

        var tickers = holdings.Select(h => h.Ticker).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var quotes = await _stockMarketService.GetQuotesAsync(tickers, ct);

        var triggeredAlerts = new List<PortfolioTargetHitAlertDto>();
        var cooldownTime = DateTime.UtcNow.AddHours(-2);

        var recentAlerts = await _context.MarketAgentAlertLogs
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(l => l.CreatedAtUtc >= cooldownTime)
            .ToListAsync(ct);

        foreach (var h in holdings)
        {
            if (!quotes.TryGetValue(h.Ticker, out var quote)) continue;
            decimal cmp = quote.CurrentPrice;
            if (cmp <= 0) continue;

            decimal profitPerShare = Math.Round(cmp - h.BuyPrice, 2);
            decimal totalProfit = Math.Round(profitPerShare * h.Quantity, 2);
            decimal profitPct = h.BuyPrice > 0 ? Math.Round((profitPerShare / h.BuyPrice) * 100m, 1) : 0m;

            bool isTargetHit = false;
            bool isStopLossHit = false;
            string alertType = "";
            string verdict = "";
            string actionHindi = "";

            // 1. Target Profit Per Share
            if (h.TargetProfitPerShare.HasValue && profitPerShare >= h.TargetProfitPerShare.Value)
            {
                isTargetHit = true;
                alertType = "TARGET_PROFIT_HIT";
                verdict = $"🎯 TARGET PROFIT HIT (+₹{profitPerShare:N0}/share)";
                actionHindi = $"Badhai ho! {h.CompanyName} me aapka per-share target profit ₹{h.TargetProfitPerShare.Value:N0} hit ho gaya hai! (Current Profit: ₹{profitPerShare:N2}/share, Total: +₹{totalProfit:N2}). Smart Action: Abhi 50% shares sell karke profit lock karein aur baaki 50% par trailing stop-loss lagayein!";
            }
            // 2. Target Price reached
            else if (h.TargetPrice.HasValue && cmp >= h.TargetPrice.Value)
            {
                isTargetHit = true;
                alertType = "TARGET_PRICE_REACHED";
                verdict = $"🎯 TARGET PRICE REACHED (₹{h.TargetPrice.Value:N2})";
                actionHindi = $"{h.CompanyName} ka target price ₹{h.TargetPrice.Value:N2} achieve ho gaya hai! (CMP: ₹{cmp:N2}, Total Profit: +₹{totalProfit:N2}). Profit book karein ya safe exit lein.";
            }
            // 3. Stop Loss Breached
            else if (h.StopLossPrice.HasValue && cmp <= h.StopLossPrice.Value)
            {
                isStopLossHit = true;
                alertType = "STOP_LOSS_BREACHED";
                verdict = $"⚠️ STOP-LOSS BREACHED (₹{h.StopLossPrice.Value:N2})";
                actionHindi = $"Dhyan dein! {h.CompanyName} ka price aapke stop-loss level ₹{h.StopLossPrice.Value:N2} ke neeche chala gaya hai (CMP: ₹{cmp:N2}, Total Loss: ₹{totalProfit:N2}). Risk management ke mutabiq position cut karke bada nuksan hone se bachein!";
            }

            if (!isTargetHit && !isStopLossHit) continue;

            // Check deduplication
            bool alreadyNotified = recentAlerts.Any(l =>
                l.UserId == h.UserId &&
                l.Ticker.Equals(h.Ticker, StringComparison.OrdinalIgnoreCase) &&
                l.AlertType == alertType);

            if (!forceCheck && alreadyNotified)
            {
                _logger.LogInformation("⏳ [DEDUPLICATION] Skipping alert for {Ticker} ({AlertType}) within cooldown window.", h.Ticker, alertType);
                continue;
            }

            var waMsg =
                $"{(isTargetHit ? "🎯" : "⚠️")} *HISAAB MY ASSISTANT ALERT*\n" +
                $"━━━━━━━━━━━━━━━━━━━━\n" +
                $"*{verdict}*\n\n" +
                $"• *Company:* {h.CompanyName} ({h.Ticker.Replace(".NS", "")})\n" +
                $"• *Buy Price:* ₹{h.BuyPrice:N2}\n" +
                $"• *Live CMP:* ₹{cmp:N2}\n" +
                $"• *Quantity:* {h.Quantity:N0} shares\n" +
                $"• *Total P&L:* {(totalProfit >= 0 ? "+" : "")}₹{totalProfit:N2} ({profitPct:N1}%)\n" +
                $"• *Trigger Level:* ₹{(isTargetHit ? (h.TargetPrice ?? (h.BuyPrice + (h.TargetProfitPerShare ?? 0))) : h.StopLossPrice):N2}\n\n" +
                $"💡 *AI Action Guide (Hindi):*\n{actionHindi}\n\n" +
                $"📲 _Dispatched automatically by Hisaab My Assistant Agent_";

            var emailHtml = $@"
<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;"">
  <div style=""background: {(isTargetHit ? "linear-gradient(135deg, #16a34a, #059669)" : "linear-gradient(135deg, #dc2626, #b91c1c)")}; padding: 22px 26px; color: #ffffff;"">
    <h1 style=""margin: 0; font-size: 20px; font-weight: 800;"">{(isTargetHit ? "🎯" : "⚠️")} {verdict}</h1>
    <p style=""margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;"">{h.CompanyName} ({h.Ticker})</p>
  </div>
  <div style=""padding: 24px;"">
    <div style=""background: {(isTargetHit ? "#f0fdf4" : "#fef2f2")}; border: 1px solid {(isTargetHit ? "#86efac" : "#fca5a5")}; border-radius: 8px; padding: 16px; margin-bottom: 20px;"">
      <strong style=""color: {(isTargetHit ? "#166534" : "#991b1b")};"">Guidance:</strong>
      <p style=""margin: 6px 0 0 0; font-size: 14px; color: {(isTargetHit ? "#15803d" : "#b91c1c")}; line-height: 1.5;"">{actionHindi}</p>
    </div>
    <table style=""width: 100%; border-collapse: collapse; font-size: 13px;"">
      <tr style=""border-bottom: 1px solid #e2e8f0;""><td style=""padding: 8px 0; color: #64748b;"">Buy Price</td><td style=""padding: 8px 0; font-weight: 700; text-align: right;"">₹{h.BuyPrice:N2}</td></tr>
      <tr style=""border-bottom: 1px solid #e2e8f0;""><td style=""padding: 8px 0; color: #64748b;"">Current Market Price</td><td style=""padding: 8px 0; font-weight: 700; text-align: right; color: {(isTargetHit ? "#16a34a" : "#dc2626")};"">₹{cmp:N2}</td></tr>
      <tr style=""border-bottom: 1px solid #e2e8f0;""><td style=""padding: 8px 0; color: #64748b;"">Quantity</td><td style=""padding: 8px 0; font-weight: 700; text-align: right;"">{h.Quantity:N0}</td></tr>
      <tr style=""border-bottom: 1px solid #e2e8f0;""><td style=""padding: 8px 0; color: #64748b;"">Total Net P&L</td><td style=""padding: 8px 0; font-weight: 800; font-size: 15px; text-align: right; color: {(totalProfit >= 0 ? "#16a34a" : "#dc2626")};"">{(totalProfit >= 0 ? "+" : "")}₹{totalProfit:N2} ({profitPct:N1}%)</td></tr>
    </table>
  </div>
</div>";

            triggeredAlerts.Add(new PortfolioTargetHitAlertDto(
                h.Id,
                h.UserId,
                h.Ticker,
                h.CompanyName,
                h.BuyPrice,
                h.Quantity,
                cmp,
                h.TargetProfitPerShare,
                profitPerShare,
                totalProfit,
                profitPct,
                h.TargetPrice,
                h.StopLossPrice,
                alertType,
                verdict,
                actionHindi,
                waMsg,
                emailHtml
            ));
        }

        return triggeredAlerts;
    }
}
