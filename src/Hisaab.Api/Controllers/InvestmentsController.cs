using Hisaab.Application.Features.Investments.Commands;
using Hisaab.Application.Features.Investments.DTOs;
using Hisaab.Application.Features.Investments.Queries;
using Hisaab.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hisaab.Api.Controllers;

[Authorize]
[Route("api/v1/investments")]
public class InvestmentsController : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(InvestmentsResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetInvestments(
        [FromQuery] InvestmentType? type,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetHoldingsQuery(type, search), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(HoldingDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetHoldingById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetHoldingByIdQuery(id), cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(HoldingDetailDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateHolding(
        [FromBody] CreateHoldingRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateHoldingCommand(
            request.Name,
            request.Type,
            request.InitialInvestedAmount,
            request.InitialUnits,
            request.CurrentValue,
            request.TransactionDate,
            request.Note
        );

        var id = await Mediator.Send(command, cancellationToken);
        var detail = await Mediator.Send(new GetHoldingByIdQuery(id), cancellationToken);

        return CreatedAtAction(nameof(GetHoldingById), new { id }, detail);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(HoldingDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateHolding(
        [FromRoute] Guid id,
        [FromBody] UpdateHoldingRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateHoldingCommand(
            id,
            request.Name,
            request.Type,
            request.CurrentValue,
            request.Note
        );

        await Mediator.Send(command, cancellationToken);
        var detail = await Mediator.Send(new GetHoldingByIdQuery(id), cancellationToken);

        return Ok(detail);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteHolding([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        if (!await CheckDeletePermissionAsync("Investments", cancellationToken))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new {
                error = "DeletionDisabled",
                message = "Deletion is disabled for Investments in Settings. Please enable it under Settings > Deletion Controls."
            });
        }

        await Mediator.Send(new DeleteHoldingCommand(id), cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/transactions")]
    [ProducesResponseType(typeof(HoldingDetailDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateTransaction(
        [FromRoute] Guid id,
        [FromBody] CreateInvestmentTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateInvestmentTransactionCommand(
            id,
            request.Kind,
            request.Amount,
            request.TransactionDate,
            request.Units,
            request.Note,
            request.UpdatedCurrentValue
        );

        await Mediator.Send(command, cancellationToken);
        var updatedDetail = await Mediator.Send(new GetHoldingByIdQuery(id), cancellationToken);

        return CreatedAtAction(nameof(GetHoldingById), new { id }, updatedDetail);
    }

    [HttpDelete("{id:guid}/transactions/{transactionId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteTransaction(
        [FromRoute] Guid id,
        [FromRoute] Guid transactionId,
        CancellationToken cancellationToken)
    {
        if (!await CheckDeletePermissionAsync("Investments", cancellationToken))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new {
                error = "DeletionDisabled",
                message = "Deletion is disabled for Investments in Settings. Please enable it under Settings > Deletion Controls."
            });
        }

        await Mediator.Send(new DeleteInvestmentTransactionCommand(id, transactionId), cancellationToken);
        return NoContent();
    }
}

public record CreateHoldingRequest(
    string Name,
    InvestmentType Type,
    decimal InitialInvestedAmount,
    decimal? InitialUnits = null,
    decimal? CurrentValue = null,
    DateTime? TransactionDate = null,
    string? Note = null
);

public record UpdateHoldingRequest(
    string Name,
    InvestmentType Type,
    decimal CurrentValue,
    string? Note = null
);

public record CreateInvestmentTransactionRequest(
    InvestmentTransactionKind Kind,
    decimal Amount,
    DateTime TransactionDate,
    decimal? Units = null,
    string? Note = null,
    decimal? UpdatedCurrentValue = null
);

