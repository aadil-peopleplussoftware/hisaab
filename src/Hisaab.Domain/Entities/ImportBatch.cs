using Hisaab.Domain.Common;
using Hisaab.Domain.Enums;

namespace Hisaab.Domain.Entities;

public class ImportBatch : BaseEntity, IUserOwned
{
    public Guid UserId { get; set; }
    public string Module { get; set; } = string.Empty; // Transactions, LoanAccounts, LoanTransactions, Epfo, Holdings, InvestmentTransactions, Categories
    public string FileName { get; set; } = string.Empty;
    public string StorageKey { get; set; } = string.Empty;
    public ImportBatchStatus Status { get; set; } = ImportBatchStatus.Pending;
    public int TotalRows { get; set; }
    public int SuccessRows { get; set; }
    public int FailedRows { get; set; }
    public int SkippedRows { get; set; }
    public ImportMode Mode { get; set; } = ImportMode.AddNewOnly;
    public bool AllOrNothing { get; set; } = false;
    public DateTime? CompletedAtUtc { get; set; }
    public DateTime? RolledBackAtUtc { get; set; }

    public ICollection<ImportError> Errors { get; set; } = new List<ImportError>();
}
