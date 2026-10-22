using FluentValidation;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;

namespace Hisaab.Application.Features.Loans.Commands;

public record CreateLoanAccountCommand(
    string Name,
    string Counterparty,
    LoanDirection Direction,
    decimal Principal,
    decimal InterestRate,
    LoanInterestType InterestType,
    DateTime StartDate,
    DateTime? DueDate,
    string? Note,
    LoanPriority Priority = LoanPriority.Medium
) : IRequest<Guid>;

public class CreateLoanAccountCommandValidator : AbstractValidator<CreateLoanAccountCommand>
{
    public CreateLoanAccountCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Loan account name is required.")
            .MaximumLength(150).WithMessage("Loan account name must not exceed 150 characters.");

        RuleFor(x => x.Counterparty)
            .NotEmpty().WithMessage("Counterparty name (borrower/lender) is required.")
            .MaximumLength(150).WithMessage("Counterparty must not exceed 150 characters.");

        RuleFor(x => x.Direction)
            .IsInEnum().WithMessage("Direction must be Given (1) or Taken (2).");

        RuleFor(x => x.Principal)
            .GreaterThan(0).WithMessage("Principal amount must be greater than zero.");

        RuleFor(x => x.InterestRate)
            .GreaterThanOrEqualTo(0).WithMessage("Interest rate cannot be negative.")
            .LessThanOrEqualTo(100).WithMessage("Interest rate cannot exceed 100%.");

        RuleFor(x => x.InterestType)
            .IsInEnum().WithMessage("Valid interest type is required.");

        RuleFor(x => x.StartDate)
            .NotEmpty().WithMessage("Start date is required.");

        RuleFor(x => x.DueDate)
            .GreaterThan(x => x.StartDate)
            .When(x => x.DueDate.HasValue)
            .WithMessage("Due date must be after the start date.");
    }
}

public class CreateLoanAccountCommandHandler : IRequestHandler<CreateLoanAccountCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateLoanAccountCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Guid> Handle(CreateLoanAccountCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId ?? Guid.Empty;

        var account = new LoanAccount
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            Name = request.Name.Trim(),
            Counterparty = request.Counterparty.Trim(),
            Direction = request.Direction,
            Principal = Math.Round(request.Principal, 2),
            InterestRate = Math.Round(request.InterestRate, 2),
            InterestType = request.InterestType,
            StartDate = DateTime.SpecifyKind(request.StartDate, DateTimeKind.Utc),
            DueDate = request.DueDate.HasValue ? DateTime.SpecifyKind(request.DueDate.Value, DateTimeKind.Utc) : null,
            Status = LoanStatus.Active,
            Priority = request.Priority,
            Note = request.Note?.Trim()
        };

        // Automatically record the initial principal disburse transaction
        var initialTransaction = new LoanTransaction
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            LoanAccountId = account.Id,
            Kind = LoanTransactionKind.Disburse,
            Amount = account.Principal,
            TransactionDate = account.StartDate,
            Note = "Initial loan disbursement"
        };

        account.Transactions.Add(initialTransaction);

        _context.LoanAccounts.Add(account);
        await _context.SaveChangesAsync(cancellationToken);

        return account.Id;
    }
}

