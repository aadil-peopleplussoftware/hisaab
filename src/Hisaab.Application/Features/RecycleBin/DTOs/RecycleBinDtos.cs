namespace Hisaab.Application.Features.RecycleBin.DTOs;

public record RecycleBinItemDto(
    Guid Id,
    string Module, // "Transactions", "Categories", "Loans", "Epfo", "Investments", "Business"
    string SubType, // e.g. "Expense", "Income", "Category", "Loan Account", "Loan Payment", "EPFO Entry", "Investment Holding", "Investment Trade", "Business Entity", "Business Transaction"
    string Title,
    string? Description,
    decimal? Amount,
    string? Currency,
    DateTime DeletedAtUtc,
    DateTime? OriginalDate
);

public record RecycleBinResponseDto(
    List<RecycleBinItemDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    Dictionary<string, int> ModuleCounts
);

