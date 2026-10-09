using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.Investments.DTOs;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using Hisaab.Domain.ValueObjects;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Investments.Queries;

public record GetHoldingByIdQuery(Guid Id) : IRequest<HoldingDetailDto>;

public class GetHoldingByIdQueryHandler : IRequestHandler<GetHoldingByIdQuery, HoldingDetailDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetHoldingByIdQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<HoldingDetailDto> Handle(GetHoldingByIdQuery request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;

        var holding = await _context.Holdings
            .Include(h => h.Transactions)
            .FirstOrDefaultAsync(h => h.Id == request.Id && h.UserId == currentUserId, cancellationToken);

        if (holding == null)
        {
            throw new NotFoundException(nameof(Holding), request.Id);
        }

        var bought = holding.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Buy).Sum(t => t.Amount);
        var sold = holding.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Sell).Sum(t => t.Amount);
        var invested = Math.Max(0m, bought - sold);

        var unitsBought = holding.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Buy && t.Units.HasValue).Sum(t => t.Units!.Value);
        var unitsSold = holding.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Sell && t.Units.HasValue).Sum(t => t.Units!.Value);
        var netUnits = Math.Max(0m, unitsBought - unitsSold);

        var dividend = holding.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Dividend).Sum(t => t.Amount);

        var gainLoss = holding.CurrentValue - invested;
        var gainLossPct = invested > 0 ? Math.Round((gainLoss / invested) * 100m, 2) : 0m;

        var holdingDto = new HoldingDto(
            holding.Id,
            holding.Name,
            holding.Type,
            holding.Type.ToString(),
            holding.CurrentValue,
            new Money(holding.CurrentValue).ToIndianFormat(),
            holding.ValueUpdatedAtUtc,
            invested,
            new Money(invested).ToIndianFormat(),
            netUnits,
            gainLoss,
            new Money(gainLoss).ToIndianFormat(),
            gainLossPct,
            dividend,
            new Money(dividend).ToIndianFormat(),
            holding.Note,
            holding.Transactions.Count,
            holding.CreatedAtUtc
        );

        var transactionDtos = holding.Transactions
            .OrderByDescending(t => t.TransactionDate)
            .ThenByDescending(t => t.CreatedAtUtc)
            .Select(t => new InvestmentTransactionDto(
                t.Id,
                t.HoldingId,
                t.Kind,
                t.Kind.ToString(),
                t.Amount,
                new Money(t.Amount).ToIndianFormat(),
                t.Units,
                t.TransactionDate,
                t.Note
            ))
            .ToList();

        return new HoldingDetailDto(holdingDto, transactionDtos);
    }
}

