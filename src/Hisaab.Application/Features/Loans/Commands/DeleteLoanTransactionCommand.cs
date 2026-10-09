using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Loans.Commands;

public record DeleteLoanTransactionCommand(
    Guid LoanAccountId,
    Guid TransactionId
) : IRequest;

public class DeleteLoanTransactionCommandHandler : IRequestHandler<DeleteLoanTransactionCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeleteLoanTransactionCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(DeleteLoanTransactionCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;

        var transaction = await _context.LoanTransactions
            .FirstOrDefaultAsync(t => t.Id == request.TransactionId &&
                                      t.LoanAccountId == request.LoanAccountId &&
                                      t.UserId == currentUserId, cancellationToken);

        if (transaction == null)
        {
            throw new NotFoundException(nameof(LoanTransaction), request.TransactionId);
        }

        _context.LoanTransactions.Remove(transaction);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

