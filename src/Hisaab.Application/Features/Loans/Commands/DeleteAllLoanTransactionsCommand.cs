using Hisaab.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Loans.Commands;

public record DeleteAllLoanTransactionsCommand(Guid LoanAccountId) : IRequest;

public class DeleteAllLoanTransactionsCommandHandler : IRequestHandler<DeleteAllLoanTransactionsCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeleteAllLoanTransactionsCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(DeleteAllLoanTransactionsCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;

        var transactions = await _context.LoanTransactions
            .Where(t => t.LoanAccountId == request.LoanAccountId && t.UserId == currentUserId)
            .ToListAsync(cancellationToken);

        foreach (var txn in transactions)
        {
            _context.LoanTransactions.Remove(txn);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}

