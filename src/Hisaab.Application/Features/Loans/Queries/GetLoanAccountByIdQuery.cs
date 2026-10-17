using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.Loans.DTOs;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using Hisaab.Domain.Services;
using Hisaab.Domain.ValueObjects;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Loans.Queries;

public record GetLoanAccountByIdQuery(Guid Id) : IRequest<LoanAccountDetailDto>;

public class GetLoanAccountByIdQueryHandler : IRequestHandler<GetLoanAccountByIdQuery, LoanAccountDetailDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeService _dateTimeService;

    public GetLoanAccountByIdQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _dateTimeService = dateTimeService;
    }

    public async Task<LoanAccountDetailDto> Handle(GetLoanAccountByIdQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        var now = _dateTimeService.UtcNow;

        var account = await _context.LoanAccounts
            .Include(l => l.Transactions)
            .FirstOrDefaultAsync(l => l.Id == request.Id && l.UserId == currentUserId, cancellationToken);

        if (account == null)
        {
            throw new NotFoundException(nameof(LoanAccount), request.Id);
        }

        // Chronological order for running balance computation
        var sortedTxns = account.Transactions
            .OrderBy(t => t.TransactionDate)
            .ThenBy(t => t.CreatedAtUtc)
            .ToList();

        decimal runningBalance = 0m;
        var txnDtos = new List<LoanTransactionDto>();

        foreach (var txn in sortedTxns)
        {
            switch (txn.Kind)
            {
                case LoanTransactionKind.Disburse:
                case LoanTransactionKind.Interest:
                case LoanTransactionKind.Penalty:
                    runningBalance += txn.Amount;
                    break;
                case LoanTransactionKind.Repayment:
                    runningBalance -= txn.Amount;
                    break;
            }

            txnDtos.Add(new LoanTransactionDto(
                txn.Id,
                txn.LoanAccountId,
                txn.Kind,
                txn.Kind.ToString(),
                txn.Amount,
                new Money(txn.Amount).ToIndianFormat(),
                txn.TransactionDate,
                txn.Note,
                txn.AttachmentId,
                runningBalance,
                new Money(runningBalance).ToIndianFormat()
            ));
        }

        var totalDisbursed = sortedTxns.Where(t => t.Kind == LoanTransactionKind.Disburse).Sum(t => t.Amount);
        var totalRepaid = sortedTxns.Where(t => t.Kind == LoanTransactionKind.Repayment).Sum(t => t.Amount);
        var totalInterest = sortedTxns.Where(t => t.Kind == LoanTransactionKind.Interest).Sum(t => t.Amount);
        var totalPenalty = sortedTxns.Where(t => t.Kind == LoanTransactionKind.Penalty).Sum(t => t.Amount);
        var outstandingBalance = (totalDisbursed + totalInterest + totalPenalty) - totalRepaid;

        var accruedInterest = LoanInterestCalculator.CalculateAccruedInterest(
            outstandingBalance > 0 ? outstandingBalance : 0,
            account.InterestRate,
            account.InterestType,
            account.StartDate,
            now
        );

        var dailyInterest = LoanInterestCalculator.CalculateDailyInterest(
            outstandingBalance > 0 ? outstandingBalance : 0,
            account.InterestRate
        );

        var projectedPayoff = (outstandingBalance > 0 ? outstandingBalance : 0) + accruedInterest;
        var daysElapsed = Math.Max(0, (int)(now.Date - account.StartDate.Date).TotalDays);

        var accountDto = new LoanAccountDto(
            account.Id,
            account.Name,
            account.Counterparty,
            account.Direction,
            account.Direction.ToString(),
            account.Principal,
            new Money(account.Principal).ToIndianFormat(),
            account.InterestRate,
            account.InterestType,
            account.InterestType.ToString(),
            account.StartDate,
            account.DueDate,
            account.Status,
            account.Status.ToString(),
            account.Priority,
            account.Priority.ToString(),
            account.Note,
            totalDisbursed,
            totalRepaid,
            totalInterest,
            totalPenalty,
            outstandingBalance,
            new Money(outstandingBalance).ToIndianFormat(),
            accruedInterest,
            new Money(accruedInterest).ToIndianFormat(),
            account.CreatedAtUtc,
            sortedTxns.Count
        );

        // Ledger display typically has latest transaction first or chronological - return chronological or reverse based on preference.
        // We reverse it for UI convenience so newest transactions appear at top of ledger, while preserving computed running balances!
        var reversedTxnDtos = txnDtos.AsEnumerable().Reverse().ToList();

        return new LoanAccountDetailDto(
            accountDto,
            reversedTxnDtos,
            projectedPayoff,
            new Money(projectedPayoff).ToIndianFormat(),
            dailyInterest,
            new Money(dailyInterest).ToIndianFormat(),
            daysElapsed
        );
    }
}

