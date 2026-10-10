using Hisaab.Domain.Enums;

namespace Hisaab.Application.Features.Business.DTOs;

public record BusinessDto(
    Guid Id,
    string Name,
    string? LegalName,
    BusinessType Type,
    string TypeName,
    string Currency,
    string? TaxId,
    string? Description,
    bool IsActive,
    string? Color,
    DateTime CreatedAtUtc,
    decimal TotalRevenue,
    decimal TotalExpenses,
    decimal NetProfit,
    decimal ProfitMargin,
    int TransactionCount
);

public record BusinessTransactionDto(
    Guid Id,
    Guid BusinessId,
    string BusinessName,
    BusinessTransactionType Type,
    string TypeName,
    string Category,
    decimal Amount,
    decimal TaxRatePercent,
    decimal TaxAmount,
    decimal TotalAmount,
    DateTime TransactionDate,
    string Counterparty,
    string? InvoiceNumber,
    DateTime? DueDate,
    BusinessPaymentStatus PaymentStatus,
    string PaymentStatusName,
    string? PaymentMethod,
    string? Description,
    string? AttachmentUrl,
    DateTime CreatedAtUtc
);

public record BusinessCategoryBreakdownDto(
    string Category,
    BusinessTransactionType Type,
    decimal Amount,
    decimal Percentage
);

public record BusinessMonthlyTrendDto(
    string MonthKey,
    string MonthLabel,
    decimal Revenue,
    decimal Expense,
    decimal NetProfit
);

public record BusinessPnLSummaryDto(
    decimal GrossRevenue,
    decimal TotalExpenses,
    decimal NetProfit,
    decimal ProfitMarginPercent,
    decimal TaxesCollected,
    decimal TaxesPaid,
    decimal NetTaxLiability,
    decimal AccountsReceivable,
    decimal AccountsPayable,
    int PendingInvoicesCount,
    int OverdueInvoicesCount,
    List<BusinessCategoryBreakdownDto> CategoryBreakdown,
    List<BusinessMonthlyTrendDto> MonthlyTrend
);

public record BusinessListResponseDto(
    List<BusinessDto> Businesses,
    BusinessPnLSummaryDto ConsolidatedSummary
);
