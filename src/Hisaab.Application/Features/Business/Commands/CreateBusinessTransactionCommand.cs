using FluentValidation;
using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Business.Commands;

public record CreateBusinessTransactionCommand(
    Guid BusinessId,
    BusinessTransactionType Type,
    string Category,
    decimal Amount,
    decimal TaxRatePercent,
    decimal? TaxAmount,
    DateTime TransactionDate,
    string Counterparty,
    string? InvoiceNumber,
    DateTime? DueDate,
    BusinessPaymentStatus PaymentStatus,
    string? PaymentMethod,
    string? Description,
    string? AttachmentUrl
) : IRequest<Guid>;

public class CreateBusinessTransactionCommandValidator : AbstractValidator<CreateBusinessTransactionCommand>
{
    public CreateBusinessTransactionCommandValidator()
    {
        RuleFor(x => x.BusinessId).NotEmpty().WithMessage("Business selection is required.");
        RuleFor(x => x.Type).IsInEnum().WithMessage("Transaction type must be Income or Expense.");
        RuleFor(x => x.Category).NotEmpty().MaximumLength(100).WithMessage("Category is required.");
        RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Amount must be greater than zero.");
        RuleFor(x => x.TaxRatePercent).GreaterThanOrEqualTo(0).WithMessage("Tax rate cannot be negative.");
        RuleFor(x => x.Counterparty).NotEmpty().MaximumLength(150).WithMessage("Counterparty (client/vendor) is required.");
        RuleFor(x => x.TransactionDate).NotEmpty().WithMessage("Transaction date is required.");
        RuleFor(x => x.PaymentStatus).IsInEnum().WithMessage("Valid payment status is required.");
    }
}

public class CreateBusinessTransactionCommandHandler : IRequestHandler<CreateBusinessTransactionCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateBusinessTransactionCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Guid> Handle(CreateBusinessTransactionCommand request, CancellationToken cancellationToken)
    {
        var business = await _context.Businesses
            .FirstOrDefaultAsync(b => b.Id == request.BusinessId, cancellationToken);

        if (business == null)
        {
            throw new NotFoundException(nameof(BusinessEntity), request.BusinessId);
        }

        var taxAmount = request.TaxAmount ?? 0m;
        if (request.TaxRatePercent > 0 && taxAmount == 0m)
        {
            taxAmount = Math.Round(request.Amount * (request.TaxRatePercent / 100m), 2);
        }

        var totalAmount = request.Amount + taxAmount;

        var txn = new BusinessTransaction
        {
            UserId = _currentUserService.UserId ?? Guid.Empty,
            BusinessId = request.BusinessId,
            Type = request.Type,
            Category = request.Category.Trim(),
            Amount = request.Amount,
            TaxRatePercent = request.TaxRatePercent,
            TaxAmount = taxAmount,
            TotalAmount = totalAmount,
            TransactionDate = request.TransactionDate.Kind == DateTimeKind.Utc
                ? request.TransactionDate
                : DateTime.SpecifyKind(request.TransactionDate, DateTimeKind.Utc),
            Counterparty = request.Counterparty.Trim(),
            InvoiceNumber = request.InvoiceNumber?.Trim(),
            DueDate = request.DueDate.HasValue
                ? (request.DueDate.Value.Kind == DateTimeKind.Utc ? request.DueDate.Value : DateTime.SpecifyKind(request.DueDate.Value, DateTimeKind.Utc))
                : null,
            PaymentStatus = request.PaymentStatus,
            PaymentMethod = request.PaymentMethod?.Trim(),
            Description = request.Description?.Trim(),
            AttachmentUrl = request.AttachmentUrl?.Trim()
        };

        _context.BusinessTransactions.Add(txn);
        await _context.SaveChangesAsync(cancellationToken);

        return txn.Id;
    }
}
