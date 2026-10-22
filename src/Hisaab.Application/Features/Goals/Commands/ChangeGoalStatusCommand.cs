using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Goals.Commands;

public record ChangeGoalStatusCommand(Guid Id, GoalStatus Status) : IRequest;

public class ChangeGoalStatusCommandHandler : IRequestHandler<ChangeGoalStatusCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ChangeGoalStatusCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(ChangeGoalStatusCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId ?? Guid.Empty;

        var goal = await _context.FinancialGoals
            .FirstOrDefaultAsync(g => g.Id == request.Id && g.UserId == currentUserId, cancellationToken);

        if (goal == null)
            throw new NotFoundException(nameof(FinancialGoal), request.Id);

        goal.Status = request.Status;
        await _context.SaveChangesAsync(cancellationToken);
    }
}

