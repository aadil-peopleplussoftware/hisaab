using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.Business.DTOs;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Business.Queries;

public record GetBusinessPnLSummaryQuery(Guid? BusinessId = null) : IRequest<BusinessPnLSummaryDto>;

public class GetBusinessPnLSummaryQueryHandler : IRequestHandler<GetBusinessPnLSummaryQuery, BusinessPnLSummaryDto>
{
    private readonly IApplicationDbContext _context;

    public GetBusinessPnLSummaryQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<BusinessPnLSummaryDto> Handle(GetBusinessPnLSummaryQuery request, CancellationToken cancellationToken)
    {
        var query = _context.BusinessTransactions.AsNoTracking();

        if (request.BusinessId.HasValue && request.BusinessId.Value != Guid.Empty)
        {
            query = query.Where(t => t.BusinessId == request.BusinessId.Value);
        }

        var transactions = await query.ToListAsync(cancellationToken);

        var totalRev = transactions.Where(t => t.Type == BusinessTransactionType.Income).Sum(t => t.TotalAmount);
        var totalExp = transactions.Where(t => t.Type == BusinessTransactionType.Expense).Sum(t => t.TotalAmount);
        var netProfit = totalRev - totalExp;
        var profitMargin = totalRev > 0 ? Math.Round((netProfit / totalRev) * 100m, 2) : 0m;

        var taxesCollected = transactions.Where(t => t.Type == BusinessTransactionType.Income).Sum(t => t.TaxAmount);
        var taxesPaid = transactions.Where(t => t.Type == BusinessTransactionType.Expense).Sum(t => t.TaxAmount);
        var netTax = taxesCollected - taxesPaid;

        var accountsReceivable = transactions
            .Where(t => t.Type == BusinessTransactionType.Income && (t.PaymentStatus == BusinessPaymentStatus.Pending || t.PaymentStatus == BusinessPaymentStatus.Overdue))
            .Sum(t => t.TotalAmount);

        var accountsPayable = transactions
            .Where(t => t.Type == BusinessTransactionType.Expense && (t.PaymentStatus == BusinessPaymentStatus.Pending || t.PaymentStatus == BusinessPaymentStatus.Overdue))
            .Sum(t => t.TotalAmount);

        var pendingCount = transactions.Count(t => t.PaymentStatus == BusinessPaymentStatus.Pending);
        var overdueCount = transactions.Count(t => t.PaymentStatus == BusinessPaymentStatus.Overdue);

        var categoryGroups = transactions
            .GroupBy(t => new { t.Category, t.Type })
            .Select(g => new BusinessCategoryBreakdownDto(
                g.Key.Category,
                g.Key.Type,
                g.Sum(x => x.TotalAmount),
                g.Key.Type == BusinessTransactionType.Income && totalRev > 0
                    ? Math.Round((g.Sum(x => x.TotalAmount) / totalRev) * 100m, 1)
                    : (g.Key.Type == BusinessTransactionType.Expense && totalExp > 0
                        ? Math.Round((g.Sum(x => x.TotalAmount) / totalExp) * 100m, 1)
                        : 0m)
            ))
            .OrderByDescending(c => c.Amount)
            .ToList();

        var now = DateTime.UtcNow;
        var monthlyTrends = new List<BusinessMonthlyTrendDto>();
        for (int i = 5; i >= 0; i--)
        {
            var targetMonth = now.AddMonths(-i);
            var mYear = targetMonth.Year;
            var mMonth = targetMonth.Month;
            var key = $"{mYear}-{mMonth:D2}";
            var label = targetMonth.ToString("MMM yyyy");

            var mRev = transactions
                .Where(t => t.TransactionDate.Year == mYear && t.TransactionDate.Month == mMonth && t.Type == BusinessTransactionType.Income)
                .Sum(t => t.TotalAmount);

            var mExp = transactions
                .Where(t => t.TransactionDate.Year == mYear && t.TransactionDate.Month == mMonth && t.Type == BusinessTransactionType.Expense)
                .Sum(t => t.TotalAmount);

            monthlyTrends.Add(new BusinessMonthlyTrendDto(key, label, mRev, mExp, mRev - mExp));
        }

        return new BusinessPnLSummaryDto(
            totalRev,
            totalExp,
            netProfit,
            profitMargin,
            taxesCollected,
            taxesPaid,
            netTax,
            accountsReceivable,
            accountsPayable,
            pendingCount,
            overdueCount,
            categoryGroups,
            monthlyTrends
        );
    }
}

