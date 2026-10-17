using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.MarketAi.DTOs;
using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Hisaab.Infrastructure.Services;

public class AlertDispatcherAgent : IAlertDispatcherAgent
{
    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IWhatsAppService _whatsAppService;
    private readonly ILogger<AlertDispatcherAgent> _logger;

    public AlertDispatcherAgent(
        IApplicationDbContext context,
        IEmailService emailService,
        IWhatsAppService whatsAppService,
        ILogger<AlertDispatcherAgent> logger)
    {
        _context = context;
        _emailService = emailService;
        _whatsAppService = whatsAppService;
        _logger = logger;
    }

    public async Task<bool> DispatchPreMarketReportAsync(
        PreMarketDailyReportDto report,
        MarketAgentUserSetting setting,
        CancellationToken ct = default)
    {
        if (setting == null) return false;

        _logger.LogInformation("📨 [AGENT 3: ALERT DISPATCHER] Dispatching Pre-Market Report for user {UserId}...", setting.UserId);

        string waStatus = "Disabled";
        string emailStatus = "Disabled";
        string? waClickUrl = null;

        // 1. WhatsApp Delivery
        if (setting.EnableWhatsAppDispatch && !string.IsNullOrWhiteSpace(setting.WhatsAppPhoneNumber))
        {
            var waRes = await _whatsAppService.SendWhatsAppMessageAsync(
                setting.WhatsAppPhoneNumber,
                report.FormattedWhatsAppMessage,
                ct);

            waStatus = waRes.Status;
            waClickUrl = waRes.ClickUrl;
        }

        // 2. Email Delivery
        if (setting.EnableEmailDispatch && !string.IsNullOrWhiteSpace(setting.EmailAddress))
        {
            var subject = $"🌅 Hisaab Pre-Market AI Briefing ({report.ReportDate}) - Today's Top Gainers & Risks";
            var emailSuccess = await _emailService.SendEmailAsync(
                setting.EmailAddress,
                subject,
                report.FormattedHtmlEmail,
                ct);

            emailStatus = emailSuccess ? "Sent" : "Failed";
        }

        // 3. Persist Alert Log
        var log = new MarketAgentAlertLog
        {
            UserId = setting.UserId,
            Ticker = "NIFTY/SENSEX",
            CompanyName = "Indian Stock Market",
            AlertType = "PRE_MARKET_REPORT",
            Title = $"🌅 Pre-Market Report ({report.ReportDate})",
            Message = report.ActionableBriefHindi,
            TriggerPrice = 0,
            TargetPrice = null,
            ProfitOrLossAmount = null,
            WhatsAppStatus = waStatus,
            EmailStatus = emailStatus,
            WhatsAppClickUrl = waClickUrl,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.MarketAgentAlertLogs.Add(log);
        setting.LastPreMarketReportDate = report.ReportDate;
        setting.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("✅ [AGENT 3: ALERT DISPATCHER] Pre-market report logged and dispatched. WA: {WA}, Email: {Email}",
            waStatus, emailStatus);

        return true;
    }

    public async Task<bool> DispatchTargetOrLossAlertAsync(
        PortfolioTargetHitAlertDto alert,
        MarketAgentUserSetting setting,
        CancellationToken ct = default)
    {
        if (setting == null) return false;

        // Check if user has this alert type enabled
        if (alert.AlertType.Contains("TARGET") && !setting.EnableTargetHitAlerts)
        {
            _logger.LogInformation("📨 [AGENT 3] Target Hit alert disabled in user settings for {Ticker}.", alert.Ticker);
            return false;
        }

        if (alert.AlertType.Contains("STOP_LOSS") && !setting.EnableStopLossAlerts)
        {
            _logger.LogInformation("📨 [AGENT 3] Stop-loss alert disabled in user settings for {Ticker}.", alert.Ticker);
            return false;
        }

        string waStatus = "Disabled";
        string emailStatus = "Disabled";
        string? waClickUrl = null;

        // 1. WhatsApp Delivery
        if (setting.EnableWhatsAppDispatch && !string.IsNullOrWhiteSpace(setting.WhatsAppPhoneNumber))
        {
            var waRes = await _whatsAppService.SendWhatsAppMessageAsync(
                setting.WhatsAppPhoneNumber,
                alert.FormattedWhatsAppMessage,
                ct);

            waStatus = waRes.Status;
            waClickUrl = waRes.ClickUrl;
        }

        // 2. Email Delivery
        if (setting.EnableEmailDispatch && !string.IsNullOrWhiteSpace(setting.EmailAddress))
        {
            var subject = $"{alert.VerdictLabel} - {alert.CompanyName} ({alert.Ticker.Replace(".NS", "")})";
            var emailSuccess = await _emailService.SendEmailAsync(
                setting.EmailAddress,
                subject,
                alert.FormattedHtmlEmail,
                ct);

            emailStatus = emailSuccess ? "Sent" : "Failed";
        }

        // 3. Persist Alert Log
        var log = new MarketAgentAlertLog
        {
            UserId = setting.UserId,
            Ticker = alert.Ticker,
            CompanyName = alert.CompanyName,
            AlertType = alert.AlertType,
            Title = alert.VerdictLabel,
            Message = alert.RecommendedActionHindi,
            TriggerPrice = alert.CurrentPrice,
            TargetPrice = alert.TargetPrice,
            ProfitOrLossAmount = alert.TotalProfit,
            WhatsAppStatus = waStatus,
            EmailStatus = emailStatus,
            WhatsAppClickUrl = waClickUrl,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.MarketAgentAlertLogs.Add(log);
        setting.LastSentinelScanUtc = DateTime.UtcNow;
        setting.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("✅ [AGENT 3: ALERT DISPATCHER] Alert dispatched for {Ticker}. WA: {WA}, Email: {Email}",
            alert.Ticker, waStatus, emailStatus);

        return true;
    }

    public async Task<MarketAgentAlertLogDto> SendTestNotificationAsync(
        Guid userId,
        string? customPhone = null,
        string? customEmail = null,
        CancellationToken ct = default)
    {
        _logger.LogInformation("🧪 [AGENT 3: TEST DISPATCH] Sending test notification for user {UserId}...", userId);

        var setting = await _context.MarketAgentUserSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.UserId == userId, ct);

        var phone = !string.IsNullOrWhiteSpace(customPhone) ? customPhone : (setting?.WhatsAppPhoneNumber ?? "919999999999");
        var email = !string.IsNullOrWhiteSpace(customEmail) ? customEmail : (setting?.EmailAddress ?? "investor@example.com");

        var testWaMessage =
            "🔔 *HISAAB AI ALERT SYSTEM - TEST NOTIFICATION*\n" +
            "━━━━━━━━━━━━━━━━━━━━\n" +
            "✅ *Status:* Aapka WhatsApp aur Email Alert system successfully connected hai!\n\n" +
            "🎯 *Example Target Profit Hit Trigger:*\n" +
            "• Stock: *Dixon Technologies (DIXON)*\n" +
            "• CMP: ₹12,845.00 (+₹1,000/share Profit Target ACHIEVED!)\n" +
            "• P&L: *+₹10,000 Total Profit on 10 shares*\n" +
            "• Recommendation: 50% shares sell karke profit lock karein, trailing stop-loss lagayein!\n\n" +
            "🌅 Har din subah market khulne se pehle (08:45 AM IST) aapko aise hi pre-market gainer aur loss list ka message aayega!";

        var testEmailHtml = @"
<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;"">
  <div style=""background: linear-gradient(135deg, #0b57d0, #6366f1); padding: 22px 26px; color: #ffffff;"">
    <h1 style=""margin: 0; font-size: 20px; font-weight: 800;"">🔔 Hisaab AI Alert Test</h1>
    <p style=""margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;"">WhatsApp & Email Dispatcher Agent Verification</p>
  </div>
  <div style=""padding: 24px;"">
    <div style=""background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin-bottom: 16px;"">
      <strong style=""color: #166534; font-size: 14px;"">✅ System Live & Connected!</strong>
      <p style=""margin: 6px 0 0 0; font-size: 13px; color: #15803d; line-height: 1.5;"">
        Aapka email and WhatsApp notifications configuration active hai. Target profit hits, stop-loss triggers aur daily morning pre-market briefs aapko real-time dispatch honge.
      </p>
    </div>
    <div style=""background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px;"">
      <div style=""font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 4px;"">SAMPLE TRIGGER TEST:</div>
      <div style=""font-size: 13px; color: #0f172a;"">Dixon Technologies • Target Hit: +₹1,000/share • Total Profit: +₹10,000</div>
    </div>
  </div>
  <div style=""background: #f1f5f9; padding: 12px 24px; text-align: center; font-size: 11px; color: #64748b;"">
    Hisaab Finance OS • Alert Dispatcher Agent
  </div>
</div>";

        var waRes = await _whatsAppService.SendWhatsAppMessageAsync(phone, testWaMessage, ct);
        var emailSent = await _emailService.SendEmailAsync(email, "🔔 Hisaab AI Alert System - Test Notification", testEmailHtml, ct);

        var log = new MarketAgentAlertLog
        {
            UserId = userId,
            Ticker = "TEST-ALERT",
            CompanyName = "Test Notification Check",
            AlertType = "MANUAL_TEST",
            Title = "🧪 WhatsApp & Email Alert System Verification",
            Message = "Test notification successfully generated and dispatched to your configured contact channels.",
            TriggerPrice = 12845.00m,
            TargetPrice = 13845.00m,
            ProfitOrLossAmount = 10000.00m,
            WhatsAppStatus = waRes.Status,
            EmailStatus = emailSent ? "Sent" : "Failed",
            WhatsAppClickUrl = waRes.ClickUrl,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.MarketAgentAlertLogs.Add(log);
        await _context.SaveChangesAsync(ct);

        var ist = TimeZoneInfo.ConvertTimeFromUtc(log.CreatedAtUtc,
            TimeZoneInfo.FindSystemTimeZoneById(OperatingSystem.IsWindows() ? "India Standard Time" : "Asia/Kolkata"));

        return new MarketAgentAlertLogDto(
            Id: log.Id,
            Ticker: log.Ticker,
            CompanyName: log.CompanyName,
            AlertType: log.AlertType,
            Title: log.Title,
            Message: log.Message,
            TriggerPrice: log.TriggerPrice,
            TargetPrice: log.TargetPrice,
            ProfitOrLossAmount: log.ProfitOrLossAmount,
            WhatsAppStatus: log.WhatsAppStatus,
            EmailStatus: log.EmailStatus,
            WhatsAppClickUrl: log.WhatsAppClickUrl,
            CreatedAtUtc: log.CreatedAtUtc,
            CreatedAtIst: ist.ToString("dd MMM yyyy, hh:mm tt")
        );
    }
}
