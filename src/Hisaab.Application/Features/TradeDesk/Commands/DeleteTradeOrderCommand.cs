using Hisaab.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.TradeDesk.Commands;

public record DeleteTradeOrderCommand(Guid TradeOrderId) : IRequest<bool>;

public class DeleteTradeOrderCommandHandler : IRequestHandler<DeleteTradeOrderCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteTradeOrderCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteTradeOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.TradeOrders
            .FirstOrDefaultAsync(x => x.Id == request.TradeOrderId, cancellationToken);

        if (order == null) return false;

        _context.TradeOrders.Remove(order);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

