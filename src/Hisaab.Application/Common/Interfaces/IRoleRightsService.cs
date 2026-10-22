namespace Hisaab.Application.Common.Interfaces;

public class ModuleRightDto
{
    public string Module { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool CanView { get; set; } = true;
    public bool CanCreate { get; set; } = true;
    public bool CanEdit { get; set; } = true;
    public bool CanDelete { get; set; } = true;
    public bool CanExport { get; set; } = true;
}

public class RoleSummaryDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int UserCount { get; set; }
    public bool IsSystemRole { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class UserRoleAssignmentDto
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public interface IRoleRightsService
{
    Task<List<RoleSummaryDto>> GetRolesAsync(CancellationToken cancellationToken = default);
    Task<List<ModuleRightDto>> GetRoleRightsAsync(string roleName, CancellationToken cancellationToken = default);
    Task<Dictionary<string, List<ModuleRightDto>>> GetAllRoleRightsAsync(CancellationToken cancellationToken = default);
    Task<bool> UpdateRoleRightsAsync(string roleName, List<ModuleRightDto> rights, CancellationToken cancellationToken = default);
    Task<bool> CreateRoleAsync(string roleName, string? description, string? copyFromRole, CancellationToken cancellationToken = default);
    Task<bool> DeleteRoleAsync(string roleName, CancellationToken cancellationToken = default);
    Task<List<UserRoleAssignmentDto>> GetUserRolesAsync(CancellationToken cancellationToken = default);
    Task<bool> AssignUserRoleAsync(Guid userId, string newRole, CancellationToken cancellationToken = default);
    Task<List<ModuleRightDto>> GetUserRightsAsync(Guid userId, CancellationToken cancellationToken = default);
}

