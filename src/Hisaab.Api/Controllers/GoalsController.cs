using Hisaab.Application.Features.Goals.Commands;
using Hisaab.Application.Features.Goals.DTOs;
using Hisaab.Application.Features.Goals.Queries;
using Hisaab.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hisaab.Api.Controllers;

[Authorize]
public class GoalsController : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(GetGoalsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGoals(
        [FromQuery] GoalStatus? status,
        [FromQuery] GoalCategory? category,
        [FromQuery] GoalPriority? priority,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetGoalsQuery(status, category, priority, search), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(GoalDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetGoalById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetGoalByIdQuery(id), cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    [ProducesResponseType(typeof(GoalDetailDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateGoal(
        [FromBody] CreateGoalRequest request,
        CancellationToken cancellationToken)
    {
        var id = await Mediator.Send(new CreateGoalCommand(
            request.Title,
            request.Description,
            request.Category,
            request.TargetAmount,
            request.InitialAmount,
            request.TargetDate,
            request.Priority,
            request.Color,
            request.Icon
        ), cancellationToken);

        var result = await Mediator.Send(new GetGoalByIdQuery(id), cancellationToken);
        return CreatedAtAction(nameof(GetGoalById), new { id }, result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(GoalDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateGoal(
        [FromRoute] Guid id,
        [FromBody] UpdateGoalRequest request,
        CancellationToken cancellationToken)
    {
        await Mediator.Send(new UpdateGoalCommand(
            id,
            request.Title,
            request.Description,
            request.Category,
            request.TargetAmount,
            request.TargetDate,
            request.Priority,
            request.Status,
            request.Color,
            request.Icon
        ), cancellationToken);

        var result = await Mediator.Send(new GetGoalByIdQuery(id), cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteGoal([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        if (!await CheckDeletePermissionAsync("Goals", cancellationToken))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new {
                error = "DeletionDisabled",
                message = "Deletion is disabled for Goals in Settings. Please enable it under Settings > Deletion Controls."
            });
        }

        await Mediator.Send(new DeleteGoalCommand(id), cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/contributions")]
    [ProducesResponseType(typeof(GoalDetailDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddContribution(
        [FromRoute] Guid id,
        [FromBody] AddGoalContributionRequest request,
        CancellationToken cancellationToken)
    {
        await Mediator.Send(new AddGoalContributionCommand(
            id,
            request.Amount,
            request.ContributionDate,
            request.Source,
            request.Notes
        ), cancellationToken);

        var result = await Mediator.Send(new GetGoalByIdQuery(id), cancellationToken);
        return CreatedAtAction(nameof(GetGoalById), new { id }, result);
    }

    [HttpDelete("{id:guid}/contributions/{contributionId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteContribution(
        [FromRoute] Guid id,
        [FromRoute] Guid contributionId,
        CancellationToken cancellationToken)
    {
        if (!await CheckDeletePermissionAsync("Goals", cancellationToken))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new {
                error = "DeletionDisabled",
                message = "Deletion is disabled for Goals in Settings. Please enable it under Settings > Deletion Controls."
            });
        }

        await Mediator.Send(new DeleteGoalContributionCommand(id, contributionId), cancellationToken);
        return NoContent();
    }

    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ChangeGoalStatus(
        [FromRoute] Guid id,
        [FromBody] GoalStatus status,
        CancellationToken cancellationToken)
    {
        await Mediator.Send(new ChangeGoalStatusCommand(id, status), cancellationToken);
        return NoContent();
    }
}

