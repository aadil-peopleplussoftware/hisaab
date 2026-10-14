using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public class GoalContribution : UserOwnedEntity
{
    public Guid GoalId { get; set; }
    public decimal Amount { get; set; }
    public DateTime ContributionDate { get; set; } // Stored in UTC
    public string? Source { get; set; } // e.g. "Monthly Savings", "Bonus", "Side Hustle"
    public string? Notes { get; set; }

    public FinancialGoal Goal { get; set; } = null!;
}

