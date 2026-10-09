using FluentValidation;

namespace Hisaab.Application.Features.Transactions.Commands.CreateTransaction;

public class CreateTransactionCommandValidator : AbstractValidator<CreateTransactionCommand>
{
    public CreateTransactionCommandValidator()
    {
        RuleFor(v => v.Amount)
            .GreaterThan(0).WithMessage("Transaction amount must be strictly greater than 0.")
            .LessThan(1_000_000_000m).WithMessage("Amount exceeds permitted maximum limit.");

        RuleFor(v => v.CategoryId)
            .NotEmpty().WithMessage("A valid category must be selected.");

        RuleFor(v => v.Type)
            .IsInEnum().WithMessage("A valid transaction type (Income or Expense) is required.");

        RuleFor(v => v.TransactionDate)
            .NotEmpty().WithMessage("Transaction date is required.");

        RuleFor(v => v.Note)
            .MaximumLength(500).WithMessage("Note must not exceed 500 characters.");
    }
}

