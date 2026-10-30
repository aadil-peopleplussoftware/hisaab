using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.TradeDesk.Commands;

public record ReopenTradeOrderCommand(Guid TradeOrderId) : IRequest<bool>;

public class ReopenTradeOrderCommandHandler : IRequestHandler<ReopenTradeOrderCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public ReopenTradeOrderCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(ReopenTradeOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.TradeOrders
            .FirstOrDefaultAsync(x => x.Id == request.TradeOrderId, cancellationToken);

        if (order == null) return false;

        order.Status = TradeStatus.Open;
        order.SellPrice = null;
        order.SellDate = null;
        order.TotalCharges = 0;
        order.RealizedProfitLoss = null;
        order.RealizedProfitLossPercentage = null;
        order.NetProfitLoss = null;
        order.NetProfitLossPercentage = null;
        order.ActualHoldingDays = null;
        order.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

