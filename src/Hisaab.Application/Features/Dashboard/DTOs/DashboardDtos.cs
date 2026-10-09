using Hisaab.Domain.Enums;

namespace Hisaab.Application.Features.Dashboard.DTOs;

public record MonthlyOverviewDto(
    string Month,
    decimal TotalIncome,
    string FormattedTotalIncome,
    decimal TotalExpense,
    string FormattedTotalExpense,
    decimal NetSavings,
    string FormattedNetSavings,
    decimal SavingsRatePercentage,
    int TransactionCount
);

public record NetWorthBreakdownDto(
    decimal TotalNetWorth,
    string FormattedTotalNetWorth,
    decimal LiquidCash,
    string FormattedLiquidCash,
    decimal InvestmentsValue,
    string FormattedInvestmentsValue,
    decimal EpfBalance,
    string FormattedEpfBalance,
    decimal LoansReceivable,
    string FormattedLoansReceivable,
    decimal LoansPayable,
    string FormattedLoansPayable,
    decimal TotalAssets,
    string FormattedTotalAssets,
    decimal TotalLiabilities,
    string FormattedTotalLiabilities
);

public record MonthlyTrendDto(
    string Month,
    string MonthLabel,
    decimal Income,
    decimal Expense,
    decimal NetSavings
);

public record CategoryBreakdownItemDto(
    Guid CategoryId,
    string CategoryName,
    string CategoryIcon,
    string CategoryColor,
    decimal Amount,
    string FormattedAmount,
    decimal Percentage
);

public record ActiveLoanDueDto(
    Guid Id,
    string Name,
    string Counterparty,
    LoanDirection Direction,
    string DirectionName,
    decimal OutstandingBalance,
    string FormattedOutstandingBalance,
    DateTime? DueDate,
    bool IsOverdue,
    int? DaysUntilDue
);

public record DashboardRecentTransactionDto(
    Guid Id,
    TransactionType Type,
    decimal Amount,
    string FormattedAmount,
    string CategoryName,
    string CategoryIcon,
    string CategoryColor,
    DateTime TransactionDate,
    string? Note
);

public record DashboardResponseDto(
    string SelectedMonth,
    MonthlyOverviewDto MonthlyOverview,
    NetWorthBreakdownDto NetWorth,
    List<MonthlyTrendDto> MonthlyTrends,
    List<CategoryBreakdownItemDto> TopExpenseCategories,
    List<CategoryBreakdownItemDto> TopIncomeCategories,
    List<ActiveLoanDueDto> UpcomingLoanDues,
    List<DashboardRecentTransactionDto> RecentTransactions
);

