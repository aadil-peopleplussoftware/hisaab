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
    private readonly ITelegramBotService _telegramService;
    private readonly IDiscordWebhookService _discordService;
    private readonly INtfyService _ntfyService;
    private readonly ILogger<AlertDispatcherAgent> _logger;

    public AlertDispatcherAgent(
        IApplicationDbContext context,
        IEmailService emailService,
        IWhatsAppService whatsAppService,
        ITelegramBotService telegramService,
        IDiscordWebhookService discordService,
        INtfyService ntfyService,
        ILogger<AlertDispatcherAgent> logger)
    {
        _context = context;
        _emailService = emailService;
        _whatsAppService = whatsAppService;
        _telegramService = telegramService;
        _discordService = discordService;
        _ntfyService = ntfyService;
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
        string telegramStatus = "Disabled";
        string discordStatus = "Disabled";
        string ntfyStatus = "Disabled";
        string? waClickUrl = null;

        // 1. WhatsApp Delivery
        if (setting.EnableWhatsAppDispatch && !string.IsNullOrWhiteSpace(setting.WhatsAppPhoneNumber))
        {
            var waRes = await _whatsAppService.SendWhatsAppMessageAsync(
                setting.WhatsAppPhoneNumber,
                report.FormattedWhatsAppMessage,
                setting.WhatsAppProvider,
                setting.WhatsAppApiKey,
                setting.WhatsAppInstanceId,
                setting.WhatsAppWebhookUrl,
                ct);

            waStatus = waRes.Status;
            waClickUrl = waRes.ClickUrl;
        }

        // 2. Telegram Delivery
        if (setting.EnableTelegramDispatch && !string.IsNullOrWhiteSpace(setting.TelegramBotToken) && !string.IsNullOrWhiteSpace(setting.TelegramChatId))
        {
            var teleRes = await _telegramService.SendMessageAsync(
                setting.TelegramBotToken,
                setting.TelegramChatId,
                report.FormattedWhatsAppMessage,
                ct);
            telegramStatus = teleRes.Status;
        }

        // 3. Discord Delivery
        if (setting.EnableDiscordDispatch && !string.IsNullOrWhiteSpace(setting.DiscordWebhookUrl))
        {
            var discRes = await _discordService.SendEmbedAlertAsync(
                setting.DiscordWebhookUrl,
                $"🌅 Pre-Market Report ({report.ReportDate})",
                report.ActionableBriefHindi,
                0x0284C7, // Blue
                null,
                ct);
            discordStatus = discRes.Status;
        }

        // 4. ntfy.sh Mobile Push
        if (setting.EnableNtfyDispatch && !string.IsNullOrWhiteSpace(setting.NtfyTopic))
        {
            var ntfyRes = await _ntfyService.SendPushNotificationAsync(
                setting.NtfyTopic,
                $"🌅 Pre-Market Report ({report.ReportDate})",
                report.ActionableBriefHindi,
                "high",
                new List<string> { "chart_with_upwards_trend", "sunrise" },
                setting.NtfyServerUrl,
                ct);
            ntfyStatus = ntfyRes.Status;
        }

        // 5. Email Delivery
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

        // 6. Persist Alert Log
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
            TelegramStatus = telegramStatus,
            DiscordStatus = discordStatus,
            NtfyStatus = ntfyStatus,
            WhatsAppClickUrl = waClickUrl,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.MarketAgentAlertLogs.Add(log);
        setting.LastPreMarketReportDate = report.ReportDate;
        setting.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("✅ [DISPATCHER] Pre-market report logged. WA: {WA}, TG: {TG}, Discord: {Disc}, Ntfy: {Ntfy}, Email: {Email}",
            waStatus, telegramStatus, discordStatus, ntfyStatus, emailStatus);

        return true;
    }

    public async Task<bool> DispatchMarketOpenReportAsync(
        MarketOpenDailyReportDto report,
        MarketAgentUserSetting setting,
        CancellationToken ct = default)
    {
        if (setting == null) return false;
        if (!setting.EnableMarketOpenAlerts) return false;

        _logger.LogInformation("🔔 [MY ASSISTANT] Dispatching Market Open Report for user {UserId}...", setting.UserId);

        string waStatus = "Disabled";
        string emailStatus = "Disabled";
        string telegramStatus = "Disabled";
        string discordStatus = "Disabled";
        string ntfyStatus = "Disabled";
        string? waClickUrl = null;

        if (setting.EnableWhatsAppDispatch && !string.IsNullOrWhiteSpace(setting.WhatsAppPhoneNumber))
        {
            var waRes = await _whatsAppService.SendWhatsAppMessageAsync(
                setting.WhatsAppPhoneNumber,
                report.FormattedWhatsAppMessage,
                setting.WhatsAppProvider,
                setting.WhatsAppApiKey,
                setting.WhatsAppInstanceId,
                setting.WhatsAppWebhookUrl,
                ct);

            waStatus = waRes.Status;
            waClickUrl = waRes.ClickUrl;
        }

        if (setting.EnableTelegramDispatch && !string.IsNullOrWhiteSpace(setting.TelegramBotToken) && !string.IsNullOrWhiteSpace(setting.TelegramChatId))
        {
            var teleRes = await _telegramService.SendMessageAsync(
                setting.TelegramBotToken,
                setting.TelegramChatId,
                report.FormattedWhatsAppMessage,
                ct);
            telegramStatus = teleRes.Status;
        }

        if (setting.EnableDiscordDispatch && !string.IsNullOrWhiteSpace(setting.DiscordWebhookUrl))
        {
            var discRes = await _discordService.SendEmbedAlertAsync(
                setting.DiscordWebhookUrl,
                $"🔔 Market Open Report (09:15 AM - {report.ReportDate})",
                report.ActionableBriefHindi,
                0x0284C7,
                report.Stocks.Take(6).Select(s => new DiscordEmbedField(
                    $"{s.CompanyName} ({s.Ticker})",
                    $"Open: ₹{s.OpenPrice:N2} ({s.GapPercentage:N1}%) • Prev: ₹{s.PreviousClose:N2}")).ToList(),
                ct);
            discordStatus = discRes.Status;
        }

        if (setting.EnableNtfyDispatch && !string.IsNullOrWhiteSpace(setting.NtfyTopic))
        {
            var ntfyRes = await _ntfyService.SendPushNotificationAsync(
                setting.NtfyTopic,
                $"🔔 Market Open Bell ({report.ReportDate})",
                report.ActionableBriefHindi,
                "high",
                new List<string> { "bell", "chart_with_upwards_trend" },
                setting.NtfyServerUrl,
                ct);
            ntfyStatus = ntfyRes.Status;
        }

        if (setting.EnableEmailDispatch && !string.IsNullOrWhiteSpace(setting.EmailAddress))
        {
            var subject = $"🔔 [09:15 AM Market Open] Hisaab Assistant — Your Portfolio Opening Prices ({report.ReportDate})";
            var emailSuccess = await _emailService.SendEmailAsync(
                setting.EmailAddress,
                subject,
                report.FormattedHtmlEmail,
                ct);

            emailStatus = emailSuccess ? "Sent" : "Failed";
        }

        var log = new MarketAgentAlertLog
        {
            UserId = setting.UserId,
            Ticker = "PORTFOLIO/OPEN",
            CompanyName = "Indian Stock Market Open",
            AlertType = "MARKET_OPEN_REPORT",
            Title = $"🔔 Market Open Report ({report.ReportDate})",
            Message = report.ActionableBriefHindi,
            TriggerPrice = 0,
            TargetPrice = null,
            ProfitOrLossAmount = null,
            WhatsAppStatus = waStatus,
            EmailStatus = emailStatus,
            TelegramStatus = telegramStatus,
            DiscordStatus = discordStatus,
            NtfyStatus = ntfyStatus,
            WhatsAppClickUrl = waClickUrl,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.MarketAgentAlertLogs.Add(log);
        setting.LastMarketOpenReportDate = report.ReportDate;
        setting.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> DispatchMarketCloseReportAsync(
        MarketCloseDailyReportDto report,
        MarketAgentUserSetting setting,
        CancellationToken ct = default)
    {
        if (setting == null) return false;
        if (!setting.EnableMarketCloseAlerts) return false;

        _logger.LogInformation("🌆 [MY ASSISTANT] Dispatching Market Close Report for user {UserId}...", setting.UserId);

        string waStatus = "Disabled";
        string emailStatus = "Disabled";
        string telegramStatus = "Disabled";
        string discordStatus = "Disabled";
        string ntfyStatus = "Disabled";
        string? waClickUrl = null;

        if (setting.EnableWhatsAppDispatch && !string.IsNullOrWhiteSpace(setting.WhatsAppPhoneNumber))
        {
            var waRes = await _whatsAppService.SendWhatsAppMessageAsync(
                setting.WhatsAppPhoneNumber,
                report.FormattedWhatsAppMessage,
                setting.WhatsAppProvider,
                setting.WhatsAppApiKey,
                setting.WhatsAppInstanceId,
                setting.WhatsAppWebhookUrl,
                ct);

            waStatus = waRes.Status;
            waClickUrl = waRes.ClickUrl;
        }

        if (setting.EnableTelegramDispatch && !string.IsNullOrWhiteSpace(setting.TelegramBotToken) && !string.IsNullOrWhiteSpace(setting.TelegramChatId))
        {
            var teleRes = await _telegramService.SendMessageAsync(
                setting.TelegramBotToken,
                setting.TelegramChatId,
                report.FormattedWhatsAppMessage,
                ct);
            telegramStatus = teleRes.Status;
        }

        if (setting.EnableDiscordDispatch && !string.IsNullOrWhiteSpace(setting.DiscordWebhookUrl))
        {
            var discRes = await _discordService.SendEmbedAlertAsync(
                setting.DiscordWebhookUrl,
                $"🌆 Market Close Summary ({report.ReportDate})",
                report.ActionableBriefHindi,
                report.DayTotalGainLoss >= 0 ? 0x16A34A : 0xDC2626,
                report.Stocks.Take(6).Select(s => new DiscordEmbedField(
                    $"{s.CompanyName} ({s.Ticker})",
                    $"Close: ₹{s.ClosePrice:N2} • Day P&L: ₹{s.DayGainLoss:N2} ({s.DayChangePercent:N1}%)")).ToList(),
                ct);
            discordStatus = discRes.Status;
        }

        if (setting.EnableNtfyDispatch && !string.IsNullOrWhiteSpace(setting.NtfyTopic))
        {
            var ntfyRes = await _ntfyService.SendPushNotificationAsync(
                setting.NtfyTopic,
                $"🌆 Market Close Bell ({report.ReportDate}) - Day P&L: ₹{report.DayTotalGainLoss:N2}",
                report.ActionableBriefHindi,
                "high",
                new List<string> { "city_sunset", report.DayTotalGainLoss >= 0 ? "moneybag" : "chart_with_downwards_trend" },
                setting.NtfyServerUrl,
                ct);
            ntfyStatus = ntfyRes.Status;
        }

        if (setting.EnableEmailDispatch && !string.IsNullOrWhiteSpace(setting.EmailAddress))
        {
            var subject = $"🌆 [03:30 PM Market Close] Hisaab Assistant — Today's Closing P&L ({report.ReportDate})";
            var emailSuccess = await _emailService.SendEmailAsync(
                setting.EmailAddress,
                subject,
                report.FormattedHtmlEmail,
                ct);

            emailStatus = emailSuccess ? "Sent" : "Failed";
        }

        var log = new MarketAgentAlertLog
        {
            UserId = setting.UserId,
            Ticker = "PORTFOLIO/CLOSE",
            CompanyName = "Indian Stock Market Close",
            AlertType = "MARKET_CLOSE_REPORT",
            Title = $"🌆 Market Close Summary ({report.ReportDate})",
            Message = report.ActionableBriefHindi,
            TriggerPrice = 0,
            TargetPrice = null,
            ProfitOrLossAmount = report.DayTotalGainLoss,
            WhatsAppStatus = waStatus,
            EmailStatus = emailStatus,
            TelegramStatus = telegramStatus,
            DiscordStatus = discordStatus,
            NtfyStatus = ntfyStatus,
            WhatsAppClickUrl = waClickUrl,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.MarketAgentAlertLogs.Add(log);
        setting.LastMarketCloseReportDate = report.ReportDate;
        setting.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
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
            _logger.LogInformation("📨 [DISPATCHER] Target Hit alert disabled in user settings for {Ticker}.", alert.Ticker);
            return false;
        }

        if (alert.AlertType.Contains("STOP_LOSS") && !setting.EnableStopLossAlerts)
        {
            _logger.LogInformation("📨 [DISPATCHER] Stop-loss alert disabled in user settings for {Ticker}.", alert.Ticker);
            return false;
        }

        bool isTarget = alert.AlertType.Contains("TARGET");
        string waStatus = "Disabled";
        string emailStatus = "Disabled";
        string telegramStatus = "Disabled";
        string discordStatus = "Disabled";
        string ntfyStatus = "Disabled";
        string? waClickUrl = null;

        // 1. WhatsApp Delivery
        if (setting.EnableWhatsAppDispatch && !string.IsNullOrWhiteSpace(setting.WhatsAppPhoneNumber))
        {
            var waRes = await _whatsAppService.SendWhatsAppMessageAsync(
                setting.WhatsAppPhoneNumber,
                alert.FormattedWhatsAppMessage,
                setting.WhatsAppProvider,
                setting.WhatsAppApiKey,
                setting.WhatsAppInstanceId,
                setting.WhatsAppWebhookUrl,
                ct);

            waStatus = waRes.Status;
            waClickUrl = waRes.ClickUrl;
        }

        // 2. Telegram Delivery (Direct Instant Mobile Alert)
        if (setting.EnableTelegramDispatch && !string.IsNullOrWhiteSpace(setting.TelegramBotToken) && !string.IsNullOrWhiteSpace(setting.TelegramChatId))
        {
            var teleRes = await _telegramService.SendMessageAsync(
                setting.TelegramBotToken,
                setting.TelegramChatId,
                alert.FormattedWhatsAppMessage,
                ct);
            telegramStatus = teleRes.Status;
        }

        // 3. Discord Webhook Delivery
        if (setting.EnableDiscordDispatch && !string.IsNullOrWhiteSpace(setting.DiscordWebhookUrl))
        {
            int color = isTarget ? 0x16A34A : 0xDC2626;
            var fields = new List<DiscordEmbedField>
            {
                new("Company", $"{alert.CompanyName} ({alert.Ticker.Replace(".NS", "")})", true),
                new("Live CMP", $"₹{alert.CurrentPrice:N2}", true),
                new("Buy Price", $"₹{alert.BuyPrice:N2}", true),
                new("Quantity", $"{alert.Quantity:N0} shares", true),
                new("Total Net P&L", $"{(alert.TotalProfit >= 0 ? "+" : "")}₹{alert.TotalProfit:N2} ({alert.ProfitPercentage:N1}%)", true),
                new("Trigger Verdict", alert.VerdictLabel, false),
                new("💡 AI Action Guide", alert.RecommendedActionHindi, false)
            };

            var discRes = await _discordService.SendEmbedAlertAsync(
                setting.DiscordWebhookUrl,
                $"{(isTarget ? "🎯" : "⚠️")} {alert.VerdictLabel} - {alert.CompanyName}",
                alert.RecommendedActionHindi,
                color,
                fields,
                ct);
            discordStatus = discRes.Status;
        }

        // 4. ntfy.sh Mobile Push Notification
        if (setting.EnableNtfyDispatch && !string.IsNullOrWhiteSpace(setting.NtfyTopic))
        {
            var ntfyRes = await _ntfyService.SendPushNotificationAsync(
                setting.NtfyTopic,
                $"{(isTarget ? "🎯" : "⚠️")} {alert.VerdictLabel}",
                $"{alert.CompanyName} | CMP: ₹{alert.CurrentPrice:N2} | Net P&L: ₹{alert.TotalProfit:N2}\n\n{alert.RecommendedActionHindi}",
                isTarget ? "high" : "urgent",
                new List<string> { isTarget ? "dart" : "warning", isTarget ? "moneybag" : "rotating_light" },
                setting.NtfyServerUrl,
                ct);
            ntfyStatus = ntfyRes.Status;
        }

        // 5. Email Delivery
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

        // 6. Persist Alert Log
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
            TelegramStatus = telegramStatus,
            DiscordStatus = discordStatus,
            NtfyStatus = ntfyStatus,
            WhatsAppClickUrl = waClickUrl,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.MarketAgentAlertLogs.Add(log);
        setting.LastSentinelScanUtc = DateTime.UtcNow;
        setting.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("✅ [DISPATCHER] Alert dispatched for {Ticker}. WA: {WA}, TG: {TG}, Discord: {Disc}, Ntfy: {Ntfy}, Email: {Email}",
            alert.Ticker, waStatus, telegramStatus, discordStatus, ntfyStatus, emailStatus);

        return true;
    }

    public async Task<MarketAgentAlertLogDto> SendTestNotificationAsync(
        Guid userId,
        string? customPhone = null,
        string? customEmail = null,
        string? customTelegramToken = null,
        string? customTelegramChatId = null,
        string? customDiscordUrl = null,
        string? customNtfyTopic = null,
        CancellationToken ct = default)
    {
        _logger.LogInformation("🧪 [DISPATCHER: TEST] Sending test notification across channels for user {UserId}...", userId);

        var setting = await _context.MarketAgentUserSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.UserId == userId || s.UserId == Guid.Empty, ct);

        var phone = !string.IsNullOrWhiteSpace(customPhone) ? customPhone : (setting?.WhatsAppPhoneNumber ?? "919999999999");
        var email = !string.IsNullOrWhiteSpace(customEmail) ? customEmail : (setting?.EmailAddress ?? "investor@example.com");
        var tgToken = !string.IsNullOrWhiteSpace(customTelegramToken) ? customTelegramToken : setting?.TelegramBotToken;
        var tgChatId = !string.IsNullOrWhiteSpace(customTelegramChatId) ? customTelegramChatId : setting?.TelegramChatId;
        var discordUrl = !string.IsNullOrWhiteSpace(customDiscordUrl) ? customDiscordUrl : setting?.DiscordWebhookUrl;
        var ntfyTopic = !string.IsNullOrWhiteSpace(customNtfyTopic) ? customNtfyTopic : setting?.NtfyTopic;

        var testMessage =
            "🔔 *HISAAB MY ASSISTANT - MULTI-CHANNEL VERIFICATION*\n" +
            "━━━━━━━━━━━━━━━━━━━━\n" +
            "✅ *Status:* Aapka automated alert system successfully test ho chuka hai!\n\n" +
            "🎯 *Example Target Hit Trigger:*\n" +
            "• Stock: *Dixon Technologies (DIXON)*\n" +
            "• CMP: ₹13,142.00 (+₹322/share Target ACHIEVED!)\n" +
            "• P&L: *+₹3,220.00 Total Profit on 10 shares*\n" +
            "• Smart Guide: 50% shares sell karke profit lock karein, trailing stop-loss lagayein!\n\n" +
            "🤖 _Dispatched automatically by Hisaab Sentinel Agent_";

        var testEmailHtml = @"
<div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;"">
  <div style=""background: linear-gradient(135deg, #0b57d0, #6366f1); padding: 22px 26px; color: #ffffff;"">
    <h1 style=""margin: 0; font-size: 20px; font-weight: 800;"">🔔 Hisaab Multi-Channel Alert Test</h1>
    <p style=""margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;"">Telegram, Discord, ntfy.sh & WhatsApp Dispatcher Agent Verification</p>
  </div>
  <div style=""padding: 24px;"">
    <div style=""background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin-bottom: 16px;"">
      <strong style=""color: #166534; font-size: 14px;"">✅ System Live & Connected!</strong>
      <p style=""margin: 6px 0 0 0; font-size: 13px; color: #15803d; line-height: 1.5;"">
        Aapka multi-channel notification engine successfully connect ho chuka hai. Target profit hits, stop-loss triggers aur daily morning & evening briefs bina delay ke aapke phone par aayenge.
      </p>
    </div>
  </div>
</div>";

        // Dispatch to WhatsApp
        var waRes = await _whatsAppService.SendWhatsAppMessageAsync(
            phone,
            testMessage,
            setting?.WhatsAppProvider,
            setting?.WhatsAppApiKey,
            setting?.WhatsAppInstanceId,
            setting?.WhatsAppWebhookUrl,
            ct);

        // Dispatch to Telegram
        string tgStatus = "Disabled";
        if (!string.IsNullOrWhiteSpace(tgToken) && !string.IsNullOrWhiteSpace(tgChatId))
        {
            var tgRes = await _telegramService.SendMessageAsync(tgToken, tgChatId, testMessage, ct);
            tgStatus = tgRes.Status;
        }

        // Dispatch to Discord
        string discStatus = "Disabled";
        if (!string.IsNullOrWhiteSpace(discordUrl))
        {
            var discRes = await _discordService.SendEmbedAlertAsync(
                discordUrl,
                "🔔 Hisaab Sentinel - Test Notification Verification",
                "Aapka Discord Webhook successfully test ho gaya hai! Market alerts yahan live aayenge.",
                0x16A34A,
                new List<DiscordEmbedField>
                {
                    new("Stock", "Dixon Technologies (DIXON)", true),
                    new("Test CMP", "₹13,142.00", true),
                    new("Test P&L", "+₹3,220.00 (+2.5%)", true),
                    new("Status", "✅ Connected & Active", false)
                },
                ct);
            discStatus = discRes.Status;
        }

        // Dispatch to ntfy.sh
        string ntfyStat = "Disabled";
        if (!string.IsNullOrWhiteSpace(ntfyTopic))
        {
            var ntfyRes = await _ntfyService.SendPushNotificationAsync(
                ntfyTopic,
                "🔔 Hisaab Alert System Test",
                "Aapka ntfy.sh push notification connection successful hai! Live market alerts instant aapke phone par aayenge.",
                "high",
                new List<string> { "white_check_mark", "chart_with_upwards_trend" },
                setting?.NtfyServerUrl,
                ct);
            ntfyStat = ntfyRes.Status;
        }

        // Dispatch to Email
        var emailSent = await _emailService.SendEmailAsync(email, "🔔 Hisaab AI Alert System - Test Notification", testEmailHtml, ct);

        var log = new MarketAgentAlertLog
        {
            UserId = userId,
            Ticker = "TEST-ALERT",
            CompanyName = "Multi-Channel Notification Check",
            AlertType = "MANUAL_TEST",
            Title = "🧪 Multi-Channel Alert Verification (Telegram, Discord, ntfy, WA)",
            Message = "Test notification generated and dispatched across your configured channels.",
            TriggerPrice = 13142.00m,
            TargetPrice = 12990.00m,
            ProfitOrLossAmount = 3220.00m,
            WhatsAppStatus = waRes.Status,
            EmailStatus = emailSent ? "Sent" : "Failed",
            TelegramStatus = tgStatus,
            DiscordStatus = discStatus,
            NtfyStatus = ntfyStat,
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
            CreatedAtIst: ist.ToString("dd MMM yyyy, hh:mm tt"),
            TelegramStatus: log.TelegramStatus,
            DiscordStatus: log.DiscordStatus,
            NtfyStatus: log.NtfyStatus
        );
    }
}
