using Hisaab.Domain.Common;
using Hisaab.Domain.Enums;

namespace Hisaab.Domain.Entities;

public class LoanTransaction : UserOwnedEntity
{
    public Guid LoanAccountId { get; set; }
    public LoanAccount? LoanAccount { get; set; }
    public LoanTransactionKind Kind { get; set; }
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; } // Stored in UTC
    public string? Note { get; set; }
    public Guid? AttachmentId { get; set; }
}

