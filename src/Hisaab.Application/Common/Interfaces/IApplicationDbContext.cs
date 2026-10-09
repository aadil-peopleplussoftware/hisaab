using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

