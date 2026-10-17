using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public class MarketAgentAlertLog : UserOwnedEntity
{
    public string Ticker { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string AlertType { get; set; } = string.Empty; // PRE_MARKET_REPORT, TARGET_PROFIT_HIT, STOP_LOSS_BREACHED, MANUAL_TEST
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public decimal TriggerPrice { get; set; }
    public decimal? TargetPrice { get; set; }
    public decimal? ProfitOrLossAmount { get; set; }
    public string WhatsAppStatus { get; set; } = "Pending"; // Sent, Simulated, Ready, Failed, Disabled
    public string EmailStatus { get; set; } = "Pending"; // Sent, Simulated, Failed, Disabled
    public string? WhatsAppClickUrl { get; set; }
}

