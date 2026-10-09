using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Investments.Commands;

public record DeleteHoldingCommand(Guid Id) : IRequest;

public class DeleteHoldingCommandHandler : IRequestHandler<DeleteHoldingCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeleteHoldingCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(DeleteHoldingCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;

        var holding = await _context.Holdings
            .Include(h => h.Transactions)
            .FirstOrDefaultAsync(h => h.Id == request.Id && h.UserId == currentUserId, cancellationToken);

        if (holding == null)
        {
            throw new NotFoundException(nameof(Holding), request.Id);
        }

        foreach (var txn in holding.Transactions)
        {
            _context.InvestmentTransactions.Remove(txn);
        }

        _context.Holdings.Remove(holding);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

