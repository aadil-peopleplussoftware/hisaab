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

    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options,
        ICurrentUserService currentUserService,
        IDateTimeService dateTimeService)
        : base(options)
    {
        _currentUserService = currentUserService;
        _dateTimeService = dateTimeService;
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

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
                // Non-admins see ONLY their own records. If unauthenticated/anonymous, returns false (or matched empty).
                var userIdProp = Expression.Property(parameter, nameof(IUserOwned.UserId));
                var currentUserIdExpr = Expression.Property(
                    Expression.Constant(_currentUserService),
                    nameof(ICurrentUserService.UserId));

                var hasValueExpr = Expression.Property(currentUserIdExpr, "HasValue");
                var valueExpr = Expression.Property(currentUserIdExpr, "Value");
                var userIdMatches = Expression.AndAlso(hasValueExpr, Expression.Equal(userIdProp, valueExpr));

                filterExpression = filterExpression == null
                    ? userIdMatches
                    : Expression.AndAlso(filterExpression, userIdMatches);
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

