using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.MarketAi.DTOs;
using Hisaab.Application.Features.TradeDesk.DTOs;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.TradeDesk.Queries;

public record GetTradeDeskDashboardQuery : IRequest<TradeDeskDashboardDto>;

public class GetTradeDeskDashboardQueryHandler : IRequestHandler<GetTradeDeskDashboardQuery, TradeDeskDashboardDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IStockMarketService _stockMarketService;

    public GetTradeDeskDashboardQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IStockMarketService stockMarketService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _stockMarketService = stockMarketService;
    }

    public async Task<TradeDeskDashboardDto> Handle(GetTradeDeskDashboardQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var trades = await _context.TradeOrders
            .AsNoTracking()
            .OrderByDescending(x => x.BuyDate)
            .ToListAsync(cancellationToken);

        var ipos = await _context.IpoApplications
            .AsNoTracking()
            .OrderByDescending(x => x.ApplicationDate)
            .ToListAsync(cancellationToken);

        // Fetch live quotes for open trades
        var openTrades = trades.Where(t => t.Status == TradeStatus.Open).ToList();
        var closedTrades = trades.Where(t => t.Status == TradeStatus.Closed).ToList();

        var openTickers = openTrades.Select(t => t.Ticker).Distinct().ToList();
        Dictionary<string, MarketQuoteDto> quotes = new(StringComparer.OrdinalIgnoreCase);

        if (openTickers.Count > 0)
        {
            try
            {
                quotes = await _stockMarketService.GetQuotesAsync(openTickers, cancellationToken);
            }
            catch
            {
                // Fallback to empty if quotes service temporarily unavailable
            }
        }

        // 1. Process Open Trades (Active Capital & Today's Unrealized Movement)
        decimal activeCapitalInvested = 0;
        decimal activeCurrentValuation = 0;
        decimal activeUnrealizedPnl = 0;

        decimal todayUnrealizedPnl = 0;
        string? todayTopGainerTicker = null;
        decimal todayTopGainerGain = 0;
        decimal todayTopGainerChangePct = 0;

        string? todayTopLoserTicker = null;
        decimal todayTopLoserLoss = 0;
        decimal todayTopLoserChangePct = 0;

        int tradesNearTargetCount = 0;
        int tradesNearStopLossCount = 0;
        int tradesBreachedStopLossCount = 0;

        var activeDtos = new List<TradeOrderDto>();

        foreach (var t in openTrades)
        {
            decimal cmp = t.BuyPrice;
            decimal dayChange = 0;
            decimal dayChangePercent = 0;

            MarketQuoteDto? quote = null;
            if (quotes.TryGetValue(t.Ticker, out var q)) quote = q;
            else if (!t.Ticker.EndsWith(".NS") && quotes.TryGetValue($"{t.Ticker}.NS", out var qNs)) quote = qNs;

            if (quote != null && quote.CurrentPrice > 0)
            {
                cmp = quote.CurrentPrice;
                dayChange = quote.DayChange;
                dayChangePercent = quote.DayChangePercent;
            }

            var curVal = Math.Round(cmp * t.Quantity, 2);
            var unPnl = Math.Round(curVal - t.InvestedAmount, 2);
            var unPnlPct = t.InvestedAmount > 0 ? Math.Round((unPnl / t.InvestedAmount) * 100, 2) : 0;

            activeCapitalInvested += t.InvestedAmount;
            activeCurrentValuation += curVal;
            activeUnrealizedPnl += unPnl;

            // Today's movement on this active position
            decimal todayPositionMove;
            if (t.BuyDate.Date >= now.Date)
            {
                // Bought today: today's movement is the total gain/loss since entry!
                todayPositionMove = unPnl;
            }
            else
            {
                // Bought on an earlier date: today's movement is quantity * dayChange
                todayPositionMove = Math.Round(t.Quantity * dayChange, 2);
            }

            todayUnrealizedPnl += todayPositionMove;

            if (todayPositionMove > 0 && (todayTopGainerTicker == null || todayPositionMove > todayTopGainerGain))
            {
                todayTopGainerGain = todayPositionMove;
                todayTopGainerTicker = t.Ticker;
                todayTopGainerChangePct = dayChangePercent;
            }

            if (todayPositionMove < 0 && (todayTopLoserTicker == null || todayPositionMove < todayTopLoserLoss))
            {
                todayTopLoserLoss = todayPositionMove;
                todayTopLoserTicker = t.Ticker;
                todayTopLoserChangePct = dayChangePercent;
            }

            // Target & Stop-Loss Proximity:
            // Only count Near Target if the position is in PROFIT (cmp > BuyPrice) and within 5% of target
            if (t.TargetPrice.HasValue && t.TargetPrice.Value > 0 && cmp > t.BuyPrice)
            {
                if (cmp >= t.TargetPrice.Value * 0.95m)
                {
                    tradesNearTargetCount++;
                }
            }

            if (t.StopLossPrice.HasValue && t.StopLossPrice.Value > 0)
            {
                if (cmp <= t.StopLossPrice.Value)
                {
                    tradesBreachedStopLossCount++;
                }
                else if (cmp <= t.StopLossPrice.Value * 1.03m) // Within 3% of SL
                {
                    tradesNearStopLossCount++;
                }
            }

            var daysElapsed = (int)Math.Max(0, (now.Date - t.BuyDate.Date).TotalDays);

            activeDtos.Add(new TradeOrderDto(
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
                null,
                null,
                t.TotalCharges,
                null,
                null,
                null,
                null,
                null,
                daysElapsed,
                cmp,
                curVal,
                unPnl,
                unPnlPct,
                dayChange,
                dayChangePercent
            ));
        }

        // 2. Process Closed Trades & Realized Metrics
        decimal totalGrossRealized = 0;
        decimal totalChargesPaid = 0;
        decimal totalNetRealized = 0;
        decimal totalClosedCost = 0;

        int winningTradesCount = 0;
        int losingTradesCount = 0;
        decimal totalWinAmount = 0;
        decimal totalLossAmount = 0;

        string? bestTradeTicker = null;
        decimal bestTradeNetProfit = decimal.MinValue;
        decimal bestTradeNetProfitPct = 0;

        string? worstTradeTicker = null;
        decimal worstTradeNetLoss = decimal.MaxValue;
        decimal worstTradeNetLossPct = 0;

        decimal totalActualHoldingDays = 0;
        int adheredPlannedDaysCount = 0;

        decimal todayRealizedPnl = 0;
        int tradesClosedTodayCount = 0;

        foreach (var t in closedTrades)
        {
            var grossPnl = t.RealizedProfitLoss ?? (t.SellPrice.HasValue ? (t.SellPrice.Value * t.Quantity - t.InvestedAmount) : 0);
            var charges = t.TotalCharges;
            var netPnl = t.NetProfitLoss ?? (grossPnl - charges);
            var netPnlPct = t.InvestedAmount > 0 ? Math.Round((netPnl / t.InvestedAmount) * 100, 2) : 0;

            totalGrossRealized += grossPnl;
            totalChargesPaid += charges;
            totalNetRealized += netPnl;
            totalClosedCost += t.InvestedAmount;

            if (netPnl > 0)
            {
                winningTradesCount++;
                totalWinAmount += netPnl;
            }
            else if (netPnl < 0)
            {
                losingTradesCount++;
                totalLossAmount += Math.Abs(netPnl);
            }

            if (netPnl > 0 && netPnl > bestTradeNetProfit)
            {
                bestTradeNetProfit = netPnl;
                bestTradeTicker = t.Ticker;
                bestTradeNetProfitPct = netPnlPct;
            }

            if (netPnl < 0 && netPnl < worstTradeNetLoss)
            {
                worstTradeNetLoss = netPnl;
                worstTradeTicker = t.Ticker;
                worstTradeNetLossPct = netPnlPct;
            }

            var actualDays = t.ActualHoldingDays ?? (t.SellDate.HasValue ? (int)Math.Max(1, (t.SellDate.Value.Date - t.BuyDate.Date).TotalDays) : 1);
            totalActualHoldingDays += actualDays;

            if (actualDays <= t.PlannedHoldingDays)
            {
                adheredPlannedDaysCount++;
            }

            // Trades closed today
            if (t.SellDate.HasValue && t.SellDate.Value.Date == now.Date)
            {
                todayRealizedPnl += netPnl;
                tradesClosedTodayCount++;
            }
        }

        if (bestTradeNetProfit == decimal.MinValue)
        {
            bestTradeNetProfit = 0;
            bestTradeTicker = null;
        }

        if (worstTradeNetLoss == decimal.MaxValue)
        {
            worstTradeNetLoss = 0;
            worstTradeTicker = null;
        }

        int totalClosedCount = closedTrades.Count;
        decimal winRatePercentage = totalClosedCount > 0 ? Math.Round(((decimal)winningTradesCount / totalClosedCount) * 100, 1) : 0;
        decimal averageWinAmount = winningTradesCount > 0 ? Math.Round(totalWinAmount / winningTradesCount, 2) : 0;
        decimal averageLossAmount = losingTradesCount > 0 ? Math.Round(totalLossAmount / losingTradesCount, 2) : 0;
        decimal profitFactor = totalLossAmount > 0 ? Math.Round(totalWinAmount / totalLossAmount, 2) : (totalWinAmount > 0 ? 99.9m : 1.0m);
        decimal chargesToGrossProfitPercentage = totalGrossRealized > 0 ? Math.Round((totalChargesPaid / totalGrossRealized) * 100, 1) : 0;
        decimal averageHoldingDays = totalClosedCount > 0 ? Math.Round(totalActualHoldingDays / totalClosedCount, 1) : 0;
        decimal plannedAdherencePercentage = totalClosedCount > 0 ? Math.Round(((decimal)adheredPlannedDaysCount / totalClosedCount) * 100, 1) : 100;

        decimal totalNetRealizedPct = totalClosedCost > 0 ? Math.Round((totalNetRealized / totalClosedCost) * 100, 2) : 0;

        // Today's Aggregate Movement
        decimal todayTotalPnl = Math.Round(todayUnrealizedPnl + todayRealizedPnl, 2);
        decimal todayBaseCapital = activeCapitalInvested > 0 ? activeCapitalInvested : 1;
        decimal todayPnlPercentage = Math.Round((todayTotalPnl / todayBaseCapital) * 100, 2);

        // Overall Lifetime P&L (Unrealized + Net Realized after charges)
        decimal overallTotalPnl = Math.Round(activeUnrealizedPnl + totalNetRealized, 2);
        decimal totalInvestedBase = (activeCapitalInvested + totalClosedCost);
        decimal overallTotalPnlPct = totalInvestedBase > 0 ? Math.Round((overallTotalPnl / totalInvestedBase) * 100, 2) : 0;

        decimal activeUnrealizedPct = activeCapitalInvested > 0 ? Math.Round((activeUnrealizedPnl / activeCapitalInvested) * 100, 2) : 0;

        // 3. Process IPO Analytics
        int totalIposApplied = ipos.Count;
        int totalIposAllotted = ipos.Count(i => i.Status == IpoApplicationStatus.Allotted || i.Status == IpoApplicationStatus.Sold);
        int totalIposRejected = ipos.Count(i => i.Status == IpoApplicationStatus.NotAllotted);
        int totalIposPending = ipos.Count(i => i.Status == IpoApplicationStatus.Applied);

        int resolvedIposCount = totalIposAllotted + totalIposRejected;
        decimal ipoStrikeRate = resolvedIposCount > 0 ? Math.Round(((decimal)totalIposAllotted / resolvedIposCount) * 100, 1) : 0;

        decimal totalBlockedInIpos = ipos
            .Where(i => i.Status == IpoApplicationStatus.Applied)
            .Sum(i => i.TotalAmountBlocked);

        decimal totalListingGainRealized = 0;
        decimal totalListingCost = 0;

        foreach (var ipo in ipos.Where(i => i.Status == IpoApplicationStatus.Sold || i.Status == IpoApplicationStatus.Allotted))
        {
            if (ipo.RealizedProfitLoss.HasValue)
            {
                totalListingGainRealized += ipo.RealizedProfitLoss.Value;
                totalListingCost += ipo.TotalAmountBlocked;
            }
        }

        decimal totalListingGainPct = totalListingCost > 0 ? Math.Round((totalListingGainRealized / totalListingCost) * 100, 2) : 0;

        // Top 5 Active Movers by % Change
        var topActiveMovers = activeDtos
            .OrderByDescending(x => Math.Abs(x.DayChangePercent))
            .Take(5)
            .ToList();

        return new TradeDeskDashboardDto(
            TodayUnrealizedProfitLoss: Math.Round(todayUnrealizedPnl, 2),
            TodayRealizedProfitLoss: Math.Round(todayRealizedPnl, 2),
            TodayTotalProfitLoss: todayTotalPnl,
            TodayProfitLossPercentage: todayPnlPercentage,
            TradesClosedTodayCount: tradesClosedTodayCount,
            TodayTopGainerTicker: todayTopGainerTicker,
            TodayTopGainerChangePercentage: Math.Round(todayTopGainerChangePct, 2),
            TodayTopGainerProfit: Math.Round(todayTopGainerGain, 2),
            TodayTopLoserTicker: todayTopLoserTicker,
            TodayTopLoserChangePercentage: Math.Round(todayTopLoserChangePct, 2),
            TodayTopLoserLoss: Math.Round(todayTopLoserLoss, 2),

            OverallTotalProfitLoss: overallTotalPnl,
            OverallTotalProfitLossPercentage: overallTotalPnlPct,
            ActiveCapitalInvested: Math.Round(activeCapitalInvested, 2),
            ActiveCurrentValuation: Math.Round(activeCurrentValuation, 2),
            ActiveUnrealizedProfitLoss: Math.Round(activeUnrealizedPnl, 2),
            ActiveUnrealizedProfitLossPercentage: activeUnrealizedPct,
            ActiveTradesCount: openTrades.Count,

            TotalGrossRealizedProfitLoss: Math.Round(totalGrossRealized, 2),
            TotalChargesPaid: Math.Round(totalChargesPaid, 2),
            TotalNetRealizedProfitLoss: Math.Round(totalNetRealized, 2),
            TotalNetRealizedProfitLossPercentage: totalNetRealizedPct,
            TotalClosedTradesCount: totalClosedCount,
            WinningTradesCount: winningTradesCount,
            LosingTradesCount: losingTradesCount,
            WinRatePercentage: winRatePercentage,
            AverageWinningTradeAmount: averageWinAmount,
            AverageLosingTradeAmount: averageLossAmount,
            ProfitFactor: profitFactor,
            ChargesToGrossProfitPercentage: chargesToGrossProfitPercentage,
            BestTradeTicker: bestTradeTicker,
            BestTradeNetProfit: Math.Round(bestTradeNetProfit, 2),
            BestTradeNetProfitPercentage: bestTradeNetProfitPct,
            WorstTradeTicker: worstTradeTicker,
            WorstTradeNetLoss: Math.Round(worstTradeNetLoss, 2),
            WorstTradeNetLossPercentage: worstTradeNetLossPct,
            AverageHoldingDays: averageHoldingDays,
            PlannedHoldingAdherencePercentage: plannedAdherencePercentage,

            TradesNearTargetCount: tradesNearTargetCount,
            TradesNearStopLossCount: tradesNearStopLossCount,
            TradesBreachedStopLossCount: tradesBreachedStopLossCount,
            TopActiveMovers: topActiveMovers,

            TotalIposApplied: totalIposApplied,
            TotalIposAllotted: totalIposAllotted,
            TotalIposRejected: totalIposRejected,
            TotalIposPending: totalIposPending,
            IpoAllotmentStrikeRatePercentage: ipoStrikeRate,
            TotalCapitalBlockedInIpos: Math.Round(totalBlockedInIpos, 2),
            TotalListingGainRealized: Math.Round(totalListingGainRealized, 2),
            TotalListingGainPercentage: totalListingGainPct
        );
    }
}
