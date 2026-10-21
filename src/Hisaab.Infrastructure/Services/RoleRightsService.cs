using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Infrastructure.Identity;
using Hisaab.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Infrastructure.Services;

public class RoleRightsService : IRoleRightsService
{
    private readonly ApplicationDbContext _context;
    private readonly RoleManager<ApplicationRole> _roleManager;
    private readonly UserManager<ApplicationUser> _userManager;

    public static readonly (string Module, string DisplayName, string Description)[] StandardModules = new[]
    {
        ("Transactions", "Transactions (Ledger)", "Manage daily income, expense entries, and account balances"),
        ("Categories", "Categories & Budgets", "Manage transaction categories, spending tags, and limits"),
        ("Loans", "Loans & Debt Manager", "Track lent/borrowed balances, interest, and EMI payment schedules"),
        ("Investments", "Investments & Stocks", "Monitor equity holdings, market portfolio, and capital gains"),
        ("Epfo", "EPFO & Pension", "Track provident fund balances, monthly passbook, and returns"),
        ("Business", "Business Accounting", "Manage client invoices, tax rates, GST, and counterparty ledgers"),
        ("Goals", "Financial Goals", "Track savings targets, life milestones, and recurring contributions"),
        ("Reports", "Reports & Analytics", "View cashflow charts, monthly spending summaries, and ledger exports"),
        ("Settings", "System Settings", "Configure account preferences, deletion switches, and visual themes"),
        ("Users", "User & Role Administration", "Manage team accounts, assign user roles, and configure role rights")
    };

    public RoleRightsService(
        ApplicationDbContext context,
        RoleManager<ApplicationRole> roleManager,
        UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _roleManager = roleManager;
        _userManager = userManager;
    }

    public async Task<List<RoleSummaryDto>> GetRolesAsync(CancellationToken cancellationToken = default)
    {
        await EnsureDefaultRolesAndRightsAsync(cancellationToken);

        var identityRoles = await _roleManager.Roles.AsNoTracking().ToListAsync(cancellationToken);
        var users = await _userManager.Users.AsNoTracking().Where(u => !u.IsDeleted).ToListAsync(cancellationToken);

        var userRoleCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var user in users)
        {
            var rList = await _userManager.GetRolesAsync(user);
            var rName = rList.FirstOrDefault() ?? "User";
            userRoleCounts[rName] = userRoleCounts.GetValueOrDefault(rName, 0) + 1;
        }

        var result = new List<RoleSummaryDto>();
        foreach (var role in identityRoles.OrderBy(r => GetRoleSortOrder(r.Name ?? "")))
        {
            var roleName = role.Name ?? "";
            var isSys = IsSystemRole(roleName);
            var count = userRoleCounts.GetValueOrDefault(roleName, 0);
            var lastUpdated = await _context.RoleRights
                .Where(rr => rr.RoleName.ToLower() == roleName.ToLower())
                .OrderByDescending(rr => rr.UpdatedAtUtc)
                .Select(rr => (DateTime?)rr.UpdatedAtUtc)
                .FirstOrDefaultAsync(cancellationToken);

            result.Add(new RoleSummaryDto
            {
                Name = roleName,
                Description = GetDefaultRoleDescription(roleName),
                UserCount = count,
                IsSystemRole = isSys,
                UpdatedAtUtc = lastUpdated
            });
        }

        return result;
    }

    public async Task<List<ModuleRightDto>> GetRoleRightsAsync(string roleName, CancellationToken cancellationToken = default)
    {
        await EnsureDefaultRolesAndRightsAsync(cancellationToken);

        var existing = await _context.RoleRights
            .Where(r => r.RoleName.ToLower() == roleName.ToLower())
            .ToListAsync(cancellationToken);

        var lookup = existing.ToDictionary(r => r.Module, StringComparer.OrdinalIgnoreCase);
        var result = new List<ModuleRightDto>();

        foreach (var m in StandardModules)
        {
            if (lookup.TryGetValue(m.Module, out var found))
            {
                result.Add(new ModuleRightDto
                {
                    Module = m.Module,
                    DisplayName = m.DisplayName,
                    Description = m.Description,
                    CanView = found.CanView,
                    CanCreate = found.CanCreate,
                    CanEdit = found.CanEdit,
                    CanDelete = found.CanDelete,
                    CanExport = found.CanExport
                });
            }
            else
            {
                // Fallback default based on role name
                var def = GetDefaultRight(roleName, m.Module);
                result.Add(new ModuleRightDto
                {
                    Module = m.Module,
                    DisplayName = m.DisplayName,
                    Description = m.Description,
                    CanView = def.CanView,
                    CanCreate = def.CanCreate,
                    CanEdit = def.CanEdit,
                    CanDelete = def.CanDelete,
                    CanExport = def.CanExport
                });
            }
        }

        return result;
    }

    public async Task<Dictionary<string, List<ModuleRightDto>>> GetAllRoleRightsAsync(CancellationToken cancellationToken = default)
    {
        await EnsureDefaultRolesAndRightsAsync(cancellationToken);

        var roles = await _roleManager.Roles.AsNoTracking().ToListAsync(cancellationToken);
        var dict = new Dictionary<string, List<ModuleRightDto>>(StringComparer.OrdinalIgnoreCase);

        foreach (var r in roles)
        {
            if (!string.IsNullOrWhiteSpace(r.Name))
            {
                dict[r.Name] = await GetRoleRightsAsync(r.Name, cancellationToken);
            }
        }

        return dict;
    }

    public async Task<bool> UpdateRoleRightsAsync(string roleName, List<ModuleRightDto> rights, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(roleName)) return false;

        var roleExists = await _roleManager.RoleExistsAsync(roleName);
        if (!roleExists)
        {
            await _roleManager.CreateAsync(new ApplicationRole(roleName));
        }

        var existing = await _context.RoleRights
            .Where(r => r.RoleName.ToLower() == roleName.ToLower())
            .ToListAsync(cancellationToken);

        var existingLookup = existing.ToDictionary(r => r.Module, StringComparer.OrdinalIgnoreCase);

        foreach (var right in rights)
        {
            if (existingLookup.TryGetValue(right.Module, out var entity))
            {
                entity.CanView = right.CanView;
                entity.CanCreate = right.CanCreate;
                entity.CanEdit = right.CanEdit;
                entity.CanDelete = right.CanDelete;
                entity.CanExport = right.CanExport;
                entity.UpdatedAtUtc = DateTime.UtcNow;
            }
            else
            {
                _context.RoleRights.Add(new RoleRight
                {
                    RoleName = roleName,
                    Module = right.Module,
                    CanView = right.CanView,
                    CanCreate = right.CanCreate,
                    CanEdit = right.CanEdit,
                    CanDelete = right.CanDelete,
                    CanExport = right.CanExport,
                    UpdatedAtUtc = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> CreateRoleAsync(string roleName, string? description, string? copyFromRole, CancellationToken cancellationToken = default)
    {
        var trimmed = roleName.Trim();
        if (string.IsNullOrWhiteSpace(trimmed)) return false;

        if (await _roleManager.RoleExistsAsync(trimmed)) return false;

        var createResult = await _roleManager.CreateAsync(new ApplicationRole(trimmed));
        if (!createResult.Succeeded) return false;

        // Populate initial rights from template or default
        var templateRole = !string.IsNullOrWhiteSpace(copyFromRole) ? copyFromRole : "User";
        var templateRights = await GetRoleRightsAsync(templateRole, cancellationToken);

        foreach (var r in templateRights)
        {
            _context.RoleRights.Add(new RoleRight
            {
                RoleName = trimmed,
                Module = r.Module,
                CanView = r.CanView,
                CanCreate = r.CanCreate,
                CanEdit = r.CanEdit,
                CanDelete = r.CanDelete,
                CanExport = r.CanExport,
                UpdatedAtUtc = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteRoleAsync(string roleName, CancellationToken cancellationToken = default)
    {
        if (IsSystemRole(roleName)) return false; // Prevent deleting core system roles

        var role = await _roleManager.FindByNameAsync(roleName);
        if (role == null) return false;

        // Reassign any users who had this role to 'User'
        var usersInRole = await _userManager.GetUsersInRoleAsync(roleName);
        foreach (var u in usersInRole)
        {
            await _userManager.RemoveFromRoleAsync(u, roleName);
            if (!await _userManager.IsInRoleAsync(u, "User"))
            {
                await _userManager.AddToRoleAsync(u, "User");
            }
        }

        // Delete from role_rights table
        var rights = await _context.RoleRights.Where(r => r.RoleName.ToLower() == roleName.ToLower()).ToListAsync(cancellationToken);
        _context.RoleRights.RemoveRange(rights);

        await _roleManager.DeleteAsync(role);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<List<UserRoleAssignmentDto>> GetUserRolesAsync(CancellationToken cancellationToken = default)
    {
        var users = await _userManager.Users
            .AsNoTracking()
            .Where(u => !u.IsDeleted)
            .OrderBy(u => u.FullName)
            .ToListAsync(cancellationToken);

        var list = new List<UserRoleAssignmentDto>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var roleName = roles.FirstOrDefault() ?? "User";
            list.Add(new UserRoleAssignmentDto
            {
                UserId = user.Id,
                Email = user.Email ?? "",
                FullName = user.FullName,
                Role = roleName,
                IsActive = user.IsActive,
                CreatedAtUtc = user.CreatedAtUtc
            });
        }

        return list;
    }

    public async Task<bool> AssignUserRoleAsync(Guid userId, string newRole, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return false;

        if (!await _roleManager.RoleExistsAsync(newRole))
        {
            await _roleManager.CreateAsync(new ApplicationRole(newRole));
        }

        var currentRoles = await _userManager.GetRolesAsync(user);
        if (currentRoles.Any())
        {
            await _userManager.RemoveFromRolesAsync(user, currentRoles);
        }

        var addResult = await _userManager.AddToRoleAsync(user, newRole);
        return addResult.Succeeded;
    }

    public async Task<List<ModuleRightDto>> GetUserRightsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null) return new List<ModuleRightDto>();

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "User";

        return await GetRoleRightsAsync(role, cancellationToken);
    }

    private async Task EnsureDefaultRolesAndRightsAsync(CancellationToken cancellationToken)
    {
        var defaultRoles = new[] { "Admin", "Manager", "Accountant", "User", "Viewer" };

        foreach (var roleName in defaultRoles)
        {
            if (!await _roleManager.RoleExistsAsync(roleName))
            {
                await _roleManager.CreateAsync(new ApplicationRole(roleName));
            }

            var hasRights = await _context.RoleRights.AnyAsync(r => r.RoleName.ToLower() == roleName.ToLower(), cancellationToken);
            if (!hasRights)
            {
                foreach (var m in StandardModules)
                {
                    var def = GetDefaultRight(roleName, m.Module);
                    _context.RoleRights.Add(new RoleRight
                    {
                        RoleName = roleName,
                        Module = m.Module,
                        CanView = def.CanView,
                        CanCreate = def.CanCreate,
                        CanEdit = def.CanEdit,
                        CanDelete = def.CanDelete,
                        CanExport = def.CanExport,
                        UpdatedAtUtc = DateTime.UtcNow
                    });
                }
            }
        }

        if (_context.ChangeTracker.HasChanges())
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    private static (bool CanView, bool CanCreate, bool CanEdit, bool CanDelete, bool CanExport) GetDefaultRight(string role, string module)
    {
        var r = role.ToLowerInvariant();
        var m = module.ToLowerInvariant();

        if (r == "admin")
        {
            return (true, true, true, true, true);
        }

        if (r == "manager")
        {
            // Managers have broad access, delete restricted on system admin & settings
            if (m is "users" or "settings")
            {
                return (true, false, false, false, true);
            }
            return (true, true, true, true, true);
        }

        if (r == "accountant")
        {
            // Financial ledgers, invoices, taxes, loans
            if (m is "transactions" or "categories" or "business" or "loans" or "reports")
            {
                return (true, true, true, false, true);
            }
            if (m is "investments" or "epfo" or "goals")
            {
                return (true, false, false, false, true);
            }
            return (false, false, false, false, false);
        }

        if (r == "viewer")
        {
            // Read-only viewing and exporting
            if (m is "users" or "settings") return (false, false, false, false, false);
            return (true, false, false, false, true);
        }

        // Standard "User" role
        if (m is "users") return (false, false, false, false, false);
        return (true, true, true, true, true);
    }

    private static bool IsSystemRole(string roleName)
    {
        var r = roleName.ToLowerInvariant();
        return r is "admin" or "user" or "manager" or "accountant" or "viewer";
    }

    private static int GetRoleSortOrder(string roleName)
    {
        return roleName.ToLowerInvariant() switch
        {
            "admin" => 1,
            "manager" => 2,
            "accountant" => 3,
            "user" => 4,
            "viewer" => 5,
            _ => 10
        };
    }

    private static string GetDefaultRoleDescription(string roleName)
    {
        return roleName.ToLowerInvariant() switch
        {
            "admin" => "Full unrestricted administrative access across all modules, settings, and user rights.",
            "manager" => "High-level operations management, transaction approvals, and financial exports.",
            "accountant" => "Ledger reconciliation, business bookkeeping, tax invoice handling, and financial reports.",
            "user" => "Standard personal finance access to manage own expenses, investments, and goals.",
            "viewer" => "Read-only audit access to view statements and export ledger data without edit capabilities.",
            _ => "Custom enterprise role with tailored module permissions."
        };
    }
}

