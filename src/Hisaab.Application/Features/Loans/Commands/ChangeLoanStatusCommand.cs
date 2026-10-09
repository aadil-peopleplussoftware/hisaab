using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Loans.Commands;

public record ChangeLoanStatusCommand(
    Guid Id,
    LoanStatus Status
) : IRequest;

public class ChangeLoanStatusCommandHandler : IRequestHandler<ChangeLoanStatusCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ChangeLoanStatusCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(ChangeLoanStatusCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;

        var account = await _context.LoanAccounts
            .FirstOrDefaultAsync(l => l.Id == request.Id && l.UserId == currentUserId, cancellationToken);

        if (account == null)
        {
            throw new NotFoundException(nameof(LoanAccount), request.Id);
        }

        account.Status = request.Status;
        await _context.SaveChangesAsync(cancellationToken);
    }
}

