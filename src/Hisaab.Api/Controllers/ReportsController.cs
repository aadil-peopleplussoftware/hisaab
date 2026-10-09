using Hisaab.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hisaab.Api.Controllers;

[Authorize]
[Route("api/v1/reports")]
public class ReportsController : ApiControllerBase
{
    private readonly IReportExportService _reportExportService;

    public ReportsController(IReportExportService reportExportService)
    {
        _reportExportService = reportExportService;
    }

    /// <summary>
    /// Generates and downloads a server-side A4 PDF statement using QuestPDF.
    /// Types supported: 'transactions', 'loans', 'epf', 'investments', 'dashboard'.
    /// </summary>
    [HttpGet("{type}/pdf")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExportPdf(
        [FromRoute] string type,
        [FromQuery] string? month,
        [FromQuery] int? year,
        [FromQuery] Guid? loanId,
        CancellationToken cancellationToken = default)
    {
        var normalizedType = type.ToLowerInvariant().Trim();
        var targetMonth = month ?? DateTime.UtcNow.ToString("yyyy-MM");
        var targetYear = year ?? DateTime.UtcNow.Year;

        FileExportResult result = normalizedType switch
        {
            "transactions" or "income-expense" =>
                await _reportExportService.ExportTransactionsPdfAsync(targetMonth, cancellationToken),

            "loans" =>
                await _reportExportService.ExportLoansPdfAsync(loanId, cancellationToken),

            "epf" or "epfo" =>
                await _reportExportService.ExportEpfoPdfAsync(targetYear, cancellationToken),

            "investments" or "portfolio" =>
                await _reportExportService.ExportInvestmentsPdfAsync(cancellationToken),

            "dashboard" or "statement" or "monthly-statement" =>
                await _reportExportService.ExportDashboardPdfAsync(targetMonth, cancellationToken),

            _ => throw new ArgumentException($"Unsupported report type: '{type}'. Valid types: 'transactions', 'loans', 'epf', 'investments', 'dashboard'.")
        };

        return File(result.Content, result.ContentType, result.FileName);
    }

    /// <summary>
    /// Generates and downloads a native Excel (.xlsx) spreadsheet using ClosedXML.
    /// Types supported: 'transactions', 'loans', 'epf', 'investments'.
    /// </summary>
    [HttpGet("{type}/excel")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExportExcel(
        [FromRoute] string type,
        [FromQuery] string? month,
        [FromQuery] int? year,
        CancellationToken cancellationToken = default)
    {
        var normalizedType = type.ToLowerInvariant().Trim();
        var targetMonth = month ?? DateTime.UtcNow.ToString("yyyy-MM");
        var targetYear = year ?? DateTime.UtcNow.Year;

        FileExportResult result = normalizedType switch
        {
            "transactions" or "income-expense" =>
                await _reportExportService.ExportTransactionsExcelAsync(targetMonth, cancellationToken),

            "loans" =>
                await _reportExportService.ExportLoansExcelAsync(cancellationToken),

            "epf" or "epfo" =>
                await _reportExportService.ExportEpfoExcelAsync(targetYear, cancellationToken),

            "investments" or "portfolio" =>
                await _reportExportService.ExportInvestmentsExcelAsync(cancellationToken),

            _ => throw new ArgumentException($"Unsupported Excel report type: '{type}'. Valid types: 'transactions', 'loans', 'epf', 'investments'.")
        };

        return File(result.Content, result.ContentType, result.FileName);
    }
}
