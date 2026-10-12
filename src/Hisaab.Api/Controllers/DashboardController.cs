using Hisaab.Application.Features.Dashboard.DTOs;
using Hisaab.Application.Features.Dashboard.Queries.GetDashboard;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hisaab.Api.Controllers;

[Authorize]
[Route("api/v1/dashboard")]
public class DashboardController : ApiControllerBase
{
    /// <summary>
    /// Gets aggregated financial dashboard data including selected-month summary,
    /// net worth breakdown, multi-month trends, category breakdowns, and upcoming loan dues.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(DashboardResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetDashboard(
        [FromQuery] string? month,
        [FromQuery] string? periodType = "month",
        [FromQuery] string? date = null,
        [FromQuery] int? year = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int trendMonths = 6,
        CancellationToken cancellationToken = default)
    {
        var result = await Mediator.Send(new GetDashboardQuery(month, trendMonths, periodType, date, year, startDate, endDate), cancellationToken);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors });
        }

        return Ok(result.Data);
    }
}

