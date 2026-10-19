using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Common.Models;
using Hisaab.Application.Features.Transactions.DTOs;
using Hisaab.Domain.Enums;
using Hisaab.Domain.ValueObjects;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Transactions.Queries.GetTransactions;

public record GetTransactionsQuery(
    string? Month = null,
    TransactionType? Type = null,
    Guid? CategoryId = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 20
) : IRequest<Result<TransactionsResponseDto>>;

public class GetTransactionsQueryHandler : IRequestHandler<GetTransactionsQuery, Result<TransactionsResponseDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTimeService _dateTimeService;

    public GetTransactionsQueryHandler(
        IApplicationDbContext context,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _dateTimeService = dateTimeService;
    }

    public async Task<Result<TransactionsResponseDto>> Handle(GetTransactionsQuery request, CancellationToken cancellationToken)
    {
        var targetMonth = string.IsNullOrWhiteSpace(request.Month)
            ? _dateTimeService.NowInKolkata.ToString("yyyy-MM")
            : request.Month.Trim();

        DateTime startDate;
        DateTime endDate;

        if (DateTime.TryParse($"{targetMonth}-01", out var parsedDate))
        {
            startDate = new DateTime(parsedDate.Year, parsedDate.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            endDate = startDate.AddMonths(1);
        }
        else
        {
            var now = _dateTimeService.UtcNow;
            startDate = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            endDate = startDate.AddMonths(1);
        }

        var baseQuery = _context.Transactions
            .AsNoTracking()
            .Where(t => t.TransactionDate >= startDate && t.TransactionDate < endDate);

        // Compute Monthly Summary seamlessly across PostgreSQL and SQLite
        var summaryRows = await baseQuery
            .Select(t => new { t.Type, t.Amount })
            .ToListAsync(cancellationToken);

        var totalIncome = summaryRows.Where(x => x.Type == TransactionType.Income).Sum(x => x.Amount);
        var totalExpense = summaryRows.Where(x => x.Type == TransactionType.Expense).Sum(x => x.Amount);
        var netSavings = totalIncome - totalExpense;
        var savingsRate = totalIncome > 0 ? Math.Round((netSavings / totalIncome) * 100m, 2) : 0m;

        var summary = new MonthlySummaryDto(
            targetMonth,
            totalIncome,
            totalExpense,
            netSavings,
            savingsRate
        );

        // Filter for list
        var filteredQuery = baseQuery;

        if (request.Type.HasValue)
        {
            filteredQuery = filteredQuery.Where(t => t.Type == request.Type.Value);
        }

        if (request.CategoryId.HasValue)
        {
            filteredQuery = filteredQuery.Where(t => t.CategoryId == request.CategoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            filteredQuery = filteredQuery.Where(t =>
                (t.Note != null && t.Note.ToLower().Contains(search)) ||
                (t.Category != null && t.Category.Name.ToLower().Contains(search)));
        }

        var totalCount = await filteredQuery.CountAsync(cancellationToken);

        var pageIndex = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize < 1 ? 20 : request.PageSize;

        var itemsRaw = await filteredQuery
            .OrderByDescending(t => t.TransactionDate)
            .ThenByDescending(t => t.CreatedAtUtc)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new
            {
                t.Id,
                t.Type,
                t.Amount,
                t.CategoryId,
                CategoryName = t.Category != null ? t.Category.Name : "Uncategorized",
                CategoryIcon = t.Category != null ? t.Category.Icon : "tag",
                CategoryColor = t.Category != null ? t.Category.Color : "#4f46e5",
                t.TransactionDate,
                t.Note,
                t.AttachmentId,
                t.AttachmentUrl,
                t.AttachmentFileName,
                t.AttachmentFileType,
                t.AttachmentFileSize
            })
            .ToListAsync(cancellationToken);

        var items = itemsRaw.Select(t => new TransactionDto(
            t.Id,
            t.Type,
            t.Amount,
            new Money(t.Amount, "INR").ToIndianFormat(),
            t.CategoryId,
            t.CategoryName,
            t.CategoryIcon,
            t.CategoryColor,
            t.TransactionDate,
            t.Note,
            t.AttachmentId,
            t.AttachmentUrl,
            t.AttachmentFileName,
            t.AttachmentFileType,
            t.AttachmentFileSize
        )).ToList();

        var paginated = new PaginatedList<TransactionDto>(items, totalCount, pageIndex, pageSize);
        var response = new TransactionsResponseDto(paginated, summary);

        return Result<TransactionsResponseDto>.Success(response);
    }
}
