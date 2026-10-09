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
    DbSet<Holding> Holdings { get; }
    DbSet<InvestmentTransaction> InvestmentTransactions { get; }
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<ImportBatch> ImportBatches { get; }
    DbSet<ImportError> ImportErrors { get; }
    DbSet<MappingProfile> MappingProfiles { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
