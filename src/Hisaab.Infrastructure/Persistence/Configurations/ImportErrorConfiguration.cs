using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hisaab.Infrastructure.Persistence.Configurations;

public class ImportErrorConfiguration : IEntityTypeConfiguration<ImportError>
{
    public void Configure(EntityTypeBuilder<ImportError> builder)
    {
        builder.ToTable("import_errors");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Column)
            .HasMaxLength(128);

        builder.Property(e => e.Value)
            .HasMaxLength(512);

        builder.Property(e => e.Message)
            .IsRequired()
            .HasMaxLength(1024);

        builder.HasIndex(e => new { e.BatchId, e.RowNumber });
    }
}
