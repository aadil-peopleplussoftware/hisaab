using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Transactions.Commands.DeleteTransaction;

public record DeleteTransactionCommand(Guid Id) : IRequest<Result>;

public class DeleteTransactionCommandHandler : IRequestHandler<DeleteTransactionCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public DeleteTransactionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(DeleteTransactionCommand request, CancellationToken cancellationToken)
    {
        var transaction = await _context.Transactions
            .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

        if (transaction == null)
        {
            throw new NotFoundException("Transaction", request.Id);
        }

        _context.Transactions.Remove(transaction); // Trigger soft-delete interceptor
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

