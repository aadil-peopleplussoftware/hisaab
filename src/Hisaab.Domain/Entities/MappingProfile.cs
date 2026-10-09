using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public class MappingProfile : BaseEntity, IUserOwned
{
    public Guid UserId { get; set; }
    public string Module { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ColumnMapJson { get; set; } = "{}"; // JSON dictionary: { "userColumn": "systemField" }
    public string? ValueMapJson { get; set; } = "{}";  // JSON dictionary: { "systemField": { "userValue": "targetValue" } }
    public string? DateFormat { get; set; } = "dd-MM-yyyy";
}

