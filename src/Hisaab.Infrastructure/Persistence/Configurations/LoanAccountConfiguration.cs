using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hisaab.Infrastructure.Persistence.Configurations;

public class LoanAccountConfiguration : IEntityTypeConfiguration<LoanAccount>
{
    public void Configure(EntityTypeBuilder<LoanAccount> builder)
    {
        builder.ToTable("loan_accounts");

        builder.HasKey(l => l.Id);

        builder.Property(l => l.Name)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(l => l.Counterparty)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(l => l.Principal)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(l => l.InterestRate)
            .HasPrecision(5, 2)
            .IsRequired();

        builder.Property(l => l.Note)
            .HasMaxLength(1000);

        builder.HasMany(l => l.Transactions)
            .WithOne(t => t.LoanAccount)
            .HasForeignKey(t => t.LoanAccountId)
            .OnDelete(DeleteBehavior.Cascade);

        // Required indexes from Section 3
        builder.HasIndex(l => new { l.UserId, l.StartDate });
        builder.HasIndex(l => new { l.UserId, l.Status });
        builder.HasIndex(l => new { l.UserId, l.Direction });
    }
}

