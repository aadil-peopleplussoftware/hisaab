using Hisaab.Domain.Common;
using Hisaab.Domain.Enums;

namespace Hisaab.Domain.Entities;

public class Holding : UserOwnedEntity
{
    public string Name { get; set; } = string.Empty;
    public InvestmentType Type { get; set; }
    public decimal CurrentValue { get; set; }
    public DateTime ValueUpdatedAtUtc { get; set; }
    public string? Note { get; set; }

    public ICollection<InvestmentTransaction> Transactions { get; set; } = new List<InvestmentTransaction>();
}

