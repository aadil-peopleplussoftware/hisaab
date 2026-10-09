namespace Hisaab.Application.Common.Interfaces;

public record FileExportResult(
    byte[] Content,
    string ContentType,
    string FileName
);

public interface IReportExportService
{
    Task<FileExportResult> ExportTransactionsPdfAsync(string month, CancellationToken cancellationToken);
    Task<FileExportResult> ExportTransactionsExcelAsync(string month, CancellationToken cancellationToken);

    Task<FileExportResult> ExportLoansPdfAsync(Guid? loanId, CancellationToken cancellationToken);
    Task<FileExportResult> ExportLoansExcelAsync(CancellationToken cancellationToken);

    Task<FileExportResult> ExportEpfoPdfAsync(int year, CancellationToken cancellationToken);
    Task<FileExportResult> ExportEpfoExcelAsync(int year, CancellationToken cancellationToken);

    Task<FileExportResult> ExportInvestmentsPdfAsync(CancellationToken cancellationToken);
    Task<FileExportResult> ExportInvestmentsExcelAsync(CancellationToken cancellationToken);

    Task<FileExportResult> ExportDashboardPdfAsync(string month, CancellationToken cancellationToken);
}
