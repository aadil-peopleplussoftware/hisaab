using Hisaab.Application.Features.Business.Commands;
using Hisaab.Application.Features.Business.DTOs;
using Hisaab.Application.Features.Business.Queries;
using Hisaab.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hisaab.Api.Controllers;

[Authorize]
public class BusinessController : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(BusinessListResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBusinesses([FromQuery] bool includeInactive = true, CancellationToken cancellationToken = default)
    {
        var result = await Mediator.Send(new GetBusinessesQuery(includeInactive), cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateBusiness([FromBody] CreateBusinessCommand command, CancellationToken cancellationToken)
    {
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetBusinesses), new { id }, new { id });
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateBusiness(Guid id, [FromBody] UpdateBusinessRequest request, CancellationToken cancellationToken)
    {
        var command = new UpdateBusinessCommand(
            id,
            request.Name,
            request.LegalName,
            request.Type,
            request.Currency,
            request.TaxId,
            request.Description,
            request.IsActive,
            request.Color
        );
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteBusiness(Guid id, CancellationToken cancellationToken)
    {
        await Mediator.Send(new DeleteBusinessCommand(id), cancellationToken);
        return NoContent();
    }

    [HttpGet("{id:guid}/pnl")]
    [ProducesResponseType(typeof(BusinessPnLSummaryDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBusinessPnL(Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetBusinessPnLSummaryQuery(id), cancellationToken);
        return Ok(result);
    }

    [HttpGet("transactions")]
    [ProducesResponseType(typeof(List<BusinessTransactionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] Guid? businessId,
        [FromQuery] BusinessTransactionType? type,
        [FromQuery] BusinessPaymentStatus? paymentStatus,
        [FromQuery] string? category,
        [FromQuery] string? searchTerm,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        CancellationToken cancellationToken)
    {
        var query = new GetBusinessTransactionsQuery(businessId, type, paymentStatus, category, searchTerm, startDate, endDate);
        var result = await Mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpPost("transactions")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateTransaction([FromBody] CreateBusinessTransactionCommand command, CancellationToken cancellationToken)
    {
        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetTransactions), new { id }, new { id });
    }

    [HttpPut("transactions/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateTransaction(Guid id, [FromBody] UpdateBusinessTransactionRequest request, CancellationToken cancellationToken)
    {
        var command = new UpdateBusinessTransactionCommand(
            id,
            request.BusinessId,
            request.Type,
            request.Category,
            request.Amount,
            request.TaxRatePercent,
            request.TaxAmount,
            request.TransactionDate,
            request.Counterparty,
            request.InvoiceNumber,
            request.DueDate,
            request.PaymentStatus,
            request.PaymentMethod,
            request.Description,
            request.AttachmentUrl
        );
        await Mediator.Send(command, cancellationToken);
        return NoContent();
    }

    [HttpDelete("transactions/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteTransaction(Guid id, CancellationToken cancellationToken)
    {
        await Mediator.Send(new DeleteBusinessTransactionCommand(id), cancellationToken);
        return NoContent();
    }

    [HttpPatch("transactions/{id:guid}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateTransactionStatus(Guid id, [FromBody] UpdateTransactionStatusRequest request, CancellationToken cancellationToken)
    {
        await Mediator.Send(new UpdateTransactionPaymentStatusCommand(id, request.Status), cancellationToken);
        return NoContent();
    }
}

public record UpdateBusinessRequest(
    string Name,
    string? LegalName,
    BusinessType Type,
    string Currency,
    string? TaxId,
    string? Description,
    bool IsActive,
    string? Color
);

public record UpdateBusinessTransactionRequest(
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
);

public record UpdateTransactionStatusRequest(BusinessPaymentStatus Status);

