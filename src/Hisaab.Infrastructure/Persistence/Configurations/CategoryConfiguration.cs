using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hisaab.Infrastructure.Persistence.Configurations;

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("categories");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(c => c.Icon)
            .HasMaxLength(50);

        builder.Property(c => c.Color)
            .HasMaxLength(20);

        builder.HasIndex(c => new { c.UserId, c.Type });

        // Seed system categories
        var systemUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        builder.HasData(
            // Income categories
            new Category { Id = Guid.Parse("11111111-1111-1111-1111-111111111101"), UserId = systemUserId, Type = Domain.Enums.TransactionType.Income, Name = "Salary", Icon = "briefcase", Color = "#16a34a", IsSystem = true },
            new Category { Id = Guid.Parse("11111111-1111-1111-1111-111111111102"), UserId = systemUserId, Type = Domain.Enums.TransactionType.Income, Name = "Freelance / Business", Icon = "laptop", Color = "#059669", IsSystem = true },
            new Category { Id = Guid.Parse("11111111-1111-1111-1111-111111111103"), UserId = systemUserId, Type = Domain.Enums.TransactionType.Income, Name = "Dividends & Interest", Icon = "trending-up", Color = "#0d9488", IsSystem = true },
            new Category { Id = Guid.Parse("11111111-1111-1111-1111-111111111104"), UserId = systemUserId, Type = Domain.Enums.TransactionType.Income, Name = "Other Income", Icon = "plus-circle", Color = "#0891b2", IsSystem = true },

            // Expense categories
            new Category { Id = Guid.Parse("11111111-1111-1111-1111-111111111105"), UserId = systemUserId, Type = Domain.Enums.TransactionType.Expense, Name = "Housing & Rent", Icon = "home", Color = "#dc2626", IsSystem = true },
            new Category { Id = Guid.Parse("11111111-1111-1111-1111-111111111106"), UserId = systemUserId, Type = Domain.Enums.TransactionType.Expense, Name = "Groceries & Food", Icon = "shopping-cart", Color = "#ea580c", IsSystem = true },
            new Category { Id = Guid.Parse("11111111-1111-1111-1111-111111111107"), UserId = systemUserId, Type = Domain.Enums.TransactionType.Expense, Name = "Utilities & Bills", Icon = "zap", Color = "#d97706", IsSystem = true },
            new Category { Id = Guid.Parse("11111111-1111-1111-1111-111111111108"), UserId = systemUserId, Type = Domain.Enums.TransactionType.Expense, Name = "Transportation & Fuel", Icon = "truck", Color = "#ca8a04", IsSystem = true },
            new Category { Id = Guid.Parse("11111111-1111-1111-1111-111111111109"), UserId = systemUserId, Type = Domain.Enums.TransactionType.Expense, Name = "Healthcare", Icon = "heart", Color = "#e11d48", IsSystem = true },
            new Category { Id = Guid.Parse("11111111-1111-1111-1111-111111111110"), UserId = systemUserId, Type = Domain.Enums.TransactionType.Expense, Name = "Entertainment & Leisure", Icon = "film", Color = "#9333ea", IsSystem = true },
            new Category { Id = Guid.Parse("11111111-1111-1111-1111-111111111111"), UserId = systemUserId, Type = Domain.Enums.TransactionType.Expense, Name = "Other Expense", Icon = "more-horizontal", Color = "#64748b", IsSystem = true }
        );
    }
}

