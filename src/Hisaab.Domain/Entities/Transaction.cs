using Hisaab.Domain.Common;
using Hisaab.Domain.Enums;

namespace Hisaab.Domain.Entities;

public class Transaction : UserOwnedEntity
{
    public TransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public Guid CategoryId { get; set; }
    public Category? Category { get; set; }
    public DateTime TransactionDate { get; set; } // Stored in UTC
    public string? Note { get; set; }
    public Guid? AttachmentId { get; set; }
    public Attachment? Attachment { get; set; }
    public string? AttachmentUrl { get; set; }
    public string? AttachmentFileName { get; set; }
    public string? AttachmentFileType { get; set; }
    public long? AttachmentFileSize { get; set; }
}

