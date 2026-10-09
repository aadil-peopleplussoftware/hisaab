namespace Hisaab.Application.Common.Interfaces;

public interface IAuditService
{
    Task LogAsync(
        string action,
        string? entityType = null,
        string? entityId = null,
        string? details = null,
        CancellationToken cancellationToken = default);
}

