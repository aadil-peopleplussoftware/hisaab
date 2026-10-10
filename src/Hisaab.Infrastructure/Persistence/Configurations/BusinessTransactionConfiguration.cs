using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hisaab.Infrastructure.Persistence.Configurations;

public class BusinessTransactionConfiguration : IEntityTypeConfiguration<BusinessTransaction>
{
    public void Configure(EntityTypeBuilder<BusinessTransaction> builder)
    {
        builder.ToTable("business_transactions");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Category)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(t => t.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(t => t.TaxRatePercent)
            .HasPrecision(5, 2)
            .IsRequired();

        builder.Property(t => t.TaxAmount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(t => t.TotalAmount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(t => t.Counterparty)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(t => t.InvoiceNumber)
            .HasMaxLength(100);

        builder.Property(t => t.PaymentMethod)
            .HasMaxLength(100);

        builder.Property(t => t.Description)
            .HasMaxLength(1000);

        builder.Property(t => t.AttachmentUrl)
            .HasMaxLength(500);

        builder.HasIndex(t => new { t.UserId, t.BusinessId, t.TransactionDate });
        builder.HasIndex(t => new { t.UserId, t.Type });
        builder.HasIndex(t => new { t.UserId, t.PaymentStatus });
    }
}
