using System.Globalization;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.Epfo.DTOs;
using Hisaab.Domain.ValueObjects;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Epfo.Queries;

public record GetEpfEntriesQuery(int? Year = null) : IRequest<EpfResponseDto>;

public class GetEpfEntriesQueryHandler : IRequestHandler<GetEpfEntriesQuery, EpfResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeService _dateTimeService;

    public GetEpfEntriesQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _dateTimeService = dateTimeService;
    }

    public async Task<EpfResponseDto> Handle(GetEpfEntriesQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        var now = _dateTimeService.UtcNow;
        var targetYear = request.Year ?? now.Year;

        // Fetch all user entries chronologically to compute running balances (defense-in-depth)
        var allEntries = await _context.EpfEntries
            .Where(e => e.UserId == currentUserId)
            .OrderBy(e => e.Month)
            .ThenByDescending(e => e.EmployeeShare)
            .ThenBy(e => e.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        // Compute running balances chronologically
        decimal runningEpf = 0m;
        decimal runningPension = 0m;
        var computedEntries = new List<EpfEntryDto>();

        foreach (var entry in allEntries)
        {
            var netInflow = entry.EmployeeShare + entry.EmployerShare + entry.Interest - entry.Withdrawal;
            runningEpf += netInflow;
            runningPension += entry.PensionShare;

            var baseMonth = entry.Month.ToString("MMM yyyy", CultureInfo.InvariantCulture);
            var monthLabel = entry.Withdrawal > 0 && entry.EmployeeShare == 0 && entry.EmployerShare == 0
                ? $"{baseMonth} (Claim)"
                : (entry.Interest > 0 && entry.EmployeeShare == 0 && entry.EmployerShare == 0
                    ? $"{baseMonth} (Interest)"
                    : baseMonth);

            computedEntries.Add(new EpfEntryDto(
                entry.Id,
                entry.Month,
                monthLabel,
                entry.EmployeeShare,
                new Money(entry.EmployeeShare).ToIndianFormat(),
                entry.EmployerShare,
                new Money(entry.EmployerShare).ToIndianFormat(),
                entry.PensionShare,
                new Money(entry.PensionShare).ToIndianFormat(),
                entry.Interest,
                new Money(entry.Interest).ToIndianFormat(),
                entry.Withdrawal,
                new Money(entry.Withdrawal).ToIndianFormat(),
                netInflow,
                new Money(netInflow).ToIndianFormat(),
                runningEpf,
                new Money(runningEpf).ToIndianFormat(),
                runningPension,
                new Money(runningPension).ToIndianFormat(),
                entry.Note,
                entry.CreatedAtUtc
            ));
        }

        // Available years list
        var years = allEntries.Select(e => e.Month.Year).Distinct().OrderByDescending(y => y).ToList();
        if (!years.Contains(now.Year))
        {
            years.Insert(0, now.Year);
            years = years.Distinct().OrderByDescending(y => y).ToList();
        }

        // Calculate opening balance before the target year
        var openingBalance = computedEntries
            .Where(e => e.Month.Year < targetYear)
            .OrderByDescending(e => e.Month)
            .Select(e => e.RunningBalance)
            .FirstOrDefault();

        // Entries for selected year
        var yearEntries = computedEntries.Where(e => e.Month.Year == targetYear).ToList();

        var totalEmployee = yearEntries.Sum(e => e.EmployeeShare);
        var totalEmployer = yearEntries.Sum(e => e.EmployerShare);
        var totalPension = yearEntries.Sum(e => e.PensionShare);
        var totalInterest = yearEntries.Sum(e => e.Interest);
        var totalWithdrawals = yearEntries.Sum(e => e.Withdrawal);

        var closingBalance = openingBalance + totalEmployee + totalEmployer + totalInterest - totalWithdrawals;

        var totalPensionBalance = computedEntries
            .Where(e => e.Month.Year <= targetYear)
            .OrderByDescending(e => e.Month)
            .Select(e => e.RunningPensionBalance)
            .FirstOrDefault();

        var summary = new EpfYearlySummaryDto(
            targetYear,
            openingBalance,
            new Money(openingBalance).ToIndianFormat(),
            totalEmployee,
            new Money(totalEmployee).ToIndianFormat(),
            totalEmployer,
            new Money(totalEmployer).ToIndianFormat(),
            totalPension,
            new Money(totalPension).ToIndianFormat(),
            totalInterest,
            new Money(totalInterest).ToIndianFormat(),
            totalWithdrawals,
            new Money(totalWithdrawals).ToIndianFormat(),
            closingBalance,
            new Money(closingBalance).ToIndianFormat(),
            totalPensionBalance,
            new Money(totalPensionBalance).ToIndianFormat(),
            yearEntries.Count
        );

        // Sort descending (latest month first) for the UI ledger display
        var displayEntries = yearEntries.OrderByDescending(e => e.Month).ToList();

        return new EpfResponseDto(
            displayEntries,
            summary,
            years,
            runningEpf,
            new Money(runningEpf).ToIndianFormat(),
            runningPension,
            new Money(runningPension).ToIndianFormat()
        );
    }
}

