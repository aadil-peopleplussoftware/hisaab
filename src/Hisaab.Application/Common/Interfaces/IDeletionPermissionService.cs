namespace Hisaab.Application.Common.Interfaces;

public interface IDeletionPermissionService
{
    Task<bool> CanDeleteAsync(Guid userId, string module, CancellationToken cancellationToken = default);
    Task<Dictionary<string, bool>> GetPermissionsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Dictionary<string, bool>> UpdatePermissionsAsync(Guid userId, Dictionary<string, bool> permissions, CancellationToken cancellationToken = default);
}

