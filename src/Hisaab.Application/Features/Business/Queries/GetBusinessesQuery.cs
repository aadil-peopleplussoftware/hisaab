using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.Business.DTOs;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Business.Queries;

public record GetBusinessesQuery(bool IncludeInactive = true) : IRequest<BusinessListResponseDto>;

public class GetBusinessesQueryHandler : IRequestHandler<GetBusinessesQuery, BusinessListResponseDto>
{
    private readonly IApplicationDbContext _context;

    public GetBusinessesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<BusinessListResponseDto> Handle(GetBusinessesQuery request, CancellationToken cancellationToken)
    {
        var businessesQuery = _context.Businesses.AsNoTracking();
        if (!request.IncludeInactive)
        {
            businessesQuery = businessesQuery.Where(b => b.IsActive);
        }

        var businesses = await businessesQuery
            .OrderByDescending(b => b.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var transactions = await _context.BusinessTransactions.AsNoTracking()
            .ToListAsync(cancellationToken);

        var dtos = new List<BusinessDto>();

        foreach (var b in businesses)
        {
            var bTxns = transactions.Where(t => t.BusinessId == b.Id).ToList();
            var rev = bTxns.Where(t => t.Type == BusinessTransactionType.Income).Sum(t => t.TotalAmount);
            var exp = bTxns.Where(t => t.Type == BusinessTransactionType.Expense).Sum(t => t.TotalAmount);
            var net = rev - exp;
            var margin = rev > 0 ? Math.Round((net / rev) * 100m, 2) : 0m;

            dtos.Add(new BusinessDto(
                b.Id,
                b.Name,
                b.LegalName,
                b.Type,
                b.Type.ToString(),
                b.Currency,
                b.TaxId,
                b.Description,
                b.IsActive,
                b.Color,
                b.CreatedAtUtc,
                rev,
                exp,
                net,
                margin,
                bTxns.Count
            ));
        }

        // Calculate consolidated summary across all transactions
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

        // Category breakdown
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

        // Monthly trends (past 6 months)
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

        var consolidatedSummary = new BusinessPnLSummaryDto(
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

        return new BusinessListResponseDto(dtos, consolidatedSummary);
    }
}

