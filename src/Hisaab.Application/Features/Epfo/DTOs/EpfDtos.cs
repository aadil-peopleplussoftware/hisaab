namespace Hisaab.Application.Features.Epfo.DTOs;

public record EpfEntryDto(
    Guid Id,
    DateTime Month,
    string MonthLabel,
    decimal EmployeeShare,
    string FormattedEmployeeShare,
    decimal EmployerShare,
    string FormattedEmployerShare,
    decimal PensionShare,
    string FormattedPensionShare,
    decimal Interest,
    string FormattedInterest,
    decimal Withdrawal,
    string FormattedWithdrawal,
    decimal NetInflow,
    string FormattedNetInflow,
    decimal RunningBalance,
    string FormattedRunningBalance,
    decimal RunningPensionBalance,
    string FormattedRunningPensionBalance,
    string? Note,
    DateTime CreatedAtUtc
);

public record EpfYearlySummaryDto(
    int Year,
    decimal OpeningBalance,
    string FormattedOpeningBalance,
    decimal TotalEmployeeShare,
    string FormattedTotalEmployeeShare,
    decimal TotalEmployerShare,
    string FormattedTotalEmployerShare,
    decimal TotalPensionShare,
    string FormattedTotalPensionShare,
    decimal TotalInterest,
    string FormattedTotalInterest,
    decimal TotalWithdrawals,
    string FormattedTotalWithdrawals,
    decimal ClosingBalance,
    string FormattedClosingBalance,
    decimal TotalPensionBalance,
    string FormattedTotalPensionBalance,
    int EntryCount
);

public record EpfResponseDto(
    List<EpfEntryDto> Entries,
    EpfYearlySummaryDto Summary,
    List<int> AvailableYears,
    decimal AllTimeEpfBalance,
    string FormattedAllTimeEpfBalance,
    decimal AllTimePensionBalance,
    string FormattedAllTimePensionBalance
);

