using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hisaab.Infrastructure.Persistence.Configurations;

public class EpfEntryConfiguration : IEntityTypeConfiguration<EpfEntry>
{
    public void Configure(EntityTypeBuilder<EpfEntry> builder)
    {
        builder.ToTable("epf_entries");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Month)
            .IsRequired();

        builder.Property(e => e.EmployeeShare)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(e => e.EmployerShare)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(e => e.PensionShare)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(e => e.Interest)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(e => e.Withdrawal)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(e => e.Note)
            .HasMaxLength(500);

        // Required index from Section 3
        builder.HasIndex(e => new { e.UserId, e.Month });
    }
}

