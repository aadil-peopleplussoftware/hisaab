using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hisaab.Infrastructure.Persistence.Configurations;

public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("refresh_tokens");

        builder.HasKey(rt => rt.Id);

        builder.Property(rt => rt.TokenHash)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(rt => rt.DeviceInfo)
            .HasMaxLength(256);

        builder.Property(rt => rt.IpAddress)
            .HasMaxLength(64);

        builder.HasIndex(rt => new { rt.UserId, rt.TokenHash });
        builder.HasIndex(rt => rt.ExpiresAtUtc);
    }
}

