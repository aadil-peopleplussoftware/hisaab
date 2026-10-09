using Hisaab.Application.Features.DataTransfer.Commands;
using Hisaab.Application.Features.DataTransfer.DTOs;
using Hisaab.Application.Features.DataTransfer.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hisaab.Api.Controllers;

[Authorize]
[Route("api/v1/import")]
public class ImportController : ApiControllerBase
{
    [HttpGet("templates/{module}")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DownloadTemplate([FromRoute] string module, CancellationToken cancellationToken)
    {
        var content = await Mediator.Send(new GetImportTemplateQuery(module), cancellationToken);
        var fileName = $"template_{module.ToLowerInvariant()}.xlsx";
        return File(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(UploadResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadFile(
        [FromForm] IFormFile file,
        [FromForm] string module,
        CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "File is required." });
        }

        if (string.IsNullOrWhiteSpace(module))
        {
            return BadRequest(new { message = "Module name is required." });
        }

        await using var stream = file.OpenReadStream();
        var result = await Mediator.Send(new UploadImportFileCommand(stream, file.FileName, module), cancellationToken);
        return Ok(result);
    }

    [HttpPost("{batchId:guid}/mapping")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SaveMapping(
        [FromRoute] Guid batchId,
        [FromBody] MappingRequestDto mapping,
        CancellationToken cancellationToken)
    {
        await Mediator.Send(new SaveImportMappingCommand(batchId, mapping), cancellationToken);
        return Ok(new { message = "Mapping saved successfully." });
    }

    [HttpPost("{batchId:guid}/validate")]
    [ProducesResponseType(typeof(PreviewValidationResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Validate(
        [FromRoute] Guid batchId,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new ValidateImportBatchCommand(batchId), cancellationToken);
        return Ok(result);
    }

    [HttpPost("{batchId:guid}/commit")]
    [ProducesResponseType(typeof(ImportResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Commit(
        [FromRoute] Guid batchId,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new CommitImportBatchCommand(batchId), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{batchId:guid}")]
    [ProducesResponseType(typeof(ImportBatchDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBatch(
        [FromRoute] Guid batchId,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetImportBatchQuery(batchId), cancellationToken);
        return Ok(result);
    }

    [HttpGet("{batchId:guid}/errors.xlsx")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DownloadErrors(
        [FromRoute] Guid batchId,
        CancellationToken cancellationToken)
    {
        var content = await Mediator.Send(new GetImportBatchErrorsExcelQuery(batchId), cancellationToken);
        return File(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"import_errors_{batchId}.xlsx");
    }

    [HttpPost("{batchId:guid}/rollback")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Rollback(
        [FromRoute] Guid batchId,
        CancellationToken cancellationToken)
    {
        var success = await Mediator.Send(new RollbackImportBatchCommand(batchId), cancellationToken);
        return Ok(new { success, message = "Import batch successfully rolled back." });
    }

    [HttpGet("history")]
    [ProducesResponseType(typeof(List<ImportBatchDetailDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetHistory(CancellationToken cancellationToken)
    {
        var list = await Mediator.Send(new GetImportHistoryQuery(), cancellationToken);
        return Ok(list);
    }

    [HttpGet("mapping-profiles")]
    [ProducesResponseType(typeof(List<MappingProfileDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMappingProfiles([FromQuery] string? module, CancellationToken cancellationToken)
    {
        var list = await Mediator.Send(new GetMappingProfilesQuery(module), cancellationToken);
        return Ok(list);
    }

    [HttpGet("mapping-profiles/{id:guid}")]
    [ProducesResponseType(typeof(MappingProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMappingProfileById([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var profile = await Mediator.Send(new GetMappingProfileByIdQuery(id), cancellationToken);
        return Ok(profile);
    }

    [HttpPost("mapping-profiles")]
    [ProducesResponseType(typeof(MappingProfileDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SaveMappingProfile(
        [FromBody] SaveMappingProfileRequest request,
        CancellationToken cancellationToken)
    {
        var profile = await Mediator.Send(new SaveMappingProfileCommand(request), cancellationToken);
        return CreatedAtAction(nameof(GetMappingProfileById), new { id = profile.Id }, profile);
    }

    [HttpDelete("mapping-profiles/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteMappingProfile([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        await Mediator.Send(new DeleteMappingProfileCommand(id), cancellationToken);
        return NoContent();
    }
}
