using Hisaab.Domain.Enums;

namespace Hisaab.Application.Features.Goals.DTOs;

public record GoalDto(
    Guid Id,
    string Title,
    string? Description,
    GoalCategory Category,
    string CategoryName,
    decimal TargetAmount,
    string FormattedTargetAmount,
    decimal CurrentAmount,
    string FormattedCurrentAmount,
    decimal RemainingAmount,
    string FormattedRemainingAmount,
    double PercentageAchieved,
    DateTime? TargetDate,
    string? FormattedTargetDate,
    int? DaysRemaining,
    double? MonthsRemaining,
    decimal? SuggestedMonthlySavings,
    string? FormattedSuggestedMonthlySavings,
    GoalPriority Priority,
    string PriorityName,
    GoalStatus Status,
    string StatusName,
    string? Color,
    string? Icon,
    DateTime CreatedAtUtc,
    int ContributionsCount
);

public record GoalContributionDto(
    Guid Id,
    Guid GoalId,
    decimal Amount,
    string FormattedAmount,
    DateTime ContributionDate,
    string? Source,
    string? Notes,
    DateTime CreatedAtUtc
);

public record GoalDetailDto(
    GoalDto Goal,
    List<GoalContributionDto> Contributions
);

public record GoalsSummaryDto(
    decimal TotalTargetAmount,
    string FormattedTotalTargetAmount,
    decimal TotalSavedAmount,
    string FormattedTotalSavedAmount,
    decimal TotalRemainingAmount,
    string FormattedTotalRemainingAmount,
    double OverallPercentageAchieved,
    int TotalGoalsCount,
    int ActiveGoalsCount,
    int AchievedGoalsCount,
    int PausedGoalsCount
);

public record CreateGoalRequest(
    string Title,
    string? Description,
    GoalCategory Category,
    decimal TargetAmount,
    decimal? InitialAmount,
    DateTime? TargetDate,
    GoalPriority Priority,
    string? Color,
    string? Icon
);

public record UpdateGoalRequest(
    string Title,
    string? Description,
    GoalCategory Category,
    decimal TargetAmount,
    DateTime? TargetDate,
    GoalPriority Priority,
    GoalStatus Status,
    string? Color,
    string? Icon
);

public record AddGoalContributionRequest(
    decimal Amount,
    DateTime? ContributionDate,
    string? Source,
    string? Notes
);

