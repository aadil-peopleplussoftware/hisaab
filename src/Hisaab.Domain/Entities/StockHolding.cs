using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public class StockHolding : UserOwnedEntity
{
    public string Ticker { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string Exchange { get; set; } = "NSE";
    public decimal BuyPrice { get; set; }
    public decimal Quantity { get; set; }
    public DateTime PurchaseDate { get; set; }
    public decimal? TargetProfitPerShare { get; set; }
    public decimal? TargetPrice { get; set; }
    public decimal? StopLossPrice { get; set; }
    public string? Notes { get; set; }
    public bool IsArchived { get; set; } = false;
}

