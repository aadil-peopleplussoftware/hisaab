using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hisaab.Infrastructure.Persistence.Configurations;

public class LoanTransactionConfiguration : IEntityTypeConfiguration<LoanTransaction>
{
    public void Configure(EntityTypeBuilder<LoanTransaction> builder)
    {
        builder.ToTable("loan_transactions");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(t => t.Note)
            .HasMaxLength(500);

        builder.HasOne(t => t.LoanAccount)
            .WithMany(l => l.Transactions)
            .HasForeignKey(t => t.LoanAccountId)
            .OnDelete(DeleteBehavior.Cascade);

        // Required indexes from Section 3
        builder.HasIndex(t => new { t.UserId, t.TransactionDate });
        builder.HasIndex(t => new { t.LoanAccountId, t.TransactionDate });
    }
}

