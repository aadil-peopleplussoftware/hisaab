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

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteCategory([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        if (!await CheckDeletePermissionAsync("Categories", cancellationToken))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new {
                error = "DeletionDisabled",
                message = "Deletion is disabled for Categories in Settings. Please enable it under Settings > Deletion Controls."
            });
        }

        var dbContext = HttpContext.RequestServices.GetRequiredService<Hisaab.Application.Common.Interfaces.IApplicationDbContext>();
        var userId = CurrentUserService.UserId;

        var category = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
            dbContext.Categories, c => c.Id == id && c.UserId == userId, cancellationToken);

        if (category == null)
        {
            return NotFound(new { error = "Category not found." });
        }

        if (category.IsSystem)
        {
            return BadRequest(new { error = "Default system categories cannot be deleted." });
        }

        dbContext.Categories.Remove(category);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}

public record CreateCategoryRequest(TransactionType Type, string Name, string? Icon, string? Color);

