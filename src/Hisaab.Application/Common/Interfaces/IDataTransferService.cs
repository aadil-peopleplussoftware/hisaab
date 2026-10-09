using Hisaab.Application.Features.DataTransfer.DTOs;

namespace Hisaab.Application.Common.Interfaces;

public interface IDataTransferService
{
    ModuleTemplateMetadata GetModuleMetadata(string module);
    List<string> GetSupportedModules();
    byte[] GenerateBlankTemplate(string module);

    Task<UploadResultDto> UploadAndInspectFileAsync(
        Stream fileStream,
        string fileName,
        string module,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task SaveMappingAsync(
        Guid batchId,
        Guid userId,
        MappingRequestDto request,
        CancellationToken cancellationToken = default);

    Task<PreviewValidationResultDto> ValidateBatchAsync(
        Guid batchId,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<ImportResultDto> CommitBatchAsync(
        Guid batchId,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<bool> RollbackBatchAsync(
        Guid batchId,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<byte[]> GenerateErrorReportExcelAsync(
        Guid batchId,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<(byte[] Content, string ContentType, string FileName)> ExportModuleAsync(
        string module,
        Guid userId,
        string format,
        DateTime? from,
        DateTime? to,
        CancellationToken cancellationToken = default);

    Task<(byte[] Content, string ContentType, string FileName)> ExportAllModulesAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
}
