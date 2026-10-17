using FluentValidation;
using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.MarketAi.Commands;

public record UpdateStockHoldingCommand(
    Guid Id,
    decimal BuyPrice,
    decimal Quantity,
    decimal? TargetProfitPerShare,
    decimal? TargetPrice,
    decimal? StopLossPrice,
    string? Notes
) : IRequest<Unit>;

public class UpdateStockHoldingCommandValidator : AbstractValidator<UpdateStockHoldingCommand>
{
    public UpdateStockHoldingCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.BuyPrice).GreaterThan(0).WithMessage("Buy Price must be greater than 0.");
        RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("Quantity must be greater than 0.");
    }
}

public class UpdateStockHoldingCommandHandler : IRequestHandler<UpdateStockHoldingCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateStockHoldingCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Unit> Handle(UpdateStockHoldingCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var holding = await _context.StockHoldings
            .FirstOrDefaultAsync(h => h.Id == request.Id && h.UserId == userId && !h.IsDeleted, cancellationToken)
            ?? throw new NotFoundException(nameof(StockHolding), request.Id);

        holding.BuyPrice = request.BuyPrice;
        holding.Quantity = request.Quantity;
        holding.TargetProfitPerShare = request.TargetProfitPerShare;
        holding.TargetPrice = request.TargetPrice ?? (request.TargetProfitPerShare.HasValue ? request.BuyPrice + request.TargetProfitPerShare.Value : null);
        holding.StopLossPrice = request.StopLossPrice;
        holding.Notes = request.Notes;
        holding.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}

