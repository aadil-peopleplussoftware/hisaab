using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.MarketAi.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.MarketAi.Queries;

public record GetMarketAiOverviewQuery : IRequest<MarketAiPortfolioOverviewDto>;

public class GetMarketAiOverviewQueryHandler : IRequestHandler<GetMarketAiOverviewQuery, MarketAiPortfolioOverviewDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IStockMarketService _stockMarketService;
    private readonly IStockAiEngine _aiEngine;

    public GetMarketAiOverviewQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IStockMarketService stockMarketService,
        IStockAiEngine aiEngine)
    {
        _context = context;
        _currentUserService = currentUserService;
        _stockMarketService = stockMarketService;
        _aiEngine = aiEngine;
    }

    public async Task<MarketAiPortfolioOverviewDto> Handle(GetMarketAiOverviewQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedAccessException();

        var holdings = await _context.StockHoldings
            .AsNoTracking()
            .Where(h => h.UserId == userId && !h.IsDeleted)
            .OrderByDescending(h => h.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var tickers = holdings.Select(h => h.Ticker).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var quotes = await _stockMarketService.GetQuotesAsync(tickers, cancellationToken);
        var screener = await _stockMarketService.GetScreenerOpportunitiesAsync(cancellationToken);

        var analyzedHoldings = new List<StockHoldingWithAnalysisDto>();
        decimal totalInvested = 0m;
        decimal totalCurrentValue = 0m;
        int targetHitCount = 0;
        int targetApproachingCount = 0;
        int profitBookingRecommendedCount = 0;

        foreach (var holding in holdings)
        {
            if (!quotes.TryGetValue(holding.Ticker, out var quote))
            {
                quote = await _stockMarketService.GetQuoteAsync(holding.Ticker, cancellationToken);
            }

            var history = await _stockMarketService.GetHistoricalDataAsync(holding.Ticker, quote, cancellationToken);
            var analysis = _aiEngine.AnalyzeHolding(holding, quote, history);

            var holdingDto = new StockHoldingDto(
                holding.Id,
                holding.Ticker,
                quote.CompanyName,
                holding.Exchange,
                holding.BuyPrice,
                holding.Quantity,
                holding.PurchaseDate,
                holding.TargetProfitPerShare,
                holding.TargetPrice,
                holding.StopLossPrice,
                holding.Notes,
                holding.IsArchived,
                holding.CreatedAtUtc
            );

            analyzedHoldings.Add(new StockHoldingWithAnalysisDto(holdingDto, quote, analysis));

            totalInvested += analysis.InvestedAmount;
            totalCurrentValue += analysis.CurrentValue;

            if (analysis.IsTargetHit) targetHitCount++;
            if (analysis.IsTargetApproaching) targetApproachingCount++;
            if (analysis.ActionRecommendation.StartsWith("BOOK", StringComparison.OrdinalIgnoreCase)) profitBookingRecommendedCount++;
        }

        decimal totalProfitLoss = totalCurrentValue - totalInvested;
        decimal totalGainPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100m : 0m;

        return new MarketAiPortfolioOverviewDto(
            TotalPortfolioInvested: Math.Round(totalInvested, 2),
            TotalPortfolioCurrentValue: Math.Round(totalCurrentValue, 2),
            TotalPortfolioProfitLoss: Math.Round(totalProfitLoss, 2),
            TotalPortfolioGainPercentage: Math.Round(totalGainPercentage, 2),
            TotalStocksCount: holdings.Count,
            TargetHitCount: targetHitCount,
            TargetApproachingCount: targetApproachingCount,
            ProfitBookingRecommendedCount: profitBookingRecommendedCount,
            HoldingsWithAnalysis: analyzedHoldings,
            TopBuyOpportunities: screener
        );
    }
}

