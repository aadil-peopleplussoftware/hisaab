using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Goals.Commands;

public record DeleteGoalCommand(Guid Id) : IRequest;

public class DeleteGoalCommandHandler : IRequestHandler<DeleteGoalCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeleteGoalCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(DeleteGoalCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId ?? Guid.Empty;

        var goal = await _context.FinancialGoals
            .Include(g => g.Contributions)
            .FirstOrDefaultAsync(g => g.Id == request.Id && g.UserId == currentUserId, cancellationToken);

        if (goal == null)
            throw new NotFoundException(nameof(FinancialGoal), request.Id);

        goal.IsDeleted = true;
        goal.DeletedAtUtc = DateTime.UtcNow;
        goal.DeletedBy = currentUserId;

        foreach (var contribution in goal.Contributions)
        {
            contribution.IsDeleted = true;
            contribution.DeletedAtUtc = DateTime.UtcNow;
            contribution.DeletedBy = currentUserId;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}

