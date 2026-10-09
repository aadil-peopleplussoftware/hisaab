using Hisaab.Domain.Enums;

namespace Hisaab.Application.Features.Investments.DTOs;

public record HoldingDto(
    Guid Id,
    string Name,
    InvestmentType Type,
    string TypeName,
    decimal CurrentValue,
    string FormattedCurrentValue,
    DateTime ValueUpdatedAtUtc,
    decimal TotalInvested,
    string FormattedTotalInvested,
    decimal TotalUnits,
    decimal AbsoluteGainLoss,
    string FormattedAbsoluteGainLoss,
    decimal GainLossPercentage,
    decimal TotalDividend,
    string FormattedTotalDividend,
    string? Note,
    int TransactionCount,
    DateTime CreatedAtUtc
);

public record InvestmentTransactionDto(
    Guid Id,
    Guid HoldingId,
    InvestmentTransactionKind Kind,
    string KindName,
    decimal Amount,
    string FormattedAmount,
    decimal? Units,
    DateTime TransactionDate,
    string? Note
);

public record HoldingDetailDto(
    HoldingDto Holding,
    List<InvestmentTransactionDto> Transactions
);

public record AssetAllocationDto(
    InvestmentType Type,
    string TypeName,
    decimal TotalValue,
    string FormattedTotalValue,
    decimal PercentageOfPortfolio,
    int HoldingCount
);

public record PortfolioSummaryDto(
    decimal TotalInvested,
    string FormattedTotalInvested,
    decimal TotalCurrentValue,
    string FormattedTotalCurrentValue,
    decimal TotalGainLoss,
    string FormattedTotalGainLoss,
    decimal OverallGainLossPercentage,
    decimal TotalDividendEarned,
    string FormattedTotalDividendEarned,
    int TotalHoldingsCount
);

public record InvestmentsResponseDto(
    List<HoldingDto> Holdings,
    PortfolioSummaryDto Summary,
    List<AssetAllocationDto> Allocations
);

