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

public record EpfoPassbookParsePreviewDto(
    string EstablishmentId,
    string EstablishmentName,
    string MemberId,
    string MemberName,
    string DateOfBirth,
    string Uan,
    string FinancialYear,
    decimal OpeningEmployeeBalance,
    decimal OpeningEmployerBalance,
    decimal OpeningPensionBalance,
    decimal TotalContributionsEmployee,
    decimal TotalContributionsEmployer,
    decimal TotalContributionsPension,
    decimal AnnualInterestEmployee,
    decimal AnnualInterestEmployer,
    decimal ClosingEmployeeBalance,
    decimal ClosingEmployerBalance,
    decimal ClosingPensionBalance,
    List<ParsedEpfoRawTransactionDto> RawTransactions,
    List<ParsedEpfoMonthlyEntryDto> MonthlyEntries
);

public record ParsedEpfoRawTransactionDto(
    string WageMonth,
    string TransactionDate,
    string Type,
    string Particulars,
    decimal EpfWages,
    decimal EpsWages,
    decimal EmployeeShare,
    decimal EmployerShare,
    decimal PensionShare
);

public record ParsedEpfoMonthlyEntryDto(
    DateTime Month,
    string MonthLabel,
    decimal EmployeeShare,
    decimal EmployerShare,
    decimal PensionShare,
    decimal Interest,
    decimal Withdrawal,
    decimal NetInflow,
    string Note
);

public record CommitEpfoPassbookImportRequest(
    List<ParsedEpfoMonthlyEntryDto> Entries,
    bool ReplaceExistingYear = true
);

