namespace Hisaab.Application.Common.Interfaces;

public record FileExportResult(
    byte[] Content,
    string ContentType,
    string FileName
);

public interface IReportExportService
{
    Task<FileExportResult> ExportTransactionsPdfAsync(string fromMonth, string? toMonth = null, CancellationToken cancellationToken = default);
    Task<FileExportResult> ExportTransactionsExcelAsync(string fromMonth, string? toMonth = null, CancellationToken cancellationToken = default);

    Task<FileExportResult> ExportLoansPdfAsync(Guid? loanId, CancellationToken cancellationToken = default);
    Task<FileExportResult> ExportLoansExcelAsync(CancellationToken cancellationToken = default);

    Task<FileExportResult> ExportEpfoPdfAsync(int year, CancellationToken cancellationToken = default);
    Task<FileExportResult> ExportEpfoExcelAsync(int year, CancellationToken cancellationToken = default);

    Task<FileExportResult> ExportInvestmentsPdfAsync(CancellationToken cancellationToken = default);
    Task<FileExportResult> ExportInvestmentsExcelAsync(CancellationToken cancellationToken = default);

    Task<FileExportResult> ExportDashboardPdfAsync(string fromMonth, string? toMonth = null, CancellationToken cancellationToken = default);
}

