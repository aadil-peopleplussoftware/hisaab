using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hisaab.Infrastructure.Persistence.Configurations;

public class ImportBatchConfiguration : IEntityTypeConfiguration<ImportBatch>
{
    public void Configure(EntityTypeBuilder<ImportBatch> builder)
    {
        builder.ToTable("import_batches");

        builder.HasKey(b => b.Id);

        builder.Property(b => b.Module)
            .IsRequired()
            .HasMaxLength(64);

        builder.Property(b => b.FileName)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(b => b.StorageKey)
            .IsRequired()
            .HasMaxLength(512);

        builder.Property(b => b.Status)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(b => b.Mode)
            .IsRequired()
            .HasConversion<int>();

        builder.HasIndex(b => new { b.UserId, b.CreatedAtUtc });

        builder.HasMany(b => b.Errors)
            .WithOne(e => e.Batch)
            .HasForeignKey(e => e.BatchId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
