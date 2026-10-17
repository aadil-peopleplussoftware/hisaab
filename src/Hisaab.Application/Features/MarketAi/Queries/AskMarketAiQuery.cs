using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.MarketAi.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Hisaab.Domain.Entities;

namespace Hisaab.Application.Features.MarketAi.Queries;

public record AskMarketAiQuery(string Question, string? SelectedTicker = null) : IRequest<AskMarketAiResponse>;

public class AskMarketAiQueryHandler : IRequestHandler<AskMarketAiQuery, AskMarketAiResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IStockMarketService _stockMarketService;
    private readonly IStockAiEngine _aiEngine;

    public AskMarketAiQueryHandler(
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

    public async Task<AskMarketAiResponse> Handle(AskMarketAiQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;

        var holdings = userId != null
            ? await _context.StockHoldings
                .AsNoTracking()
                .Where(h => h.UserId == userId && !h.IsDeleted)
                .ToListAsync(cancellationToken)
            : new List<StockHolding>();

        var tickers = holdings.Select(h => h.Ticker).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var quotes = await _stockMarketService.GetQuotesAsync(tickers, cancellationToken);
        var screener = await _stockMarketService.GetScreenerOpportunitiesAsync(cancellationToken);

        var analyzedHoldings = new List<StockHoldingWithAnalysisDto>();
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
        }

        // Resolve target stock quote and technical history (whether already owned or fresh search)
        MarketQuoteDto? targetQuote = null;
        StockHistoricalDataDto? targetHistory = null;
        string? targetTicker = request.SelectedTicker;

        if (string.IsNullOrWhiteSpace(targetTicker))
        {
            targetTicker = DetectTickerFromQuestion(request.Question);
        }

        if (!string.IsNullOrWhiteSpace(targetTicker))
        {
            try
            {
                var normalized = NormalizeTicker(targetTicker);
                targetQuote = await _stockMarketService.GetQuoteAsync(normalized, cancellationToken);
                if (targetQuote != null)
                {
                    targetHistory = await _stockMarketService.GetHistoricalDataAsync(targetQuote.Ticker, targetQuote, cancellationToken);
                }
            }
            catch
            {
                // Fallback gracefully
            }
        }

        return _aiEngine.AnswerUserQuestion(request.Question, targetTicker, analyzedHoldings, screener, targetQuote, targetHistory);
    }

    private static string? DetectTickerFromQuestion(string question)
    {
        if (string.IsNullOrWhiteSpace(question)) return null;
        var q = question.ToLowerInvariant();

        var knownMappings = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["dixon"] = "DIXON.NS",
            ["ireda"] = "IREDA.NS",
            ["rvnl"] = "RVNL.NS",
            ["mazdock"] = "MAZDOCK.NS",
            ["mazagon"] = "MAZDOCK.NS",
            ["cdsl"] = "CDSL.NS",
            ["bse"] = "BSE.NS",
            ["kaynes"] = "KAYNES.NS",
            ["reliance"] = "RELIANCE.NS",
            ["tata motors"] = "TATAMOTORS.NS",
            ["tatamotors"] = "TATAMOTORS.NS",
            ["tata power"] = "TATAPOWER.NS",
            ["tatapower"] = "TATAPOWER.NS",
            ["tata steel"] = "TATASTEEL.NS",
            ["tatasteel"] = "TATASTEEL.NS",
            ["tcs"] = "TCS.NS",
            ["hdfc"] = "HDFCBANK.NS",
            ["icici"] = "ICICIBANK.NS",
            ["sbi"] = "SBIN.NS",
            ["state bank"] = "SBIN.NS",
            ["infosys"] = "INFY.NS",
            ["infy"] = "INFY.NS",
            ["wipro"] = "WIPRO.NS",
            ["itc"] = "ITC.NS",
            ["zomato"] = "ZOMATO.NS",
            ["jio"] = "JIOFIN.NS",
            ["suzlon"] = "SUZLON.NS",
            ["irfc"] = "IRFC.NS",
            ["irctc"] = "IRCTC.NS",
            ["hal"] = "HAL.NS",
            ["bel"] = "BEL.NS",
            ["adani"] = "ADANIENT.NS",
            ["polycab"] = "POLYCAB.NS",
            ["trent"] = "TRENT.NS",
            ["indigo"] = "INDIGO.NS",
            ["maruti"] = "MARUTI.NS",
            ["titan"] = "TITAN.NS",
            ["vedanta"] = "VEDL.NS",
            ["sun pharma"] = "SUNPHARMA.NS",
            ["cipla"] = "CIPLA.NS",
            ["bajaj finance"] = "BAJFINANCE.NS"
        };

        foreach (var (keyword, ticker) in knownMappings)
        {
            if (q.Contains(keyword)) return ticker;
        }

        return null;
    }

    private static string NormalizeTicker(string ticker)
    {
        var clean = ticker.Trim().ToUpperInvariant();
        if (!clean.Contains('.') && !clean.StartsWith('^'))
        {
            return clean + ".NS";
        }
        return clean;
    }
}

