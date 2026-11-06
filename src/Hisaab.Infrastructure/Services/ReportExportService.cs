using System.Globalization;
using ClosedXML.Excel;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using Hisaab.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Hisaab.Infrastructure.Services;

public class ReportExportService : IReportExportService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeService _dateTimeService;

    public ReportExportService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _dateTimeService = dateTimeService;
    }

    public async Task<FileExportResult> ExportTransactionsPdfAsync(string fromMonth, string? toMonth = null, CancellationToken cancellationToken = default)
    {
        var currentUserId = _currentUserService.UserId;
        var (startUtc, endUtc, monthDisplay, fileTag, totalMonths) = ParseDateRange(fromMonth, toMonth);

        var transactions = await _context.Transactions
            .AsNoTracking()
            .Include(t => t.Category)
            .Where(t => t.UserId == currentUserId && t.TransactionDate >= startUtc && t.TransactionDate < endUtc)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync(cancellationToken);

        var totalIncome = transactions.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
        var totalExpense = transactions.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);
        var netSavings = totalIncome - totalExpense;

        var pdfBytes = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(x => x.FontSize(10).FontColor(Colors.Grey.Darken3));

                page.Header().Element(c => ComposeReportHeader(c, totalMonths > 1 ? "Income & Expense Multi-Month Statement" : "Monthly Income & Expense Statement", $"Period: {monthDisplay}"));

                page.Content().PaddingVertical(15).Column(col =>
                {
                    // Prominent Statement Period Banner
                    col.Item().Border(1).BorderColor(Colors.Indigo.Medium).Background(Colors.Indigo.Lighten5).Padding(10).Row(r =>
                    {
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("STATEMENT PERIOD").Bold().FontSize(8).FontColor(Colors.Indigo.Darken2);
                            c.Item().Text($"{monthDisplay}  ({startUtc:dd-MMM-yyyy} to {endUtc.AddDays(-1):dd-MMM-yyyy})")
                                .Bold().FontSize(12).FontColor(Colors.Indigo.Darken4);
                        });
                        r.AutoItem().AlignRight().Column(c =>
                        {
                            c.Item().Text("TOTAL DURATION").FontSize(8).FontColor(Colors.Grey.Darken1);
                            c.Item().Text(totalMonths == 1 ? "1 Month" : $"{totalMonths} Months").Bold().FontSize(11).FontColor(Colors.Indigo.Darken3);
                        });
                    });

                    // Summary KPI Box
                    col.Item().PaddingTop(10).Border(1).BorderColor(Colors.Grey.Lighten2).Background(Colors.Grey.Lighten4).Padding(12).Row(r =>
                    {
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Total Income").FontSize(9).FontColor(Colors.Grey.Darken1);
                            c.Item().Text(new Money(totalIncome).ToIndianFormat()).Bold().FontSize(12).FontColor(Colors.Green.Darken2);
                        });
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Total Expenses").FontSize(9).FontColor(Colors.Grey.Darken1);
                            c.Item().Text(new Money(totalExpense).ToIndianFormat()).Bold().FontSize(12).FontColor(Colors.Red.Darken2);
                        });
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Net Savings").FontSize(9).FontColor(Colors.Grey.Darken1);
                            c.Item().Text(new Money(netSavings).ToIndianFormat()).Bold().FontSize(12).FontColor(netSavings >= 0 ? Colors.Green.Darken2 : Colors.Red.Darken2);
                        });
                    });

                    // Month-by-month summary if multi-month
                    if (totalMonths > 1)
                    {
                        var monthlyGroups = transactions
                            .GroupBy(t => new { t.TransactionDate.Year, t.TransactionDate.Month })
                            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
                            .Select(g => new
                            {
                                MonthName = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy"),
                                Income = g.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount),
                                Expense = g.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount),
                                Savings = g.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount) - g.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount)
                            })
                            .ToList();

                        if (monthlyGroups.Count > 0)
                        {
                            col.Item().PaddingTop(12).Text("Month-by-Month Breakdown").Bold().FontSize(11);
                            col.Item().PaddingTop(4).Table(mTable =>
                            {
                                mTable.ColumnsDefinition(cols =>
                                {
                                    cols.RelativeColumn(2);
                                    cols.RelativeColumn(2);
                                    cols.RelativeColumn(2);
                                    cols.RelativeColumn(2);
                                });

                                mTable.Header(h =>
                                {
                                    h.Cell().BorderBottom(1).Padding(3).Text("Month").Bold().FontSize(9);
                                    h.Cell().BorderBottom(1).Padding(3).AlignRight().Text("Income").Bold().FontSize(9);
                                    h.Cell().BorderBottom(1).Padding(3).AlignRight().Text("Expense").Bold().FontSize(9);
                                    h.Cell().BorderBottom(1).Padding(3).AlignRight().Text("Net Savings").Bold().FontSize(9);
                                });

                                foreach (var m in monthlyGroups)
                                {
                                    mTable.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).Text(m.MonthName).FontSize(9);
                                    mTable.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).AlignRight().Text(new Money(m.Income).ToIndianFormat()).FontColor(Colors.Green.Darken2).FontSize(9);
                                    mTable.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).AlignRight().Text(new Money(m.Expense).ToIndianFormat()).FontColor(Colors.Red.Darken2).FontSize(9);
                                    mTable.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).AlignRight().Text(new Money(m.Savings).ToIndianFormat()).FontColor(m.Savings >= 0 ? Colors.Green.Darken2 : Colors.Red.Darken2).Bold().FontSize(9);
                                }
                            });
                        }
                    }

                    col.Item().PaddingTop(15).Text($"Itemized Transactions ({transactions.Count})").Bold().FontSize(11);

                    // Table
                    col.Item().PaddingTop(8).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.ConstantColumn(75);
                            cols.ConstantColumn(65);
                            cols.RelativeColumn(2);
                            cols.RelativeColumn(3);
                            cols.RelativeColumn(2);
                        });

                        table.Header(header =>
                        {
                            header.Cell().BorderBottom(1).BorderColor(Colors.Grey.Medium).Padding(4).Text("Date").Bold();
                            header.Cell().BorderBottom(1).BorderColor(Colors.Grey.Medium).Padding(4).Text("Type").Bold();
                            header.Cell().BorderBottom(1).BorderColor(Colors.Grey.Medium).Padding(4).Text("Category").Bold();
                            header.Cell().BorderBottom(1).BorderColor(Colors.Grey.Medium).Padding(4).Text("Note").Bold();
                            header.Cell().BorderBottom(1).BorderColor(Colors.Grey.Medium).Padding(4).AlignRight().Text("Amount").Bold();
                        });

                        foreach (var tx in transactions)
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(tx.TransactionDate.ToString("dd-MMM-yyyy"));
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(tx.Type.ToString());
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(tx.Category?.Name ?? "Uncategorized");
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text(tx.Note ?? "-");
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).AlignRight()
                                .Text(new Money(tx.Amount).ToIndianFormat())
                                .FontColor(tx.Type == TransactionType.Income ? Colors.Green.Darken2 : Colors.Red.Darken2);
                        }
                    });
                });

                page.Footer().Element(ComposeReportFooter);
            });
        }).GeneratePdf();

        return new FileExportResult(pdfBytes, "application/pdf", $"Hisaab_Transactions_{fileTag}.pdf");
    }

    public async Task<FileExportResult> ExportTransactionsExcelAsync(string fromMonth, string? toMonth = null, CancellationToken cancellationToken = default)
    {
        var currentUserId = _currentUserService.UserId;
        var (startUtc, endUtc, monthDisplay, fileTag, totalMonths) = ParseDateRange(fromMonth, toMonth);

        var transactions = await _context.Transactions
            .AsNoTracking()
            .Include(t => t.Category)
            .Where(t => t.UserId == currentUserId && t.TransactionDate >= startUtc && t.TransactionDate < endUtc)
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync(cancellationToken);

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Transactions");

        // Header Title
        ws.Cell(1, 1).Value = totalMonths > 1 ? "Hisaab - Multi-Month Transactions Statement" : "Hisaab - Monthly Transactions Statement";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;
        ws.Cell(2, 1).Value = $"Statement Period: {monthDisplay} (From {startUtc:dd-MMM-yyyy} to {endUtc.AddDays(-1):dd-MMM-yyyy}) | Total Duration: {totalMonths} Month(s)";
        ws.Cell(2, 1).Style.Font.Bold = true;
        ws.Cell(2, 1).Style.Font.FontSize = 11;
        ws.Cell(2, 1).Style.Font.FontColor = XLColor.FromHtml("#4F46E5");

        // Table Header
        var row = 4;
        ws.Cell(row, 1).Value = "Date";
        ws.Cell(row, 2).Value = "Type";
        ws.Cell(row, 3).Value = "Category";
        ws.Cell(row, 4).Value = "Amount (INR)";
        ws.Cell(row, 5).Value = "Formatted Amount";
        ws.Cell(row, 6).Value = "Note";

        var headerRange = ws.Range(row, 1, row, 6);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#4F46E5");
        headerRange.Style.Font.FontColor = XLColor.White;

        row++;
        foreach (var tx in transactions)
        {
            ws.Cell(row, 1).Value = tx.TransactionDate.ToString("yyyy-MM-dd");
            ws.Cell(row, 2).Value = tx.Type.ToString();
            ws.Cell(row, 3).Value = tx.Category?.Name ?? "Uncategorized";
            ws.Cell(row, 4).Value = tx.Amount;
            ws.Cell(row, 5).Value = new Money(tx.Amount).ToIndianFormat();
            ws.Cell(row, 6).Value = tx.Note ?? string.Empty;
            row++;
        }

        ws.Columns().AdjustToContents();

        if (totalMonths > 1)
        {
            var wsSummary = workbook.Worksheets.Add("Monthly Summary");
            wsSummary.Cell(1, 1).Value = "Monthly Breakdown Summary";
            wsSummary.Cell(1, 1).Style.Font.Bold = true;
            wsSummary.Cell(1, 1).Style.Font.FontSize = 13;
            wsSummary.Cell(2, 1).Value = $"Period: {monthDisplay}";
            wsSummary.Cell(2, 1).Style.Font.Italic = true;

            wsSummary.Cell(4, 1).Value = "Month";
            wsSummary.Cell(4, 2).Value = "Income (INR)";
            wsSummary.Cell(4, 3).Value = "Expense (INR)";
            wsSummary.Cell(4, 4).Value = "Net Savings (INR)";
            var sHdr = wsSummary.Range(4, 1, 4, 4);
            sHdr.Style.Font.Bold = true;
            sHdr.Style.Fill.BackgroundColor = XLColor.FromHtml("#4F46E5");
            sHdr.Style.Font.FontColor = XLColor.White;

            var sRow = 5;
            var monthlyGroups = transactions
                .GroupBy(t => new { t.TransactionDate.Year, t.TransactionDate.Month })
                .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month);

            foreach (var mg in monthlyGroups)
            {
                var inc = mg.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
                var exp = mg.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);
                wsSummary.Cell(sRow, 1).Value = new DateTime(mg.Key.Year, mg.Key.Month, 1).ToString("MMMM yyyy");
                wsSummary.Cell(sRow, 2).Value = inc;
                wsSummary.Cell(sRow, 3).Value = exp;
                wsSummary.Cell(sRow, 4).Value = inc - exp;
                sRow++;
            }
            wsSummary.Columns().AdjustToContents();
        }

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return new FileExportResult(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Hisaab_Transactions_{fileTag}.xlsx");
    }

    public async Task<FileExportResult> ExportLoansPdfAsync(Guid? loanId, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        var nowUtc = _dateTimeService.UtcNow;

        var loansQuery = _context.LoanAccounts
            .AsNoTracking()
            .Include(l => l.Transactions)
            .Where(l => l.UserId == currentUserId);

        if (loanId.HasValue)
        {
            loansQuery = loansQuery.Where(l => l.Id == loanId.Value);
        }

        var loans = await loansQuery.OrderByDescending(l => l.CreatedAtUtc).ToListAsync(cancellationToken);

        var pdfBytes = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(x => x.FontSize(10).FontColor(Colors.Grey.Darken3));

                page.Header().Element(c => ComposeReportHeader(c, "Loan Accounts & Ledger Statement", $"Generated {nowUtc:dd-MMM-yyyy}"));

                page.Content().PaddingVertical(15).Column(col =>
                {
                    foreach (var loan in loans)
                    {
                        var disburse = loan.Transactions.Where(t => t.Kind == LoanTransactionKind.Disburse).Sum(t => t.Amount);
                        var repayment = loan.Transactions.Where(t => t.Kind == LoanTransactionKind.Repayment).Sum(t => t.Amount);
                        var interest = loan.Transactions.Where(t => t.Kind == LoanTransactionKind.Interest).Sum(t => t.Amount);
                        var penalty = loan.Transactions.Where(t => t.Kind == LoanTransactionKind.Penalty).Sum(t => t.Amount);
                        var outstanding = (disburse + interest + penalty) - repayment;

                        col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Background(Colors.Grey.Lighten4).Padding(10).Column(loanBox =>
                        {
                            loanBox.Item().Row(r =>
                            {
                                r.RelativeItem().Column(info =>
                                {
                                    info.Item().Text(loan.Name).Bold().FontSize(12);
                                    info.Item().Text($"Counterparty: {loan.Counterparty} | Type: {loan.Direction} | Status: {loan.Status}").FontSize(9);
                                });
                                r.RelativeItem().AlignRight().Column(bal =>
                                {
                                    bal.Item().Text("Outstanding Balance").FontSize(9).FontColor(Colors.Grey.Darken1);
                                    bal.Item().Text(new Money(outstanding).ToIndianFormat()).Bold().FontSize(13).FontColor(loan.Direction == LoanDirection.Given ? Colors.Green.Darken2 : Colors.Red.Darken2);
                                });
                            });

                            if (loan.Transactions.Count > 0)
                            {
                                loanBox.Item().PaddingTop(8).Table(table =>
                                {
                                    table.ColumnsDefinition(cols =>
                                    {
                                        cols.ConstantColumn(75);
                                        cols.ConstantColumn(80);
                                        cols.RelativeColumn(2);
                                        cols.RelativeColumn(1);
                                    });

                                    table.Header(h =>
                                    {
                                        h.Cell().BorderBottom(1).Padding(3).Text("Date").Bold().FontSize(9);
                                        h.Cell().BorderBottom(1).Padding(3).Text("Kind").Bold().FontSize(9);
                                        h.Cell().BorderBottom(1).Padding(3).Text("Note").Bold().FontSize(9);
                                        h.Cell().BorderBottom(1).Padding(3).AlignRight().Text("Amount").Bold().FontSize(9);
                                    });

                                    foreach (var tx in loan.Transactions.OrderBy(t => t.TransactionDate))
                                    {
                                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).Text(tx.TransactionDate.ToString("dd-MMM-yyyy")).FontSize(8);
                                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).Text(tx.Kind.ToString()).FontSize(8);
                                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).Text(tx.Note ?? "-").FontSize(8);
                                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).AlignRight().Text(new Money(tx.Amount).ToIndianFormat()).FontSize(8);
                                    }
                                });
                            }
                        });

                        col.Item().PaddingVertical(6);
                    }
                });

                page.Footer().Element(ComposeReportFooter);
            });
        }).GeneratePdf();

        var fileName = loanId.HasValue ? $"Hisaab_Loan_{loanId.Value}.pdf" : "Hisaab_Loans_Summary.pdf";
        return new FileExportResult(pdfBytes, "application/pdf", fileName);
    }

    public async Task<FileExportResult> ExportLoansExcelAsync(CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        var loans = await _context.LoanAccounts
            .AsNoTracking()
            .Include(l => l.Transactions)
            .Where(l => l.UserId == currentUserId)
            .OrderByDescending(l => l.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Loans");

        ws.Cell(1, 1).Value = "Hisaab - Loan Accounts Summary";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;

        var row = 3;
        ws.Cell(row, 1).Value = "Loan Name";
        ws.Cell(row, 2).Value = "Counterparty";
        ws.Cell(row, 3).Value = "Direction";
        ws.Cell(row, 4).Value = "Principal";
        ws.Cell(row, 5).Value = "Outstanding";
        ws.Cell(row, 6).Value = "Status";
        ws.Cell(row, 7).Value = "Start Date";
        ws.Cell(row, 8).Value = "Due Date";

        var header = ws.Range(row, 1, row, 8);
        header.Style.Font.Bold = true;
        header.Style.Fill.BackgroundColor = XLColor.FromHtml("#D97706");
        header.Style.Font.FontColor = XLColor.White;

        row++;
        foreach (var l in loans)
        {
            var disburse = l.Transactions.Where(t => t.Kind == LoanTransactionKind.Disburse).Sum(t => t.Amount);
            var repayment = l.Transactions.Where(t => t.Kind == LoanTransactionKind.Repayment).Sum(t => t.Amount);
            var interest = l.Transactions.Where(t => t.Kind == LoanTransactionKind.Interest).Sum(t => t.Amount);
            var penalty = l.Transactions.Where(t => t.Kind == LoanTransactionKind.Penalty).Sum(t => t.Amount);
            var outstanding = (disburse + interest + penalty) - repayment;

            ws.Cell(row, 1).Value = l.Name;
            ws.Cell(row, 2).Value = l.Counterparty;
            ws.Cell(row, 3).Value = l.Direction.ToString();
            ws.Cell(row, 4).Value = l.Principal;
            ws.Cell(row, 5).Value = outstanding;
            ws.Cell(row, 6).Value = l.Status.ToString();
            ws.Cell(row, 7).Value = l.StartDate.ToString("yyyy-MM-dd");
            ws.Cell(row, 8).Value = l.DueDate.HasValue ? l.DueDate.Value.ToString("yyyy-MM-dd") : "N/A";
            row++;
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return new FileExportResult(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Hisaab_Loans_Summary.xlsx");
    }

    public async Task<FileExportResult> ExportEpfoPdfAsync(int year, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        var isOverall = year <= 0;
        List<EpfEntry> entries;
        string subHeader;
        string fileName;

        if (isOverall)
        {
            entries = await _context.EpfEntries
                .AsNoTracking()
                .Where(e => e.UserId == currentUserId)
                .OrderBy(e => e.Month)
                .ToListAsync(cancellationToken);
            subHeader = "Overall Passbook Statement (All Years)";
            fileName = "Hisaab_EPFO_Passbook_Overall.pdf";
        }
        else
        {
            var startUtc = new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var endUtc = new DateTime(year + 1, 1, 1, 0, 0, 0, DateTimeKind.Utc);

            entries = await _context.EpfEntries
                .AsNoTracking()
                .Where(e => e.UserId == currentUserId && e.Month >= startUtc && e.Month < endUtc)
                .OrderBy(e => e.Month)
                .ToListAsync(cancellationToken);
            subHeader = $"Calendar Year {year}";
            fileName = $"Hisaab_EPFO_Passbook_{year}.pdf";
        }

        var totalEmp = entries.Sum(e => e.EmployeeShare);
        var totalEmpr = entries.Sum(e => e.EmployerShare);
        var totalPension = entries.Sum(e => e.PensionShare);
        var totalInt = entries.Sum(e => e.Interest);
        var totalWdl = entries.Sum(e => e.Withdrawal);
        var netYearContribution = (totalEmp + totalEmpr + totalInt) - totalWdl;

        var pdfBytes = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(x => x.FontSize(10).FontColor(Colors.Grey.Darken3));

                page.Header().Element(c => ComposeReportHeader(c, "EPFO Member Passbook Statement", subHeader));

                page.Content().PaddingVertical(15).Column(col =>
                {
                    // Yearly Summary Box
                    col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Background(Colors.Grey.Lighten4).Padding(10).Row(r =>
                    {
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Employee Share (12%)").FontSize(9);
                            c.Item().Text(new Money(totalEmp).ToIndianFormat()).Bold().FontSize(11);
                        });
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Employer Share (3.67%)").FontSize(9);
                            c.Item().Text(new Money(totalEmpr).ToIndianFormat()).Bold().FontSize(11);
                        });
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Pension Fund (8.33%)").FontSize(9);
                            c.Item().Text(new Money(totalPension).ToIndianFormat()).Bold().FontSize(11);
                        });
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Net Additions").FontSize(9);
                            c.Item().Text(new Money(netYearContribution).ToIndianFormat()).Bold().FontSize(11).FontColor(Colors.Teal.Darken2);
                        });
                    });

                    col.Item().PaddingTop(15).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.ConstantColumn(70);
                            cols.RelativeColumn(1);
                            cols.RelativeColumn(1);
                            cols.RelativeColumn(1);
                            cols.RelativeColumn(1);
                            cols.RelativeColumn(1);
                        });

                        table.Header(h =>
                        {
                            h.Cell().BorderBottom(1).Padding(3).Text("Wage Month").Bold();
                            h.Cell().BorderBottom(1).Padding(3).AlignRight().Text("EE Share").Bold();
                            h.Cell().BorderBottom(1).Padding(3).AlignRight().Text("ER Share").Bold();
                            h.Cell().BorderBottom(1).Padding(3).AlignRight().Text("Pension").Bold();
                            h.Cell().BorderBottom(1).Padding(3).AlignRight().Text("Interest").Bold();
                            h.Cell().BorderBottom(1).Padding(3).AlignRight().Text("Withdrawal").Bold();
                        });

                        foreach (var e in entries)
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).Text(e.Month.ToString("MMM yyyy"));
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).AlignRight().Text(new Money(e.EmployeeShare).ToIndianFormat());
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).AlignRight().Text(new Money(e.EmployerShare).ToIndianFormat());
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).AlignRight().Text(new Money(e.PensionShare).ToIndianFormat());
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).AlignRight().Text(new Money(e.Interest).ToIndianFormat());
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).AlignRight().Text(new Money(e.Withdrawal).ToIndianFormat());
                        }
                    });
                });

                page.Footer().Element(ComposeReportFooter);
            });
        }).GeneratePdf();

        return new FileExportResult(pdfBytes, "application/pdf", fileName);
    }

    public async Task<FileExportResult> ExportEpfoExcelAsync(int year, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        var isOverall = year <= 0;
        List<EpfEntry> entries;
        string sheetName = isOverall ? "EPF_Overall" : $"EPF_{year}";
        string title = isOverall ? "Hisaab - EPFO Statement (Overall)" : $"Hisaab - EPFO Statement ({year})";
        string fileName = isOverall ? "Hisaab_EPFO_Statement_Overall.xlsx" : $"Hisaab_EPFO_Statement_{year}.xlsx";

        if (isOverall)
        {
            entries = await _context.EpfEntries
                .AsNoTracking()
                .Where(e => e.UserId == currentUserId)
                .OrderBy(e => e.Month)
                .ToListAsync(cancellationToken);
        }
        else
        {
            var startUtc = new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var endUtc = new DateTime(year + 1, 1, 1, 0, 0, 0, DateTimeKind.Utc);

            entries = await _context.EpfEntries
                .AsNoTracking()
                .Where(e => e.UserId == currentUserId && e.Month >= startUtc && e.Month < endUtc)
                .OrderBy(e => e.Month)
                .ToListAsync(cancellationToken);
        }

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add(sheetName);

        ws.Cell(1, 1).Value = title;
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;

        var row = 3;
        ws.Cell(row, 1).Value = "Wage Month";
        ws.Cell(row, 2).Value = "Employee Share (12%)";
        ws.Cell(row, 3).Value = "Employer Share (3.67%)";
        ws.Cell(row, 4).Value = "Pension Share (8.33%)";
        ws.Cell(row, 5).Value = "Interest Credited";
        ws.Cell(row, 6).Value = "Withdrawal";
        ws.Cell(row, 7).Value = "Note";

        var header = ws.Range(row, 1, row, 7);
        header.Style.Font.Bold = true;
        header.Style.Fill.BackgroundColor = XLColor.FromHtml("#0D9488");
        header.Style.Font.FontColor = XLColor.White;

        row++;
        foreach (var e in entries)
        {
            ws.Cell(row, 1).Value = e.Month.ToString("yyyy-MM");
            ws.Cell(row, 2).Value = e.EmployeeShare;
            ws.Cell(row, 3).Value = e.EmployerShare;
            ws.Cell(row, 4).Value = e.PensionShare;
            ws.Cell(row, 5).Value = e.Interest;
            ws.Cell(row, 6).Value = e.Withdrawal;
            ws.Cell(row, 7).Value = e.Note ?? string.Empty;
            row++;
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return new FileExportResult(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    public async Task<FileExportResult> ExportInvestmentsPdfAsync(CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        var nowUtc = _dateTimeService.UtcNow;

        var holdings = await _context.Holdings
            .AsNoTracking()
            .Include(h => h.Transactions)
            .Where(h => h.UserId == currentUserId)
            .OrderBy(h => h.Type)
            .ThenBy(h => h.Name)
            .ToListAsync(cancellationToken);

        var holdingData = holdings.Select(h =>
        {
            var bought = h.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Buy).Sum(t => t.Amount);
            var sold = h.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Sell).Sum(t => t.Amount);
            var invested = Math.Max(0m, bought - sold);
            var gain = h.CurrentValue - invested;
            return new { Holding = h, Invested = invested, Gain = gain };
        }).ToList();

        var totalInvested = holdingData.Sum(x => x.Invested);
        var totalCurrent = holdings.Sum(h => h.CurrentValue);
        var totalGain = totalCurrent - totalInvested;
        var gainPct = totalInvested > 0 ? Math.Round((totalGain / totalInvested) * 100m, 2) : 0m;

        var pdfBytes = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(x => x.FontSize(10).FontColor(Colors.Grey.Darken3));

                page.Header().Element(c => ComposeReportHeader(c, "Investment Portfolio Valuation Statement", $"As of {nowUtc:dd-MMM-yyyy}"));

                page.Content().PaddingVertical(15).Column(col =>
                {
                    // Portfolio KPI Box
                    col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Background(Colors.Grey.Lighten4).Padding(10).Row(r =>
                    {
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Total Invested").FontSize(9);
                            c.Item().Text(new Money(totalInvested).ToIndianFormat()).Bold().FontSize(12);
                        });
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Current Valuation").FontSize(9);
                            c.Item().Text(new Money(totalCurrent).ToIndianFormat()).Bold().FontSize(12).FontColor(Colors.Blue.Darken2);
                        });
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Gain / Loss").FontSize(9);
                            c.Item().Text(new Money(totalGain).ToIndianFormat()).Bold().FontSize(12).FontColor(totalGain >= 0 ? Colors.Green.Darken2 : Colors.Red.Darken2);
                        });
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Return %").FontSize(9);
                            c.Item().Text($"{(gainPct >= 0 ? "+" : "")}{gainPct}%").Bold().FontSize(12).FontColor(gainPct >= 0 ? Colors.Green.Darken2 : Colors.Red.Darken2);
                        });
                    });

                    col.Item().PaddingTop(15).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn(3);
                            cols.RelativeColumn(2);
                            cols.RelativeColumn(2);
                            cols.RelativeColumn(2);
                            cols.RelativeColumn(2);
                        });

                        table.Header(h =>
                        {
                            h.Cell().BorderBottom(1).Padding(3).Text("Asset Name").Bold();
                            h.Cell().BorderBottom(1).Padding(3).Text("Class").Bold();
                            h.Cell().BorderBottom(1).Padding(3).AlignRight().Text("Invested").Bold();
                            h.Cell().BorderBottom(1).Padding(3).AlignRight().Text("Current Value").Bold();
                            h.Cell().BorderBottom(1).Padding(3).AlignRight().Text("Gain/Loss").Bold();
                        });

                        foreach (var item in holdingData)
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).Text(item.Holding.Name);
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).Text(item.Holding.Type.ToString());
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).AlignRight().Text(new Money(item.Invested).ToIndianFormat());
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).AlignRight().Text(new Money(item.Holding.CurrentValue).ToIndianFormat());
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(3).AlignRight()
                                .Text(new Money(item.Gain).ToIndianFormat())
                                .FontColor(item.Gain >= 0 ? Colors.Green.Darken2 : Colors.Red.Darken2);
                        }
                    });
                });

                page.Footer().Element(ComposeReportFooter);
            });
        }).GeneratePdf();

        return new FileExportResult(pdfBytes, "application/pdf", "Hisaab_Investments_Portfolio.pdf");
    }

    public async Task<FileExportResult> ExportInvestmentsExcelAsync(CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;
        var holdings = await _context.Holdings
            .AsNoTracking()
            .Include(h => h.Transactions)
            .Where(h => h.UserId == currentUserId)
            .OrderBy(h => h.Type)
            .ThenBy(h => h.Name)
            .ToListAsync(cancellationToken);

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Portfolio");

        ws.Cell(1, 1).Value = "Hisaab - Investment Portfolio Holdings";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 14;

        var row = 3;
        ws.Cell(row, 1).Value = "Asset Name";
        ws.Cell(row, 2).Value = "Type";
        ws.Cell(row, 3).Value = "Units";
        ws.Cell(row, 4).Value = "Total Invested";
        ws.Cell(row, 5).Value = "Current Value";
        ws.Cell(row, 6).Value = "Gain / Loss";
        ws.Cell(row, 7).Value = "Return %";

        var header = ws.Range(row, 1, row, 7);
        header.Style.Font.Bold = true;
        header.Style.Fill.BackgroundColor = XLColor.FromHtml("#2563EB");
        header.Style.Font.FontColor = XLColor.White;

        row++;
        foreach (var h in holdings)
        {
            var bought = h.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Buy).Sum(t => t.Amount);
            var sold = h.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Sell).Sum(t => t.Amount);
            var invested = Math.Max(0m, bought - sold);

            var unitsBought = h.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Buy && t.Units.HasValue).Sum(t => t.Units!.Value);
            var unitsSold = h.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Sell && t.Units.HasValue).Sum(t => t.Units!.Value);
            var netUnits = Math.Max(0m, unitsBought - unitsSold);

            var gain = h.CurrentValue - invested;
            var pct = invested > 0 ? Math.Round((gain / invested) * 100m, 2) : 0m;

            ws.Cell(row, 1).Value = h.Name;
            ws.Cell(row, 2).Value = h.Type.ToString();
            ws.Cell(row, 3).Value = netUnits;
            ws.Cell(row, 4).Value = invested;
            ws.Cell(row, 5).Value = h.CurrentValue;
            ws.Cell(row, 6).Value = gain;
            ws.Cell(row, 7).Value = pct;
            row++;
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return new FileExportResult(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Hisaab_Investments_Portfolio.xlsx");
    }

    public async Task<FileExportResult> ExportDashboardPdfAsync(string fromMonth, string? toMonth = null, CancellationToken cancellationToken = default)
    {
        var currentUserId = _currentUserService.UserId;
        var (startUtc, endUtc, monthDisplay, fileTag, totalMonths) = ParseDateRange(fromMonth, toMonth);

        // Transactions in period
        var txInPeriod = await _context.Transactions
            .AsNoTracking()
            .Include(t => t.Category)
            .Where(t => t.UserId == currentUserId && t.TransactionDate >= startUtc && t.TransactionDate < endUtc)
            .ToListAsync(cancellationToken);

        var monthInc = txInPeriod.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
        var monthExp = txInPeriod.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);
        var netSavings = monthInc - monthExp;

        // Cumulative Net Worth calculations
        var allTx = await _context.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == currentUserId)
            .Select(t => new { t.Type, t.Amount })
            .ToListAsync(cancellationToken);

        var cash = allTx.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount) - allTx.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);

        var holdings = await _context.Holdings
            .AsNoTracking()
            .Where(h => h.UserId == currentUserId)
            .Select(h => h.CurrentValue)
            .ToListAsync(cancellationToken);
        var investVal = holdings.Sum();

        var epf = await _context.EpfEntries
            .AsNoTracking()
            .Where(e => e.UserId == currentUserId)
            .Select(e => e.EmployeeShare + e.EmployerShare + e.Interest - e.Withdrawal)
            .ToListAsync(cancellationToken);
        var epfBal = epf.Sum();

        var loans = await _context.LoanAccounts
            .AsNoTracking()
            .Include(l => l.Transactions)
            .Where(l => l.UserId == currentUserId && l.Status == LoanStatus.Active)
            .ToListAsync(cancellationToken);

        decimal receivable = 0m;
        decimal payable = 0m;
        foreach (var l in loans)
        {
            var disburse = l.Transactions.Where(t => t.Kind == LoanTransactionKind.Disburse).Sum(t => t.Amount);
            var repayment = l.Transactions.Where(t => t.Kind == LoanTransactionKind.Repayment).Sum(t => t.Amount);
            var interest = l.Transactions.Where(t => t.Kind == LoanTransactionKind.Interest).Sum(t => t.Amount);
            var penalty = l.Transactions.Where(t => t.Kind == LoanTransactionKind.Penalty).Sum(t => t.Amount);
            var outstanding = (disburse + interest + penalty) - repayment;

            if (l.Direction == LoanDirection.Given) receivable += outstanding;
            else payable += outstanding;
        }

        var netWorth = (cash + investVal + epfBal + receivable) - payable;

        var pdfBytes = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(36);
                page.DefaultTextStyle(x => x.FontSize(10).FontColor(Colors.Grey.Darken3));

                page.Header().Element(c => ComposeReportHeader(c, totalMonths > 1 ? "Executive Multi-Month Financial Statement" : "Comprehensive Monthly Financial Statement", $"Period: {monthDisplay}"));

                page.Content().PaddingVertical(15).Column(col =>
                {
                    // Prominent Statement Period Banner
                    col.Item().Border(1).BorderColor(Colors.Indigo.Medium).Background(Colors.Indigo.Lighten5).Padding(10).Row(r =>
                    {
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("STATEMENT PERIOD").Bold().FontSize(8).FontColor(Colors.Indigo.Darken2);
                            c.Item().Text($"{monthDisplay}  ({startUtc:dd-MMM-yyyy} to {endUtc.AddDays(-1):dd-MMM-yyyy})")
                                .Bold().FontSize(12).FontColor(Colors.Indigo.Darken4);
                        });
                        r.AutoItem().AlignRight().Column(c =>
                        {
                            c.Item().Text("TOTAL DURATION").FontSize(8).FontColor(Colors.Grey.Darken1);
                            c.Item().Text(totalMonths == 1 ? "1 Month" : $"{totalMonths} Months").Bold().FontSize(11).FontColor(Colors.Indigo.Darken3);
                        });
                    });

                    // Net Worth Box
                    col.Item().PaddingTop(10).Border(1).BorderColor(Colors.Indigo.Medium).Background(Colors.Indigo.Lighten5).Padding(12).Row(r =>
                    {
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Total Net Worth").Bold().FontSize(10).FontColor(Colors.Indigo.Darken3);
                            c.Item().Text(new Money(netWorth).ToIndianFormat()).Bold().FontSize(18).FontColor(Colors.Indigo.Darken3);
                        });
                        r.RelativeItem().Column(c =>
                        {
                            c.Item().Text(totalMonths > 1 ? "Period Net Savings" : "Monthly Net Savings").Bold().FontSize(10).FontColor(Colors.Indigo.Darken3);
                            c.Item().Text(new Money(netSavings).ToIndianFormat()).Bold().FontSize(14).FontColor(netSavings >= 0 ? Colors.Green.Darken2 : Colors.Red.Darken2);
                        });
                    });

                    col.Item().PaddingTop(15).Text("Balance Sheet Components").Bold().FontSize(12);

                    col.Item().PaddingTop(6).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn(3);
                            cols.RelativeColumn(2);
                            cols.RelativeColumn(2);
                        });

                        table.Header(h =>
                        {
                            h.Cell().BorderBottom(1).Padding(4).Text("Asset / Liability").Bold();
                            h.Cell().BorderBottom(1).Padding(4).Text("Classification").Bold();
                            h.Cell().BorderBottom(1).Padding(4).AlignRight().Text("Valuation").Bold();
                        });

                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text("Liquid Cash / Cumulative Surplus");
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text("Cash Asset");
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).AlignRight().Text(new Money(cash).ToIndianFormat());

                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text("Investment Portfolio");
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text("Market Asset");
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).AlignRight().Text(new Money(investVal).ToIndianFormat());

                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text("Employees' Provident Fund (EPF)");
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text("Retirement Asset");
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).AlignRight().Text(new Money(epfBal).ToIndianFormat());

                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text("Loans Given (Receivables)");
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text("Credit Asset");
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).AlignRight().Text(new Money(receivable).ToIndianFormat());

                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text("Loans Taken (Payables / Liabilities)");
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).Text("Debt Liability");
                        table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten3).Padding(4).AlignRight().Text(new Money(payable).ToIndianFormat()).FontColor(Colors.Red.Darken2);
                    });

                    col.Item().PaddingTop(15).Text($"Cashflow Summary ({monthDisplay})").Bold().FontSize(12);

                    col.Item().PaddingTop(6).Row(r =>
                    {
                        r.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(c =>
                        {
                            c.Item().Text("Total Income").FontSize(9);
                            c.Item().Text(new Money(monthInc).ToIndianFormat()).Bold().FontSize(11).FontColor(Colors.Green.Darken2);
                        });
                        r.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(c =>
                        {
                            c.Item().Text("Total Expenses").FontSize(9);
                            c.Item().Text(new Money(monthExp).ToIndianFormat()).Bold().FontSize(11).FontColor(Colors.Red.Darken2);
                        });
                        r.RelativeItem().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(c =>
                        {
                            c.Item().Text("Savings Rate").FontSize(9);
                            var rate = monthInc > 0 ? Math.Round((netSavings / monthInc) * 100m, 1) : 0m;
                            c.Item().Text($"{rate}%").Bold().FontSize(11);
                        });
                    });
                });

                page.Footer().Element(ComposeReportFooter);
            });
        }).GeneratePdf();

        return new FileExportResult(pdfBytes, "application/pdf", $"Hisaab_Statement_{fileTag}.pdf");
    }

    private static void ComposeReportHeader(IContainer container, string reportTitle, string periodSubtitle)
    {
        container.BorderBottom(2).BorderColor(Colors.Indigo.Medium).PaddingBottom(8).Row(row =>
        {
            row.RelativeItem().Column(col =>
            {
                col.Item().Text("HISAAB").Bold().FontSize(16).FontColor(Colors.Indigo.Darken3);
                col.Item().Text("Personal Finance & Wealth Management System").FontSize(8).FontColor(Colors.Grey.Darken1);
            });
            row.RelativeItem().AlignRight().Column(col =>
            {
                col.Item().Text(reportTitle).Bold().FontSize(11);
                col.Item().Text(periodSubtitle).Bold().FontSize(9).FontColor(Colors.Indigo.Darken2);
            });
        });
    }

    private void ComposeReportFooter(IContainer container)
    {
        var nowKolkata = _dateTimeService.NowInKolkata;
        container.BorderTop(1).BorderColor(Colors.Grey.Lighten2).PaddingTop(6).Row(row =>
        {
            row.RelativeItem().Text($"Generated: {nowKolkata:dd-MMM-yyyy hh:mm tt} IST | Confidential & Proprietary").FontSize(8).FontColor(Colors.Grey.Darken1);
            row.RelativeItem().AlignRight().Text(text =>
            {
                text.Span("Page ").FontSize(8);
                text.CurrentPageNumber().FontSize(8);
                text.Span(" of ").FontSize(8);
                text.TotalPages().FontSize(8);
            });
        });
    }

    private (DateTime startUtc, DateTime endUtc, string display, string fileTag, int totalMonths) ParseDateRange(string? fromMonth, string? toMonth = null)
    {
        var nowKolkata = _dateTimeService.NowInKolkata;
        var defaultMonthStr = nowKolkata.ToString("yyyy-MM");

        var fStr = !string.IsNullOrWhiteSpace(fromMonth) ? fromMonth.Trim() : defaultMonthStr;
        var tStr = !string.IsNullOrWhiteSpace(toMonth) ? toMonth.Trim() : fStr;

        DateTime fromDate;
        if (DateTime.TryParseExact(fStr, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var pFrom))
        {
            fromDate = new DateTime(pFrom.Year, pFrom.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        }
        else if (DateTime.TryParse(fStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dFrom))
        {
            fromDate = new DateTime(dFrom.Year, dFrom.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        }
        else
        {
            fromDate = new DateTime(nowKolkata.Year, nowKolkata.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        }

        DateTime toDate;
        if (DateTime.TryParseExact(tStr, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var pTo))
        {
            toDate = new DateTime(pTo.Year, pTo.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        }
        else if (DateTime.TryParse(tStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dTo))
        {
            toDate = new DateTime(dTo.Year, dTo.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        }
        else
        {
            toDate = fromDate;
        }

        if (fromDate > toDate)
        {
            (fromDate, toDate) = (toDate, fromDate);
        }

        var startUtc = fromDate;
        var endUtc = toDate.AddMonths(1);
        var totalMonths = ((toDate.Year - fromDate.Year) * 12) + toDate.Month - fromDate.Month + 1;

        string display;
        string fileTag;

        if (fromDate.Year == toDate.Year && fromDate.Month == toDate.Month)
        {
            display = fromDate.ToString("MMMM yyyy");
            fileTag = fromDate.ToString("yyyy-MM");
        }
        else if (fromDate.Year == toDate.Year)
        {
            display = $"{fromDate:MMMM} to {toDate:MMMM yyyy}";
            fileTag = $"{fromDate:yyyy-MM}_to_{toDate:yyyy-MM}";
        }
        else
        {
            display = $"{fromDate:MMMM yyyy} to {toDate:MMMM yyyy}";
            fileTag = $"{fromDate:yyyy-MM}_to_{toDate:yyyy-MM}";
        }

        return (startUtc, endUtc, display, fileTag, totalMonths);
    }
}
