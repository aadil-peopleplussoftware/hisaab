using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Loans.Commands;

public record DeleteLoanAccountCommand(Guid Id) : IRequest;

public class DeleteLoanAccountCommandHandler : IRequestHandler<DeleteLoanAccountCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeleteLoanAccountCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(DeleteLoanAccountCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;

        var account = await _context.LoanAccounts
            .Include(l => l.Transactions)
            .FirstOrDefaultAsync(l => l.Id == request.Id && l.UserId == currentUserId, cancellationToken);

        if (account == null)
        {
            throw new NotFoundException(nameof(LoanAccount), request.Id);
        }

        // Soft delete the loan transactions
        foreach (var txn in account.Transactions)
        {
            _context.LoanTransactions.Remove(txn);
        }

        _context.LoanAccounts.Remove(account);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

