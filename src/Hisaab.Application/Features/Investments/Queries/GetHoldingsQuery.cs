using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.Investments.DTOs;
using Hisaab.Domain.Enums;
using Hisaab.Domain.ValueObjects;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Investments.Queries;

public record GetHoldingsQuery(
    InvestmentType? Type = null,
    string? Search = null
) : IRequest<InvestmentsResponseDto>;

public class GetHoldingsQueryHandler : IRequestHandler<GetHoldingsQuery, InvestmentsResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetHoldingsQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<InvestmentsResponseDto> Handle(GetHoldingsQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;

        // Fetch all user holdings with transactions (defense in depth)
        var allHoldings = await _context.Holdings
            .Include(h => h.Transactions)
            .Where(h => h.UserId == currentUserId)
            .OrderByDescending(h => h.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var holdingDtos = new List<HoldingDto>();

        foreach (var h in allHoldings)
        {
            var bought = h.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Buy).Sum(t => t.Amount);
            var sold = h.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Sell).Sum(t => t.Amount);
            var invested = Math.Max(0m, bought - sold);

            var unitsBought = h.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Buy && t.Units.HasValue).Sum(t => t.Units!.Value);
            var unitsSold = h.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Sell && t.Units.HasValue).Sum(t => t.Units!.Value);
            var netUnits = Math.Max(0m, unitsBought - unitsSold);

            var dividend = h.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Dividend).Sum(t => t.Amount);

            var gainLoss = h.CurrentValue - invested;
            var gainLossPct = invested > 0 ? Math.Round((gainLoss / invested) * 100m, 2) : 0m;

            holdingDtos.Add(new HoldingDto(
                h.Id,
                h.Name,
                h.Type,
                h.Type.ToString(),
                h.CurrentValue,
                new Money(h.CurrentValue).ToIndianFormat(),
                h.ValueUpdatedAtUtc,
                invested,
                new Money(invested).ToIndianFormat(),
                netUnits,
                gainLoss,
                new Money(gainLoss).ToIndianFormat(),
                gainLossPct,
                dividend,
                new Money(dividend).ToIndianFormat(),
                h.Note,
                h.Transactions.Count,
                h.CreatedAtUtc
            ));
        }

        // Global Portfolio Summary across all holdings
        var totalInvested = holdingDtos.Sum(h => h.TotalInvested);
        var totalCurrentValue = holdingDtos.Sum(h => h.CurrentValue);
        var totalGainLoss = totalCurrentValue - totalInvested;
        var overallGainLossPct = totalInvested > 0 ? Math.Round((totalGainLoss / totalInvested) * 100m, 2) : 0m;
        var totalDividend = holdingDtos.Sum(h => h.TotalDividend);

        var summary = new PortfolioSummaryDto(
            totalInvested,
            new Money(totalInvested).ToIndianFormat(),
            totalCurrentValue,
            new Money(totalCurrentValue).ToIndianFormat(),
            totalGainLoss,
            new Money(totalGainLoss).ToIndianFormat(),
            overallGainLossPct,
            totalDividend,
            new Money(totalDividend).ToIndianFormat(),
            holdingDtos.Count
        );

        // Asset Allocation breakdown by InvestmentType
        var allocations = holdingDtos
            .GroupBy(h => h.Type)
            .Select(g =>
            {
                var val = g.Sum(h => h.CurrentValue);
                var pct = totalCurrentValue > 0 ? Math.Round((val / totalCurrentValue) * 100m, 2) : 0m;
                return new AssetAllocationDto(
                    g.Key,
                    g.Key.ToString(),
                    val,
                    new Money(val).ToIndianFormat(),
                    pct,
                    g.Count()
                );
            })
            .OrderByDescending(a => a.TotalValue)
            .ToList();

        // Apply filters to list
        var filtered = holdingDtos.AsEnumerable();

        if (request.Type.HasValue)
        {
            filtered = filtered.Where(h => h.Type == request.Type.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLowerInvariant();
            filtered = filtered.Where(h =>
                h.Name.ToLowerInvariant().Contains(search) ||
                (h.Note != null && h.Note.ToLowerInvariant().Contains(search)));
        }

        return new InvestmentsResponseDto(filtered.ToList(), summary, allocations);
    }
}

