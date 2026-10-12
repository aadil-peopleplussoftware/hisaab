using Hisaab.Application.Features.Loans.Commands;
using Hisaab.Application.Features.Loans.DTOs;
using Hisaab.Application.Features.Loans.Queries;
using Hisaab.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hisaab.Api.Controllers;

[Authorize]
public class LoansController : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(LoanListResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLoans(
        [FromQuery] LoanDirection? direction,
        [FromQuery] LoanStatus? status,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetLoanAccountsQuery(direction, status, search), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(LoanAccountDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLoanById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetLoanAccountByIdQuery(id), cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(LoanAccountDetailDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateLoan(
        [FromBody] CreateLoanRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateLoanAccountCommand(
            request.Name,
            request.Counterparty,
            request.Direction,
            request.Principal,
            request.InterestRate,
            request.InterestType,
            request.StartDate,
            request.DueDate,
            request.Note
        );

        var id = await Mediator.Send(command, cancellationToken);
        var detail = await Mediator.Send(new GetLoanAccountByIdQuery(id), cancellationToken);

        return CreatedAtAction(nameof(GetLoanById), new { id }, detail);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(LoanAccountDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateLoan(
        [FromRoute] Guid id,
        [FromBody] UpdateLoanRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateLoanAccountCommand(
            id,
            request.Name,
            request.Counterparty,
            request.InterestRate,
            request.InterestType,
            request.DueDate,
            request.Note
        );

        await Mediator.Send(command, cancellationToken);
        var detail = await Mediator.Send(new GetLoanAccountByIdQuery(id), cancellationToken);

        return Ok(detail);
    }

    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(typeof(LoanAccountDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ChangeStatus(
        [FromRoute] Guid id,
        [FromBody] ChangeLoanStatusRequest request,
        CancellationToken cancellationToken)
    {
        await Mediator.Send(new ChangeLoanStatusCommand(id, request.Status), cancellationToken);
        var detail = await Mediator.Send(new GetLoanAccountByIdQuery(id), cancellationToken);

        return Ok(detail);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteLoan([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        if (!await CheckDeletePermissionAsync("Loans", cancellationToken))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new {
                error = "DeletionDisabled",
                message = "Deletion is disabled for Loans in Settings. Please enable it under Settings > Deletion Controls."
            });
        }

        await Mediator.Send(new DeleteLoanAccountCommand(id), cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/transactions")]
    [ProducesResponseType(typeof(LoanAccountDetailDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateTransaction(
        [FromRoute] Guid id,
        [FromBody] CreateLoanTransactionRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateLoanTransactionCommand(
            id,
            request.Kind,
            request.Amount,
            request.TransactionDate,
            request.Note,
            request.AttachmentId
        );

        var transactionId = await Mediator.Send(command, cancellationToken);
        var updatedDetail = await Mediator.Send(new GetLoanAccountByIdQuery(id), cancellationToken);

        return CreatedAtAction(nameof(GetLoanById), new { id }, updatedDetail);
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
        if (!await CheckDeletePermissionAsync("Loans", cancellationToken))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new {
                error = "DeletionDisabled",
                message = "Deletion is disabled for Loans in Settings. Please enable it under Settings > Deletion Controls."
            });
        }

        await Mediator.Send(new DeleteLoanTransactionCommand(id, transactionId), cancellationToken);
        return NoContent();
    }

    [HttpGet("{id:guid}/interest-preview")]
    [ProducesResponseType(typeof(InterestCalculationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetInterestPreview(
        [FromRoute] Guid id,
        [FromQuery] DateTime? asOfDate,
        CancellationToken cancellationToken)
    {
        var query = new CalculateLoanInterestQuery(LoanAccountId: id, AsOfDate: asOfDate);
        var result = await Mediator.Send(query, cancellationToken);
        return Ok(result);
    }
}

public record CreateLoanRequest(
    string Name,
    string Counterparty,
    LoanDirection Direction,
    decimal Principal,
    decimal InterestRate,
    LoanInterestType InterestType,
    DateTime StartDate,
    DateTime? DueDate,
    string? Note
);

public record UpdateLoanRequest(
    string Name,
    string Counterparty,
    decimal InterestRate,
    LoanInterestType InterestType,
    DateTime? DueDate,
    string? Note
);

public record ChangeLoanStatusRequest(
    LoanStatus Status
);

public record CreateLoanTransactionRequest(
    LoanTransactionKind Kind,
    decimal Amount,
    DateTime TransactionDate,
    string? Note,
    Guid? AttachmentId = null
);

