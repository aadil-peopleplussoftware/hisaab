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
                ["business"] = true,
                ["goals"] = true
            };
        }

        return new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase)
        {
            ["transactions"] = setting.Transactions,
            ["categories"] = setting.Categories,
            ["loans"] = setting.Loans,
            ["epfo"] = setting.Epfo,
            ["investments"] = setting.Investments,
            ["business"] = setting.Business,
            ["goals"] = setting.Goals
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
        var normalized = new Dictionary<string, bool>(permissions, StringComparer.OrdinalIgnoreCase);

        var setting = await _context.DeletionSettings
            .FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);

        if (setting == null)
        {
            setting = new UserDeletionSetting
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Transactions = true,
                Categories = true,
                Loans = true,
                Epfo = true,
                Investments = true,
                Business = true,
                Goals = true,
                UpdatedAtUtc = DateTime.UtcNow
            };
            _context.DeletionSettings.Add(setting);
        }

        if (normalized.TryGetValue("transactions", out var tx)) setting.Transactions = tx;
        if (normalized.TryGetValue("categories", out var cat)) setting.Categories = cat;
        if (normalized.TryGetValue("loans", out var loan)) setting.Loans = loan;
        if (normalized.TryGetValue("epfo", out var epf)) setting.Epfo = epf;
        if (normalized.TryGetValue("investments", out var inv)) setting.Investments = inv;
        if (normalized.TryGetValue("business", out var biz)) setting.Business = biz;
        if (normalized.TryGetValue("goals", out var goal)) setting.Goals = goal;

        setting.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return await GetPermissionsAsync(userId, cancellationToken);
    }
}

