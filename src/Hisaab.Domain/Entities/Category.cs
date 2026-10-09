using Hisaab.Domain.Common;
using Hisaab.Domain.Enums;

namespace Hisaab.Domain.Entities;

public class Category : BaseEntity, IUserOwned, ISoftDeletable
{
    public Guid UserId { get; set; }
    public TransactionType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = "tag";
    public string Color { get; set; } = "#4f46e5";
    public bool IsSystem { get; set; } = false;

    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAtUtc { get; set; }
    public Guid? DeletedBy { get; set; }

    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
