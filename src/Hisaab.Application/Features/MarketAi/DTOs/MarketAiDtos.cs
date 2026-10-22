namespace Hisaab.Application.Features.MarketAi.DTOs;

public record MarketQuoteDto(
    string Ticker,
    string CompanyName,
    string Exchange,
    decimal CurrentPrice,
    decimal DayChange,
    decimal DayChangePercent,
    decimal DayHigh,
    decimal DayLow,
    decimal High52Week,
    decimal Low52Week,
    long Volume,
    DateTime LastUpdatedUtc,
    bool IsMarketOpen
);

public record StockHistoricalDataDto(
    string Ticker,
    List<decimal> ClosePrices,
    decimal SMA20,
    decimal EMA20,
    decimal EMA50,
    decimal EMA200,
    decimal RSI14,
    decimal MACD,
    decimal MACDSignal,
    decimal PivotPoint,
    decimal Resistance1,
    decimal Resistance2,
    decimal Resistance3,
    decimal Support1,
    decimal Support2,
    decimal Support3
);

public record StockHoldingDto(
    Guid Id,
    string Ticker,
    string CompanyName,
    string Exchange,
    decimal BuyPrice,
    decimal Quantity,
    DateTime PurchaseDate,
    decimal? TargetProfitPerShare,
    decimal? TargetPrice,
    decimal? StopLossPrice,
    string? Notes,
    bool IsArchived,
    DateTime CreatedAtUtc
);

public record StockHoldingWithAnalysisDto(
    StockHoldingDto Holding,
    MarketQuoteDto Quote,
    StockAiAnalysisDto Analysis
);

public record StockAiAnalysisDto(
    Guid HoldingId,
    string Ticker,
    string CompanyName,
    decimal BuyPrice,
    decimal Quantity,
    decimal InvestedAmount,
    decimal CurrentPrice,
    decimal CurrentValue,
    decimal CurrentProfitPerShare,
    decimal TotalProfitLoss,
    decimal ProfitLossPercentage,
    decimal? TargetProfitPerShare,
    decimal? TargetPrice,
    decimal? TargetProgressPercentage,
    bool IsTargetHit,
    bool IsTargetApproaching,
    decimal? StopLossPrice,
    bool IsStopLossBreached,
    string ActionRecommendation,
    string ActionBadgeText,
    string ActionColor,
    int BullishScore,
    string SentimentLabel,
    decimal? NextUpsideTargetPrice,
    decimal? MaxExpectedUpsideAmount,
    decimal? UpsidePercentage,
    int UpsideProbabilityPercent,
    string UpsideRationale,
    decimal? KeySupportPrice,
    decimal? MaxExpectedDownsideAmount,
    decimal? DownsidePercentage,
    int DownsideProbabilityPercent,
    decimal? RecommendedTrailingStopLoss,
    string DownsideRationale,
    string AiSummaryHindi,
    string AiSummaryEnglish,
    decimal RiskRewardRatio
);

public record MarketScreenerStockDto(
    string Ticker,
    string CompanyName,
    string Sector,
    decimal CurrentPrice,
    decimal DayChangePercent,
    string Recommendation,
    decimal EntryPrice,
    decimal TargetPrice1,
    decimal TargetPrice2,
    decimal StopLossPrice,
    decimal RiskRewardRatio,
    string SetupType,
    string Catalyst,
    int ConfidenceScore
);

public record MarketAiPortfolioOverviewDto(
    decimal TotalPortfolioInvested,
    decimal TotalPortfolioCurrentValue,
    decimal TotalPortfolioProfitLoss,
    decimal TotalPortfolioGainPercentage,
    int TotalStocksCount,
    int TargetHitCount,
    int TargetApproachingCount,
    int ProfitBookingRecommendedCount,
    List<StockHoldingWithAnalysisDto> HoldingsWithAnalysis,
    List<MarketScreenerStockDto> TopBuyOpportunities
);

public record CreateStockHoldingRequest(
    string Ticker,
    string? CompanyName,
    string Exchange,
    decimal BuyPrice,
    decimal Quantity,
    DateTime? PurchaseDate,
    decimal? TargetProfitPerShare,
    decimal? TargetPrice,
    decimal? StopLossPrice,
    string? Notes
);

public record UpdateStockHoldingRequest(
    decimal BuyPrice,
    decimal Quantity,
    decimal? TargetProfitPerShare,
    decimal? TargetPrice,
    decimal? StopLossPrice,
    string? Notes
);

public record AskMarketAiRequest(
    string Question,
    string? SelectedTicker = null
);

public record AskMarketAiResponse(
    string AnswerHindi,
    string AnswerEnglish,
    string ActionSignal,
    decimal? KeyTargetPrice,
    decimal? KeySupportPrice,
    decimal? TrailingStopLoss,
    List<string> KeyBulletPoints,
    string? Ticker = null,
    string? CompanyName = null,
    decimal? CurrentPrice = null,
    decimal? IdealEntryZoneLow = null,
    decimal? IdealEntryZoneHigh = null,
    decimal? TargetPrice2 = null,
    decimal? RiskRewardRatio = null,
    int? BullishScore = null,
    string? VerdictLabel = null,
    List<string>? Strengths = null,
    List<string>? Risks = null
);

public record StockSearchResultDto(
    string Ticker,
    string CompanyName,
    string Exchange,
    string Sector,
    decimal CurrentPrice,
    decimal DayChangePercent
);

