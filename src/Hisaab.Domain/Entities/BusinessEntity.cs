using Hisaab.Domain.Common;
using Hisaab.Domain.Enums;

namespace Hisaab.Domain.Entities;

public class BusinessEntity : UserOwnedEntity
{
    public string Name { get; set; } = string.Empty;
    public string? LegalName { get; set; }
    public BusinessType Type { get; set; } = BusinessType.Services;
    public string Currency { get; set; } = "INR";
    public string? TaxId { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Color { get; set; } = "#2563eb";

    public ICollection<BusinessTransaction> Transactions { get; set; } = new List<BusinessTransaction>();
}
