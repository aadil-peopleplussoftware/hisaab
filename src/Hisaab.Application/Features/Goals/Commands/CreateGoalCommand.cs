using FluentValidation;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;

namespace Hisaab.Application.Features.Goals.Commands;

public record CreateGoalCommand(
    string Title,
    string? Description,
    GoalCategory Category,
    decimal TargetAmount,
    decimal? InitialAmount,
    DateTime? TargetDate,
    GoalPriority Priority = GoalPriority.Medium,
    string? Color = null,
    string? Icon = null
) : IRequest<Guid>;

public class CreateGoalCommandValidator : AbstractValidator<CreateGoalCommand>
{
    public CreateGoalCommandValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Goal title is required.")
            .MaximumLength(200).WithMessage("Goal title must not exceed 200 characters.");

        RuleFor(x => x.TargetAmount)
            .GreaterThan(0).WithMessage("Target amount must be greater than zero.");

        RuleFor(x => x.InitialAmount)
            .GreaterThanOrEqualTo(0).When(x => x.InitialAmount.HasValue)
            .WithMessage("Initial amount cannot be negative.");

        RuleFor(x => x.Category)
            .IsInEnum().WithMessage("Valid goal category is required.");

        RuleFor(x => x.Priority)
            .IsInEnum().WithMessage("Valid goal priority is required.");
    }
}

public class CreateGoalCommandHandler : IRequestHandler<CreateGoalCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateGoalCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Guid> Handle(CreateGoalCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId ?? Guid.Empty;
        var initial = request.InitialAmount.HasValue ? Math.Round(request.InitialAmount.Value, 2) : 0m;
        var target = Math.Round(request.TargetAmount, 2);

        var goal = new FinancialGoal
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Category = request.Category,
            TargetAmount = target,
            CurrentAmount = initial,
            TargetDate = request.TargetDate.HasValue 
                ? DateTime.SpecifyKind(request.TargetDate.Value, DateTimeKind.Utc) 
                : null,
            Priority = request.Priority,
            Status = (initial >= target && target > 0) ? GoalStatus.Achieved : GoalStatus.InProgress,
            Color = string.IsNullOrWhiteSpace(request.Color) ? "#0b57d0" : request.Color.Trim(),
            Icon = string.IsNullOrWhiteSpace(request.Icon) ? "🎯" : request.Icon.Trim()
        };

        if (initial > 0)
        {
            var initialContribution = new GoalContribution
            {
                Id = Guid.NewGuid(),
                UserId = currentUserId,
                GoalId = goal.Id,
                Amount = initial,
                ContributionDate = DateTime.UtcNow,
                Source = "Initial Starting Balance",
                Notes = "Goal kick-off deposit"
            };
            goal.Contributions.Add(initialContribution);
        }

        _context.FinancialGoals.Add(goal);
        await _context.SaveChangesAsync(cancellationToken);

        return goal.Id;
    }
}

