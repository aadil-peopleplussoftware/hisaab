using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.TradeDesk.Commands;

public record UpdateClosedTradeOrderCommand(
    Guid TradeOrderId,
    decimal SellPrice,
    DateTime SellDate,
    decimal TotalCharges = 0,
    string? Notes = null
) : IRequest<bool>;

public class UpdateClosedTradeOrderCommandHandler : IRequestHandler<UpdateClosedTradeOrderCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateClosedTradeOrderCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateClosedTradeOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.TradeOrders
            .FirstOrDefaultAsync(x => x.Id == request.TradeOrderId, cancellationToken);

        if (order == null) return false;

        var sellDateUtc = request.SellDate.ToUniversalTime();
        var sellTotal = Math.Round(request.SellPrice * order.Quantity, 2);
        var grossPnl = Math.Round(sellTotal - order.InvestedAmount, 2);
        var grossPnlPct = order.InvestedAmount > 0
            ? Math.Round((grossPnl / order.InvestedAmount) * 100, 2)
            : 0;

        var totalCharges = Math.Max(0, request.TotalCharges);
        var netPnl = Math.Round(grossPnl - totalCharges, 2);
        var netPnlPct = order.InvestedAmount > 0
            ? Math.Round((netPnl / order.InvestedAmount) * 100, 2)
            : 0;

        var holdingDays = (int)Math.Max(1, Math.Round((sellDateUtc.Date - order.BuyDate.Date).TotalDays));

        order.Status = TradeStatus.Closed;
        order.SellPrice = request.SellPrice;
        order.SellDate = sellDateUtc;
        order.TotalCharges = totalCharges;
        order.RealizedProfitLoss = grossPnl;
        order.RealizedProfitLossPercentage = grossPnlPct;
        order.NetProfitLoss = netPnl;
        order.NetProfitLossPercentage = netPnlPct;
        order.ActualHoldingDays = holdingDays;

        if (request.Notes != null)
        {
            order.Notes = request.Notes.Trim();
        }

        order.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

