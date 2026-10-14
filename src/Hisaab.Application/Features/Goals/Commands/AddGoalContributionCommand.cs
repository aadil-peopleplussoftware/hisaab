using FluentValidation;
using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Goals.Commands;

public record AddGoalContributionCommand(
    Guid GoalId,
    decimal Amount,
    DateTime? ContributionDate,
    string? Source,
    string? Notes
) : IRequest<Guid>;

public class AddGoalContributionCommandValidator : AbstractValidator<AddGoalContributionCommand>
{
    public AddGoalContributionCommandValidator()
    {
        RuleFor(x => x.GoalId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Contribution amount must be greater than zero.");
        RuleFor(x => x.Source).MaximumLength(150);
        RuleFor(x => x.Notes).MaximumLength(500);
    }
}

public class AddGoalContributionCommandHandler : IRequestHandler<AddGoalContributionCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public AddGoalContributionCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Guid> Handle(AddGoalContributionCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId ?? Guid.Empty;

        var goal = await _context.FinancialGoals
            .FirstOrDefaultAsync(g => g.Id == request.GoalId && g.UserId == currentUserId, cancellationToken);

        if (goal == null)
            throw new NotFoundException(nameof(FinancialGoal), request.GoalId);

        var amount = Math.Round(request.Amount, 2);
        var date = request.ContributionDate.HasValue
            ? DateTime.SpecifyKind(request.ContributionDate.Value, DateTimeKind.Utc)
            : DateTime.UtcNow;

        var contribution = new GoalContribution
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            GoalId = goal.Id,
            Amount = amount,
            ContributionDate = date,
            Source = request.Source?.Trim(),
            Notes = request.Notes?.Trim()
        };

        _context.GoalContributions.Add(contribution);

        // Update goal progress
        goal.CurrentAmount += amount;
        if (goal.CurrentAmount >= goal.TargetAmount && goal.Status == GoalStatus.InProgress)
        {
            goal.Status = GoalStatus.Achieved;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return contribution.Id;
    }
}

