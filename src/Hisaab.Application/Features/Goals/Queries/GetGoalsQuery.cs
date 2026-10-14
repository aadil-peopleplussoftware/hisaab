using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.Goals.DTOs;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Goals.Queries;

public record GetGoalsResponse(
    List<GoalDto> Goals,
    GoalsSummaryDto Summary
);

public record GetGoalsQuery(
    GoalStatus? Status = null,
    GoalCategory? Category = null,
    GoalPriority? Priority = null,
    string? Search = null
) : IRequest<GetGoalsResponse>;

public class GetGoalsQueryHandler : IRequestHandler<GetGoalsQuery, GetGoalsResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetGoalsQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<GetGoalsResponse> Handle(GetGoalsQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId ?? Guid.Empty;

        var allUserGoals = await _context.FinancialGoals
            .Include(g => g.Contributions.Where(c => !c.IsDeleted))
            .Where(g => g.UserId == currentUserId && !g.IsDeleted)
            .OrderByDescending(g => g.Priority)
            .ThenBy(g => g.TargetDate.HasValue ? 0 : 1)
            .ThenBy(g => g.TargetDate)
            .ToListAsync(cancellationToken);

        // Filter for specific view if requested
        var filtered = allUserGoals.AsEnumerable();

        if (request.Status.HasValue)
            filtered = filtered.Where(g => g.Status == request.Status.Value);

        if (request.Category.HasValue)
            filtered = filtered.Where(g => g.Category == request.Category.Value);

        if (request.Priority.HasValue)
            filtered = filtered.Where(g => g.Priority == request.Priority.Value);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLowerInvariant();
            filtered = filtered.Where(g =>
                g.Title.ToLowerInvariant().Contains(search) ||
                (g.Description != null && g.Description.ToLowerInvariant().Contains(search)));
        }

        var goalDtos = filtered.Select(MapToDto).ToList();

        // Calculate Summary KPIs across all non-deleted goals of user
        var totalTarget = allUserGoals.Sum(g => g.TargetAmount);
        var totalSaved = allUserGoals.Sum(g => g.CurrentAmount);
        var totalRemaining = Math.Max(0, totalTarget - totalSaved);
        var overallPct = totalTarget > 0
            ? Math.Min(100.0, Math.Round((double)(totalSaved / totalTarget) * 100.0, 1))
            : 0.0;

        var summary = new GoalsSummaryDto(
            TotalTargetAmount: totalTarget,
            FormattedTotalTargetAmount: $"₹{totalTarget:N2}",
            TotalSavedAmount: totalSaved,
            FormattedTotalSavedAmount: $"₹{totalSaved:N2}",
            TotalRemainingAmount: totalRemaining,
            FormattedTotalRemainingAmount: $"₹{totalRemaining:N2}",
            OverallPercentageAchieved: overallPct,
            TotalGoalsCount: allUserGoals.Count,
            ActiveGoalsCount: allUserGoals.Count(g => g.Status == GoalStatus.InProgress),
            AchievedGoalsCount: allUserGoals.Count(g => g.Status == GoalStatus.Achieved),
            PausedGoalsCount: allUserGoals.Count(g => g.Status == GoalStatus.Paused)
        );

        return new GetGoalsResponse(goalDtos, summary);
    }

    public static GoalDto MapToDto(FinancialGoal g)
    {
        var remaining = Math.Max(0, g.TargetAmount - g.CurrentAmount);
        var pct = g.TargetAmount > 0
            ? Math.Min(100.0, Math.Round((double)(g.CurrentAmount / g.TargetAmount) * 100.0, 1))
            : 0.0;

        int? daysLeft = null;
        double? monthsLeft = null;
        decimal? monthlySaving = null;

        if (g.TargetDate.HasValue)
        {
            var diffDays = (g.TargetDate.Value.Date - DateTime.UtcNow.Date).TotalDays;
            daysLeft = (int)Math.Max(0, diffDays);
            var mLeft = Math.Max(0.1, Math.Round(diffDays / 30.4375, 1));
            monthsLeft = mLeft;

            if (remaining > 0 && mLeft > 0)
            {
                monthlySaving = Math.Round(remaining / (decimal)mLeft, 2);
            }
        }

        return new GoalDto(
            Id: g.Id,
            Title: g.Title,
            Description: g.Description,
            Category: g.Category,
            CategoryName: FormatCategoryName(g.Category),
            TargetAmount: g.TargetAmount,
            FormattedTargetAmount: $"₹{g.TargetAmount:N2}",
            CurrentAmount: g.CurrentAmount,
            FormattedCurrentAmount: $"₹{g.CurrentAmount:N2}",
            RemainingAmount: remaining,
            FormattedRemainingAmount: $"₹{remaining:N2}",
            PercentageAchieved: pct,
            TargetDate: g.TargetDate,
            FormattedTargetDate: g.TargetDate?.ToString("dd MMM yyyy"),
            DaysRemaining: daysLeft,
            MonthsRemaining: monthsLeft,
            SuggestedMonthlySavings: monthlySaving,
            FormattedSuggestedMonthlySavings: monthlySaving.HasValue ? $"₹{monthlySaving.Value:N2}" : null,
            Priority: g.Priority,
            PriorityName: g.Priority.ToString(),
            Status: g.Status,
            StatusName: g.Status.ToString(),
            Color: string.IsNullOrWhiteSpace(g.Color) ? "#0b57d0" : g.Color,
            Icon: string.IsNullOrWhiteSpace(g.Icon) ? "🎯" : g.Icon,
            CreatedAtUtc: g.CreatedAtUtc,
            ContributionsCount: g.Contributions?.Count(c => !c.IsDeleted) ?? 0
        );
    }

    private static string FormatCategoryName(GoalCategory cat) => cat switch
    {
        GoalCategory.EmergencyFund => "Emergency Fund",
        GoalCategory.DreamHome => "Dream Home",
        GoalCategory.Vehicle => "Vehicle / Car",
        GoalCategory.Vacation => "Vacation & Travel",
        GoalCategory.Gadget => "Gadgets & Tech",
        GoalCategory.Wedding => "Wedding & Life Events",
        GoalCategory.Education => "Education & Upskilling",
        GoalCategory.Retirement => "Retirement Corpus",
        GoalCategory.Business => "Business Capital",
        _ => "Personal Wishlist"
    };
}

