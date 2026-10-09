using Hisaab.Domain.Common;
using Hisaab.Domain.Enums;

namespace Hisaab.Domain.Entities;

public class LoanAccount : UserOwnedEntity
{
    public string Name { get; set; } = string.Empty;
    public string Counterparty { get; set; } = string.Empty;
    public LoanDirection Direction { get; set; }
    public decimal Principal { get; set; }
    public decimal InterestRate { get; set; } // Annual percentage rate, e.g. 10.50
    public LoanInterestType InterestType { get; set; } = LoanInterestType.None;
    public DateTime StartDate { get; set; } // Stored in UTC
    public DateTime? DueDate { get; set; } // Stored in UTC
    public LoanStatus Status { get; set; } = LoanStatus.Active;
    public string? Note { get; set; }

    public ICollection<LoanTransaction> Transactions { get; set; } = new List<LoanTransaction>();
}

