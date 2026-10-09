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

public record CalculateLoanInterestQuery(
    Guid? LoanAccountId = null,
    decimal? CustomPrincipal = null,
    decimal? CustomAnnualRate = null,
    LoanInterestType? CustomInterestType = null,
    DateTime? CustomStartDate = null,
    DateTime? AsOfDate = null
) : IRequest<InterestCalculationDto>;

public class CalculateLoanInterestQueryHandler : IRequestHandler<CalculateLoanInterestQuery, InterestCalculationDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeService _dateTimeService;

    public CalculateLoanInterestQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _dateTimeService = dateTimeService;
    }

    public async Task<InterestCalculationDto> Handle(CalculateLoanInterestQuery request, CancellationToken cancellationToken)
    {
        decimal principal;
        decimal rate;
        LoanInterestType interestType;
        DateTime startDate;
        var asOfDate = request.AsOfDate ?? _dateTimeService.UtcNow;

        if (request.LoanAccountId.HasValue)
        {
            var currentUserId = _currentUserService.UserId;
            var account = await _context.LoanAccounts
                .Include(l => l.Transactions)
                .FirstOrDefaultAsync(l => l.Id == request.LoanAccountId.Value && l.UserId == currentUserId, cancellationToken);

            if (account == null)
            {
                throw new NotFoundException(nameof(LoanAccount), request.LoanAccountId.Value);
            }

            // Calculate current outstanding balance
            var disburse = account.Transactions.Where(t => t.Kind == LoanTransactionKind.Disburse).Sum(t => t.Amount);
            var repayment = account.Transactions.Where(t => t.Kind == LoanTransactionKind.Repayment).Sum(t => t.Amount);
            var interest = account.Transactions.Where(t => t.Kind == LoanTransactionKind.Interest).Sum(t => t.Amount);
            var penalty = account.Transactions.Where(t => t.Kind == LoanTransactionKind.Penalty).Sum(t => t.Amount);
            var outstanding = (disburse + interest + penalty) - repayment;

            principal = outstanding > 0 ? outstanding : 0;
            rate = request.CustomAnnualRate ?? account.InterestRate;
            interestType = request.CustomInterestType ?? account.InterestType;
            startDate = request.CustomStartDate ?? account.StartDate;
        }
        else
        {
            principal = request.CustomPrincipal ?? 0m;
            rate = request.CustomAnnualRate ?? 0m;
            interestType = request.CustomInterestType ?? LoanInterestType.None;
            startDate = request.CustomStartDate ?? _dateTimeService.UtcNow;
        }

        var accrued = LoanInterestCalculator.CalculateAccruedInterest(principal, rate, interestType, startDate, asOfDate);
        var totalPayable = principal + accrued;
        var days = Math.Max(0, (int)(asOfDate.Date - startDate.Date).TotalDays);
        var daily = LoanInterestCalculator.CalculateDailyInterest(principal, rate);

        return new InterestCalculationDto(
            principal,
            rate,
            interestType,
            interestType.ToString(),
            startDate,
            asOfDate,
            days,
            accrued,
            new Money(accrued).ToIndianFormat(),
            totalPayable,
            new Money(totalPayable).ToIndianFormat(),
            daily,
            new Money(daily).ToIndianFormat()
        );
    }
}

