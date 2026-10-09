using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.DataTransfer.DTOs;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Hisaab.Application.Features.DataTransfer.Queries;

public record GetImportTemplateQuery(string Module) : IRequest<byte[]>;

public class GetImportTemplateQueryHandler : IRequestHandler<GetImportTemplateQuery, byte[]>
{
    private readonly IDataTransferService _dataTransferService;

    public GetImportTemplateQueryHandler(IDataTransferService dataTransferService)
    {
        _dataTransferService = dataTransferService;
    }

    public Task<byte[]> Handle(GetImportTemplateQuery request, CancellationToken cancellationToken)
    {
        var content = _dataTransferService.GenerateBlankTemplate(request.Module);
        return Task.FromResult(content);
    }
}

public record GetImportBatchQuery(Guid BatchId) : IRequest<ImportBatchDetailDto>;

public class GetImportBatchQueryHandler : IRequestHandler<GetImportBatchQuery, ImportBatchDetailDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetImportBatchQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<ImportBatchDetailDto> Handle(GetImportBatchQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var batch = await _context.ImportBatches
            .Include(b => b.Errors)
            .FirstOrDefaultAsync(b => b.Id == request.BatchId && b.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException($"Import batch '{request.BatchId}' not found.");

        var canRollback = batch.Status == Domain.Enums.ImportBatchStatus.Completed &&
                          batch.CreatedAtUtc >= DateTime.UtcNow.AddDays(-7);

        return new ImportBatchDetailDto(
            batch.Id,
            batch.Module,
            batch.FileName,
            batch.Status,
            batch.Status.ToString(),
            batch.TotalRows,
            batch.SuccessRows,
            batch.FailedRows,
            batch.SkippedRows,
            batch.Mode,
            batch.Mode.ToString(),
            batch.AllOrNothing,
            batch.CreatedAtUtc,
            batch.CompletedAtUtc,
            batch.RolledBackAtUtc,
            canRollback,
            batch.Errors.OrderBy(e => e.RowNumber).Select(e => new ImportErrorDto(e.RowNumber, e.Column, e.Value, e.Message)).ToList()
        );
    }
}

public record GetImportBatchErrorsExcelQuery(Guid BatchId) : IRequest<byte[]>;

public class GetImportBatchErrorsExcelQueryHandler : IRequestHandler<GetImportBatchErrorsExcelQuery, byte[]>
{
    private readonly IDataTransferService _dataTransferService;
    private readonly ICurrentUserService _currentUserService;

    public GetImportBatchErrorsExcelQueryHandler(IDataTransferService dataTransferService, ICurrentUserService currentUserService)
    {
        _dataTransferService = dataTransferService;
        _currentUserService = currentUserService;
    }

    public async Task<byte[]> Handle(GetImportBatchErrorsExcelQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();
        return await _dataTransferService.GenerateErrorReportExcelAsync(request.BatchId, userId, cancellationToken);
    }
}

public record GetImportHistoryQuery : IRequest<List<ImportBatchDetailDto>>;

public class GetImportHistoryQueryHandler : IRequestHandler<GetImportHistoryQuery, List<ImportBatchDetailDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetImportHistoryQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<List<ImportBatchDetailDto>> Handle(GetImportHistoryQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var batches = await _context.ImportBatches
            .Include(b => b.Errors)
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return batches.Select(batch =>
        {
            var canRollback = batch.Status == Domain.Enums.ImportBatchStatus.Completed &&
                              batch.CreatedAtUtc >= DateTime.UtcNow.AddDays(-7);

            return new ImportBatchDetailDto(
                batch.Id,
                batch.Module,
                batch.FileName,
                batch.Status,
                batch.Status.ToString(),
                batch.TotalRows,
                batch.SuccessRows,
                batch.FailedRows,
                batch.SkippedRows,
                batch.Mode,
                batch.Mode.ToString(),
                batch.AllOrNothing,
                batch.CreatedAtUtc,
                batch.CompletedAtUtc,
                batch.RolledBackAtUtc,
                canRollback,
                batch.Errors.OrderBy(e => e.RowNumber).Select(e => new ImportErrorDto(e.RowNumber, e.Column, e.Value, e.Message)).ToList()
            );
        }).ToList();
    }
}

public record GetMappingProfilesQuery(string? Module) : IRequest<List<MappingProfileDto>>;

public class GetMappingProfilesQueryHandler : IRequestHandler<GetMappingProfilesQuery, List<MappingProfileDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetMappingProfilesQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<List<MappingProfileDto>> Handle(GetMappingProfilesQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var query = _context.MappingProfiles.Where(m => m.UserId == userId);
        if (!string.IsNullOrWhiteSpace(request.Module))
        {
            query = query.Where(m => m.Module.ToLower() == request.Module.ToLower());
        }

        var list = await query.OrderByDescending(m => m.CreatedAtUtc).ToListAsync(cancellationToken);

        return list.Select(m => new MappingProfileDto(
            m.Id,
            m.Module,
            m.Name,
            JsonSerializer.Deserialize<Dictionary<string, string>>(m.ColumnMapJson) ?? new(),
            string.IsNullOrWhiteSpace(m.ValueMapJson) ? null : JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, string>>>(m.ValueMapJson),
            m.DateFormat,
            m.CreatedAtUtc
        )).ToList();
    }
}

public record GetMappingProfileByIdQuery(Guid Id) : IRequest<MappingProfileDto>;

public class GetMappingProfileByIdQueryHandler : IRequestHandler<GetMappingProfileByIdQuery, MappingProfileDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetMappingProfileByIdQueryHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<MappingProfileDto> Handle(GetMappingProfileByIdQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var profile = await _context.MappingProfiles
            .FirstOrDefaultAsync(m => m.Id == request.Id && m.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException($"Mapping profile '{request.Id}' not found.");

        return new MappingProfileDto(
            profile.Id,
            profile.Module,
            profile.Name,
            JsonSerializer.Deserialize<Dictionary<string, string>>(profile.ColumnMapJson) ?? new(),
            string.IsNullOrWhiteSpace(profile.ValueMapJson) ? null : JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, string>>>(profile.ValueMapJson),
            profile.DateFormat,
            profile.CreatedAtUtc
        );
    }
}

public record ExportModuleQuery(string Module, string Format, DateTime? From, DateTime? To) : IRequest<(byte[] Content, string ContentType, string FileName)>;

public class ExportModuleQueryHandler : IRequestHandler<ExportModuleQuery, (byte[] Content, string ContentType, string FileName)>
{
    private readonly IDataTransferService _dataTransferService;
    private readonly ICurrentUserService _currentUserService;

    public ExportModuleQueryHandler(IDataTransferService dataTransferService, ICurrentUserService currentUserService)
    {
        _dataTransferService = dataTransferService;
        _currentUserService = currentUserService;
    }

    public async Task<(byte[] Content, string ContentType, string FileName)> Handle(ExportModuleQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();
        return await _dataTransferService.ExportModuleAsync(request.Module, userId, request.Format, request.From, request.To, cancellationToken);
    }
}

public record ExportAllModulesQuery : IRequest<(byte[] Content, string ContentType, string FileName)>;

public class ExportAllModulesQueryHandler : IRequestHandler<ExportAllModulesQuery, (byte[] Content, string ContentType, string FileName)>
{
    private readonly IDataTransferService _dataTransferService;
    private readonly ICurrentUserService _currentUserService;

    public ExportAllModulesQueryHandler(IDataTransferService dataTransferService, ICurrentUserService currentUserService)
    {
        _dataTransferService = dataTransferService;
        _currentUserService = currentUserService;
    }

    public async Task<(byte[] Content, string ContentType, string FileName)> Handle(ExportAllModulesQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();
        return await _dataTransferService.ExportAllModulesAsync(userId, cancellationToken);
    }
}
