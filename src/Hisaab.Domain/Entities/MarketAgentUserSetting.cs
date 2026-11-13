using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public class MarketAgentUserSetting : UserOwnedEntity
{
    public string? WhatsAppPhoneNumber { get; set; }
    public string? WhatsAppProvider { get; set; } = "CallMeBot";
    public string? WhatsAppApiKey { get; set; }
    public string? WhatsAppInstanceId { get; set; }
    public string? WhatsAppWebhookUrl { get; set; }
    public string? EmailAddress { get; set; }
    public bool EnablePreMarketScan { get; set; } = true;
    public bool EnableMarketOpenAlerts { get; set; } = true;
    public bool EnableMarketCloseAlerts { get; set; } = true;
    public bool EnableTargetHitAlerts { get; set; } = true;
    public bool EnableStopLossAlerts { get; set; } = true;
    public bool EnableEmailDispatch { get; set; } = true;
    public bool EnableWhatsAppDispatch { get; set; } = true;

    // Multi-Channel Instant Notification Settings (Telegram, Discord, ntfy.sh)
    public bool EnableTelegramDispatch { get; set; } = false;
    public string? TelegramBotToken { get; set; }
    public string? TelegramChatId { get; set; }

    public bool EnableDiscordDispatch { get; set; } = false;
    public string? DiscordWebhookUrl { get; set; }

    public bool EnableNtfyDispatch { get; set; } = false;
    public string? NtfyTopic { get; set; }
    public string? NtfyServerUrl { get; set; } = "https://ntfy.sh";

    public string PreMarketScanTime { get; set; } = "08:45";
    public string MarketOpenScanTime { get; set; } = "09:15";
    public string MarketCloseScanTime { get; set; } = "15:30";
    public string? LastPreMarketReportDate { get; set; }
    public string? LastMarketOpenReportDate { get; set; }
    public string? LastMarketCloseReportDate { get; set; }
    public DateTime? LastSentinelScanUtc { get; set; }
}

