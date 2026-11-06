using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public class ExportArchive : BaseEntity, IUserOwned
{
    public Guid UserId { get; set; }
    public string Module { get; set; } = string.Empty; // Transactions, LoanAccounts, Epfo, Holdings, FullBackup, etc.
    public string FileName { get; set; } = string.Empty;
    public string StorageKey { get; set; } = string.Empty;
    public string Format { get; set; } = "xlsx"; // xlsx, csv
    public long FileSizeBytes { get; set; }
    public int RecordCount { get; set; }
}

