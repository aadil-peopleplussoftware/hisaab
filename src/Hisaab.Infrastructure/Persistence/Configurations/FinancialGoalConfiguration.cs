using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hisaab.Infrastructure.Persistence.Configurations;

public class FinancialGoalConfiguration : IEntityTypeConfiguration<FinancialGoal>
{
    public void Configure(EntityTypeBuilder<FinancialGoal> builder)
    {
        builder.ToTable("financial_goals");

        builder.HasKey(g => g.Id);

        builder.Property(g => g.Title)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(g => g.Description)
            .HasMaxLength(1000);

        builder.Property(g => g.TargetAmount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(g => g.CurrentAmount)
            .HasPrecision(18, 2)
            .HasDefaultValue(0m)
            .IsRequired();

        builder.Property(g => g.Category)
            .HasDefaultValue(GoalCategory.Other)
            .IsRequired();

        builder.Property(g => g.Priority)
            .HasDefaultValue(GoalPriority.Medium)
            .IsRequired();

        builder.Property(g => g.Status)
            .HasDefaultValue(GoalStatus.InProgress)
            .IsRequired();

        builder.Property(g => g.Color)
            .HasMaxLength(30);

        builder.Property(g => g.Icon)
            .HasMaxLength(50);

        builder.HasMany(g => g.Contributions)
            .WithOne(c => c.Goal)
            .HasForeignKey(c => c.GoalId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(g => new { g.UserId, g.Status });
        builder.HasIndex(g => new { g.UserId, g.Category });
        builder.HasIndex(g => new { g.UserId, g.Priority });
        builder.HasIndex(g => new { g.UserId, g.TargetDate });
    }
}

public class GoalContributionConfiguration : IEntityTypeConfiguration<GoalContribution>
{
    public void Configure(EntityTypeBuilder<GoalContribution> builder)
    {
        builder.ToTable("goal_contributions");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(c => c.Source)
            .HasMaxLength(150);

        builder.Property(c => c.Notes)
            .HasMaxLength(500);

        builder.HasIndex(c => new { c.GoalId, c.ContributionDate });
        builder.HasIndex(c => new { c.UserId, c.ContributionDate });
    }
}

