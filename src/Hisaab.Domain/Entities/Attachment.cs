using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public class Attachment : UserOwnedEntity
{
    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string? FileUrl { get; set; }
}

