using Hisaab.Domain.Common;
using Hisaab.Domain.Enums;

namespace Hisaab.Domain.Entities;

public class Category : UserOwnedEntity
{
    public TransactionType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = "tag";
    public string Color { get; set; } = "#4f46e5";
    public bool IsSystem { get; set; } = false;

    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}

