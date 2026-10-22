using Hisaab.Application.Features.MarketAi.DTOs;
using Hisaab.Domain.Entities;

namespace Hisaab.Application.Common.Interfaces;

public interface IStockAiEngine
{
    StockAiAnalysisDto AnalyzeHolding(StockHolding holding, MarketQuoteDto quote, StockHistoricalDataDto history);
    AskMarketAiResponse AnswerUserQuestion(
        string question,
        string? selectedTicker,
        List<StockHoldingWithAnalysisDto> userHoldings,
        List<MarketScreenerStockDto> screener,
        MarketQuoteDto? targetQuote = null,
        StockHistoricalDataDto? targetHistory = null);
}

