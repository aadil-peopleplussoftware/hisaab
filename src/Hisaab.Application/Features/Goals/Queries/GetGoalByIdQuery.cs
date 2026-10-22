using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.Goals.DTOs;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Goals.Queries;

public record GetGoalByIdQuery(Guid Id) : IRequest<GoalDetailDto>;

public class GetGoalByIdQueryHandler : IRequestHandler<GetGoalByIdQuery, GoalDetailDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetGoalByIdQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<GoalDetailDto> Handle(GetGoalByIdQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId ?? Guid.Empty;

        var goal = await _context.FinancialGoals
            .Include(g => g.Contributions.Where(c => !c.IsDeleted))
            .FirstOrDefaultAsync(g => g.Id == request.Id && g.UserId == currentUserId && !g.IsDeleted, cancellationToken);

        if (goal == null)
            throw new NotFoundException(nameof(FinancialGoal), request.Id);

        var goalDto = GetGoalsQueryHandler.MapToDto(goal);

        var contributionDtos = goal.Contributions
            .Where(c => !c.IsDeleted)
            .OrderByDescending(c => c.ContributionDate)
            .ThenByDescending(c => c.CreatedAtUtc)
            .Select(c => new GoalContributionDto(
                Id: c.Id,
                GoalId: c.GoalId,
                Amount: c.Amount,
                FormattedAmount: $"₹{c.Amount:N2}",
                ContributionDate: c.ContributionDate,
                Source: c.Source ?? "Deposit",
                Notes: c.Notes,
                CreatedAtUtc: c.CreatedAtUtc
            ))
            .ToList();

        return new GoalDetailDto(goalDto, contributionDtos);
    }
}

