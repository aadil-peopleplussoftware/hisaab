using ClosedXML.Excel;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.Epfo.Commands;
using Hisaab.Application.Features.Epfo.DTOs;
using Hisaab.Application.Features.Epfo.Queries;
using Hisaab.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Api.Controllers;

[Authorize]
[Route("api/v1/epf")]
public class EpfoController : ApiControllerBase
{
    private readonly IEpfoPdfParserService _pdfParserService;
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IReportExportService _reportExportService;

    public EpfoController(
        IEpfoPdfParserService pdfParserService,
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IReportExportService reportExportService)
    {
        _pdfParserService = pdfParserService;
        _context = context;
        _currentUserService = currentUserService;
        _reportExportService = reportExportService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(EpfResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEpfEntries(
        [FromQuery] int? year,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetEpfEntriesQuery(year), cancellationToken);
        return Ok(result);
    }

    [HttpPost("upload-passbook-pdf")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(EpfoPassbookParsePreviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadPassbookPdf(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Official EPFO Passbook PDF file is required." });
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".pdf")
        {
            return BadRequest(new { message = "Only official EPFO Passbook PDF documents (.pdf) are supported." });
        }

        await using var stream = file.OpenReadStream();
        var result = await _pdfParserService.ParsePassbookPdfAsync(stream, cancellationToken);
        return Ok(result);
    }

    [HttpPost("import-passbook-commit")]
    [ProducesResponseType(typeof(EpfResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CommitPassbookImport(
        [FromBody] CommitEpfoPassbookImportRequest request,
        CancellationToken cancellationToken)
    {
        if (request?.Entries == null || request.Entries.Count == 0)
        {
            return BadRequest(new { message = "No valid EPFO passbook entries to import." });
        }

        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var distinctYears = request.Entries.Select(e => e.Month.Year).Distinct().ToList();

        if (request.ReplaceExistingYear)
        {
            // Remove existing entries in the target months to ensure clean state without duplicates
            var targetMonths = request.Entries.Select(e => new { e.Month.Year, e.Month.Month }).Distinct().ToList();
            var existingEntries = await _context.EpfEntries
                .Where(e => e.UserId == userId.Value)
                .ToListAsync(cancellationToken);

            var toRemove = existingEntries
                .Where(e => targetMonths.Any(m => m.Year == e.Month.Year && m.Month == e.Month.Month))
                .ToList();

            if (toRemove.Count > 0)
            {
                _context.EpfEntries.RemoveRange(toRemove);
            }
        }

        foreach (var item in request.Entries)
        {
            var normalizedMonth = new DateTime(item.Month.Year, item.Month.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            _context.EpfEntries.Add(new EpfEntry
            {
                UserId = userId.Value,
                Month = normalizedMonth,
                EmployeeShare = item.EmployeeShare,
                EmployerShare = item.EmployerShare,
                PensionShare = item.PensionShare,
                Interest = item.Interest,
                Withdrawal = item.Withdrawal,
                Note = item.Note
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        var primaryYear = distinctYears.FirstOrDefault(DateTime.UtcNow.Year);
        var fullState = await Mediator.Send(new GetEpfEntriesQuery(primaryYear), cancellationToken);
        return Ok(fullState);
    }

    [HttpGet("export/pdf")]
    public async Task<IActionResult> ExportPdf([FromQuery] int? year, CancellationToken cancellationToken)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;
        var fileResult = await _reportExportService.ExportEpfoPdfAsync(targetYear, cancellationToken);
        return File(fileResult.Content, fileResult.ContentType, fileResult.FileName);
    }

    [HttpGet("export/excel")]
    public async Task<IActionResult> ExportExcel([FromQuery] int? year, CancellationToken cancellationToken)
    {
        var targetYear = year ?? DateTime.UtcNow.Year;
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var entries = await _context.EpfEntries
            .Where(e => e.UserId == userId.Value && e.Month.Year == targetYear)
            .OrderBy(e => e.Month)
            .ToListAsync(cancellationToken);

        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add($"EPFO {targetYear}");

        worksheet.Cell(1, 1).Value = "Month";
        worksheet.Cell(1, 2).Value = "Employee Share (12%)";
        worksheet.Cell(1, 3).Value = "Employer Share (3.67%)";
        worksheet.Cell(1, 4).Value = "Pension Share (8.33%)";
        worksheet.Cell(1, 5).Value = "Interest";
        worksheet.Cell(1, 6).Value = "Withdrawal";
        worksheet.Cell(1, 7).Value = "Net Inflow";
        worksheet.Cell(1, 8).Value = "Note";

        var headerRow = worksheet.Row(1);
        headerRow.Style.Font.Bold = true;
        headerRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#00695c");
        headerRow.Style.Font.FontColor = XLColor.White;

        int row = 2;
        foreach (var e in entries)
        {
            worksheet.Cell(row, 1).Value = e.Month.ToString("MMM yyyy");
            worksheet.Cell(row, 2).Value = e.EmployeeShare;
            worksheet.Cell(row, 3).Value = e.EmployerShare;
            worksheet.Cell(row, 4).Value = e.PensionShare;
            worksheet.Cell(row, 5).Value = e.Interest;
            worksheet.Cell(row, 6).Value = e.Withdrawal;
            worksheet.Cell(row, 7).Value = e.NetEpfInflow;
            worksheet.Cell(row, 8).Value = e.Note ?? "";
            row++;
        }

        worksheet.Columns().AdjustToContents();

        using var memoryStream = new MemoryStream();
        workbook.SaveAs(memoryStream);
        return File(memoryStream.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Hisaab_EPFO_{targetYear}.xlsx");
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
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteEpfEntry(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        if (!await CheckDeletePermissionAsync("Epfo", cancellationToken))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new {
                error = "DeletionDisabled",
                message = "Deletion is disabled for EPFO in Settings. Please enable it under Settings > Deletion Controls."
            });
        }

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

