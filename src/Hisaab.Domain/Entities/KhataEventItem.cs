using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public class KhataEventItem : UserOwnedEntity
{
    public Guid EventId { get; set; }
    public KhataEvent? Event { get; set; }

    /// <summary>
    /// "Shopping", "LocalKharch" (daily travel/food), "CashHandover" (e.g. Bushra ko diya)
    /// </summary>
    public string ItemType { get; set; } = "Shopping";

    public string Description { get; set; } = string.Empty; // e.g. "Burka", "Train ticket", "Hotel khana"
    public decimal Amount { get; set; }
    public string? Beneficiary { get; set; } // e.g. "Aadil", "Zaid, Huzaif", "Abba", "Bushra"
    public DateTime Date { get; set; } = DateTime.UtcNow;
}
