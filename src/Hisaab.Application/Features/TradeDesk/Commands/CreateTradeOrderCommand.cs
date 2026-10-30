using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;

namespace Hisaab.Application.Features.TradeDesk.Commands;

public record CreateTradeOrderCommand(
    string Ticker,
    string CompanyName,
    string Exchange,
    TradeType TradeType,
    decimal BuyPrice,
    decimal Quantity,
    DateTime BuyDate,
    int PlannedHoldingDays,
    decimal? TargetPrice,
    decimal? StopLossPrice,
    string? Notes
) : IRequest<Guid>;

public class CreateTradeOrderCommandHandler : IRequestHandler<CreateTradeOrderCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateTradeOrderCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Guid> Handle(CreateTradeOrderCommand request, CancellationToken cancellationToken)
    {
        var investedAmount = Math.Round(request.BuyPrice * request.Quantity, 2);

        var order = new TradeOrder
        {
            Id = Guid.NewGuid(),
            UserId = _currentUserService.UserId ?? Guid.Empty,
            Ticker = request.Ticker.Trim().ToUpperInvariant(),
            CompanyName = string.IsNullOrWhiteSpace(request.CompanyName) ? request.Ticker.Trim().ToUpperInvariant() : request.CompanyName.Trim(),
            Exchange = string.IsNullOrWhiteSpace(request.Exchange) ? "NSE" : request.Exchange.Trim().ToUpperInvariant(),
            TradeType = request.TradeType,
            Status = TradeStatus.Open,
            BuyPrice = request.BuyPrice,
            Quantity = request.Quantity,
            InvestedAmount = investedAmount,
            BuyDate = request.BuyDate.ToUniversalTime(),
            PlannedHoldingDays = request.PlannedHoldingDays > 0 ? request.PlannedHoldingDays : 10,
            TargetPrice = request.TargetPrice,
            StopLossPrice = request.StopLossPrice,
            Notes = request.Notes?.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.TradeOrders.Add(order);
        await _context.SaveChangesAsync(cancellationToken);

        return order.Id;
    }
}

