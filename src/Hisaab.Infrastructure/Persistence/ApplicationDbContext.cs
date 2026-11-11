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
    public DbSet<ExportArchive> ExportArchives => Set<ExportArchive>();
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
    public DbSet<RoleRight> RoleRights => Set<RoleRight>();
    public DbSet<TradeOrder> TradeOrders => Set<TradeOrder>();
    public DbSet<IpoApplication> IpoApplications => Set<IpoApplication>();
    public DbSet<LocalKhataParty> LocalKhataParties => Set<LocalKhataParty>();
    public DbSet<LocalKhataEntry> LocalKhataEntries => Set<LocalKhataEntry>();
    public DbSet<KhataLiquidityAccount> KhataLiquidityAccounts => Set<KhataLiquidityAccount>();
    public DbSet<KhataEvent> KhataEvents => Set<KhataEvent>();
    public DbSet<KhataEventFund> KhataEventFunds => Set<KhataEventFund>();
    public DbSet<KhataEventItem> KhataEventItems => Set<KhataEventItem>();

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

        builder.Entity<RoleRight>(b =>
        {
            b.ToTable("role_rights");
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.RoleName, x.Module }).IsUnique();
        });

        builder.Entity<TradeOrder>(b =>
        {
            b.ToTable("trade_orders");
            b.HasKey(x => x.Id);
            b.Property(x => x.Quantity).HasPrecision(18, 4);
            b.HasIndex(x => new { x.UserId, x.Status });
            b.HasIndex(x => new { x.UserId, x.BuyDate });
        });

        builder.Entity<IpoApplication>(b =>
        {
            b.ToTable("ipo_applications");
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.UserId, x.Status });
            b.HasIndex(x => new { x.UserId, x.ApplicationDate });
        });

        builder.Entity<LocalKhataParty>(b =>
        {
            b.ToTable("local_khata_parties");
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.UserId, x.Name });
            b.HasIndex(x => new { x.UserId, x.IsSettled });
            b.HasMany(x => x.Entries).WithOne(x => x.Party).HasForeignKey(x => x.PartyId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<LocalKhataEntry>(b =>
        {
            b.ToTable("local_khata_entries");
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.UserId, x.PartyId });
            b.HasIndex(x => new { x.UserId, x.Date });
        });

        builder.Entity<KhataLiquidityAccount>(b =>
        {
            b.ToTable("khata_liquidity_accounts");
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.UserId, x.AccountType });
        });

        builder.Entity<KhataEvent>(b =>
        {
            b.ToTable("khata_events");
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.UserId, x.Date });
            b.HasMany(x => x.Funds).WithOne(x => x.Event).HasForeignKey(x => x.EventId).OnDelete(DeleteBehavior.Cascade);
            b.HasMany(x => x.Items).WithOne(x => x.Event).HasForeignKey(x => x.EventId).OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<KhataEventFund>(b =>
        {
            b.ToTable("khata_event_funds");
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.UserId, x.EventId });
        });

        builder.Entity<KhataEventItem>(b =>
        {
            b.ToTable("khata_event_items");
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.UserId, x.EventId, x.ItemType });
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

