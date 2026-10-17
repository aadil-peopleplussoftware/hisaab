using FluentValidation;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.MarketAi.DTOs;
using Hisaab.Domain.Entities;
using MediatR;

namespace Hisaab.Application.Features.MarketAi.Commands;

public record CreateStockHoldingCommand(
    string Ticker,
    string? CompanyName,
    string Exchange,
    decimal BuyPrice,
    decimal Quantity,
    DateTime? PurchaseDate,
    decimal? TargetProfitPerShare,
    decimal? TargetPrice,
    decimal? StopLossPrice,
    string? Notes
) : IRequest<Guid>;

public class CreateStockHoldingCommandValidator : AbstractValidator<CreateStockHoldingCommand>
{
    public CreateStockHoldingCommandValidator()
    {
        RuleFor(x => x.Ticker).NotEmpty().MaximumLength(50);
        RuleFor(x => x.BuyPrice).GreaterThan(0).WithMessage("Buy Price must be greater than 0.");
        RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("Quantity must be greater than 0.");
    }
}

public class CreateStockHoldingCommandHandler : IRequestHandler<CreateStockHoldingCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateStockHoldingCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Guid> Handle(CreateStockHoldingCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var rawTicker = request.Ticker.Trim().ToUpperInvariant();
        var exchange = string.IsNullOrWhiteSpace(request.Exchange) ? "NSE" : request.Exchange.Trim().ToUpperInvariant();
        string normalizedTicker = rawTicker;
        if (!normalizedTicker.Contains('.') && !normalizedTicker.StartsWith('^'))
        {
            if (exchange == "BSE") normalizedTicker += ".BO";
            else if (exchange == "NSE") normalizedTicker += ".NS";
        }

        var holding = new StockHolding
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Ticker = normalizedTicker,
            CompanyName = !string.IsNullOrWhiteSpace(request.CompanyName) ? request.CompanyName.Trim() : rawTicker,
            Exchange = exchange,
            BuyPrice = request.BuyPrice,
            Quantity = request.Quantity,
            PurchaseDate = request.PurchaseDate ?? DateTime.UtcNow,
            TargetProfitPerShare = request.TargetProfitPerShare,
            TargetPrice = request.TargetPrice ?? (request.TargetProfitPerShare.HasValue ? request.BuyPrice + request.TargetProfitPerShare.Value : null),
            StopLossPrice = request.StopLossPrice,
            Notes = request.Notes,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.StockHoldings.Add(holding);
        await _context.SaveChangesAsync(cancellationToken);

        return holding.Id;
    }
}

