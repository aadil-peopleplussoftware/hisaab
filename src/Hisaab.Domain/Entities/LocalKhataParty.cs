using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public class LocalKhataParty : UserOwnedEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Type { get; set; } = "Payable"; // "Payable" (Dena Hai) or "Receivable" (Lena Hai)
    public string? Category { get; set; } // "Family", "Friend", "Work", "Local"
    public string? Notes { get; set; }
    public bool IsSettled { get; set; } = false;
    public bool IsArchived { get; set; } = false;

    public ICollection<LocalKhataEntry> Entries { get; set; } = new List<LocalKhataEntry>();
}
