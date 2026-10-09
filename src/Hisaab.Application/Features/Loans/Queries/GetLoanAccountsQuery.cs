using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.Loans.DTOs;
using Hisaab.Domain.Enums;
using Hisaab.Domain.Services;
using Hisaab.Domain.ValueObjects;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Loans.Queries;

public record GetLoanAccountsQuery(
    LoanDirection? Direction = null,
    LoanStatus? Status = null,
    string? Search = null
) : IRequest<LoanListResponseDto>;

public class GetLoanAccountsQueryHandler : IRequestHandler<GetLoanAccountsQuery, LoanListResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeService _dateTimeService;

    public GetLoanAccountsQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _dateTimeService = dateTimeService;
    }

    public async Task<LoanListResponseDto> Handle(GetLoanAccountsQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        var now = _dateTimeService.UtcNow;

        // Query all accounts belonging to the current user (defense in depth)
        var allAccounts = await _context.LoanAccounts
            .Include(l => l.Transactions)
            .Where(l => l.UserId == currentUserId)
            .OrderByDescending(l => l.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        // Pre-calculate per-account ledger totals in memory for provider compatibility (SQLite & Postgres)
        var accountDtos = new List<LoanAccountDto>();

        foreach (var acc in allAccounts)
        {
            var disburse = acc.Transactions
                .Where(t => t.Kind == LoanTransactionKind.Disburse)
                .Sum(t => t.Amount);

            var repayment = acc.Transactions
                .Where(t => t.Kind == LoanTransactionKind.Repayment)
                .Sum(t => t.Amount);

            var interest = acc.Transactions
                .Where(t => t.Kind == LoanTransactionKind.Interest)
                .Sum(t => t.Amount);

            var penalty = acc.Transactions
                .Where(t => t.Kind == LoanTransactionKind.Penalty)
                .Sum(t => t.Amount);

            var outstanding = (disburse + interest + penalty) - repayment;
            var accruedInterest = LoanInterestCalculator.CalculateAccruedInterest(
                outstanding > 0 ? outstanding : 0,
                acc.InterestRate,
                acc.InterestType,
                acc.StartDate,
                now
            );

            accountDtos.Add(new LoanAccountDto(
                acc.Id,
                acc.Name,
                acc.Counterparty,
                acc.Direction,
                acc.Direction.ToString(),
                acc.Principal,
                new Money(acc.Principal).ToIndianFormat(),
                acc.InterestRate,
                acc.InterestType,
                acc.InterestType.ToString(),
                acc.StartDate,
                acc.DueDate,
                acc.Status,
                acc.Status.ToString(),
                acc.Note,
                disburse,
                repayment,
                interest,
                penalty,
                outstanding,
                new Money(outstanding).ToIndianFormat(),
                accruedInterest,
                new Money(accruedInterest).ToIndianFormat(),
                acc.CreatedAtUtc,
                acc.Transactions.Count
            ));
        }

        // Global summary across all accounts of the user (regardless of current filter)
        var activeGiven = accountDtos.Where(a => a.Direction == LoanDirection.Given && a.Status == LoanStatus.Active).ToList();
        var activeTaken = accountDtos.Where(a => a.Direction == LoanDirection.Taken && a.Status == LoanStatus.Active).ToList();

        var totalGivenPrincipal = activeGiven.Sum(a => a.Principal);
        var totalGivenOutstanding = activeGiven.Sum(a => a.OutstandingBalance);
        var totalTakenPrincipal = activeTaken.Sum(a => a.Principal);
        var totalTakenOutstanding = activeTaken.Sum(a => a.OutstandingBalance);
        var netPosition = totalGivenOutstanding - totalTakenOutstanding; // Receivable minus Payable

        var summary = new LoanSummaryDto(
            totalGivenPrincipal,
            totalGivenOutstanding,
            new Money(totalGivenOutstanding).ToIndianFormat(),
            totalTakenPrincipal,
            totalTakenOutstanding,
            new Money(totalTakenOutstanding).ToIndianFormat(),
            netPosition,
            new Money(netPosition).ToIndianFormat(),
            activeGiven.Count,
            activeTaken.Count,
            accountDtos.Count(a => a.Status == LoanStatus.Closed)
        );

        // Apply filters for the returned account list
        var filteredList = accountDtos.AsEnumerable();

        if (request.Direction.HasValue)
        {
            filteredList = filteredList.Where(a => a.Direction == request.Direction.Value);
        }

        if (request.Status.HasValue)
        {
            filteredList = filteredList.Where(a => a.Status == request.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLowerInvariant();
            filteredList = filteredList.Where(a =>
                a.Name.ToLowerInvariant().Contains(search) ||
                a.Counterparty.ToLowerInvariant().Contains(search) ||
                (a.Note != null && a.Note.ToLowerInvariant().Contains(search)));
        }

        return new LoanListResponseDto(filteredList.ToList(), summary);
    }
}

