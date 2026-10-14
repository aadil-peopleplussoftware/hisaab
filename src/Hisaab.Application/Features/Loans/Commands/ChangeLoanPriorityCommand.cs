using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Loans.Commands;

public record ChangeLoanPriorityCommand(
    Guid Id,
    LoanPriority Priority
) : IRequest;

public class ChangeLoanPriorityCommandHandler : IRequestHandler<ChangeLoanPriorityCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ChangeLoanPriorityCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(ChangeLoanPriorityCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;

        var account = await _context.LoanAccounts
            .FirstOrDefaultAsync(l => l.Id == request.Id && l.UserId == currentUserId, cancellationToken);

        if (account == null)
        {
            throw new NotFoundException(nameof(LoanAccount), request.Id);
        }

        account.Priority = request.Priority;
        await _context.SaveChangesAsync(cancellationToken);
    }
}

