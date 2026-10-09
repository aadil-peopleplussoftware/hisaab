using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hisaab.Infrastructure.Persistence.Configurations;

public class InvestmentTransactionConfiguration : IEntityTypeConfiguration<InvestmentTransaction>
{
    public void Configure(EntityTypeBuilder<InvestmentTransaction> builder)
    {
        builder.ToTable("investment_transactions");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(t => t.Units)
            .HasPrecision(18, 4);

        builder.Property(t => t.Note)
            .HasMaxLength(500);

        builder.HasOne(t => t.Holding)
            .WithMany(h => h.Transactions)
            .HasForeignKey(t => t.HoldingId)
            .OnDelete(DeleteBehavior.Cascade);

        // Required indexes from Section 3
        builder.HasIndex(t => new { t.UserId, t.TransactionDate });
        builder.HasIndex(t => new { t.HoldingId, t.TransactionDate });
    }
}

