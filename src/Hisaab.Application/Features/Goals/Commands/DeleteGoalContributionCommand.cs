using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Goals.Commands;

public record DeleteGoalContributionCommand(Guid GoalId, Guid ContributionId) : IRequest;

public class DeleteGoalContributionCommandHandler : IRequestHandler<DeleteGoalContributionCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeleteGoalContributionCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(DeleteGoalContributionCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId ?? Guid.Empty;

        var contribution = await _context.GoalContributions
            .Include(c => c.Goal)
            .FirstOrDefaultAsync(c => c.Id == request.ContributionId && c.GoalId == request.GoalId && c.UserId == currentUserId, cancellationToken);

        if (contribution == null)
            throw new NotFoundException(nameof(GoalContribution), request.ContributionId);

        contribution.IsDeleted = true;
        contribution.DeletedAtUtc = DateTime.UtcNow;
        contribution.DeletedBy = currentUserId;

        if (contribution.Goal != null)
        {
            contribution.Goal.CurrentAmount = Math.Max(0, contribution.Goal.CurrentAmount - contribution.Amount);
            if (contribution.Goal.CurrentAmount < contribution.Goal.TargetAmount && contribution.Goal.Status == GoalStatus.Achieved)
            {
                contribution.Goal.Status = GoalStatus.InProgress;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}

