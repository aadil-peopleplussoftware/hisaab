using FluentValidation;
using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Business.Commands;

public record UpdateBusinessTransactionCommand(
    Guid Id,
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
) : IRequest;

public class UpdateBusinessTransactionCommandValidator : AbstractValidator<UpdateBusinessTransactionCommand>
{
    public UpdateBusinessTransactionCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.BusinessId).NotEmpty();
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Category).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.TaxRatePercent).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Counterparty).NotEmpty().MaximumLength(150);
        RuleFor(x => x.TransactionDate).NotEmpty();
        RuleFor(x => x.PaymentStatus).IsInEnum();
    }
}

public class UpdateBusinessTransactionCommandHandler : IRequestHandler<UpdateBusinessTransactionCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateBusinessTransactionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(UpdateBusinessTransactionCommand request, CancellationToken cancellationToken)
    {
        var txn = await _context.BusinessTransactions
            .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

        if (txn == null)
        {
            throw new NotFoundException(nameof(BusinessTransaction), request.Id);
        }

        var taxAmount = request.TaxAmount ?? 0m;
        if (request.TaxRatePercent > 0 && taxAmount == 0m)
        {
            taxAmount = Math.Round(request.Amount * (request.TaxRatePercent / 100m), 2);
        }

        var totalAmount = request.Amount + taxAmount;

        txn.BusinessId = request.BusinessId;
        txn.Type = request.Type;
        txn.Category = request.Category.Trim();
        txn.Amount = request.Amount;
        txn.TaxRatePercent = request.TaxRatePercent;
        txn.TaxAmount = taxAmount;
        txn.TotalAmount = totalAmount;
        txn.TransactionDate = request.TransactionDate.Kind == DateTimeKind.Utc
            ? request.TransactionDate
            : DateTime.SpecifyKind(request.TransactionDate, DateTimeKind.Utc);
        txn.Counterparty = request.Counterparty.Trim();
        txn.InvoiceNumber = request.InvoiceNumber?.Trim();
        txn.DueDate = request.DueDate.HasValue
            ? (request.DueDate.Value.Kind == DateTimeKind.Utc ? request.DueDate.Value : DateTime.SpecifyKind(request.DueDate.Value, DateTimeKind.Utc))
            : null;
        txn.PaymentStatus = request.PaymentStatus;
        txn.PaymentMethod = request.PaymentMethod?.Trim();
        txn.Description = request.Description?.Trim();
        txn.AttachmentUrl = request.AttachmentUrl?.Trim();

        await _context.SaveChangesAsync(cancellationToken);
    }
}
