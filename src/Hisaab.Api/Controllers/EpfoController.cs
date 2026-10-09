using Hisaab.Application.Features.Epfo.Commands;
using Hisaab.Application.Features.Epfo.DTOs;
using Hisaab.Application.Features.Epfo.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hisaab.Api.Controllers;

[Authorize]
[Route("api/v1/epf")]
public class EpfoController : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(EpfResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEpfEntries(
        [FromQuery] int? year,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetEpfEntriesQuery(year), cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(EpfResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateEpfEntry(
        [FromBody] CreateEpfRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateEpfEntryCommand(
            request.Month,
            request.EmployeeShare,
            request.EmployerShare,
            request.PensionShare,
            request.Interest,
            request.Withdrawal,
            request.Note
        );

        var id = await Mediator.Send(command, cancellationToken);
        var year = request.Month.Year;
        var fullState = await Mediator.Send(new GetEpfEntriesQuery(year), cancellationToken);

        return CreatedAtAction(nameof(GetEpfEntries), new { year }, fullState);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(EpfResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateEpfEntry(
        [FromRoute] Guid id,
        [FromBody] UpdateEpfRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateEpfEntryCommand(
            id,
            request.Month,
            request.EmployeeShare,
            request.EmployerShare,
            request.PensionShare,
            request.Interest,
            request.Withdrawal,
            request.Note
        );

        await Mediator.Send(command, cancellationToken);
        var year = request.Month.Year;
        var fullState = await Mediator.Send(new GetEpfEntriesQuery(year), cancellationToken);

        return Ok(fullState);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteEpfEntry(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        await Mediator.Send(new DeleteEpfEntryCommand(id), cancellationToken);
        return NoContent();
    }
}

public record CreateEpfRequest(
    DateTime Month,
    decimal EmployeeShare,
    decimal EmployerShare,
    decimal PensionShare,
    decimal Interest = 0m,
    decimal Withdrawal = 0m,
    string? Note = null
);

public record UpdateEpfRequest(
    DateTime Month,
    decimal EmployeeShare,
    decimal EmployerShare,
    decimal PensionShare,
    decimal Interest = 0m,
    decimal Withdrawal = 0m,
    string? Note = null
);

