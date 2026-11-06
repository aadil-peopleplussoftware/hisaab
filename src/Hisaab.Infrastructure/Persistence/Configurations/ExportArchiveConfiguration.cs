using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hisaab.Infrastructure.Persistence.Configurations;

public class ExportArchiveConfiguration : IEntityTypeConfiguration<ExportArchive>
{
    public void Configure(EntityTypeBuilder<ExportArchive> builder)
    {
        builder.ToTable("export_archives");

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

        builder.Property(b => b.Format)
            .IsRequired()
            .HasMaxLength(16);

        builder.HasIndex(b => new { b.UserId, b.CreatedAtUtc });
    }
}

