using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public class ImportError : BaseEntity
{
    public Guid BatchId { get; set; }
    public ImportBatch? Batch { get; set; }
    public int RowNumber { get; set; }
    public string? Column { get; set; }
    public string? Value { get; set; }
    public string Message { get; set; } = string.Empty;
}

