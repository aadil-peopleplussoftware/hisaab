using FluentValidation;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;

namespace Hisaab.Application.Features.Investments.Commands;

public record CreateHoldingCommand(
    string Name,
    InvestmentType Type,
    decimal InitialInvestedAmount,
    decimal? InitialUnits = null,
    decimal? CurrentValue = null,
    DateTime? TransactionDate = null,
    string? Note = null
) : IRequest<Guid>;

public class CreateHoldingCommandValidator : AbstractValidator<CreateHoldingCommand>
{
    public CreateHoldingCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Holding name is required.")
            .MaximumLength(150).WithMessage("Holding name must not exceed 150 characters.");

        RuleFor(x => x.Type)
            .IsInEnum().WithMessage("Valid investment asset type is required.");

        RuleFor(x => x.InitialInvestedAmount)
            .GreaterThan(0).WithMessage("Initial invested amount must be greater than zero.");

        RuleFor(x => x.InitialUnits)
            .GreaterThan(0).When(x => x.InitialUnits.HasValue)
            .WithMessage("Units must be greater than zero if specified.");

        RuleFor(x => x.CurrentValue)
            .GreaterThanOrEqualTo(0).When(x => x.CurrentValue.HasValue)
            .WithMessage("Current value cannot be negative.");

        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Note must not exceed 500 characters.");
    }
}

public class CreateHoldingCommandHandler : IRequestHandler<CreateHoldingCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeService _dateTimeService;

    public CreateHoldingCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _dateTimeService = dateTimeService;
    }

    public async Task<Guid> Handle(CreateHoldingCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId ?? Guid.Empty;
        var now = _dateTimeService.UtcNow;
        var txnDate = request.TransactionDate ?? now;

        var holding = new Holding
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            Name = request.Name.Trim(),
            Type = request.Type,
            CurrentValue = request.CurrentValue ?? request.InitialInvestedAmount,
            ValueUpdatedAtUtc = now,
            Note = request.Note?.Trim()
        };

        var initialBuyTransaction = new InvestmentTransaction
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            HoldingId = holding.Id,
            Kind = InvestmentTransactionKind.Buy,
            Amount = Math.Round(request.InitialInvestedAmount, 2),
            Units = request.InitialUnits.HasValue ? Math.Round(request.InitialUnits.Value, 4) : null,
            TransactionDate = DateTime.SpecifyKind(txnDate, DateTimeKind.Utc),
            Note = "Initial asset purchase"
        };

        holding.Transactions.Add(initialBuyTransaction);

        _context.Holdings.Add(holding);
        await _context.SaveChangesAsync(cancellationToken);

        return holding.Id;
    }
}

