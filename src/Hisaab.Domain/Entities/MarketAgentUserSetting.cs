using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public class MarketAgentUserSetting : UserOwnedEntity
{
    public string? WhatsAppPhoneNumber { get; set; }
    public string? EmailAddress { get; set; }
    public bool EnablePreMarketScan { get; set; } = true;
    public bool EnableTargetHitAlerts { get; set; } = true;
    public bool EnableStopLossAlerts { get; set; } = true;
    public bool EnableEmailDispatch { get; set; } = true;
    public bool EnableWhatsAppDispatch { get; set; } = true;
    public string PreMarketScanTime { get; set; } = "08:45";
    public string? LastPreMarketReportDate { get; set; }
    public DateTime? LastSentinelScanUtc { get; set; }
}

