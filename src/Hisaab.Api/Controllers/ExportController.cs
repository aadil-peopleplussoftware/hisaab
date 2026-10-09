using Hisaab.Application.Features.DataTransfer.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hisaab.Api.Controllers;

[Authorize]
[Route("api/v1/export")]
public class ExportController : ApiControllerBase
{
    /// <summary>
    /// Exports data for a given module into Excel (.xlsx) or CSV format using the exact import template column names.
    /// Supports formula injection escaping, Indian currency format, and date formatting.
    /// </summary>
    [HttpGet("{module}")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExportModule(
        [FromRoute] string module,
        [FromQuery] string format = "xlsx",
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        var (content, contentType, fileName) = await Mediator.Send(
            new ExportModuleQuery(module, format, from, to),
            cancellationToken);

        return File(content, contentType, fileName);
    }

    /// <summary>
    /// Full backup: one Excel workbook with one sheet per module plus an Info sheet with user metadata and record counts.
    /// </summary>
    [HttpGet("all")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportAll(CancellationToken cancellationToken = default)
    {
        var (content, contentType, fileName) = await Mediator.Send(
            new ExportAllModulesQuery(),
            cancellationToken);

        return File(content, contentType, fileName);
    }
}
