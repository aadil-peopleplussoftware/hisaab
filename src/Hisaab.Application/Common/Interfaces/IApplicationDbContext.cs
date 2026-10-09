using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<RefreshToken> RefreshTokens { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
