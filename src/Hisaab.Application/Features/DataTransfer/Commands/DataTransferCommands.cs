using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.DataTransfer.DTOs;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Hisaab.Application.Features.DataTransfer.Commands;

public record UploadImportFileCommand(
    Stream FileStream,
    string FileName,
    string Module
) : IRequest<UploadResultDto>;

public class UploadImportFileCommandHandler : IRequestHandler<UploadImportFileCommand, UploadResultDto>
{
    private readonly IDataTransferService _dataTransferService;
    private readonly ICurrentUserService _currentUserService;

    public UploadImportFileCommandHandler(IDataTransferService dataTransferService, ICurrentUserService currentUserService)
    {
        _dataTransferService = dataTransferService;
        _currentUserService = currentUserService;
    }

    public async Task<UploadResultDto> Handle(UploadImportFileCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();
        return await _dataTransferService.UploadAndInspectFileAsync(
            request.FileStream,
            request.FileName,
            request.Module,
            userId,
            cancellationToken);
    }
}

public record SaveImportMappingCommand(
    Guid BatchId,
    MappingRequestDto Mapping
) : IRequest<Unit>;

public class SaveImportMappingCommandHandler : IRequestHandler<SaveImportMappingCommand, Unit>
{
    private readonly IDataTransferService _dataTransferService;
    private readonly ICurrentUserService _currentUserService;

    public SaveImportMappingCommandHandler(IDataTransferService dataTransferService, ICurrentUserService currentUserService)
    {
        _dataTransferService = dataTransferService;
        _currentUserService = currentUserService;
    }

    public async Task<Unit> Handle(SaveImportMappingCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();
        await _dataTransferService.SaveMappingAsync(request.BatchId, userId, request.Mapping, cancellationToken);
        return Unit.Value;
    }
}

public record ValidateImportBatchCommand(
    Guid BatchId
) : IRequest<PreviewValidationResultDto>;

public class ValidateImportBatchCommandHandler : IRequestHandler<ValidateImportBatchCommand, PreviewValidationResultDto>
{
    private readonly IDataTransferService _dataTransferService;
    private readonly ICurrentUserService _currentUserService;

    public ValidateImportBatchCommandHandler(IDataTransferService dataTransferService, ICurrentUserService currentUserService)
    {
        _dataTransferService = dataTransferService;
        _currentUserService = currentUserService;
    }

    public async Task<PreviewValidationResultDto> Handle(ValidateImportBatchCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();
        return await _dataTransferService.ValidateBatchAsync(request.BatchId, userId, cancellationToken);
    }
}

public record CommitImportBatchCommand(
    Guid BatchId
) : IRequest<ImportResultDto>;

public class CommitImportBatchCommandHandler : IRequestHandler<CommitImportBatchCommand, ImportResultDto>
{
    private readonly IDataTransferService _dataTransferService;
    private readonly ICurrentUserService _currentUserService;

    public CommitImportBatchCommandHandler(IDataTransferService dataTransferService, ICurrentUserService currentUserService)
    {
        _dataTransferService = dataTransferService;
        _currentUserService = currentUserService;
    }

    public async Task<ImportResultDto> Handle(CommitImportBatchCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();
        return await _dataTransferService.CommitBatchAsync(request.BatchId, userId, cancellationToken);
    }
}

public record RollbackImportBatchCommand(
    Guid BatchId
) : IRequest<bool>;

public class RollbackImportBatchCommandHandler : IRequestHandler<RollbackImportBatchCommand, bool>
{
    private readonly IDataTransferService _dataTransferService;
    private readonly ICurrentUserService _currentUserService;

    public RollbackImportBatchCommandHandler(IDataTransferService dataTransferService, ICurrentUserService currentUserService)
    {
        _dataTransferService = dataTransferService;
        _currentUserService = currentUserService;
    }

    public async Task<bool> Handle(RollbackImportBatchCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();
        return await _dataTransferService.RollbackBatchAsync(request.BatchId, userId, cancellationToken);
    }
}

public record SaveMappingProfileCommand(
    SaveMappingProfileRequest Request
) : IRequest<MappingProfileDto>;

public class SaveMappingProfileCommandHandler : IRequestHandler<SaveMappingProfileCommand, MappingProfileDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public SaveMappingProfileCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<MappingProfileDto> Handle(SaveMappingProfileCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var existing = await _context.MappingProfiles
            .FirstOrDefaultAsync(m => m.UserId == userId && m.Module.ToLower() == request.Request.Module.ToLower() && m.Name.ToLower() == request.Request.Name.ToLower(), cancellationToken);

        if (existing == null)
        {
            existing = new MappingProfile
            {
                UserId = userId,
                Module = request.Request.Module,
                Name = request.Request.Name,
                ColumnMapJson = JsonSerializer.Serialize(request.Request.ColumnMap),
                ValueMapJson = request.Request.ValueMap != null ? JsonSerializer.Serialize(request.Request.ValueMap) : "{}",
                DateFormat = request.Request.DateFormat ?? "dd-MM-yyyy"
            };
            _context.MappingProfiles.Add(existing);
        }
        else
        {
            existing.ColumnMapJson = JsonSerializer.Serialize(request.Request.ColumnMap);
            existing.ValueMapJson = request.Request.ValueMap != null ? JsonSerializer.Serialize(request.Request.ValueMap) : "{}";
            existing.DateFormat = request.Request.DateFormat ?? existing.DateFormat;
            existing.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new MappingProfileDto(
            existing.Id,
            existing.Module,
            existing.Name,
            request.Request.ColumnMap,
            request.Request.ValueMap,
            existing.DateFormat,
            existing.CreatedAtUtc
        );
    }
}

public record DeleteMappingProfileCommand(Guid Id) : IRequest<Unit>;

public class DeleteMappingProfileCommandHandler : IRequestHandler<DeleteMappingProfileCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeleteMappingProfileCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Unit> Handle(DeleteMappingProfileCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var profile = await _context.MappingProfiles
            .FirstOrDefaultAsync(m => m.Id == request.Id && m.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException($"Mapping profile '{request.Id}' not found.");

        _context.MappingProfiles.Remove(profile);
        await _context.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}

