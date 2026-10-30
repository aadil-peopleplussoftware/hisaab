using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public enum TradeType
{
    Swing = 1,
    ShortTerm = 2,
    Positional = 3,
    Intraday = 4
}

public enum TradeStatus
{
    Open = 1,
    Closed = 2
}

public class TradeOrder : UserOwnedEntity
{
    public string Ticker { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string Exchange { get; set; } = "NSE";
    public TradeType TradeType { get; set; } = TradeType.Swing;
    public TradeStatus Status { get; set; } = TradeStatus.Open;

    // Buy Information
    public decimal BuyPrice { get; set; }
    public decimal Quantity { get; set; }
    public decimal InvestedAmount { get; set; }
    public DateTime BuyDate { get; set; }
    public int PlannedHoldingDays { get; set; } = 10;
    public decimal? TargetPrice { get; set; }
    public decimal? StopLossPrice { get; set; }
    public string? Notes { get; set; }

    // Sell / Close Information
    public DateTime? SellDate { get; set; }
    public decimal? SellPrice { get; set; }
    public decimal TotalCharges { get; set; } = 0;
    public decimal? RealizedProfitLoss { get; set; } // Gross P&L
    public decimal? RealizedProfitLossPercentage { get; set; }
    public decimal? NetProfitLoss { get; set; } // Net In-Hand P&L after charges
    public decimal? NetProfitLossPercentage { get; set; }
    public int? ActualHoldingDays { get; set; }
}

