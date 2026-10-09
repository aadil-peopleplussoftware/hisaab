using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<Category> Categories { get; }
    DbSet<Transaction> Transactions { get; }
    DbSet<LoanAccount> LoanAccounts { get; }
    DbSet<LoanTransaction> LoanTransactions { get; }
    DbSet<EpfEntry> EpfEntries { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
