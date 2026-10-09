using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hisaab.Infrastructure.Persistence.Configurations;

public class MappingProfileConfiguration : IEntityTypeConfiguration<MappingProfile>
{
    public void Configure(EntityTypeBuilder<MappingProfile> builder)
    {
        builder.ToTable("mapping_profiles");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.Module)
            .IsRequired()
            .HasMaxLength(64);

        builder.Property(m => m.Name)
            .IsRequired()
            .HasMaxLength(128);

        builder.Property(m => m.ColumnMapJson)
            .IsRequired()
            .HasMaxLength(4000);

        builder.Property(m => m.ValueMapJson)
            .HasMaxLength(8000);

        builder.Property(m => m.DateFormat)
            .HasMaxLength(32);

        builder.HasIndex(m => new { m.UserId, m.Module });
    }
}

