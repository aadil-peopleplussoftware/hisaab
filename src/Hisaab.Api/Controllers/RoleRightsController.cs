using Hisaab.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hisaab.Api.Controllers;

[Authorize]
[Route("api/v1/role-rights")]
public class RoleRightsController : ApiControllerBase
{
    private readonly IRoleRightsService _roleRightsService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;

    public RoleRightsController(
        IRoleRightsService roleRightsService,
        ICurrentUserService currentUserService,
        IAuditService auditService)
    {
        _roleRightsService = roleRightsService;
        _currentUserService = currentUserService;
        _auditService = auditService;
    }

    /// <summary>
    /// Gets all registered roles with user count and metadata.
    /// </summary>
    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles(CancellationToken cancellationToken)
    {
        var roles = await _roleRightsService.GetRolesAsync(cancellationToken);
        return Ok(roles);
    }

    /// <summary>
    /// Gets module rights for a specific role.
    /// </summary>
    [HttpGet("roles/{roleName}")]
    public async Task<IActionResult> GetRoleRights(string roleName, CancellationToken cancellationToken)
    {
        var rights = await _roleRightsService.GetRoleRightsAsync(roleName, cancellationToken);
        return Ok(rights);
    }

    /// <summary>
    /// Updates the module rights matrix for a specific role.
    /// </summary>
    [HttpPut("roles/{roleName}")]
    public async Task<IActionResult> UpdateRoleRights(
        string roleName,
        [FromBody] List<ModuleRightDto> rights,
        CancellationToken cancellationToken)
    {
        var success = await _roleRightsService.UpdateRoleRightsAsync(roleName, rights, cancellationToken);
        if (!success) return BadRequest(new { message = "Failed to update role rights." });

        await _auditService.LogAsync("RoleRightsUpdated", "Role", roleName, $"Updated module permissions for role {roleName}", cancellationToken);
        return Ok(new { message = $"Rights updated successfully for role '{roleName}'." });
    }

    /// <summary>
    /// Creates a new custom role.
    /// </summary>
    [HttpPost("roles")]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RoleName))
        {
            return BadRequest(new { message = "Role name is required." });
        }

        var success = await _roleRightsService.CreateRoleAsync(request.RoleName, request.Description, request.CopyFromRole, cancellationToken);
        if (!success)
        {
            return BadRequest(new { message = $"Role '{request.RoleName}' already exists or could not be created." });
        }

        await _auditService.LogAsync("RoleCreated", "Role", request.RoleName, $"Created role '{request.RoleName}' copied from '{request.CopyFromRole ?? "default"}'", cancellationToken);
        return Ok(new { message = $"Role '{request.RoleName}' created successfully." });
    }

    /// <summary>
    /// Deletes a custom role (reassigns users to 'User'). System roles cannot be deleted.
    /// </summary>
    [HttpDelete("roles/{roleName}")]
    public async Task<IActionResult> DeleteRole(string roleName, CancellationToken cancellationToken)
    {
        var success = await _roleRightsService.DeleteRoleAsync(roleName, cancellationToken);
        if (!success)
        {
            return BadRequest(new { message = $"Cannot delete system role or role '{roleName}' not found." });
        }

        await _auditService.LogAsync("RoleDeleted", "Role", roleName, $"Deleted custom role '{roleName}'", cancellationToken);
        return Ok(new { message = $"Role '{roleName}' deleted successfully." });
    }

    /// <summary>
    /// Gets all users with their assigned roles.
    /// </summary>
    [HttpGet("users")]
    public async Task<IActionResult> GetUserRoles(CancellationToken cancellationToken)
    {
        var userRoles = await _roleRightsService.GetUserRolesAsync(cancellationToken);
        return Ok(userRoles);
    }

    /// <summary>
    /// Assigns a role to a specific user.
    /// </summary>
    [HttpPut("users/{userId:guid}/role")]
    public async Task<IActionResult> AssignUserRole(Guid userId, [FromBody] AssignRoleRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.RoleName))
        {
            return BadRequest(new { message = "Role name is required." });
        }

        var success = await _roleRightsService.AssignUserRoleAsync(userId, request.RoleName, cancellationToken);
        if (!success)
        {
            return BadRequest(new { message = "Failed to assign role to user." });
        }

        await _auditService.LogAsync("UserRoleAssigned", "User", userId.ToString(), $"Assigned role '{request.RoleName}' to user", cancellationToken);
        return Ok(new { message = $"User role updated to '{request.RoleName}'." });
    }

    /// <summary>
    /// Gets module rights for the currently authenticated user.
    /// </summary>
    [HttpGet("my-rights")]
    public async Task<IActionResult> GetMyRights(CancellationToken cancellationToken)
    {
        if (!_currentUserService.UserId.HasValue) return Unauthorized();
        var rights = await _roleRightsService.GetUserRightsAsync(_currentUserService.UserId.Value, cancellationToken);
        return Ok(rights);
    }
}

public class CreateRoleRequest
{
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CopyFromRole { get; set; }
}

public class AssignRoleRequest
{
    public string RoleName { get; set; } = string.Empty;
}

