using System.Linq.Expressions;
using System.Reflection;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Common;
using Hisaab.Domain.Entities;
using Hisaab.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace Hisaab.Infrastructure.Persistence;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>, IApplicationDbContext
{
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeService _dateTimeService;

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<LoanAccount> LoanAccounts => Set<LoanAccount>();
    public DbSet<LoanTransaction> LoanTransactions => Set<LoanTransaction>();
    public DbSet<EpfEntry> EpfEntries => Set<EpfEntry>();
    public DbSet<Holding> Holdings => Set<Holding>();
    public DbSet<InvestmentTransaction> InvestmentTransactions => Set<InvestmentTransaction>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<ImportBatch> ImportBatches => Set<ImportBatch>();
    public DbSet<ImportError> ImportErrors => Set<ImportError>();
    public DbSet<MappingProfile> MappingProfiles => Set<MappingProfile>();
    public DbSet<BusinessEntity> Businesses => Set<BusinessEntity>();
    public DbSet<BusinessTransaction> BusinessTransactions => Set<BusinessTransaction>();
    public DbSet<UserDeletionSetting> DeletionSettings => Set<UserDeletionSetting>();
    public DbSet<FinancialGoal> FinancialGoals => Set<FinancialGoal>();
    public DbSet<GoalContribution> GoalContributions => Set<GoalContribution>();
    public DbSet<StockHolding> StockHoldings => Set<StockHolding>();
    public DbSet<MarketAgentUserSetting> MarketAgentUserSettings => Set<MarketAgentUserSetting>();
    public DbSet<MarketAgentAlertLog> MarketAgentAlertLogs => Set<MarketAgentAlertLog>();
    public DbSet<Attachment> Attachments => Set<Attachment>();

    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options,
        ICurrentUserService currentUserService,
        IDateTimeService dateTimeService)
        : base(options)
    {
        _currentUserService = currentUserService;
        _dateTimeService = dateTimeService;
    }

    public Guid? CurrentUserId => _currentUserService.UserId;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        builder.Entity<StockHolding>(b =>
        {
            b.ToTable("stock_holdings");
            b.HasKey(x => x.Id);
            b.Property(x => x.Quantity).HasPrecision(18, 4);
            b.HasIndex(x => new { x.UserId, x.Ticker });
            b.HasIndex(x => new { x.UserId, x.IsArchived });
        });

        builder.Entity<MarketAgentUserSetting>(b =>
        {
            b.ToTable("market_agent_user_settings");
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.UserId);
        });

        builder.Entity<MarketAgentAlertLog>(b =>
        {
            b.ToTable("market_agent_alert_logs");
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.UserId, x.CreatedAtUtc });
            b.HasIndex(x => new { x.UserId, x.Ticker });
        });

        builder.Entity<UserDeletionSetting>(b =>
        {
            b.ToTable("user_deletion_settings");
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.UserId).IsUnique();
        });

        // Global conventions & filters
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;

            // Configure decimal precision NUMERIC(18,2) across all entities
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(decimal) || property.ClrType == typeof(decimal?))
                {
                    property.SetPrecision(18);
                    property.SetScale(2);
                }
            }

            // Apply Global Query Filters for Soft Delete and Multi-tenant User Isolation
            var parameter = Expression.Parameter(clrType, "e");
            Expression? filterExpression = null;

            if (typeof(ISoftDeletable).IsAssignableFrom(clrType))
            {
                var isDeletedProp = Expression.Property(parameter, nameof(ISoftDeletable.IsDeleted));
                var notDeleted = Expression.Equal(isDeletedProp, Expression.Constant(false));
                filterExpression = notDeleted;
            }

            if (typeof(IUserOwned).IsAssignableFrom(clrType))
            {
                // Defense-in-depth: Tenant Isolation Filter
                var userIdProp = Expression.Property(parameter, nameof(IUserOwned.UserId));
                var currentUserIdExpr = Expression.Property(
                    Expression.Constant(this),
                    nameof(CurrentUserId));

                var hasValueExpr = Expression.Property(currentUserIdExpr, nameof(Nullable<Guid>.HasValue));
                var valueExpr = Expression.Call(currentUserIdExpr, nameof(Nullable<Guid>.GetValueOrDefault), Type.EmptyTypes);
                Expression tenantCheck = Expression.AndAlso(hasValueExpr, Expression.Equal(userIdProp, valueExpr));

                if (clrType == typeof(Category))
                {
                    var isSystemProp = Expression.Property(parameter, nameof(Category.IsSystem));
                    var isSystemTrue = Expression.Equal(isSystemProp, Expression.Constant(true));
                    tenantCheck = Expression.OrElse(isSystemTrue, tenantCheck);
                }

                filterExpression = filterExpression == null
                    ? tenantCheck
                    : Expression.AndAlso(filterExpression, tenantCheck);
            }

            if (filterExpression != null)
            {
                var lambda = Expression.Lambda(filterExpression, parameter);
                builder.Entity(clrType).HasQueryFilter(lambda);
            }
        }
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var currentUserId = _currentUserService.UserId;
        var now = _dateTimeService.UtcNow;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAtUtc = now;
                    entry.Entity.CreatedBy ??= currentUserId;

                    if (entry.Entity is IUserOwned userOwned && userOwned.UserId == Guid.Empty && currentUserId.HasValue)
                    {
                        userOwned.UserId = currentUserId.Value;
                    }
                    break;

                case EntityState.Modified:
                    entry.Entity.UpdatedAtUtc = now;
                    entry.Entity.UpdatedBy = currentUserId;
                    break;

                case EntityState.Deleted when entry.Entity is ISoftDeletable softDeletable:
                    entry.State = EntityState.Modified;
                    softDeletable.IsDeleted = true;
                    softDeletable.DeletedAtUtc = now;
                    softDeletable.DeletedBy = currentUserId;
                    break;
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}

