using System.Diagnostics;
using System.Runtime.InteropServices;
using Hisaab.Infrastructure.Identity;
using Hisaab.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Api.Controllers;

[Authorize(Roles = "Admin")]
[Route("api/v1/admin")]
public class AdminController : ApiControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _context;

    public AdminController(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext context)
    {
        _userManager = userManager;
        _context = context;
    }

    /// <summary>
    /// Returns list of all registered users with metadata only.
    /// Per security blueprint, Admin cannot view user financial records.
    /// </summary>
    [HttpGet("users")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUsers(CancellationToken cancellationToken)
    {
        var users = await _userManager.Users
            .AsNoTracking()
            .OrderByDescending(u => u.CreatedAtUtc)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FullName,
                u.Timezone,
                u.Locale,
                u.IsActive,
                u.IsDeleted,
                u.CreatedAtUtc,
                u.LockoutEnd
            })
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    /// <summary>
    /// Returns security, authentication, and data event audit logs.
    /// </summary>
    [HttpGet("audit-logs")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] string? action,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var query = _context.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(action))
        {
            var search = action.Trim().ToLowerInvariant();
            query = query.Where(a => a.Action.ToLower().Contains(search));
        }

        var total = await query.CountAsync(cancellationToken);
        var pageIndex = Math.Max(1, page);
        var size = Math.Clamp(pageSize, 1, 100);

        var items = await query
            .OrderByDescending(a => a.TimestampUtc)
            .Skip((pageIndex - 1) * size)
            .Take(size)
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            TotalCount = total,
            Page = pageIndex,
            PageSize = size,
            Items = items
        });
    }

    /// <summary>
    /// Returns runtime system health and infrastructure metrics.
    /// </summary>
    [HttpGet("system-health")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetSystemHealth()
    {
        var proc = Process.GetCurrentProcess();
        var allocatedMemoryMb = GC.GetTotalMemory(forceFullCollection: false) / (1024.0 * 1024.0);
        var workingSetMb = proc.WorkingSet64 / (1024.0 * 1024.0);

        return Ok(new
        {
            Status = "Online",
            TimestampUtc = DateTime.UtcNow,
            ProcessUptime = DateTime.UtcNow - proc.StartTime.ToUniversalTime(),
            MemoryAllocatedMb = Math.Round(allocatedMemoryMb, 2),
            WorkingSetMb = Math.Round(workingSetMb, 2),
            Framework = RuntimeInformation.FrameworkDescription,
            OsDescription = RuntimeInformation.OSDescription,
            ProcessArchitecture = RuntimeInformation.ProcessArchitecture.ToString(),
            DatabaseProvider = _context.Database.ProviderName
        });
    }
}
