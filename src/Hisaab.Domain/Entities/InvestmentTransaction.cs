using Hisaab.Domain.Common;
using Hisaab.Domain.Enums;

namespace Hisaab.Domain.Entities;

public class InvestmentTransaction : UserOwnedEntity
{
    public Guid HoldingId { get; set; }
    public Holding? Holding { get; set; }
    public InvestmentTransactionKind Kind { get; set; }
    public decimal Amount { get; set; }
    public decimal? Units { get; set; }
    public DateTime TransactionDate { get; set; } // Stored in UTC
    public string? Note { get; set; }
}

