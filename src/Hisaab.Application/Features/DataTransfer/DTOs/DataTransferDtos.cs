using Hisaab.Domain.Enums;

namespace Hisaab.Application.Features.DataTransfer.DTOs;

public record ModuleFieldDefinition(
    string Name,
    string DisplayName,
    string DataType,
    bool IsRequired,
    string Description,
    string ExampleValue,
    List<string> Synonyms,
    List<string>? AllowedValues = null
);

public record ModuleTemplateMetadata(
    string Module,
    string Title,
    string Description,
    List<ModuleFieldDefinition> Fields
);

public record UploadResultDto(
    Guid BatchId,
    string Module,
    string FileName,
    List<string> Sheets,
    string SelectedSheet,
    List<string> Headers,
    List<Dictionary<string, string>> SampleRows,
    int TotalRows,
    Dictionary<string, string> SuggestedColumnMap
);

public record MappingRequestDto(
    Dictionary<string, string> ColumnMap,
    Dictionary<string, Dictionary<string, string>>? ValueMap = null,
    string? DateFormat = null,
    string? SaveAsProfileName = null,
    ImportMode? Mode = null,
    bool? AllOrNothing = null
);

public record PreviewValidationRowDto(
    int RowNumber,
    Dictionary<string, string> RawData,
    Dictionary<string, object?> MappedData,
    bool IsValid,
    bool IsDuplicate,
    List<string> Errors,
    List<string> Warnings
);

public record PreviewValidationResultDto(
    Guid BatchId,
    int TotalRowsPreviewed,
    int ValidCount,
    int InvalidCount,
    int DuplicateCount,
    List<PreviewValidationRowDto> Rows
);

public record ImportResultDto(
    Guid BatchId,
    ImportBatchStatus Status,
    string StatusName,
    int TotalRows,
    int SuccessRows,
    int FailedRows,
    int SkippedRows,
    string? ErrorMessage = null
);

public record ImportBatchDetailDto(
    Guid Id,
    string Module,
    string FileName,
    ImportBatchStatus Status,
    string StatusName,
    int TotalRows,
    int SuccessRows,
    int FailedRows,
    int SkippedRows,
    ImportMode Mode,
    string ModeName,
    bool AllOrNothing,
    DateTime CreatedAtUtc,
    DateTime? CompletedAtUtc,
    DateTime? RolledBackAtUtc,
    bool CanRollback,
    List<ImportErrorDto> Errors
);

public record ImportErrorDto(
    int RowNumber,
    string? Column,
    string? Value,
    string Message
);

public record MappingProfileDto(
    Guid Id,
    string Module,
    string Name,
    Dictionary<string, string> ColumnMap,
    Dictionary<string, Dictionary<string, string>>? ValueMap,
    string? DateFormat,
    DateTime CreatedAtUtc
);

public record SaveMappingProfileRequest(
    string Module,
    string Name,
    Dictionary<string, string> ColumnMap,
    Dictionary<string, Dictionary<string, string>>? ValueMap = null,
    string? DateFormat = null
);
