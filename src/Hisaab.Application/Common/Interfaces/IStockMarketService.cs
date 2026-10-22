using Hisaab.Application.Features.MarketAi.DTOs;

namespace Hisaab.Application.Common.Interfaces;

public interface IStockMarketService
{
    Task<MarketQuoteDto> GetQuoteAsync(string ticker, CancellationToken ct = default);
    Task<Dictionary<string, MarketQuoteDto>> GetQuotesAsync(IEnumerable<string> tickers, CancellationToken ct = default);
    Task<StockHistoricalDataDto> GetHistoricalDataAsync(string ticker, MarketQuoteDto currentQuote, CancellationToken ct = default);
    Task<List<MarketScreenerStockDto>> GetScreenerOpportunitiesAsync(CancellationToken ct = default);
    Task<List<StockSearchResultDto>> SearchStocksAsync(string query, CancellationToken ct = default);
}

