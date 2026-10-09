using Hisaab.Application.Features.Categories.Commands;
using Hisaab.Application.Features.Categories.DTOs;
using Hisaab.Application.Features.Categories.Queries;
using Hisaab.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hisaab.Api.Controllers;

[Authorize]
public class CategoriesController : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(List<CategoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories([FromQuery] TransactionType? type, CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetCategoriesQuery(type), cancellationToken);
        return Ok(result.Data);
    }

    [HttpPost]
    [ProducesResponseType(typeof(CategoryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        var command = new CreateCategoryCommand(request.Type, request.Name, request.Icon ?? "tag", request.Color ?? "#4f46e5");
        var result = await Mediator.Send(command, cancellationToken);

        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors });
        }

        return CreatedAtAction(nameof(GetCategories), new { id = result.Data!.Id }, result.Data);
    }
}

public record CreateCategoryRequest(TransactionType Type, string Name, string? Icon, string? Color);
