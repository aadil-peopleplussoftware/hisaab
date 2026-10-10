using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Business.Commands;

public record UpdateTransactionPaymentStatusCommand(Guid Id, BusinessPaymentStatus Status) : IRequest;

public class UpdateTransactionPaymentStatusCommandHandler : IRequestHandler<UpdateTransactionPaymentStatusCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateTransactionPaymentStatusCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(UpdateTransactionPaymentStatusCommand request, CancellationToken cancellationToken)
    {
        var txn = await _context.BusinessTransactions
            .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

        if (txn == null)
        {
            throw new NotFoundException(nameof(BusinessTransaction), request.Id);
        }

        txn.PaymentStatus = request.Status;
        await _context.SaveChangesAsync(cancellationToken);
    }
}

