using FluentValidation;
using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Investments.Commands;

public record CreateInvestmentTransactionCommand(
    Guid HoldingId,
    InvestmentTransactionKind Kind,
    decimal Amount,
    DateTime TransactionDate,
    decimal? Units = null,
    string? Note = null,
    decimal? UpdatedCurrentValue = null
) : IRequest<Guid>;

public class CreateInvestmentTransactionCommandValidator : AbstractValidator<CreateInvestmentTransactionCommand>
{
    public CreateInvestmentTransactionCommandValidator()
    {
        RuleFor(x => x.HoldingId).NotEmpty().WithMessage("Holding ID is required.");
        RuleFor(x => x.Kind).IsInEnum().WithMessage("Valid investment transaction kind is required.");
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Amount must be greater than zero.");
        RuleFor(x => x.Units).GreaterThan(0).When(x => x.Units.HasValue).WithMessage("Units must be greater than zero if specified.");
        RuleFor(x => x.TransactionDate).NotEmpty().WithMessage("Transaction date is required.");
        RuleFor(x => x.Note).MaximumLength(500).WithMessage("Note must not exceed 500 characters.");
        RuleFor(x => x.UpdatedCurrentValue).GreaterThanOrEqualTo(0).When(x => x.UpdatedCurrentValue.HasValue).WithMessage("Updated current value cannot be negative.");
    }
}

public class CreateInvestmentTransactionCommandHandler : IRequestHandler<CreateInvestmentTransactionCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeService _dateTimeService;

    public CreateInvestmentTransactionCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _dateTimeService = dateTimeService;
    }

    public async Task<Guid> Handle(CreateInvestmentTransactionCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId ?? Guid.Empty;

        var holding = await _context.Holdings
            .FirstOrDefaultAsync(h => h.Id == request.HoldingId && h.UserId == currentUserId, cancellationToken);

        if (holding == null)
        {
            throw new NotFoundException(nameof(Holding), request.HoldingId);
        }

        var transaction = new InvestmentTransaction
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            HoldingId = holding.Id,
            Kind = request.Kind,
            Amount = Math.Round(request.Amount, 2),
            Units = request.Units.HasValue ? Math.Round(request.Units.Value, 4) : null,
            TransactionDate = DateTime.SpecifyKind(request.TransactionDate, DateTimeKind.Utc),
            Note = request.Note?.Trim()
        };

        if (request.UpdatedCurrentValue.HasValue)
        {
            holding.CurrentValue = Math.Round(request.UpdatedCurrentValue.Value, 2);
            holding.ValueUpdatedAtUtc = _dateTimeService.UtcNow;
        }

        _context.InvestmentTransactions.Add(transaction);
        await _context.SaveChangesAsync(cancellationToken);

        return transaction.Id;
    }
}

