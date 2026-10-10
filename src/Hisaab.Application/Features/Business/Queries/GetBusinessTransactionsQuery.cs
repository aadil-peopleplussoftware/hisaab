using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.Business.DTOs;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Business.Queries;

public record GetBusinessTransactionsQuery(
    Guid? BusinessId = null,
    BusinessTransactionType? Type = null,
    BusinessPaymentStatus? PaymentStatus = null,
    string? Category = null,
    string? SearchTerm = null,
    DateTime? StartDate = null,
    DateTime? EndDate = null
) : IRequest<List<BusinessTransactionDto>>;

public class GetBusinessTransactionsQueryHandler : IRequestHandler<GetBusinessTransactionsQuery, List<BusinessTransactionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetBusinessTransactionsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<BusinessTransactionDto>> Handle(GetBusinessTransactionsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.BusinessTransactions
            .Include(t => t.Business)
            .AsNoTracking();

        if (request.BusinessId.HasValue && request.BusinessId.Value != Guid.Empty)
        {
            query = query.Where(t => t.BusinessId == request.BusinessId.Value);
        }

        if (request.Type.HasValue)
        {
            query = query.Where(t => t.Type == request.Type.Value);
        }

        if (request.PaymentStatus.HasValue)
        {
            query = query.Where(t => t.PaymentStatus == request.PaymentStatus.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            query = query.Where(t => t.Category == request.Category);
        }

        if (request.StartDate.HasValue)
        {
            var startUtc = request.StartDate.Value.Kind == DateTimeKind.Utc ? request.StartDate.Value : DateTime.SpecifyKind(request.StartDate.Value, DateTimeKind.Utc);
            query = query.Where(t => t.TransactionDate >= startUtc);
        }

        if (request.EndDate.HasValue)
        {
            var endUtc = request.EndDate.Value.Kind == DateTimeKind.Utc ? request.EndDate.Value : DateTime.SpecifyKind(request.EndDate.Value, DateTimeKind.Utc);
            query = query.Where(t => t.TransactionDate <= endUtc);
        }

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var search = request.SearchTerm.Trim().ToLower();
            query = query.Where(t =>
                (t.InvoiceNumber != null && t.InvoiceNumber.ToLower().Contains(search)) ||
                t.Counterparty.ToLower().Contains(search) ||
                (t.Description != null && t.Description.ToLower().Contains(search)) ||
                t.Category.ToLower().Contains(search)
            );
        }

        var results = await query
            .OrderByDescending(t => t.TransactionDate)
            .ThenByDescending(t => t.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return results.Select(t => new BusinessTransactionDto(
            t.Id,
            t.BusinessId,
            t.Business?.Name ?? "Unknown Business",
            t.Type,
            t.Type.ToString(),
            t.Category,
            t.Amount,
            t.TaxRatePercent,
            t.TaxAmount,
            t.TotalAmount,
            t.TransactionDate,
            t.Counterparty,
            t.InvoiceNumber,
            t.DueDate,
            t.PaymentStatus,
            t.PaymentStatus.ToString(),
            t.PaymentMethod,
            t.Description,
            t.AttachmentUrl,
            t.CreatedAtUtc
        )).ToList();
    }
}
