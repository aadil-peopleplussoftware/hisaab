using FluentValidation;
using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Loans.Commands;

public record UpdateLoanAccountCommand(
    Guid Id,
    string Name,
    string Counterparty,
    decimal InterestRate,
    LoanInterestType InterestType,
    DateTime? DueDate,
    string? Note,
    LoanPriority? Priority = null
) : IRequest;

public class UpdateLoanAccountCommandValidator : AbstractValidator<UpdateLoanAccountCommand>
{
    public UpdateLoanAccountCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Loan account name is required.")
            .MaximumLength(150).WithMessage("Loan account name must not exceed 150 characters.");

        RuleFor(x => x.Counterparty)
            .NotEmpty().WithMessage("Counterparty name is required.")
            .MaximumLength(150).WithMessage("Counterparty must not exceed 150 characters.");

        RuleFor(x => x.InterestRate)
            .GreaterThanOrEqualTo(0).WithMessage("Interest rate cannot be negative.")
            .LessThanOrEqualTo(100).WithMessage("Interest rate cannot exceed 100%.");

        RuleFor(x => x.InterestType)
            .IsInEnum().WithMessage("Valid interest type is required.");
    }
}

public class UpdateLoanAccountCommandHandler : IRequestHandler<UpdateLoanAccountCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateLoanAccountCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(UpdateLoanAccountCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;

        var account = await _context.LoanAccounts
            .FirstOrDefaultAsync(l => l.Id == request.Id && l.UserId == currentUserId, cancellationToken);

        if (account == null)
        {
            throw new NotFoundException(nameof(LoanAccount), request.Id);
        }

        account.Name = request.Name.Trim();
        account.Counterparty = request.Counterparty.Trim();
        account.InterestRate = Math.Round(request.InterestRate, 2);
        account.InterestType = request.InterestType;
        account.DueDate = request.DueDate.HasValue
            ? DateTime.SpecifyKind(request.DueDate.Value, DateTimeKind.Utc)
            : null;
        account.Note = request.Note?.Trim();

        if (request.Priority.HasValue)
        {
            account.Priority = request.Priority.Value;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}

