using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Business.Commands;

public record DeleteBusinessTransactionCommand(Guid Id) : IRequest;

public class DeleteBusinessTransactionCommandHandler : IRequestHandler<DeleteBusinessTransactionCommand>
{
    private readonly IApplicationDbContext _context;

    public DeleteBusinessTransactionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeleteBusinessTransactionCommand request, CancellationToken cancellationToken)
    {
        var txn = await _context.BusinessTransactions
            .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

        if (txn == null)
        {
            throw new NotFoundException(nameof(BusinessTransaction), request.Id);
        }

        _context.BusinessTransactions.Remove(txn);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

