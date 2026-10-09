using Hisaab.Application.Features.Transactions.Commands.CreateTransaction;
using Hisaab.Application.Features.Transactions.Commands.DeleteTransaction;
using Hisaab.Application.Features.Transactions.Commands.UpdateTransaction;
using Hisaab.Application.Features.Transactions.DTOs;
using Hisaab.Application.Features.Transactions.Queries.GetTransactions;
using Hisaab.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hisaab.Api.Controllers;

[Authorize]
public class TransactionsController : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(TransactionsResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] string? month,
        [FromQuery] TransactionType? type,
        [FromQuery] Guid? categoryId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = new GetTransactionsQuery(month, type, categoryId, search, page, pageSize);
        var result = await Mediator.Send(query, cancellationToken);
        return Ok(result.Data);
    }

    [HttpPost]
    [ProducesResponseType(typeof(TransactionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateTransaction(
        [FromBody] CreateTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateTransactionCommand(
            request.Type,
            request.Amount,
            request.CategoryId,
            request.TransactionDate,
            request.Note,
            request.AttachmentId);

        var result = await Mediator.Send(command, cancellationToken);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors });
        }

        return CreatedAtAction(nameof(GetTransactions), new { id = result.Data!.Id }, result.Data);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(TransactionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateTransaction(
        [FromRoute] Guid id,
        [FromBody] UpdateTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateTransactionCommand(
            id,
            request.Type,
            request.Amount,
            request.CategoryId,
            request.TransactionDate,
            request.Note,
            request.AttachmentId);

        var result = await Mediator.Send(command, cancellationToken);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors });
        }

        return Ok(result.Data);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteTransaction(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        await Mediator.Send(new DeleteTransactionCommand(id), cancellationToken);
        return NoContent();
    }
}

public record CreateTransactionRequest(
    TransactionType Type,
    decimal Amount,
    Guid CategoryId,
    DateTime TransactionDate,
    string? Note = null,
    Guid? AttachmentId = null
);

public record UpdateTransactionRequest(
    TransactionType Type,
    decimal Amount,
    Guid CategoryId,
    DateTime TransactionDate,
    string? Note = null,
    Guid? AttachmentId = null
);

