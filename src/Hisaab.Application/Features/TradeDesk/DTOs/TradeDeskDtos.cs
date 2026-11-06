using Hisaab.Domain.Entities;

namespace Hisaab.Application.Features.TradeDesk.DTOs;

public record TradeOrderDto(
    Guid Id,
    string Ticker,
    string CompanyName,
    string Exchange,
    TradeType TradeType,
    string TradeTypeName,
    TradeStatus Status,
    string StatusName,
    decimal BuyPrice,
    decimal Quantity,
    decimal InvestedAmount,
    DateTime BuyDate,
    int PlannedHoldingDays,
    decimal? TargetPrice,
    decimal? StopLossPrice,
    string? Notes,
    DateTime? SellDate,
    decimal? SellPrice,
    decimal TotalCharges,
    decimal? RealizedProfitLoss,
    decimal? RealizedProfitLossPercentage,
    decimal? NetProfitLoss,
    decimal? NetProfitLossPercentage,
    int? ActualHoldingDays,
    int CurrentHoldingDays,
    decimal CurrentMarketPrice = 0,
    decimal CurrentValue = 0,
    decimal UnrealizedProfitLoss = 0,
    decimal UnrealizedProfitLossPercentage = 0,
    decimal DayChange = 0,
    decimal DayChangePercent = 0
);

public record IpoApplicationDto(
    Guid Id,
    string CompanyName,
    string Symbol,
    IpoIssueType IssueType,
    string IssueTypeName,
    IpoApplicationStatus Status,
    string StatusName,
    DateTime ApplicationDate,
    DateTime? AllotmentDate,
    DateTime? ListingDate,
    int LotSize,
    int LotsApplied,
    int TotalShares,
    decimal BidPrice,
    decimal TotalAmountBlocked,
    string? ApplicationNumber,
    string? UpiId,
    int SharesAllotted,
    decimal? ListingPrice,
    decimal? SellPrice,
    DateTime? SellDate,
    decimal? RealizedProfitLoss,
    decimal? RealizedProfitLossPercentage,
    string? Notes
);

public record TradeDeskSummaryDto(
    decimal TotalCapitalInTrades,
    decimal TotalCurrentValueInTrades,
    decimal TotalUnrealizedProfitLoss,
    decimal TotalUnrealizedProfitLossPercentage,
    decimal TotalCapitalBlockedInIpos,
    int ActiveTradesCount,
    int ClosedTradesCount,
    decimal TotalRealizedProfitLoss,
    decimal TotalRealizedProfitLossPercentage,
    decimal TotalChargesPaidOnTrades,
    decimal TotalNetRealizedProfitLoss,
    decimal TotalNetRealizedProfitLossPercentage,
    int TotalIpoApplicationsCount,
    int AllottedIposCount,
    decimal IpoAllotmentRatePercentage,
    decimal TotalIpoProfitLoss
);

public record TradeDeskOverviewDto(
    TradeDeskSummaryDto Summary,
    List<TradeOrderDto> ActiveTrades,
    List<TradeOrderDto> ClosedTrades,
    List<IpoApplicationDto> Ipos
);

public record LiveIpoDto(
    string CompanyName,
    string Symbol,
    string IssueType,
    decimal MinPrice,
    decimal MaxPrice,
    int LotSize,
    decimal IssueSizeCr,
    string Status,
    string OpenDate,
    string CloseDate,
    string? ListingDate
);

public record TradeDeskDashboardDto(
    // Today's Live Performance
    decimal TodayUnrealizedProfitLoss,
    decimal TodayRealizedProfitLoss,
    decimal TodayTotalProfitLoss,
    decimal TodayProfitLossPercentage,
    int TradesClosedTodayCount,
    string? TodayTopGainerTicker,
    decimal TodayTopGainerChangePercentage,
    decimal TodayTopGainerProfit,
    string? TodayTopLoserTicker,
    decimal TodayTopLoserChangePercentage,
    decimal TodayTopLoserLoss,

    // Overall Lifetime & Portfolio Totals
    decimal OverallTotalProfitLoss,
    decimal OverallTotalProfitLossPercentage,
    decimal ActiveCapitalInvested,
    decimal ActiveCurrentValuation,
    decimal ActiveUnrealizedProfitLoss,
    decimal ActiveUnrealizedProfitLossPercentage,
    int ActiveTradesCount,

    // Closed Trades & Win/Loss Mastery
    decimal TotalGrossRealizedProfitLoss,
    decimal TotalChargesPaid,
    decimal TotalNetRealizedProfitLoss,
    decimal TotalNetRealizedProfitLossPercentage,
    int TotalClosedTradesCount,
    int WinningTradesCount,
    int LosingTradesCount,
    decimal WinRatePercentage,
    decimal AverageWinningTradeAmount,
    decimal AverageLosingTradeAmount,
    decimal ProfitFactor,
    decimal ChargesToGrossProfitPercentage,
    string? BestTradeTicker,
    decimal BestTradeNetProfit,
    decimal BestTradeNetProfitPercentage,
    string? WorstTradeTicker,
    decimal WorstTradeNetLoss,
    decimal WorstTradeNetLossPercentage,
    decimal AverageHoldingDays,
    decimal PlannedHoldingAdherencePercentage,

    // Active Risk & Target Surveillance
    int TradesNearTargetCount,
    int TradesNearStopLossCount,
    int TradesBreachedStopLossCount,
    List<TradeOrderDto> TopActiveMovers,

    // IPO Intelligence
    int TotalIposApplied,
    int TotalIposAllotted,
    int TotalIposRejected,
    int TotalIposPending,
    decimal IpoAllotmentStrikeRatePercentage,
    decimal TotalCapitalBlockedInIpos,
    decimal TotalListingGainRealized,
    decimal TotalListingGainPercentage
);

