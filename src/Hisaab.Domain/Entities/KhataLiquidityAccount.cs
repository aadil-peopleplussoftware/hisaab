using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public class KhataLiquidityAccount : UserOwnedEntity
{
    public string AccountName { get; set; } = string.Empty; // e.g. "A/C 1", "A/C 2", "Share 1", "Cash in Hand"
    public string AccountType { get; set; } = "Bank"; // "Bank", "Share", "Cash", "Other"
    public decimal Balance { get; set; }
    public string? Notes { get; set; }
    public int SortOrder { get; set; }
}
