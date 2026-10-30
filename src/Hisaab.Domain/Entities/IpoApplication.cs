using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public enum IpoIssueType
{
    Mainboard = 1,
    Sme = 2
}

public enum IpoApplicationStatus
{
    Applied = 1,
    Allotted = 2,
    NotAllotted = 3,
    Sold = 4
}

public class IpoApplication : UserOwnedEntity
{
    public string CompanyName { get; set; } = string.Empty;
    public string Symbol { get; set; } = string.Empty;
    public IpoIssueType IssueType { get; set; } = IpoIssueType.Mainboard;
    public IpoApplicationStatus Status { get; set; } = IpoApplicationStatus.Applied;

    // Bidding details
    public DateTime ApplicationDate { get; set; }
    public DateTime? AllotmentDate { get; set; }
    public DateTime? ListingDate { get; set; }
    public int LotSize { get; set; } = 1;
    public int LotsApplied { get; set; } = 1;
    public int TotalShares { get; set; }
    public decimal BidPrice { get; set; }
    public decimal TotalAmountBlocked { get; set; }
    public string? ApplicationNumber { get; set; }
    public string? UpiId { get; set; }

    // Allotment & Listing result
    public int SharesAllotted { get; set; } = 0;
    public decimal? ListingPrice { get; set; }
    public decimal? SellPrice { get; set; }
    public DateTime? SellDate { get; set; }
    public decimal? RealizedProfitLoss { get; set; }
    public decimal? RealizedProfitLossPercentage { get; set; }
    public string? Notes { get; set; }
}

