using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.MarketAi.Commands;

public record DeleteStockHoldingCommand(Guid Id) : IRequest<Unit>;

public class DeleteStockHoldingCommandHandler : IRequestHandler<DeleteStockHoldingCommand, Unit>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeleteStockHoldingCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Unit> Handle(DeleteStockHoldingCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var holding = await _context.StockHoldings
            .FirstOrDefaultAsync(h => h.Id == request.Id && h.UserId == userId && !h.IsDeleted, cancellationToken)
            ?? throw new NotFoundException(nameof(StockHolding), request.Id);

        holding.IsDeleted = true;
        holding.DeletedAtUtc = DateTime.UtcNow;
        holding.DeletedBy = userId;

        await _context.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}

