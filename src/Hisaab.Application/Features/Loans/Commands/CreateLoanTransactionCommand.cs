using FluentValidation;
using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Loans.Commands;

public record CreateLoanTransactionCommand(
    Guid LoanAccountId,
    LoanTransactionKind Kind,
    decimal Amount,
    DateTime TransactionDate,
    string? Note,
    Guid? AttachmentId = null
) : IRequest<Guid>;

public class CreateLoanTransactionCommandValidator : AbstractValidator<CreateLoanTransactionCommand>
{
    public CreateLoanTransactionCommandValidator()
    {
        RuleFor(x => x.LoanAccountId).NotEmpty().WithMessage("Loan account ID is required.");
        RuleFor(x => x.Kind).IsInEnum().WithMessage("Valid loan transaction kind is required.");
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Amount must be greater than zero.");
        RuleFor(x => x.TransactionDate).NotEmpty().WithMessage("Transaction date is required.");
        RuleFor(x => x.Note).MaximumLength(500).WithMessage("Note must not exceed 500 characters.");
    }
}

public class CreateLoanTransactionCommandHandler : IRequestHandler<CreateLoanTransactionCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateLoanTransactionCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Guid> Handle(CreateLoanTransactionCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId ?? Guid.Empty;

        var account = await _context.LoanAccounts
            .FirstOrDefaultAsync(l => l.Id == request.LoanAccountId && l.UserId == currentUserId, cancellationToken);

        if (account == null)
        {
            throw new NotFoundException(nameof(LoanAccount), request.LoanAccountId);
        }

        if (account.Status == LoanStatus.Closed)
        {
            throw new DomainException("Cannot record a transaction on a closed loan account. Reopen the account first.");
        }

        var transaction = new LoanTransaction
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            LoanAccountId = account.Id,
            Kind = request.Kind,
            Amount = Math.Round(request.Amount, 2),
            TransactionDate = DateTime.SpecifyKind(request.TransactionDate, DateTimeKind.Utc),
            Note = request.Note?.Trim(),
            AttachmentId = request.AttachmentId
        };

        _context.LoanTransactions.Add(transaction);
        await _context.SaveChangesAsync(cancellationToken);

        return transaction.Id;
    }
}

