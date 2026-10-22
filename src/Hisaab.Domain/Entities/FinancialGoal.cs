using Hisaab.Domain.Common;
using Hisaab.Domain.Enums;

namespace Hisaab.Domain.Entities;

public class FinancialGoal : UserOwnedEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public GoalCategory Category { get; set; } = GoalCategory.Other;
    public decimal TargetAmount { get; set; }
    public decimal CurrentAmount { get; set; }
    public DateTime? TargetDate { get; set; } // Stored in UTC
    public GoalPriority Priority { get; set; } = GoalPriority.Medium;
    public GoalStatus Status { get; set; } = GoalStatus.InProgress;
    public string? Color { get; set; } // Hex accent color, e.g. #0b57d0
    public string? Icon { get; set; } // Emoji or icon key, e.g. 🎯, 🚗, 🏡

    public ICollection<GoalContribution> Contributions { get; set; } = new List<GoalContribution>();
}

