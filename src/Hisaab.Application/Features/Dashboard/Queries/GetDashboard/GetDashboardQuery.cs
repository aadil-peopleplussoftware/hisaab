using System.Globalization;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Common.Models;
using Hisaab.Application.Features.Dashboard.DTOs;
using Hisaab.Domain.Enums;
using Hisaab.Domain.ValueObjects;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Dashboard.Queries.GetDashboard;

public record GetDashboardQuery(
    string? Month = null,
    int TrendMonths = 6,
    string? PeriodType = "month",
    string? Date = null,
    int? Year = null,
    DateTime? StartDate = null,
    DateTime? EndDate = null
) : IRequest<Result<DashboardResponseDto>>;

public class GetDashboardQueryHandler : IRequestHandler<GetDashboardQuery, Result<DashboardResponseDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeService _dateTimeService;

    public GetDashboardQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _dateTimeService = dateTimeService;
    }

    public async Task<Result<DashboardResponseDto>> Handle(GetDashboardQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        var nowUtc = _dateTimeService.UtcNow;

        var period = (request.PeriodType ?? "month").Trim().ToLowerInvariant();
        DateTime selectedStartUtc;
        DateTime selectedEndUtc;
        string targetPeriodLabel;

        switch (period)
        {
            case "all":
            case "all-time":
            case "lifetime":
                selectedStartUtc = new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);
                selectedEndUtc = DateTime.UtcNow.AddYears(10);
                targetPeriodLabel = "All Time";
                break;

            case "year":
                var targetYear = request.Year ?? _dateTimeService.NowInKolkata.Year;
                if (!string.IsNullOrWhiteSpace(request.Month) && int.TryParse(request.Month, out var yFromMonth) && yFromMonth > 2000)
                {
                    targetYear = yFromMonth;
                }
                selectedStartUtc = new DateTime(targetYear, 1, 1, 0, 0, 0, DateTimeKind.Utc);
                selectedEndUtc = selectedStartUtc.AddYears(1);
                targetPeriodLabel = $"Year {targetYear}";
                break;

            case "day":
            case "today":
                DateTime targetDay;
                if (!string.IsNullOrWhiteSpace(request.Date) && DateTime.TryParse(request.Date, out var parsedDay))
                {
                    targetDay = parsedDay.Date;
                }
                else
                {
                    targetDay = _dateTimeService.NowInKolkata.Date;
                }
                selectedStartUtc = DateTime.SpecifyKind(targetDay, DateTimeKind.Utc);
                selectedEndUtc = selectedStartUtc.AddDays(1);
                targetPeriodLabel = targetDay.ToString("dd MMM yyyy", CultureInfo.InvariantCulture);
                break;

            case "custom":
                var start = request.StartDate ?? _dateTimeService.NowInKolkata.Date.AddDays(-30);
                var end = request.EndDate ?? _dateTimeService.NowInKolkata.Date;
                if (start > end) (start, end) = (end, start);
                selectedStartUtc = DateTime.SpecifyKind(start.Date, DateTimeKind.Utc);
                selectedEndUtc = DateTime.SpecifyKind(end.Date.AddDays(1), DateTimeKind.Utc);
                targetPeriodLabel = $"{start:dd MMM yyyy} - {end:dd MMM yyyy}";
                break;

            case "month":
            default:
                var targetMonthStr = string.IsNullOrWhiteSpace(request.Month)
                    ? _dateTimeService.NowInKolkata.ToString("yyyy-MM")
                    : request.Month.Trim();

                if (DateTime.TryParseExact(targetMonthStr, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedMonth))
                {
                    selectedStartUtc = new DateTime(parsedMonth.Year, parsedMonth.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                }
                else
                {
                    var now = _dateTimeService.NowInKolkata;
                    selectedStartUtc = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                    targetMonthStr = selectedStartUtc.ToString("yyyy-MM");
                }
                selectedEndUtc = selectedStartUtc.AddMonths(1);
                targetPeriodLabel = selectedStartUtc.ToString("MMMM yyyy", CultureInfo.InvariantCulture);
                break;
        }

        // 1. Transactions in selected period
        var selectedPeriodTx = await _context.Transactions
            .AsNoTracking()
            .Include(t => t.Category)
            .Where(t => t.UserId == currentUserId && t.TransactionDate >= selectedStartUtc && t.TransactionDate < selectedEndUtc)
            .ToListAsync(cancellationToken);

        var periodIncome = selectedPeriodTx.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
        var periodExpense = selectedPeriodTx.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);
        var netSavings = periodIncome - periodExpense;
        var savingsRate = periodIncome > 0 ? Math.Round((netSavings / periodIncome) * 100m, 2) : 0m;

        var monthlyOverview = new MonthlyOverviewDto(
            targetPeriodLabel,
            periodIncome,
            new Money(periodIncome).ToIndianFormat(),
            periodExpense,
            new Money(periodExpense).ToIndianFormat(),
            netSavings,
            new Money(netSavings).ToIndianFormat(),
            savingsRate,
            selectedPeriodTx.Count
        );

        // 2. All-time Net Worth Calculation
        // Cumulative Cash = Total historical Income - Total historical Expense
        var allTxSums = await _context.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == currentUserId)
            .Select(t => new { t.Type, t.Amount })
            .ToListAsync(cancellationToken);

        var totalHistoricalIncome = allTxSums.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
        var totalHistoricalExpense = allTxSums.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);
        var liquidCash = totalHistoricalIncome - totalHistoricalExpense;

        // Investment portfolio current valuation
        var holdings = await _context.Holdings
            .AsNoTracking()
            .Where(h => h.UserId == currentUserId)
            .Select(h => h.CurrentValue)
            .ToListAsync(cancellationToken);
        var investmentsValue = holdings.Sum();

        // EPFO total balance
        var epfEntries = await _context.EpfEntries
            .AsNoTracking()
            .Where(e => e.UserId == currentUserId)
            .Select(e => new { e.EmployeeShare, e.EmployerShare, e.Interest, e.Withdrawal })
            .ToListAsync(cancellationToken);
        var epfBalance = epfEntries.Sum(e => e.EmployeeShare + e.EmployerShare + e.Interest - e.Withdrawal);

        // Active Loans (Given = Receivable, Taken = Payable)
        var loanAccounts = await _context.LoanAccounts
            .AsNoTracking()
            .Include(l => l.Transactions)
            .Where(l => l.UserId == currentUserId)
            .ToListAsync(cancellationToken);

        decimal loansReceivable = 0m;
        decimal loansPayable = 0m;
        var upcomingDuesList = new List<ActiveLoanDueDto>();

        foreach (var loan in loanAccounts)
        {
            var disburse = loan.Transactions.Where(t => t.Kind == LoanTransactionKind.Disburse).Sum(t => t.Amount);
            var repayment = loan.Transactions.Where(t => t.Kind == LoanTransactionKind.Repayment).Sum(t => t.Amount);
            var interest = loan.Transactions.Where(t => t.Kind == LoanTransactionKind.Interest).Sum(t => t.Amount);
            var penalty = loan.Transactions.Where(t => t.Kind == LoanTransactionKind.Penalty).Sum(t => t.Amount);

            var outstanding = (disburse + interest + penalty) - repayment;

            if (loan.Status == LoanStatus.Active)
            {
                if (loan.Direction == LoanDirection.Given)
                {
                    loansReceivable += outstanding;
                }
                else
                {
                    loansPayable += outstanding;
                }

                if (outstanding > 0)
                {
                    var isOverdue = loan.DueDate.HasValue && loan.DueDate.Value.Date < nowUtc.Date;
                    int? daysUntilDue = loan.DueDate.HasValue ? (int?)(loan.DueDate.Value.Date - nowUtc.Date).TotalDays : null;

                    upcomingDuesList.Add(new ActiveLoanDueDto(
                        loan.Id,
                        loan.Name,
                        loan.Counterparty,
                        loan.Direction,
                        loan.Direction.ToString(),
                        outstanding,
                        new Money(outstanding).ToIndianFormat(),
                        loan.DueDate,
                        isOverdue,
                        daysUntilDue
                    ));
                }
            }
        }

        // Sort upcoming dues: overdue first, then by earliest due date, then highest outstanding
        upcomingDuesList = upcomingDuesList
            .OrderByDescending(d => d.IsOverdue)
            .ThenBy(d => d.DueDate.HasValue ? 0 : 1)
            .ThenBy(d => d.DueDate)
            .ThenByDescending(d => d.OutstandingBalance)
            .Take(5)
            .ToList();

        var totalAssets = (liquidCash > 0 ? liquidCash : 0m) + investmentsValue + (epfBalance > 0 ? epfBalance : 0m) + loansReceivable;
        var totalLiabilities = loansPayable + (liquidCash < 0 ? Math.Abs(liquidCash) : 0m) + (epfBalance < 0 ? Math.Abs(epfBalance) : 0m);
        var totalNetWorth = (liquidCash + investmentsValue + epfBalance + loansReceivable) - loansPayable;

        var netWorthBreakdown = new NetWorthBreakdownDto(
            totalNetWorth,
            new Money(totalNetWorth).ToIndianFormat(),
            liquidCash,
            new Money(liquidCash).ToIndianFormat(),
            investmentsValue,
            new Money(investmentsValue).ToIndianFormat(),
            epfBalance,
            new Money(epfBalance).ToIndianFormat(),
            loansReceivable,
            new Money(loansReceivable).ToIndianFormat(),
            loansPayable,
            new Money(loansPayable).ToIndianFormat(),
            totalAssets,
            new Money(totalAssets).ToIndianFormat(),
            totalLiabilities,
            new Money(totalLiabilities).ToIndianFormat()
        );

        // 3. Multi-month Historical Trend (default trailing 6 months)
        var trendCount = Math.Clamp(request.TrendMonths, 3, 24);
        var trendRef = (period == "all" || period == "custom" || selectedEndUtc > nowUtc.AddYears(1) || selectedEndUtc < new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc))
            ? _dateTimeService.NowInKolkata
            : selectedEndUtc;
        var trendEndUtc = new DateTime(trendRef.Year, trendRef.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1);
        var trendStartUtc = trendEndUtc.AddMonths(-trendCount);

        var trendTx = await _context.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == currentUserId && t.TransactionDate >= trendStartUtc && t.TransactionDate < trendEndUtc)
            .Select(t => new { t.TransactionDate, t.Type, t.Amount })
            .ToListAsync(cancellationToken);

        var monthlyTrends = new List<MonthlyTrendDto>();
        for (int i = 0; i < trendCount; i++)
        {
            var mDate = trendStartUtc.AddMonths(i);
            var mStart = mDate;
            var mEnd = mDate.AddMonths(1);
            var mKey = mDate.ToString("yyyy-MM");
            var mLabel = mDate.ToString("MMM yyyy", CultureInfo.InvariantCulture);

            var itemsInMonth = trendTx.Where(t => t.TransactionDate >= mStart && t.TransactionDate < mEnd).ToList();
            var inc = itemsInMonth.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
            var exp = itemsInMonth.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);

            monthlyTrends.Add(new MonthlyTrendDto(
                mKey,
                mLabel,
                inc,
                exp,
                inc - exp
            ));
        }

        // 4. Category Breakdowns for Selected Period
        var expenseCategories = selectedPeriodTx
            .Where(t => t.Type == TransactionType.Expense)
            .GroupBy(t => new
            {
                Id = t.CategoryId,
                Name = t.Category != null ? t.Category.Name : "Uncategorized",
                Icon = t.Category != null ? t.Category.Icon : "tag",
                Color = t.Category != null ? t.Category.Color : "#ef4444"
            })
            .Select(g =>
            {
                var amt = g.Sum(x => x.Amount);
                var pct = periodExpense > 0 ? Math.Round((amt / periodExpense) * 100m, 1) : 0m;
                return new CategoryBreakdownItemDto(
                    g.Key.Id,
                    g.Key.Name,
                    g.Key.Icon,
                    g.Key.Color,
                    amt,
                    new Money(amt).ToIndianFormat(),
                    pct
                );
            })
            .OrderByDescending(c => c.Amount)
            .Take(6)
            .ToList();

        var incomeCategories = selectedPeriodTx
            .Where(t => t.Type == TransactionType.Income)
            .GroupBy(t => new
            {
                Id = t.CategoryId,
                Name = t.Category != null ? t.Category.Name : "Uncategorized",
                Icon = t.Category != null ? t.Category.Icon : "tag",
                Color = t.Category != null ? t.Category.Color : "#10b981"
            })
            .Select(g =>
            {
                var amt = g.Sum(x => x.Amount);
                var pct = periodIncome > 0 ? Math.Round((amt / periodIncome) * 100m, 1) : 0m;
                return new CategoryBreakdownItemDto(
                    g.Key.Id,
                    g.Key.Name,
                    g.Key.Icon,
                    g.Key.Color,
                    amt,
                    new Money(amt).ToIndianFormat(),
                    pct
                );
            })
            .OrderByDescending(c => c.Amount)
            .Take(6)
            .ToList();

        // 5. Recent Transactions
        var recentTxRaw = await _context.Transactions
            .AsNoTracking()
            .Include(t => t.Category)
            .Where(t => t.UserId == currentUserId)
            .OrderByDescending(t => t.TransactionDate)
            .ThenByDescending(t => t.CreatedAtUtc)
            .Take(6)
            .Select(t => new
            {
                t.Id,
                t.Type,
                t.Amount,
                CategoryName = t.Category != null ? t.Category.Name : "Uncategorized",
                CategoryIcon = t.Category != null ? t.Category.Icon : "tag",
                CategoryColor = t.Category != null ? t.Category.Color : "#6366f1",
                t.TransactionDate,
                t.Note
            })
            .ToListAsync(cancellationToken);

        var recentTx = recentTxRaw.Select(t => new DashboardRecentTransactionDto(
            t.Id,
            t.Type,
            t.Amount,
            new Money(t.Amount).ToIndianFormat(),
            t.CategoryName,
            t.CategoryIcon,
            t.CategoryColor,
            t.TransactionDate,
            t.Note
        )).ToList();

        var response = new DashboardResponseDto(
            targetPeriodLabel,
            monthlyOverview,
            netWorthBreakdown,
            monthlyTrends,
            expenseCategories,
            incomeCategories,
            upcomingDuesList,
            recentTx
        );

        return Result<DashboardResponseDto>.Success(response);
    }
}
