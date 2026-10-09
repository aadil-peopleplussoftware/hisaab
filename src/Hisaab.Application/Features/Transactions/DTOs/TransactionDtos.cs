using Hisaab.Application.Common.Models;
using Hisaab.Domain.Enums;
using Hisaab.Domain.ValueObjects;

namespace Hisaab.Application.Features.Transactions.DTOs;

public record TransactionDto(
    Guid Id,
    TransactionType Type,
    decimal Amount,
    string FormattedAmount,
    Guid CategoryId,
    string CategoryName,
    string CategoryIcon,
    string CategoryColor,
    DateTime TransactionDate,
    string? Note,
    Guid? AttachmentId
);

public record MonthlySummaryDto(
    string Month,
    decimal TotalIncome,
    decimal TotalExpense,
    decimal NetSavings,
    decimal SavingsRatePercentage
);

public record TransactionsResponseDto(
    PaginatedList<TransactionDto> Transactions,
    MonthlySummaryDto Summary
);

