namespace Hisaab.Application.Features.MarketAi.DTOs;

public record PreMarketStockItemDto(
    string Ticker,
    string CompanyName,
    string Sector,
    decimal CurrentPrice,
    decimal EntryPrice,
    decimal TargetPrice,
    decimal ExpectedProfitPerShare,
    decimal ExpectedProfitPercentage,
    decimal StopLossPrice,
    decimal RiskRewardRatio,
    string SetupType,
    string CatalystHindi,
    bool IsBullishGainer
);

public record PreMarketDailyReportDto(
    string ReportDate,
    string ScanTimeIst,
    string MarketSentiment,
    string NiftyExpectedTrend,
    List<PreMarketStockItemDto> TopProfitGainers,
    List<PreMarketStockItemDto> TopLossRisks,
    string ActionableBriefHindi,
    string FormattedWhatsAppMessage,
    string FormattedHtmlEmail
);

public record PortfolioTargetHitAlertDto(
    Guid HoldingId,
    Guid UserId,
    string Ticker,
    string CompanyName,
    decimal BuyPrice,
    decimal Quantity,
    decimal CurrentPrice,
    decimal? TargetProfitPerShare,
    decimal CurrentProfitPerShare,
    decimal TotalProfit,
    decimal ProfitPercentage,
    decimal? TargetPrice,
    decimal? StopLossPrice,
    string AlertType, // TARGET_PROFIT_HIT, TARGET_PRICE_REACHED, STOP_LOSS_BREACHED
    string VerdictLabel,
    string RecommendedActionHindi,
    string FormattedWhatsAppMessage,
    string FormattedHtmlEmail
);

public record MarketAgentUserSettingDto(
    string? WhatsAppPhoneNumber,
    string? EmailAddress,
    bool EnablePreMarketScan,
    bool EnableTargetHitAlerts,
    bool EnableStopLossAlerts,
    bool EnableEmailDispatch,
    bool EnableWhatsAppDispatch,
    string PreMarketScanTime,
    string? LastPreMarketReportDate
);

public record UpdateMarketAgentUserSettingRequest(
    string? WhatsAppPhoneNumber,
    string? EmailAddress,
    bool EnablePreMarketScan,
    bool EnableTargetHitAlerts,
    bool EnableStopLossAlerts,
    bool EnableEmailDispatch,
    bool EnableWhatsAppDispatch,
    string? PreMarketScanTime
);

public record MarketAgentAlertLogDto(
    Guid Id,
    string Ticker,
    string CompanyName,
    string AlertType,
    string Title,
    string Message,
    decimal TriggerPrice,
    decimal? TargetPrice,
    decimal? ProfitOrLossAmount,
    string WhatsAppStatus,
    string EmailStatus,
    string? WhatsAppClickUrl,
    DateTime CreatedAtUtc,
    string CreatedAtIst
);

public record MarketAgentStatusDto(
    string CurrentTimeIst,
    bool IsMarketOpen,
    string MarketStatusText,
    string PreMarketAgentStatus,
    string PortfolioSentinelAgentStatus,
    string AlertDispatcherAgentStatus,
    string NextPreMarketRunTimeIst,
    int TotalAlertsDispatchedToday,
    List<MarketAgentAlertLogDto> RecentAlerts
);

public record TestNotificationRequest(
    string? WhatsAppPhoneNumber = null,
    string? EmailAddress = null
);
