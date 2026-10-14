using FluentValidation;
using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Goals.Commands;

public record UpdateGoalCommand(
    Guid Id,
    string Title,
    string? Description,
    GoalCategory Category,
    decimal TargetAmount,
    DateTime? TargetDate,
    GoalPriority Priority,
    GoalStatus Status,
    string? Color,
    string? Icon
) : IRequest;

public class UpdateGoalCommandValidator : AbstractValidator<UpdateGoalCommand>
{
    public UpdateGoalCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.TargetAmount).GreaterThan(0);
        RuleFor(x => x.Category).IsInEnum();
        RuleFor(x => x.Priority).IsInEnum();
        RuleFor(x => x.Status).IsInEnum();
    }
}

public class UpdateGoalCommandHandler : IRequestHandler<UpdateGoalCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateGoalCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(UpdateGoalCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId ?? Guid.Empty;

        var goal = await _context.FinancialGoals
            .FirstOrDefaultAsync(g => g.Id == request.Id && g.UserId == currentUserId, cancellationToken);

        if (goal == null)
            throw new NotFoundException(nameof(FinancialGoal), request.Id);

        goal.Title = request.Title.Trim();
        goal.Description = request.Description?.Trim();
        goal.Category = request.Category;
        goal.TargetAmount = Math.Round(request.TargetAmount, 2);
        goal.TargetDate = request.TargetDate.HasValue
            ? DateTime.SpecifyKind(request.TargetDate.Value, DateTimeKind.Utc)
            : null;
        goal.Priority = request.Priority;
        goal.Status = request.Status;

        if (!string.IsNullOrWhiteSpace(request.Color))
            goal.Color = request.Color.Trim();

        if (!string.IsNullOrWhiteSpace(request.Icon))
            goal.Icon = request.Icon.Trim();

        // If goal target is met, auto-mark achieved
        if (goal.CurrentAmount >= goal.TargetAmount && goal.Status == GoalStatus.InProgress)
        {
            goal.Status = GoalStatus.Achieved;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}

