using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hisaab.Infrastructure.Persistence.Configurations;

public class HoldingConfiguration : IEntityTypeConfiguration<Holding>
{
    public void Configure(EntityTypeBuilder<Holding> builder)
    {
        builder.ToTable("holdings");

        builder.HasKey(h => h.Id);

        builder.Property(h => h.Name)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(h => h.CurrentValue)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(h => h.Note)
            .HasMaxLength(500);

        builder.HasMany(h => h.Transactions)
            .WithOne(t => t.Holding)
            .HasForeignKey(t => t.HoldingId)
            .OnDelete(DeleteBehavior.Cascade);

        // Required indexes from Section 3
        builder.HasIndex(h => new { h.UserId, h.Type });
    }
}

