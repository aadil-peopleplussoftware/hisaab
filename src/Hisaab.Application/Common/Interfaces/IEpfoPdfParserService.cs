using Hisaab.Application.Features.Epfo.DTOs;

namespace Hisaab.Application.Common.Interfaces;

public interface IEpfoPdfParserService
{
    Task<EpfoPassbookParsePreviewDto> ParsePassbookPdfAsync(Stream pdfStream, CancellationToken cancellationToken = default);
}

