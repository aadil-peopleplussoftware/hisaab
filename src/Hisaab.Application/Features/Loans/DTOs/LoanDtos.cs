using Hisaab.Domain.Enums;

namespace Hisaab.Application.Features.Loans.DTOs;

public record LoanAccountDto(
    Guid Id,
    string Name,
    string Counterparty,
    LoanDirection Direction,
    string DirectionName,
    decimal Principal,
    string FormattedPrincipal,
    decimal InterestRate,
    LoanInterestType InterestType,
    string InterestTypeName,
    DateTime StartDate,
    DateTime? DueDate,
    LoanStatus Status,
    string StatusName,
    string? Note,
    decimal TotalDisbursed,
    decimal TotalRepaid,
    decimal TotalInterest,
    decimal TotalPenalty,
    decimal OutstandingBalance,
    string FormattedOutstandingBalance,
    decimal AccruedInterest,
    string FormattedAccruedInterest,
    DateTime CreatedAtUtc,
    int TransactionCount
);

public record LoanTransactionDto(
    Guid Id,
    Guid LoanAccountId,
    LoanTransactionKind Kind,
    string KindName,
    decimal Amount,
    string FormattedAmount,
    DateTime TransactionDate,
    string? Note,
    Guid? AttachmentId,
    decimal RunningBalance,
    string FormattedRunningBalance
);

public record LoanAccountDetailDto(
    LoanAccountDto Account,
    List<LoanTransactionDto> Transactions,
    decimal ProjectedPayoffAmount,
    string FormattedProjectedPayoffAmount,
    decimal DailyInterest,
    string FormattedDailyInterest,
    int DaysElapsed
);

public record LoanSummaryDto(
    decimal TotalGivenPrincipal,
    decimal TotalGivenOutstanding,
    string FormattedTotalGivenOutstanding,
    decimal TotalTakenPrincipal,
    decimal TotalTakenOutstanding,
    string FormattedTotalTakenOutstanding,
    decimal NetPosition,
    string FormattedNetPosition,
    int ActiveGivenCount,
    int ActiveTakenCount,
    int ClosedCount
);

public record LoanListResponseDto(
    List<LoanAccountDto> Accounts,
    LoanSummaryDto Summary
);

public record InterestCalculationDto(
    decimal Principal,
    decimal AnnualRate,
    LoanInterestType InterestType,
    string InterestTypeName,
    DateTime StartDate,
    DateTime AsOfDate,
    int DaysElapsed,
    decimal AccruedInterest,
    string FormattedAccruedInterest,
    decimal TotalPayable,
    string FormattedTotalPayable,
    decimal DailyInterest,
    string FormattedDailyInterest
);

