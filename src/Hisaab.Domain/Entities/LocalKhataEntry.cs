using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public class LocalKhataEntry : UserOwnedEntity
{
    public Guid PartyId { get; set; }
    public LocalKhataParty? Party { get; set; }

    /// <summary>
    /// "IN" = Mila / Received / Liya; "OUT" = Diya / Paid / Kharch Kiya
    /// </summary>
    public string EntryType { get; set; } = "OUT";

    public decimal Amount { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public string? Category { get; set; } // "Medical", "Shadi", "A/c Transfer", "Shopping", "Food", "Cash", "General"
    public string? Remark { get; set; }
    public string? PaymentMode { get; set; } // "Cash", "UPI", "Bank A/c", "Other"
}
