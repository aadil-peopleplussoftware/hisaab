using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Infrastructure.Services;

public class DeletionPermissionService : IDeletionPermissionService
{
    private readonly IApplicationDbContext _context;

    public DeletionPermissionService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Dictionary<string, bool>> GetPermissionsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var setting = await _context.DeletionSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);

        if (setting == null)
        {
            return new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase)
            {
                ["transactions"] = true,
                ["categories"] = true,
                ["loans"] = true,
                ["epfo"] = true,
                ["investments"] = true,
                ["business"] = true
            };
        }

        return new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase)
        {
            ["transactions"] = setting.Transactions,
            ["categories"] = setting.Categories,
            ["loans"] = setting.Loans,
            ["epfo"] = setting.Epfo,
            ["investments"] = setting.Investments,
            ["business"] = setting.Business
        };
    }

    public async Task<bool> CanDeleteAsync(Guid userId, string module, CancellationToken cancellationToken = default)
    {
        var permissions = await GetPermissionsAsync(userId, cancellationToken);
        if (permissions.TryGetValue(module, out var allowed))
        {
            return allowed;
        }
        return true;
    }

    public async Task<Dictionary<string, bool>> UpdatePermissionsAsync(Guid userId, Dictionary<string, bool> permissions, CancellationToken cancellationToken = default)
    {
        var setting = await _context.DeletionSettings
            .FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);

        if (setting == null)
        {
            setting = new UserDeletionSetting
            {
                UserId = userId
            };
            _context.DeletionSettings.Add(setting);
        }

        if (permissions.TryGetValue("transactions", out var tx)) setting.Transactions = tx;
        if (permissions.TryGetValue("categories", out var cat)) setting.Categories = cat;
        if (permissions.TryGetValue("loans", out var loan)) setting.Loans = loan;
        if (permissions.TryGetValue("epfo", out var epf)) setting.Epfo = epf;
        if (permissions.TryGetValue("investments", out var inv)) setting.Investments = inv;
        if (permissions.TryGetValue("business", out var biz)) setting.Business = biz;

        setting.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return await GetPermissionsAsync(userId, cancellationToken);
    }
}

