using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.MarketAi.DTOs;
using Hisaab.Application.Features.TradeDesk.DTOs;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.TradeDesk.Queries;

public record GetTradeDeskOverviewQuery : IRequest<TradeDeskOverviewDto>;

public class GetTradeDeskOverviewQueryHandler : IRequestHandler<GetTradeDeskOverviewQuery, TradeDeskOverviewDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IStockMarketService _stockMarketService;

    public GetTradeDeskOverviewQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IStockMarketService stockMarketService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _stockMarketService = stockMarketService;
    }

    public async Task<TradeDeskOverviewDto> Handle(GetTradeDeskOverviewQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        var now = DateTime.UtcNow;

        var trades = await _context.TradeOrders
            .AsNoTracking()
            .OrderByDescending(x => x.BuyDate)
            .ToListAsync(cancellationToken);

        var ipos = await _context.IpoApplications
            .AsNoTracking()
            .OrderByDescending(x => x.ApplicationDate)
            .ToListAsync(cancellationToken);

        // Fetch live market quotes for all open trade tickers
        var openTickers = trades
            .Where(t => t.Status == TradeStatus.Open)
            .Select(t => t.Ticker)
            .Distinct()
            .ToList();

        Dictionary<string, MarketQuoteDto> quotes = new(StringComparer.OrdinalIgnoreCase);
        if (openTickers.Count > 0)
        {
            try
            {
                quotes = await _stockMarketService.GetQuotesAsync(openTickers, cancellationToken);
            }
            catch
            {
                // Fallback to empty if quotes service is temporarily unavailable
            }
        }

        var activeTradeDtos = new List<TradeOrderDto>();
        var closedTradeDtos = new List<TradeOrderDto>();

        decimal totalCapitalInTrades = 0;
        decimal totalCurrentValueInTrades = 0;
        decimal totalUnrealizedPnlInTrades = 0;

        decimal totalChargesPaidOnTrades = 0;
        decimal totalRealizedPnlTrades = 0;
        decimal totalNetRealizedPnlTrades = 0;
        decimal totalRealizedCostTrades = 0;

        foreach (var t in trades)
        {
            var curDays = (int)Math.Max(0, (now.Date - t.BuyDate.Date).TotalDays);

            decimal cmp = t.BuyPrice;
            decimal dayChange = 0;
            decimal dayChangePercent = 0;
            decimal currentValue = t.InvestedAmount;
            decimal unrealizedPnl = 0;
            decimal unrealizedPnlPercent = 0;

            if (t.Status == TradeStatus.Open)
            {
                MarketQuoteDto? quote = null;
                if (quotes.TryGetValue(t.Ticker, out var q)) quote = q;
                else if (!t.Ticker.EndsWith(".NS") && quotes.TryGetValue($"{t.Ticker}.NS", out var qNs)) quote = qNs;

                if (quote != null && quote.CurrentPrice > 0)
                {
                    cmp = quote.CurrentPrice;
                    dayChange = quote.DayChange;
                    dayChangePercent = quote.DayChangePercent;
                }

                currentValue = Math.Round(cmp * t.Quantity, 2);
                unrealizedPnl = Math.Round(currentValue - t.InvestedAmount, 2);
                unrealizedPnlPercent = t.InvestedAmount > 0 ? Math.Round((unrealizedPnl / t.InvestedAmount) * 100, 2) : 0;

                totalCapitalInTrades += t.InvestedAmount;
                totalCurrentValueInTrades += currentValue;
                totalUnrealizedPnlInTrades += unrealizedPnl;
            }
            else
            {
                var charges = t.TotalCharges;
                var grossPnl = t.RealizedProfitLoss ?? 0;
                var netPnl = t.NetProfitLoss ?? (grossPnl - charges);

                totalChargesPaidOnTrades += charges;
                totalRealizedPnlTrades += grossPnl;
                totalNetRealizedPnlTrades += netPnl;
                totalRealizedCostTrades += t.InvestedAmount;
            }

            var netProfitLoss = t.NetProfitLoss ?? (t.RealizedProfitLoss.HasValue ? t.RealizedProfitLoss.Value - t.TotalCharges : null);
            var netProfitLossPercentage = t.NetProfitLossPercentage ?? (t.InvestedAmount > 0 && netProfitLoss.HasValue ? Math.Round((netProfitLoss.Value / t.InvestedAmount) * 100, 2) : null);

            var dto = new TradeOrderDto(
                t.Id,
                t.Ticker,
                t.CompanyName,
                t.Exchange,
                t.TradeType,
                t.TradeType.ToString(),
                t.Status,
                t.Status.ToString(),
                t.BuyPrice,
                t.Quantity,
                t.InvestedAmount,
                t.BuyDate,
                t.PlannedHoldingDays,
                t.TargetPrice,
                t.StopLossPrice,
                t.Notes,
                t.SellDate,
                t.SellPrice,
                t.TotalCharges,
                t.RealizedProfitLoss,
                t.RealizedProfitLossPercentage,
                netProfitLoss,
                netProfitLossPercentage,
                t.ActualHoldingDays,
                curDays,
                CurrentMarketPrice: cmp,
                CurrentValue: currentValue,
                UnrealizedProfitLoss: unrealizedPnl,
                UnrealizedProfitLossPercentage: unrealizedPnlPercent,
                DayChange: dayChange,
                DayChangePercent: dayChangePercent
            );

            if (t.Status == TradeStatus.Open)
            {
                activeTradeDtos.Add(dto);
            }
            else
            {
                closedTradeDtos.Add(dto);
            }
        }

        var ipoDtos = new List<IpoApplicationDto>();
        decimal totalCapitalBlockedInIpos = 0;
        int allottedIpos = 0;
        decimal totalIpoProfitLoss = 0;

        foreach (var ipo in ipos)
        {
            var dto = new IpoApplicationDto(
                ipo.Id,
                ipo.CompanyName,
                ipo.Symbol,
                ipo.IssueType,
                ipo.IssueType.ToString(),
                ipo.Status,
                ipo.Status.ToString(),
                ipo.ApplicationDate,
                ipo.AllotmentDate,
                ipo.ListingDate,
                ipo.LotSize,
                ipo.LotsApplied,
                ipo.TotalShares,
                ipo.BidPrice,
                ipo.TotalAmountBlocked,
                ipo.ApplicationNumber,
                ipo.UpiId,
                ipo.SharesAllotted,
                ipo.ListingPrice,
                ipo.SellPrice,
                ipo.SellDate,
                ipo.RealizedProfitLoss,
                ipo.RealizedProfitLossPercentage,
                ipo.Notes
            );

            ipoDtos.Add(dto);

            if (ipo.Status == IpoApplicationStatus.Applied)
            {
                totalCapitalBlockedInIpos += ipo.TotalAmountBlocked;
            }
            if (ipo.Status == IpoApplicationStatus.Allotted || ipo.Status == IpoApplicationStatus.Sold)
            {
                allottedIpos++;
            }
            if (ipo.RealizedProfitLoss.HasValue)
            {
                totalIpoProfitLoss += ipo.RealizedProfitLoss.Value;
            }
        }

        var totalClosedTrades = closedTradeDtos.Count;
        var totalRealizedPnlPct = totalRealizedCostTrades > 0
            ? Math.Round((totalRealizedPnlTrades / totalRealizedCostTrades) * 100, 2)
            : 0;

        var totalNetRealizedPnlPct = totalRealizedCostTrades > 0
            ? Math.Round((totalNetRealizedPnlTrades / totalRealizedCostTrades) * 100, 2)
            : 0;

        var allotmentRate = ipoDtos.Count > 0
            ? Math.Round(((decimal)allottedIpos / ipoDtos.Count) * 100, 1)
            : 0;

        var totalUnrealizedPct = totalCapitalInTrades > 0
            ? Math.Round((totalUnrealizedPnlInTrades / totalCapitalInTrades) * 100, 2)
            : 0;

        var summary = new TradeDeskSummaryDto(
            totalCapitalInTrades,
            totalCurrentValueInTrades,
            totalUnrealizedPnlInTrades,
            totalUnrealizedPct,
            totalCapitalBlockedInIpos,
            activeTradeDtos.Count,
            totalClosedTrades,
            totalRealizedPnlTrades,
            totalRealizedPnlPct,
            totalChargesPaidOnTrades,
            totalNetRealizedPnlTrades,
            totalNetRealizedPnlPct,
            ipoDtos.Count,
            allottedIpos,
            allotmentRate,
            totalIpoProfitLoss
        );

        return new TradeDeskOverviewDto(
            summary,
            activeTradeDtos,
            closedTradeDtos,
            ipoDtos
        );
    }
}

