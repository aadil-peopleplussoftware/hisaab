using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Investments.Commands;

public record DeleteInvestmentTransactionCommand(
    Guid HoldingId,
    Guid TransactionId
) : IRequest;

public class DeleteInvestmentTransactionCommandHandler : IRequestHandler<DeleteInvestmentTransactionCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeleteInvestmentTransactionCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(DeleteInvestmentTransactionCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;

        var transaction = await _context.InvestmentTransactions
            .FirstOrDefaultAsync(t => t.Id == request.TransactionId &&
                                      t.HoldingId == request.HoldingId &&
                                      t.UserId == currentUserId, cancellationToken);

        if (transaction == null)
        {
            throw new NotFoundException(nameof(InvestmentTransaction), request.TransactionId);
        }

        _context.InvestmentTransactions.Remove(transaction);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

