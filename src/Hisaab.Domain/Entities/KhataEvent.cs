using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public class KhataEvent : UserOwnedEntity
{
    public string Title { get; set; } = string.Empty; // e.g., "Pune Shopping & Kharcha"
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }
    public string Status { get; set; } = "Active"; // "Active", "Completed"

    public ICollection<KhataEventFund> Funds { get; set; } = new List<KhataEventFund>();
    public ICollection<KhataEventItem> Items { get; set; } = new List<KhataEventItem>();
}
