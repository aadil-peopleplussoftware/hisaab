using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hisaab.Infrastructure.Persistence.Configurations;

public class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ToTable("transactions");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(t => t.Note)
            .HasMaxLength(500);

        builder.Property(t => t.AttachmentUrl)
            .HasMaxLength(1000);

        builder.Property(t => t.AttachmentFileName)
            .HasMaxLength(255);

        builder.Property(t => t.AttachmentFileType)
            .HasMaxLength(100);

        builder.HasOne(t => t.Attachment)
            .WithMany()
            .HasForeignKey(t => t.AttachmentId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(t => t.Category)
            .WithMany(c => c.Transactions)
            .HasForeignKey(t => t.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        // Required indexes from Section 3
        builder.HasIndex(t => new { t.UserId, t.TransactionDate });
        builder.HasIndex(t => new { t.UserId, t.CategoryId });
    }
}

