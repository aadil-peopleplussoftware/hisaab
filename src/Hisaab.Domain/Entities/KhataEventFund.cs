using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public class KhataEventFund : UserOwnedEntity
{
    public Guid EventId { get; set; }
    public KhataEvent? Event { get; set; }

    public string ContributorName { get; set; } = string.Empty; // e.g. "Abba ne dale", "Aadil Khan"
    public decimal Amount { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }
}
