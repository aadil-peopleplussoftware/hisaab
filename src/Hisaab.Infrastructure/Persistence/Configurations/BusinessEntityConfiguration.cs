using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hisaab.Infrastructure.Persistence.Configurations;

public class BusinessEntityConfiguration : IEntityTypeConfiguration<BusinessEntity>
{
    public void Configure(EntityTypeBuilder<BusinessEntity> builder)
    {
        builder.ToTable("businesses");

        builder.HasKey(b => b.Id);

        builder.Property(b => b.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(b => b.LegalName)
            .HasMaxLength(200);

        builder.Property(b => b.Currency)
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(b => b.TaxId)
            .HasMaxLength(50);

        builder.Property(b => b.Description)
            .HasMaxLength(1000);

        builder.Property(b => b.Color)
            .HasMaxLength(20);

        builder.HasMany(b => b.Transactions)
            .WithOne(t => t.Business)
            .HasForeignKey(t => t.BusinessId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(b => new { b.UserId, b.IsActive });
        builder.HasIndex(b => new { b.UserId, b.Name });
    }
}
