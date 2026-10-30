using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.TradeDesk.Commands;

public record UpdateIpoStatusCommand(
    Guid IpoId,
    IpoApplicationStatus Status,
    int? SharesAllotted,
    decimal? ListingPrice,
    decimal? SellPrice,
    DateTime? SellDate,
    string? Notes
) : IRequest<bool>;

public class UpdateIpoStatusCommandHandler : IRequestHandler<UpdateIpoStatusCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateIpoStatusCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateIpoStatusCommand request, CancellationToken cancellationToken)
    {
        var ipo = await _context.IpoApplications
            .FirstOrDefaultAsync(x => x.Id == request.IpoId, cancellationToken);

        if (ipo == null) return false;

        ipo.Status = request.Status;

        if (request.SharesAllotted.HasValue)
        {
            ipo.SharesAllotted = request.SharesAllotted.Value;
        }

        if (request.ListingPrice.HasValue)
        {
            ipo.ListingPrice = request.ListingPrice.Value;
        }

        if (request.Status == IpoApplicationStatus.Sold && request.SellPrice.HasValue && ipo.SharesAllotted > 0)
        {
            ipo.SellPrice = request.SellPrice.Value;
            ipo.SellDate = (request.SellDate ?? DateTime.UtcNow).ToUniversalTime();

            var allottedCost = Math.Round(ipo.SharesAllotted * ipo.BidPrice, 2);
            var sellTotal = Math.Round(ipo.SharesAllotted * request.SellPrice.Value, 2);
            var pnl = Math.Round(sellTotal - allottedCost, 2);
            var pnlPct = allottedCost > 0 ? Math.Round((pnl / allottedCost) * 100, 2) : 0;

            ipo.RealizedProfitLoss = pnl;
            ipo.RealizedProfitLossPercentage = pnlPct;
        }

        if (!string.IsNullOrWhiteSpace(request.Notes))
        {
            ipo.Notes = string.IsNullOrWhiteSpace(ipo.Notes)
                ? request.Notes.Trim()
                : $"{ipo.Notes} | {request.Notes.Trim()}";
        }

        ipo.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

