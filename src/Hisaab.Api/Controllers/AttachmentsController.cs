using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Api.Controllers;

[Authorize]
public class AttachmentsController : ApiControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IWebHostEnvironment _environment;

    public AttachmentsController(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IWebHostEnvironment environment)
    {
        _context = context;
        _currentUserService = currentUserService;
        _environment = environment;
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadAttachment(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { error = "No file was uploaded." });
        }

        // Limit size to 15 MB
        const long maxSizeBytes = 15 * 1024 * 1024;
        if (file.Length > maxSizeBytes)
        {
            return BadRequest(new { error = "File size exceeds the 15 MB limit." });
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedExtensions = new[] { ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg", ".pdf" };
        if (!allowedExtensions.Contains(ext))
        {
            return BadRequest(new { error = "Only image formats (PNG, JPG, JPEG, WEBP, GIF, BMP, SVG) and PDF receipts/bills are allowed." });
        }

        var contentType = ext switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            ".bmp" => "image/bmp",
            ".svg" => "image/svg+xml",
            ".pdf" => "application/pdf",
            _ => file.ContentType ?? "application/octet-stream"
        };

        var uploadsFolder = Path.Combine(_environment.ContentRootPath, "uploads", "attachments");
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var attachmentId = Guid.NewGuid();
        var uniqueFileName = $"{attachmentId}{ext}";
        var fullPath = Path.Combine(uploadsFolder, uniqueFileName);

        await using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var attachment = new Attachment
        {
            Id = attachmentId,
            UserId = _currentUserService.UserId ?? Guid.Empty,
            FileName = uniqueFileName,
            OriginalFileName = Path.GetFileName(file.FileName),
            ContentType = contentType,
            FileSizeBytes = file.Length,
            FilePath = fullPath,
            FileUrl = $"/api/v1/attachments/{attachmentId}"
        };

        _context.Attachments.Add(attachment);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            id = attachment.Id,
            fileName = attachment.FileName,
            originalFileName = attachment.OriginalFileName,
            contentType = attachment.ContentType,
            fileSizeBytes = attachment.FileSizeBytes,
            fileUrl = attachment.FileUrl
        });
    }

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAttachment([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var attachment = await _context.Attachments
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted, cancellationToken);

        if (attachment == null || !System.IO.File.Exists(attachment.FilePath))
        {
            // Fallback search in uploads/attachments folder
            var uploadsFolder = Path.Combine(_environment.ContentRootPath, "uploads", "attachments");
            var matchingFiles = Directory.Exists(uploadsFolder)
                ? Directory.GetFiles(uploadsFolder, $"{id}.*")
                : Array.Empty<string>();

            if (matchingFiles.Length == 0)
            {
                return NotFound("Attachment not found.");
            }

            var fallbackPath = matchingFiles[0];
            var fallbackExt = Path.GetExtension(fallbackPath).ToLowerInvariant();
            var fallbackContentType = fallbackExt == ".pdf" ? "application/pdf" : "image/jpeg";
            Response.Headers["Content-Disposition"] = "inline";
            return PhysicalFile(fallbackPath, fallbackContentType, enableRangeProcessing: true);
        }

        Response.Headers["Content-Disposition"] = $"inline; filename=\"{Uri.EscapeDataString(attachment.OriginalFileName)}\"";
        Response.Headers["Cache-Control"] = "public, max-age=604800";
        return PhysicalFile(attachment.FilePath, attachment.ContentType, enableRangeProcessing: true);
    }

    [HttpGet("{id:guid}/download")]
    [AllowAnonymous]
    public async Task<IActionResult> DownloadAttachment([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var attachment = await _context.Attachments
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted, cancellationToken);

        if (attachment == null || !System.IO.File.Exists(attachment.FilePath))
        {
            return NotFound("Attachment not found.");
        }

        return PhysicalFile(attachment.FilePath, attachment.ContentType, attachment.OriginalFileName, enableRangeProcessing: true);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteAttachment([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var attachment = await _context.Attachments
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (attachment == null)
        {
            return NotFound("Attachment not found.");
        }

        _context.Attachments.Remove(attachment);
        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            if (System.IO.File.Exists(attachment.FilePath))
            {
                System.IO.File.Delete(attachment.FilePath);
            }
        }
        catch
        {
            // Ignored if file lock prevents immediate deletion
        }

        return NoContent();
    }
}

