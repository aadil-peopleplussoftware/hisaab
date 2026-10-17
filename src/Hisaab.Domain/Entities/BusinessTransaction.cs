using Hisaab.Domain.Common;
using Hisaab.Domain.Enums;

namespace Hisaab.Domain.Entities;

public class BusinessTransaction : UserOwnedEntity
{
    public Guid BusinessId { get; set; }
    public BusinessEntity? Business { get; set; }

    public BusinessTransactionType Type { get; set; } = BusinessTransactionType.Expense;
    public string Category { get; set; } = string.Empty;

    public decimal Amount { get; set; }
    public decimal TaxRatePercent { get; set; } = 0;
    public decimal TaxAmount { get; set; } = 0;
    public decimal TotalAmount { get; set; }

    public DateTime TransactionDate { get; set; }
    public string Counterparty { get; set; } = string.Empty;
    public string? InvoiceNumber { get; set; }
    public DateTime? DueDate { get; set; }

    public BusinessPaymentStatus PaymentStatus { get; set; } = BusinessPaymentStatus.Paid;
    public string? PaymentMethod { get; set; }
    public string? Description { get; set; }
    public string? AttachmentUrl { get; set; }
}

