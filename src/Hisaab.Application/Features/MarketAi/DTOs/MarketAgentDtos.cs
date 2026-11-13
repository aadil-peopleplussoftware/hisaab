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
    string? LastPreMarketReportDate,
    bool EnableMarketOpenAlerts = true,
    bool EnableMarketCloseAlerts = true,
    string? LastMarketOpenReportDate = null,
    string? LastMarketCloseReportDate = null,
    string? WhatsAppProvider = "CallMeBot",
    string? WhatsAppApiKey = null,
    string? WhatsAppInstanceId = null,
    string? WhatsAppWebhookUrl = null,
    bool EnableTelegramDispatch = false,
    string? TelegramBotToken = null,
    string? TelegramChatId = null,
    bool EnableDiscordDispatch = false,
    string? DiscordWebhookUrl = null,
    bool EnableNtfyDispatch = false,
    string? NtfyTopic = null,
    string? NtfyServerUrl = "https://ntfy.sh"
);

public record UpdateMarketAgentUserSettingRequest(
    string? WhatsAppPhoneNumber,
    string? EmailAddress,
    bool EnablePreMarketScan,
    bool EnableTargetHitAlerts,
    bool EnableStopLossAlerts,
    bool EnableEmailDispatch,
    bool EnableWhatsAppDispatch,
    string? PreMarketScanTime,
    bool EnableMarketOpenAlerts = true,
    bool EnableMarketCloseAlerts = true,
    string? WhatsAppProvider = "CallMeBot",
    string? WhatsAppApiKey = null,
    string? WhatsAppInstanceId = null,
    string? WhatsAppWebhookUrl = null,
    bool EnableTelegramDispatch = false,
    string? TelegramBotToken = null,
    string? TelegramChatId = null,
    bool EnableDiscordDispatch = false,
    string? DiscordWebhookUrl = null,
    bool EnableNtfyDispatch = false,
    string? NtfyTopic = null,
    string? NtfyServerUrl = "https://ntfy.sh"
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
    string CreatedAtIst,
    string TelegramStatus = "Disabled",
    string DiscordStatus = "Disabled",
    string NtfyStatus = "Disabled"
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
    string? EmailAddress = null,
    string? TelegramBotToken = null,
    string? TelegramChatId = null,
    string? DiscordWebhookUrl = null,
    string? NtfyTopic = null
);

public record MarketOpenStockItemDto(
    string Ticker,
    string CompanyName,
    decimal BuyPrice,
    decimal Quantity,
    decimal OpenPrice,
    decimal PreviousClose,
    decimal GapPercentage,
    decimal CurrentPrice,
    decimal? TargetPrice,
    decimal? StopLossPrice,
    string GapStatus
);

public record MarketOpenDailyReportDto(
    string ReportDate,
    string ScanTimeIst,
    int TotalHoldingsTracked,
    List<MarketOpenStockItemDto> Stocks,
    string ActionableBriefHindi,
    string FormattedWhatsAppMessage,
    string FormattedHtmlEmail
);

public record MarketCloseStockItemDto(
    string Ticker,
    string CompanyName,
    decimal BuyPrice,
    decimal Quantity,
    decimal ClosePrice,
    decimal DayChange,
    decimal DayChangePercent,
    decimal TotalProfitLoss,
    decimal TotalProfitLossPct,
    decimal DayGainLoss
);

public record MarketCloseDailyReportDto(
    string ReportDate,
    string ScanTimeIst,
    int TotalHoldingsTracked,
    decimal DayTotalGainLoss,
    decimal OverallTotalGainLoss,
    List<MarketCloseStockItemDto> Stocks,
    string ActionableBriefHindi,
    string FormattedWhatsAppMessage,
    string FormattedHtmlEmail
);

public record MyAssistantStockItemDto(
    Guid Id,
    string Ticker,
    string CompanyName,
    string Exchange,
    decimal BuyPrice,
    decimal Quantity,
    decimal CurrentPrice,
    decimal OpenPrice,
    decimal PreviousClose,
    decimal DayChange,
    decimal DayChangePercent,
    decimal DayHigh,
    decimal DayLow,
    decimal? TargetPrice,
    decimal? TargetProfitPerShare,
    decimal? StopLossPrice,
    decimal CurrentProfitPerShare,
    decimal TotalProfitLoss,
    decimal ProfitPercentage,
    decimal DistanceToTarget,
    decimal DistanceToTargetPct,
    decimal DistanceToStopLoss,
    decimal DistanceToStopLossPct,
    string Status,
    string? Notes,
    DateTime PurchaseDate
);

public record MyAssistantOverviewDto(
    string CurrentTimeIst,
    bool IsMarketOpen,
    string MarketStatusText,
    string NextScheduledEventIst,
    decimal TotalInvested,
    decimal TotalCurrentValue,
    decimal TotalUnrealizedProfit,
    decimal TotalDayGainLoss,
    int TotalStocksTracked,
    int TargetsHitCount,
    int StopLossHitCount,
    int AlertsDispatchedToday,
    List<MyAssistantStockItemDto> Holdings,
    MarketAgentUserSettingDto Settings,
    List<MarketAgentAlertLogDto> RecentLogs
);

public record AddMyAssistantStockRequest(
    string Ticker,
    string? CompanyName,
    decimal BuyPrice,
    decimal Quantity,
    decimal? TargetPrice,
    decimal? TargetProfitPerShare,
    decimal? StopLossPrice,
    string? Notes
);

public record UpdateMyAssistantStockRequest(
    decimal BuyPrice,
    decimal Quantity,
    decimal? TargetPrice,
    decimal? TargetProfitPerShare,
    decimal? StopLossPrice,
    string? Notes
);
