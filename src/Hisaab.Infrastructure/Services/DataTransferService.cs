using System.Data;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using CsvHelper;
using CsvHelper.Configuration;
using ExcelDataReader;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.DataTransfer.DTOs;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Hisaab.Infrastructure.Services;

public class DataTransferService : IDataTransferService
{
    private readonly IApplicationDbContext _context;
    private readonly IAuditService _auditService;
    private readonly string _uploadDirectory;

    public DataTransferService(IApplicationDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
        _uploadDirectory = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "uploads", "imports");
        Directory.CreateDirectory(_uploadDirectory);

        // Required for ExcelDataReader on .NET Core
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    public List<string> GetSupportedModules()
    {
        return new List<string>
        {
            "Transactions",
            "LoanAccounts",
            "LoanTransactions",
            "Epfo",
            "Holdings",
            "InvestmentTransactions",
            "Categories"
        };
    }

    public ModuleTemplateMetadata GetModuleMetadata(string module)
    {
        var normalized = NormalizeModuleName(module);
        return normalized switch
        {
            "Transactions" => new ModuleTemplateMetadata(
                "Transactions",
                "Income & Expense Transactions",
                "Import or export your monthly income and expense entries.",
                new List<ModuleFieldDefinition>
                {
                    new("Type", "Type", "Text", true, "Income or Expense (also accepts Cr/Dr, Jama/Kharcha)", "Income", new List<string> { "type", "transaction type", "txntype", "cr/dr", "cr dr", "credit/debit" }, new List<string> { "Income", "Expense" }),
                    new("Amount", "Amount", "Number", true, "Transaction amount in INR", "15000.00", new List<string> { "amount", "amt", "rupees", "value", "rs", "inr", "debit/credit", "balance" }),
                    new("Category", "Category", "Text", true, "Category name (e.g. Salary, Groceries, Rent)", "Salary", new List<string> { "category", "cat", "category name", "head", "expense head", "tag" }),
                    new("Date", "Date", "Date", true, "Transaction date (dd-MM-yyyy)", "05-10-2026", new List<string> { "date", "txn date", "txndate", "transaction date", "dt", "tarikh", "timestamp" }),
                    new("Note", "Note", "Text", false, "Description or remarks", "Monthly salary deposit", new List<string> { "note", "notes", "description", "narration", "remarks", "memo", "particulars" }),
                    new("ExternalId", "External ID", "Text", false, "Optional unique reference for update mode", "TXN-1001", new List<string> { "id", "external id", "ref", "reference", "ref no", "txn id" })
                }),

            "LoanAccounts" => new ModuleTemplateMetadata(
                "LoanAccounts",
                "Loan Accounts (Given / Taken)",
                "Import or export your personal loans, borrowed or lent.",
                new List<ModuleFieldDefinition>
                {
                    new("Name", "Loan Name", "Text", true, "Account name (e.g. Home Loan SBI or Loan to Rahul)", "Personal Loan to Rahul", new List<string> { "name", "account name", "loan name", "title" }),
                    new("Counterparty", "Counterparty", "Text", true, "Borrower or Lender person/entity name", "Rahul Sharma", new List<string> { "counterparty", "person", "borrower", "lender", "party", "party name" }),
                    new("Direction", "Direction", "Text", true, "Given (you lent) or Taken (you borrowed)", "Given", new List<string> { "direction", "loan type", "given/taken", "type" }, new List<string> { "Given", "Taken" }),
                    new("Principal", "Principal Amount", "Number", true, "Principal sanctioned/disbursed amount", "50000.00", new List<string> { "principal", "principal amount", "loan amount", "amount" }),
                    new("InterestRate", "Interest Rate (%)", "Number", false, "Annual interest rate percent (0 if interest-free)", "0.00", new List<string> { "interest rate", "interest %", "roi", "rate" }),
                    new("InterestType", "Interest Type", "Text", false, "None, Simple, or Compound", "None", new List<string> { "interest type", "calculation type" }, new List<string> { "None", "Simple", "Compound" }),
                    new("StartDate", "Start Date", "Date", true, "Date loan was initiated (dd-MM-yyyy)", "01-10-2026", new List<string> { "start date", "open date", "date", "commencement date" }),
                    new("DueDate", "Due Date", "Date", false, "Repayment target date (dd-MM-yyyy)", "31-03-2027", new List<string> { "due date", "maturity date", "end date" }),
                    new("Note", "Note", "Text", false, "Additional notes", "Interest-free emergency loan", new List<string> { "note", "notes", "remarks", "memo" }),
                    new("ExternalId", "External ID", "Text", false, "Optional ID for update mode", "LOAN-101", new List<string> { "id", "external id", "ref", "loan id" })
                }),

            "LoanTransactions" => new ModuleTemplateMetadata(
                "LoanTransactions",
                "Loan Ledger Transactions",
                "Import disbursements, repayments, interest, or penalties against loan accounts.",
                new List<ModuleFieldDefinition>
                {
                    new("LoanAccount", "Loan Account", "Text", true, "Target loan account name or counterparty", "Personal Loan to Rahul", new List<string> { "loan account", "loan", "account name", "loan name", "counterparty" }),
                    new("Kind", "Transaction Kind", "Text", true, "Disburse, Repayment, Interest, or Penalty", "Repayment", new List<string> { "kind", "type", "txn kind", "action" }, new List<string> { "Disburse", "Repayment", "Interest", "Penalty" }),
                    new("Amount", "Amount", "Number", true, "Transaction amount", "10000.00", new List<string> { "amount", "amt", "value", "payment", "repayment" }),
                    new("Date", "Date", "Date", true, "Date of transaction (dd-MM-yyyy)", "15-10-2026", new List<string> { "date", "txn date", "dt", "tarikh" }),
                    new("Note", "Note", "Text", false, "Notes or transaction remarks", "Part repayment via UPI", new List<string> { "note", "notes", "remarks", "particulars" }),
                    new("ExternalId", "External ID", "Text", false, "Optional ID for update mode", "LTX-501", new List<string> { "id", "external id", "ref" })
                }),

            "Epfo" => new ModuleTemplateMetadata(
                "Epfo",
                "EPFO (Provident Fund) Monthly Records",
                "Import or export your monthly employee, employer, pension, and interest entries.",
                new List<ModuleFieldDefinition>
                {
                    new("Month", "Month", "Date", true, "Contribution month (yyyy-MM or 01-MM-yyyy)", "10-2026", new List<string> { "month", "period", "salary month", "epf month", "date" }),
                    new("EmployeeShare", "Employee Share (12%)", "Number", true, "Employee monthly contribution", "9000.00", new List<string> { "employee share", "ee share", "employee contribution", "epf ee", "ee" }),
                    new("EmployerShare", "Employer Share (3.67%)", "Number", true, "Employer EPF contribution", "2752.50", new List<string> { "employer share", "er share", "employer contribution", "epf er", "er" }),
                    new("PensionShare", "Pension Share (8.33%)", "Number", true, "Employer EPS contribution", "6247.50", new List<string> { "pension share", "eps", "pension contribution", "eps share", "pension" }),
                    new("Interest", "Interest Credited", "Number", false, "Annual interest credited by EPFO", "0.00", new List<string> { "interest", "interest credited", "byaj" }),
                    new("Withdrawal", "Withdrawal Amount", "Number", false, "PF advance or withdrawal", "0.00", new List<string> { "withdrawal", "advance", "claim", "withdrawn" }),
                    new("Note", "Note", "Text", false, "Remarks", "October PF slip", new List<string> { "note", "notes", "remarks" }),
                    new("ExternalId", "External ID", "Text", false, "Optional ID", "EPF-2026-10", new List<string> { "id", "external id", "ref" })
                }),

            "Holdings" => new ModuleTemplateMetadata(
                "Holdings",
                "Investment Holdings & Assets",
                "Import or export mutual funds, stocks, FDs, PPF, NPS, gold, etc.",
                new List<ModuleFieldDefinition>
                {
                    new("Name", "Holding Name", "Text", true, "Name of the security or asset", "Nifty 50 Index Fund", new List<string> { "name", "holding name", "scheme", "fund", "stock", "symbol" }),
                    new("Type", "Asset Type", "Text", true, "MutualFund, Stock, FixedDeposit, RecurringDeposit, PPF, NPS, Gold, RealEstate, Crypto, Other", "MutualFund", new List<string> { "type", "asset type", "category", "holding type" }, new List<string> { "MutualFund", "Stock", "FixedDeposit", "RecurringDeposit", "PPF", "NPS", "Gold", "RealEstate", "Crypto", "Other" }),
                    new("InitialInvestedAmount", "Invested Amount", "Number", true, "Initial/Total invested cost in INR", "10000.00", new List<string> { "invested amount", "initial invested amount", "cost", "investment", "invested" }),
                    new("InitialUnits", "Units / Quantity", "Number", false, "Total units held", "50.00", new List<string> { "units", "quantity", "shares", "qty" }),
                    new("CurrentValue", "Current Value", "Number", false, "Current market value in INR", "10500.00", new List<string> { "current value", "market value", "latest value", "nav value" }),
                    new("StartDate", "Start Date", "Date", false, "Investment date (dd-MM-yyyy)", "02-10-2026", new List<string> { "start date", "date", "purchase date" }),
                    new("Note", "Note", "Text", false, "Notes or folio reference", "Monthly SIP via AMC", new List<string> { "note", "notes", "remarks" }),
                    new("ExternalId", "External ID", "Text", false, "Optional ID", "HLD-001", new List<string> { "id", "external id", "ref" })
                }),

            "InvestmentTransactions" => new ModuleTemplateMetadata(
                "InvestmentTransactions",
                "Investment Trade Ledger",
                "Import Buy, Sell, Dividend, or Interest trades against holdings.",
                new List<ModuleFieldDefinition>
                {
                    new("HoldingName", "Holding Name", "Text", true, "Target holding name", "Nifty 50 Index Fund", new List<string> { "holding", "holding name", "scheme", "asset" }),
                    new("Kind", "Transaction Kind", "Text", true, "Buy, Sell, Dividend, Interest, or ValuationUpdate", "Buy", new List<string> { "kind", "type", "action" }, new List<string> { "Buy", "Sell", "Dividend", "Interest", "ValuationUpdate" }),
                    new("Amount", "Amount", "Number", true, "Trade amount in INR", "5000.00", new List<string> { "amount", "amt", "value", "total" }),
                    new("Units", "Units Transacted", "Number", false, "Units bought or sold", "25.00", new List<string> { "units", "quantity", "shares" }),
                    new("Date", "Date", "Date", true, "Trade date (dd-MM-yyyy)", "05-10-2026", new List<string> { "date", "trade date", "txn date", "dt" }),
                    new("UpdatedCurrentValue", "Updated Current Value", "Number", false, "Portfolio value after trade", "15500.00", new List<string> { "updated current value", "current value", "market value" }),
                    new("Note", "Note", "Text", false, "Trade notes", "SIP installment", new List<string> { "note", "notes", "remarks" }),
                    new("ExternalId", "External ID", "Text", false, "Optional ID", "ITX-101", new List<string> { "id", "external id", "ref" })
                }),

            "Categories" => new ModuleTemplateMetadata(
                "Categories",
                "Expense & Income Categories",
                "Import custom user categories with colors and icons.",
                new List<ModuleFieldDefinition>
                {
                    new("Name", "Category Name", "Text", true, "Category display name", "Groceries", new List<string> { "name", "category", "category name", "title" }),
                    new("Type", "Category Type", "Text", true, "Income or Expense", "Expense", new List<string> { "type", "category type" }, new List<string> { "Income", "Expense" }),
                    new("Color", "Color (Hex)", "Text", false, "Hex color code", "#10b981", new List<string> { "color", "hex color", "theme" }),
                    new("Icon", "Icon", "Text", false, "Icon identifier", "shopping-cart", new List<string> { "icon", "symbol" }),
                    new("ExternalId", "External ID", "Text", false, "Optional ID", "CAT-10", new List<string> { "id", "external id", "ref" })
                }),

            _ => throw new ArgumentException($"Unsupported module '{module}'. Supported modules: {string.Join(", ", GetSupportedModules())}")
        };
    }

    public byte[] GenerateBlankTemplate(string module)
    {
        var meta = GetModuleMetadata(module);

        using var workbook = new XLWorkbook();
        var templateSheet = workbook.Worksheets.Add("Template");

        // Header row
        for (int i = 0; i < meta.Fields.Count; i++)
        {
            var field = meta.Fields[i];
            var col = i + 1;
            var headerText = field.IsRequired ? $"{field.Name}*" : field.Name;
            var cell = templateSheet.Cell(1, col);
            cell.Value = headerText;
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Fill.BackgroundColor = XLColor.FromArgb(30, 41, 59); // Slate-800
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
        }

        // Sample row
        for (int i = 0; i < meta.Fields.Count; i++)
        {
            var field = meta.Fields[i];
            var col = i + 1;
            var cell = templateSheet.Cell(2, col);
            cell.Value = field.ExampleValue;
            cell.Style.Font.Italic = true;
            cell.Style.Font.FontColor = XLColor.FromArgb(71, 85, 105);
            cell.Style.Fill.BackgroundColor = XLColor.FromArgb(248, 250, 252);
        }

        templateSheet.Columns().AdjustToContents();

        // Instructions Sheet
        var instrSheet = workbook.Worksheets.Add("Instructions");
        instrSheet.Cell(1, 1).Value = $"{meta.Title} — Import Instructions";
        instrSheet.Cell(1, 1).Style.Font.Bold = true;
        instrSheet.Cell(1, 1).Style.Font.FontSize = 14;

        instrSheet.Cell(2, 1).Value = meta.Description;

        instrSheet.Cell(4, 1).Value = "Field Name";
        instrSheet.Cell(4, 2).Value = "Required?";
        instrSheet.Cell(4, 3).Value = "Data Type";
        instrSheet.Cell(4, 4).Value = "Accepted Values / Format";
        instrSheet.Cell(4, 5).Value = "Description";

        var instrHeaderRow = instrSheet.Range(4, 1, 4, 5);
        instrHeaderRow.Style.Font.Bold = true;
        instrHeaderRow.Style.Fill.BackgroundColor = XLColor.FromArgb(226, 232, 240);

        for (int i = 0; i < meta.Fields.Count; i++)
        {
            var row = 5 + i;
            var field = meta.Fields[i];
            instrSheet.Cell(row, 1).Value = field.Name;
            instrSheet.Cell(row, 2).Value = field.IsRequired ? "Yes (Required)" : "Optional";
            instrSheet.Cell(row, 3).Value = field.DataType;
            instrSheet.Cell(row, 4).Value = field.AllowedValues != null ? string.Join(", ", field.AllowedValues) : field.ExampleValue;
            instrSheet.Cell(row, 5).Value = field.Description;
        }

        instrSheet.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<UploadResultDto> UploadAndInspectFileAsync(
        Stream fileStream,
        string fileName,
        string module,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var meta = GetModuleMetadata(module);

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (ext != ".xlsx" && ext != ".xls" && ext != ".csv")
        {
            throw new ArgumentException("Unsupported file format. Please upload an Excel (.xlsx, .xls) or CSV file.");
        }

        var batchId = Guid.NewGuid();
        var userDir = Path.Combine(_uploadDirectory, userId.ToString());
        Directory.CreateDirectory(userDir);
        var storedPath = Path.Combine(userDir, $"{batchId}_{SanitizeFileName(fileName)}");

        using (var dest = File.Create(storedPath))
        {
            await fileStream.CopyToAsync(dest, cancellationToken);
        }

        // Validate Magic Bytes and Security
        ValidateFileSafety(storedPath, ext);

        // Parse file to get sheet names, headers, sample rows, and suggested mappings
        var (sheets, selectedSheet, headers, sampleRows, totalRows) = InspectFileContent(storedPath, ext);

        // Auto-match user headers to system fields using synonyms
        var suggestedColumnMap = AutoMatchColumns(headers, meta.Fields);

        var batch = new ImportBatch
        {
            Id = batchId,
            UserId = userId,
            Module = meta.Module,
            FileName = fileName,
            StorageKey = storedPath,
            Status = ImportBatchStatus.Pending,
            TotalRows = totalRows,
            SuccessRows = 0,
            FailedRows = 0,
            SkippedRows = 0,
            Mode = ImportMode.AddNewOnly,
            AllOrNothing = false
        };

        _context.ImportBatches.Add(batch);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "ImportFileUploaded",
            "ImportBatch",
            batchId.ToString(),
            $"Uploaded {fileName} ({totalRows} rows) for module {meta.Module}",
            cancellationToken
        );

        return new UploadResultDto(
            batchId,
            meta.Module,
            fileName,
            sheets,
            selectedSheet,
            headers,
            sampleRows,
            totalRows,
            suggestedColumnMap
        );
    }

    public async Task SaveMappingAsync(
        Guid batchId,
        Guid userId,
        MappingRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var batch = await _context.ImportBatches
            .FirstOrDefaultAsync(b => b.Id == batchId && b.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException($"Batch '{batchId}' not found.");

        if (request.Mode.HasValue)
        {
            batch.Mode = request.Mode.Value;
        }
        if (request.AllOrNothing.HasValue)
        {
            batch.AllOrNothing = request.AllOrNothing.Value;
        }

        batch.Status = ImportBatchStatus.Ready;

        // Persist mapping config alongside stored file
        var mappingFilePath = batch.StorageKey + ".mapping.json";
        var mappingJson = JsonSerializer.Serialize(request);
        await File.WriteAllTextAsync(mappingFilePath, mappingJson, cancellationToken);

        // If user asked to save this as a profile, persist to MappingProfile table
        if (!string.IsNullOrWhiteSpace(request.SaveAsProfileName))
        {
            var profile = await _context.MappingProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId && p.Module == batch.Module && p.Name == request.SaveAsProfileName, cancellationToken);

            if (profile == null)
            {
                profile = new MappingProfile
                {
                    UserId = userId,
                    Module = batch.Module,
                    Name = request.SaveAsProfileName,
                    ColumnMapJson = JsonSerializer.Serialize(request.ColumnMap),
                    ValueMapJson = request.ValueMap != null ? JsonSerializer.Serialize(request.ValueMap) : "{}",
                    DateFormat = request.DateFormat ?? "dd-MM-yyyy"
                };
                _context.MappingProfiles.Add(profile);
            }
            else
            {
                profile.ColumnMapJson = JsonSerializer.Serialize(request.ColumnMap);
                profile.ValueMapJson = request.ValueMap != null ? JsonSerializer.Serialize(request.ValueMap) : "{}";
                profile.DateFormat = request.DateFormat ?? profile.DateFormat;
                profile.UpdatedAtUtc = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<PreviewValidationResultDto> ValidateBatchAsync(
        Guid batchId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var batch = await _context.ImportBatches
            .FirstOrDefaultAsync(b => b.Id == batchId && b.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException($"Batch '{batchId}' not found.");

        var meta = GetModuleMetadata(batch.Module);
        var mapping = LoadMappingConfig(batch.StorageKey);

        var ext = Path.GetExtension(batch.StorageKey).ToLowerInvariant();
        var rows = ReadAllRows(batch.StorageKey, ext, maxRows: 50);

        var previewRows = new List<PreviewValidationRowDto>();
        int validCount = 0;
        int invalidCount = 0;
        int duplicateCount = 0;

        for (int i = 0; i < rows.Count; i++)
        {
            var rowNumber = i + 2; // header is row 1
            var raw = rows[i];
            var (mapped, errors, warnings, isDuplicate) = await ValidateSingleRowAsync(raw, rowNumber, meta, mapping, userId, cancellationToken);

            var isValid = errors.Count == 0;
            if (isValid) validCount++; else invalidCount++;
            if (isDuplicate) duplicateCount++;

            previewRows.Add(new PreviewValidationRowDto(
                rowNumber,
                raw,
                mapped,
                isValid,
                isDuplicate,
                errors,
                warnings
            ));
        }

        return new PreviewValidationResultDto(
            batchId,
            previewRows.Count,
            validCount,
            invalidCount,
            duplicateCount,
            previewRows
        );
    }

    public async Task<ImportResultDto> CommitBatchAsync(
        Guid batchId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var batch = await _context.ImportBatches
            .FirstOrDefaultAsync(b => b.Id == batchId && b.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException($"Batch '{batchId}' not found.");

        var meta = GetModuleMetadata(batch.Module);
        var mapping = LoadMappingConfig(batch.StorageKey);

        batch.Status = ImportBatchStatus.Importing;
        await _context.SaveChangesAsync(cancellationToken);

        var ext = Path.GetExtension(batch.StorageKey).ToLowerInvariant();
        var allRows = ReadAllRows(batch.StorageKey, ext);

        int successCount = 0;
        int failedCount = 0;
        int skippedCount = 0;

        var importErrors = new List<ImportError>();
        var entitiesToInsert = new List<object>();

        // Cache existing lookup data in memory for fast resolution
        var categories = await _context.Categories.Where(c => c.UserId == userId || c.IsSystem).ToListAsync(cancellationToken);
        var loans = await _context.LoanAccounts.Where(l => l.UserId == userId).ToListAsync(cancellationToken);
        var holdings = await _context.Holdings.Where(h => h.UserId == userId).ToListAsync(cancellationToken);

        for (int i = 0; i < allRows.Count; i++)
        {
            var rowNumber = i + 2;
            var raw = allRows[i];

            var (mapped, errors, warnings, isDuplicate) = await ValidateSingleRowAsync(raw, rowNumber, meta, mapping, userId, cancellationToken);

            if (errors.Count > 0)
            {
                failedCount++;
                foreach (var err in errors)
                {
                    importErrors.Add(new ImportError
                    {
                        BatchId = batchId,
                        RowNumber = rowNumber,
                        Column = "Row",
                        Value = string.Join("; ", raw.Select(kv => $"{kv.Key}={kv.Value}")),
                        Message = err
                    });
                }
                continue;
            }

            if (isDuplicate && batch.Mode == ImportMode.AddNewOnly)
            {
                skippedCount++;
                continue;
            }

            // Materialize entity for database insertion
            try
            {
                var entity = CreateEntityFromMapped(batch.Module, mapped, batchId, userId, categories, loans, holdings);
                if (entity != null)
                {
                    entitiesToInsert.Add(entity);
                    successCount++;
                }
            }
            catch (Exception ex)
            {
                failedCount++;
                importErrors.Add(new ImportError
                {
                    BatchId = batchId,
                    RowNumber = rowNumber,
                    Column = "EntityCreation",
                    Value = "",
                    Message = ex.Message
                });
            }
        }

        // All or nothing check
        if (batch.AllOrNothing && failedCount > 0)
        {
            batch.Status = ImportBatchStatus.Failed;
            batch.TotalRows = allRows.Count;
            batch.SuccessRows = 0;
            batch.FailedRows = failedCount;
            batch.SkippedRows = 0;
            batch.CompletedAtUtc = DateTime.UtcNow;

            _context.ImportErrors.AddRange(importErrors);
            await _context.SaveChangesAsync(cancellationToken);

            await _auditService.LogAsync(
                "ImportBatchFailedAllOrNothing",
                "ImportBatch",
                batchId.ToString(),
                $"Import aborted: All-or-nothing failed with {failedCount} errors.",
                cancellationToken
            );

            return new ImportResultDto(
                batchId,
                batch.Status,
                batch.Status.ToString(),
                allRows.Count,
                0,
                failedCount,
                0,
                "Import aborted because all-or-nothing mode was selected and some rows had errors."
            );
        }

        // Persist imported entities
        foreach (var item in entitiesToInsert)
        {
            switch (item)
            {
                case Transaction t: _context.Transactions.Add(t); break;
                case LoanAccount l: _context.LoanAccounts.Add(l); break;
                case LoanTransaction lt: _context.LoanTransactions.Add(lt); break;
                case EpfEntry e: _context.EpfEntries.Add(e); break;
                case Holding h: _context.Holdings.Add(h); break;
                case InvestmentTransaction it: _context.InvestmentTransactions.Add(it); break;
                case Category c: _context.Categories.Add(c); break;
            }
        }

        if (importErrors.Count > 0)
        {
            _context.ImportErrors.AddRange(importErrors);
        }

        batch.TotalRows = allRows.Count;
        batch.SuccessRows = successCount;
        batch.FailedRows = failedCount;
        batch.SkippedRows = skippedCount;
        batch.Status = failedCount > 0 && successCount == 0 ? ImportBatchStatus.Failed : ImportBatchStatus.Completed;
        batch.CompletedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "ImportBatchCompleted",
            "ImportBatch",
            batchId.ToString(),
            $"Successfully imported {successCount} rows, failed: {failedCount}, skipped: {skippedCount}",
            cancellationToken
        );

        return new ImportResultDto(
            batchId,
            batch.Status,
            batch.Status.ToString(),
            allRows.Count,
            successCount,
            failedCount,
            skippedCount,
            failedCount > 0 ? $"{failedCount} rows failed validation and were logged." : null
        );
    }

    public async Task<bool> RollbackBatchAsync(
        Guid batchId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var batch = await _context.ImportBatches
            .FirstOrDefaultAsync(b => b.Id == batchId && b.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException($"Batch '{batchId}' not found.");

        if (batch.Status != ImportBatchStatus.Completed)
        {
            throw new InvalidOperationException($"Cannot rollback a batch with status '{batch.Status}'. Only Completed batches can be rolled back.");
        }

        if (batch.CreatedAtUtc < DateTime.UtcNow.AddDays(-7))
        {
            throw new InvalidOperationException("Batches can only be rolled back within 7 days of import.");
        }

        var normalized = NormalizeModuleName(batch.Module);
        int deletedCount = 0;

        switch (normalized)
        {
            case "Transactions":
                var txs = await _context.Transactions.Where(t => t.ImportBatchId == batchId && t.UserId == userId).ToListAsync(cancellationToken);
                _context.Transactions.RemoveRange(txs);
                deletedCount = txs.Count;
                break;

            case "LoanAccounts":
                var loans = await _context.LoanAccounts.Where(l => l.ImportBatchId == batchId && l.UserId == userId).ToListAsync(cancellationToken);
                _context.LoanAccounts.RemoveRange(loans);
                deletedCount = loans.Count;
                break;

            case "LoanTransactions":
                var loanTxs = await _context.LoanTransactions.Where(lt => lt.ImportBatchId == batchId && lt.UserId == userId).ToListAsync(cancellationToken);
                _context.LoanTransactions.RemoveRange(loanTxs);
                deletedCount = loanTxs.Count;
                break;

            case "Epfo":
                var epfs = await _context.EpfEntries.Where(e => e.ImportBatchId == batchId && e.UserId == userId).ToListAsync(cancellationToken);
                _context.EpfEntries.RemoveRange(epfs);
                deletedCount = epfs.Count;
                break;

            case "Holdings":
                var hlds = await _context.Holdings.Where(h => h.ImportBatchId == batchId && h.UserId == userId).ToListAsync(cancellationToken);
                _context.Holdings.RemoveRange(hlds);
                deletedCount = hlds.Count;
                break;

            case "InvestmentTransactions":
                var invTxs = await _context.InvestmentTransactions.Where(it => it.ImportBatchId == batchId && it.UserId == userId).ToListAsync(cancellationToken);
                _context.InvestmentTransactions.RemoveRange(invTxs);
                deletedCount = invTxs.Count;
                break;

            case "Categories":
                var cats = await _context.Categories.Where(c => c.ImportBatchId == batchId && c.UserId == userId).ToListAsync(cancellationToken);
                _context.Categories.RemoveRange(cats);
                deletedCount = cats.Count;
                break;
        }

        batch.Status = ImportBatchStatus.RolledBack;
        batch.RolledBackAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "ImportBatchRolledBack",
            "ImportBatch",
            batchId.ToString(),
            $"Rolled back {deletedCount} items from batch {batch.FileName}",
            cancellationToken
        );

        return true;
    }

    public async Task<byte[]> GenerateErrorReportExcelAsync(
        Guid batchId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var batch = await _context.ImportBatches
            .Include(b => b.Errors)
            .FirstOrDefaultAsync(b => b.Id == batchId && b.UserId == userId, cancellationToken)
            ?? throw new KeyNotFoundException($"Batch '{batchId}' not found.");

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Failed Rows");

        ws.Cell(1, 1).Value = "Row Number";
        ws.Cell(1, 2).Value = "Column";
        ws.Cell(1, 3).Value = "Offending Value / Row Data";
        ws.Cell(1, 4).Value = "Error Reason";

        var headerRange = ws.Range(1, 1, 1, 4);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Fill.BackgroundColor = XLColor.FromArgb(220, 38, 38); // Red-600

        int rowIdx = 2;
        foreach (var err in batch.Errors.OrderBy(e => e.RowNumber))
        {
            ws.Cell(rowIdx, 1).Value = err.RowNumber;
            ws.Cell(rowIdx, 2).Value = err.Column ?? "Row";
            ws.Cell(rowIdx, 3).Value = EscapeFormula(err.Value ?? "");
            ws.Cell(rowIdx, 4).Value = err.Message;
            rowIdx++;
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<(byte[] Content, string ContentType, string FileName)> ExportModuleAsync(
        string module,
        Guid userId,
        string format,
        DateTime? from,
        DateTime? to,
        CancellationToken cancellationToken = default)
    {
        var meta = GetModuleMetadata(module);
        var normalized = NormalizeModuleName(module);
        var isCsv = string.Equals(format, "csv", StringComparison.OrdinalIgnoreCase);

        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
        var baseFileName = $"hisaab_{normalized.ToLowerInvariant()}_{timestamp}";

        // Fetch data
        var rows = await FetchModuleExportRowsAsync(normalized, userId, from, to, cancellationToken);

        if (isCsv)
        {
            using var ms = new MemoryStream();
            using var writer = new StreamWriter(ms, Encoding.UTF8);
            using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture));

            // Write headers (matches import template field names)
            foreach (var field in meta.Fields)
            {
                csv.WriteField(field.Name);
            }
            csv.NextRecord();

            // Write rows with formula injection escaping
            foreach (var r in rows)
            {
                foreach (var field in meta.Fields)
                {
                    var val = r.ContainsKey(field.Name) ? r[field.Name]?.ToString() ?? "" : "";
                    csv.WriteField(EscapeFormula(val));
                }
                csv.NextRecord();
            }

            writer.Flush();
            return (ms.ToArray(), "text/csv", $"{baseFileName}.csv");
        }
        else
        {
            using var workbook = new XLWorkbook();
            var ws = workbook.Worksheets.Add(meta.Title.Length > 30 ? meta.Title.Substring(0, 30) : meta.Title);

            // Headers
            for (int i = 0; i < meta.Fields.Count; i++)
            {
                var field = meta.Fields[i];
                var cell = ws.Cell(1, i + 1);
                cell.Value = field.Name;
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Fill.BackgroundColor = XLColor.FromArgb(30, 41, 59);
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            }

            // Data
            for (int rIdx = 0; rIdx < rows.Count; rIdx++)
            {
                var r = rows[rIdx];
                for (int cIdx = 0; cIdx < meta.Fields.Count; cIdx++)
                {
                    var field = meta.Fields[cIdx];
                    var rawVal = r.ContainsKey(field.Name) ? r[field.Name]?.ToString() ?? "" : "";
                    var cell = ws.Cell(rIdx + 2, cIdx + 1);

                    if (field.DataType == "Number" && decimal.TryParse(rawVal, out var dec))
                    {
                        cell.Value = dec;
                        cell.Style.NumberFormat.Format = "#,##0.00";
                    }
                    else
                    {
                        cell.Value = EscapeFormula(rawVal);
                    }
                }
            }

            ws.Columns().AdjustToContents();

            using var ms = new MemoryStream();
            workbook.SaveAs(ms);
            return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{baseFileName}.xlsx");
        }
    }

    public async Task<(byte[] Content, string ContentType, string FileName)> ExportAllModulesAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        using var workbook = new XLWorkbook();

        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
        var fileName = $"hisaab_full_backup_{timestamp}.xlsx";

        // Info Sheet
        var infoSheet = workbook.Worksheets.Add("Backup Info");
        infoSheet.Cell(1, 1).Value = "Hisaab Financial Backup Archive";
        infoSheet.Cell(1, 1).Style.Font.Bold = true;
        infoSheet.Cell(1, 1).Style.Font.FontSize = 14;

        infoSheet.Cell(2, 1).Value = $"Generated At (UTC): {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}";
        infoSheet.Cell(3, 1).Value = $"User ID: {userId}";

        infoSheet.Cell(5, 1).Value = "Module Name";
        infoSheet.Cell(5, 2).Value = "Total Exported Rows";
        infoSheet.Range(5, 1, 5, 2).Style.Font.Bold = true;
        infoSheet.Range(5, 1, 5, 2).Style.Fill.BackgroundColor = XLColor.FromArgb(226, 232, 240);

        int infoRow = 6;

        foreach (var mod in GetSupportedModules())
        {
            var meta = GetModuleMetadata(mod);
            var rows = await FetchModuleExportRowsAsync(mod, userId, null, null, cancellationToken);

            infoSheet.Cell(infoRow, 1).Value = meta.Title;
            infoSheet.Cell(infoRow, 2).Value = rows.Count;
            infoRow++;

            // Create module sheet
            var sheetTitle = meta.Module.Length > 30 ? meta.Module.Substring(0, 30) : meta.Module;
            var ws = workbook.Worksheets.Add(sheetTitle);

            // Headers
            for (int i = 0; i < meta.Fields.Count; i++)
            {
                var field = meta.Fields[i];
                var cell = ws.Cell(1, i + 1);
                cell.Value = field.Name;
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Fill.BackgroundColor = XLColor.FromArgb(30, 41, 59);
            }

            // Rows
            for (int rIdx = 0; rIdx < rows.Count; rIdx++)
            {
                var r = rows[rIdx];
                for (int cIdx = 0; cIdx < meta.Fields.Count; cIdx++)
                {
                    var field = meta.Fields[cIdx];
                    var rawVal = r.ContainsKey(field.Name) ? r[field.Name]?.ToString() ?? "" : "";
                    var cell = ws.Cell(rIdx + 2, cIdx + 1);

                    if (field.DataType == "Number" && decimal.TryParse(rawVal, out var dec))
                    {
                        cell.Value = dec;
                        cell.Style.NumberFormat.Format = "#,##0.00";
                    }
                    else
                    {
                        cell.Value = EscapeFormula(rawVal);
                    }
                }
            }

            ws.Columns().AdjustToContents();
        }

        infoSheet.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return (ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    #region Private Helper Methods

    private static string NormalizeModuleName(string mod)
    {
        var clean = mod.Trim().ToLowerInvariant();
        return clean switch
        {
            "transactions" or "income-expense" or "incomeexpense" => "Transactions",
            "loanaccounts" or "loans" or "loan" => "LoanAccounts",
            "loantransactions" or "loanledger" or "loan-transactions" => "LoanTransactions",
            "epfo" or "epf" => "Epfo",
            "holdings" or "investments" or "portfolio" => "Holdings",
            "investmenttransactions" or "trades" or "investment-transactions" => "InvestmentTransactions",
            "categories" or "category" => "Categories",
            _ => mod
        };
    }

    private static void ValidateFileSafety(string filePath, string ext)
    {
        var fi = new FileInfo(filePath);
        if (fi.Length > 10 * 1024 * 1024)
        {
            throw new ArgumentException("File exceeds maximum allowed size of 10 MB.");
        }

        using var stream = File.OpenRead(filePath);
        var buffer = new byte[8];
        var read = stream.Read(buffer, 0, buffer.Length);

        // Reject executables (.exe, .dll)
        if (read >= 2 && buffer[0] == 0x4D && buffer[1] == 0x5A) // MZ header
        {
            throw new InvalidOperationException("Executable binary files are strictly prohibited.");
        }

        // For .xlsx, verify zip header PK\x03\x04
        if (ext == ".xlsx")
        {
            if (read >= 4 && (buffer[0] != 0x50 || buffer[1] != 0x4B))
            {
                throw new InvalidOperationException("Invalid Excel file format signature.");
            }
        }
    }

    private static (List<string> sheets, string selectedSheet, List<string> headers, List<Dictionary<string, string>> sampleRows, int totalRows)
        InspectFileContent(string filePath, string ext)
    {
        if (ext == ".csv")
        {
            using var reader = new StreamReader(filePath, Encoding.UTF8);
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture) { HasHeaderRecord = true });

            csv.Read();
            csv.ReadHeader();
            var headers = csv.HeaderRecord?.Select(h => h.Trim()).Where(h => !string.IsNullOrEmpty(h)).ToList() ?? new List<string>();

            var sampleRows = new List<Dictionary<string, string>>();
            int count = 0;

            while (csv.Read())
            {
                count++;
                if (sampleRows.Count < 5)
                {
                    var dict = new Dictionary<string, string>();
                    foreach (var h in headers)
                    {
                        dict[h] = csv.GetField(h) ?? "";
                    }
                    sampleRows.Add(dict);
                }
            }

            return (new List<string> { "Sheet1" }, "Sheet1", headers, sampleRows, count);
        }
        else
        {
            using var stream = File.OpenRead(filePath);
            using var reader = ExcelReaderFactory.CreateReader(stream);
            var ds = reader.AsDataSet(new ExcelDataSetConfiguration
            {
                ConfigureDataTable = _ => new ExcelDataTableConfiguration { UseHeaderRow = true }
            });

            var sheetNames = new List<string>();
            foreach (DataTable dt in ds.Tables)
            {
                sheetNames.Add(dt.TableName);
            }

            var activeSheet = ds.Tables[0];
            var headers = activeSheet.Columns.Cast<DataColumn>().Select(c => c.ColumnName.Trim()).ToList();

            var sampleRows = new List<Dictionary<string, string>>();
            int count = activeSheet.Rows.Count;

            for (int i = 0; i < Math.Min(5, count); i++)
            {
                var dict = new Dictionary<string, string>();
                var row = activeSheet.Rows[i];
                foreach (var h in headers)
                {
                    dict[h] = row[h]?.ToString() ?? "";
                }
                sampleRows.Add(dict);
            }

            return (sheetNames, activeSheet.TableName, headers, sampleRows, count);
        }
    }

    private static Dictionary<string, string> AutoMatchColumns(List<string> userHeaders, List<ModuleFieldDefinition> fields)
    {
        var map = new Dictionary<string, string>();

        foreach (var userH in userHeaders)
        {
            var cleanedUser = Regex.Replace(userH.ToLowerInvariant().Replace("*", "").Trim(), @"[\s_\-]+", "");

            foreach (var field in fields)
            {
                var cleanedField = Regex.Replace(field.Name.ToLowerInvariant(), @"[\s_\-]+", "");
                if (cleanedUser == cleanedField)
                {
                    map[userH] = field.Name;
                    break;
                }

                // Match against synonyms
                if (field.Synonyms.Any(syn => Regex.Replace(syn.ToLowerInvariant(), @"[\s_\-]+", "") == cleanedUser))
                {
                    map[userH] = field.Name;
                    break;
                }
            }
        }

        return map;
    }

    private static List<Dictionary<string, string>> ReadAllRows(string filePath, string ext, int maxRows = 50000)
    {
        var rows = new List<Dictionary<string, string>>();

        if (ext == ".csv")
        {
            using var reader = new StreamReader(filePath, Encoding.UTF8);
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture) { HasHeaderRecord = true });

            csv.Read();
            csv.ReadHeader();
            var headers = csv.HeaderRecord?.Select(h => h.Trim()).Where(h => !string.IsNullOrEmpty(h)).ToList() ?? new List<string>();

            while (csv.Read() && rows.Count < maxRows)
            {
                var dict = new Dictionary<string, string>();
                foreach (var h in headers)
                {
                    dict[h] = csv.GetField(h) ?? "";
                }
                rows.Add(dict);
            }
        }
        else
        {
            using var stream = File.OpenRead(filePath);
            using var reader = ExcelReaderFactory.CreateReader(stream);
            var ds = reader.AsDataSet(new ExcelDataSetConfiguration
            {
                ConfigureDataTable = _ => new ExcelDataTableConfiguration { UseHeaderRow = true }
            });

            var dt = ds.Tables[0];
            var headers = dt.Columns.Cast<DataColumn>().Select(c => c.ColumnName.Trim()).ToList();

            for (int i = 0; i < Math.Min(dt.Rows.Count, maxRows); i++)
            {
                var dict = new Dictionary<string, string>();
                var row = dt.Rows[i];
                foreach (var h in headers)
                {
                    dict[h] = row[h]?.ToString() ?? "";
                }
                rows.Add(dict);
            }
        }

        return rows;
    }

    private static MappingRequestDto LoadMappingConfig(string storageKey)
    {
        var mappingPath = storageKey + ".mapping.json";
        if (File.Exists(mappingPath))
        {
            var json = File.ReadAllText(mappingPath);
            return JsonSerializer.Deserialize<MappingRequestDto>(json) ?? new MappingRequestDto(new());
        }
        return new MappingRequestDto(new());
    }

    private async Task<(Dictionary<string, object?> mapped, List<string> errors, List<string> warnings, bool isDuplicate)>
        ValidateSingleRowAsync(
            Dictionary<string, string> raw,
            int rowNumber,
            ModuleTemplateMetadata meta,
            MappingRequestDto mapping,
            Guid userId,
            CancellationToken ct)
    {
        var mapped = new Dictionary<string, object?>();
        var errors = new List<string>();
        var warnings = new List<string>();
        bool isDuplicate = false;

        // Apply column mapping (user header -> system field)
        foreach (var (userCol, sysField) in mapping.ColumnMap)
        {
            if (string.IsNullOrWhiteSpace(sysField) || sysField == "Ignore") continue;

            if (raw.TryGetValue(userCol, out var rawVal))
            {
                var val = rawVal.Trim();

                // Apply value mapping if defined
                if (mapping.ValueMap != null && mapping.ValueMap.TryGetValue(sysField, out var valMap) && valMap.TryGetValue(val, out var targetVal))
                {
                    val = targetVal;
                }

                mapped[sysField] = val;
            }
        }

        // Check required fields
        foreach (var field in meta.Fields.Where(f => f.IsRequired))
        {
            if (!mapped.ContainsKey(field.Name) || string.IsNullOrWhiteSpace(mapped[field.Name]?.ToString()))
            {
                errors.Add($"Required column '{field.DisplayName}' is missing or empty.");
            }
        }

        // Validate & parse numbers
        foreach (var field in meta.Fields.Where(f => f.DataType == "Number"))
        {
            if (mapped.TryGetValue(field.Name, out var objVal) && objVal != null && !string.IsNullOrWhiteSpace(objVal.ToString()))
            {
                if (TryParseAmount(objVal.ToString()!, out var amount))
                {
                    mapped[field.Name] = amount;
                }
                else
                {
                    errors.Add($"Invalid amount format for '{field.DisplayName}': '{objVal}'.");
                }
            }
        }

        // Validate & parse dates
        foreach (var field in meta.Fields.Where(f => f.DataType == "Date"))
        {
            if (mapped.TryGetValue(field.Name, out var objVal) && objVal != null && !string.IsNullOrWhiteSpace(objVal.ToString()))
            {
                if (TryParseDate(objVal.ToString()!, mapping.DateFormat, out var dt))
                {
                    mapped[field.Name] = dt;
                }
                else
                {
                    errors.Add($"Invalid date format for '{field.DisplayName}': '{objVal}'. Expected {mapping.DateFormat ?? "dd-MM-yyyy"}.");
                }
            }
        }

        // Check duplicate detection in database
        if (errors.Count == 0)
        {
            isDuplicate = await CheckIsDuplicateAsync(meta.Module, mapped, userId, ct);
            if (isDuplicate)
            {
                warnings.Add("Potential duplicate record detected with identical date, amount, and reference.");
            }
        }

        return (mapped, errors, warnings, isDuplicate);
    }

    private static bool TryParseAmount(string input, out decimal result)
    {
        result = 0m;
        if (string.IsNullOrWhiteSpace(input)) return false;

        var clean = input.Trim()
            .Replace("₹", "")
            .Replace("$", "")
            .Replace("Rs.", "", StringComparison.OrdinalIgnoreCase)
            .Replace("Rs", "", StringComparison.OrdinalIgnoreCase)
            .Replace("INR", "", StringComparison.OrdinalIgnoreCase)
            .Replace(",", "")
            .Trim();

        bool isNegative = false;
        if (clean.StartsWith("(") && clean.EndsWith(")"))
        {
            isNegative = true;
            clean = clean.Substring(1, clean.Length - 2).Trim();
        }
        else if (clean.EndsWith("Dr", StringComparison.OrdinalIgnoreCase))
        {
            clean = clean.Substring(0, clean.Length - 2).Trim();
        }
        else if (clean.EndsWith("Cr", StringComparison.OrdinalIgnoreCase))
        {
            clean = clean.Substring(0, clean.Length - 2).Trim();
        }

        if (decimal.TryParse(clean, NumberStyles.Any, CultureInfo.InvariantCulture, out var val))
        {
            result = isNegative ? -Math.Abs(val) : val;
            return true;
        }

        return false;
    }

    private static bool TryParseDate(string input, string? preferredFormat, out DateTime result)
    {
        result = DateTime.MinValue;
        if (string.IsNullOrWhiteSpace(input)) return false;

        var clean = input.Trim();

        // Check Excel numeric serial date (e.g. 45200)
        if (double.TryParse(clean, NumberStyles.Any, CultureInfo.InvariantCulture, out var serial) && serial > 30000 && serial < 80000)
        {
            try
            {
                result = DateTime.FromOADate(serial);
                return true;
            }
            catch { }
        }

        var formats = new List<string>();
        if (!string.IsNullOrWhiteSpace(preferredFormat))
        {
            formats.Add(preferredFormat);
        }

        formats.AddRange(new[]
        {
            "dd-MM-yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "MM/dd/yyyy",
            "d-M-yyyy", "d/M/yyyy", "yyyy/MM/dd", "dd.MM.yyyy",
            "yyyy-MM", "MM-yyyy", "yyyy/MM", "MM/yyyy"
        });

        foreach (var fmt in formats)
        {
            if (DateTime.TryParseExact(clean, fmt, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            {
                result = DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
                return true;
            }
        }

        if (DateTime.TryParse(clean, CultureInfo.InvariantCulture, DateTimeStyles.None, out var generalParsed))
        {
            result = DateTime.SpecifyKind(generalParsed, DateTimeKind.Utc);
            return true;
        }

        return false;
    }

    private async Task<bool> CheckIsDuplicateAsync(string module, Dictionary<string, object?> mapped, Guid userId, CancellationToken ct)
    {
        var normalized = NormalizeModuleName(module);

        switch (normalized)
        {
            case "Transactions":
                if (mapped.TryGetValue("Amount", out var amtObj) && amtObj is decimal amt &&
                    mapped.TryGetValue("Date", out var dtObj) && dtObj is DateTime dt)
                {
                    var start = dt.Date;
                    var end = dt.Date.AddDays(1);
                    return await _context.Transactions.AnyAsync(t =>
                        t.UserId == userId &&
                        t.Amount == amt &&
                        t.TransactionDate >= start && t.TransactionDate < end, ct);
                }
                break;

            case "LoanAccounts":
                if (mapped.TryGetValue("Name", out var nameObj) && nameObj != null)
                {
                    var name = nameObj.ToString()!.Trim();
                    return await _context.LoanAccounts.AnyAsync(l => l.UserId == userId && l.Name.ToLower() == name.ToLower(), ct);
                }
                break;

            case "Epfo":
                if (mapped.TryGetValue("Month", out var monthObj) && monthObj is DateTime m)
                {
                    var startMonth = new DateTime(m.Year, m.Month, 1, 0, 0, 0, DateTimeKind.Utc);
                    return await _context.EpfEntries.AnyAsync(e => e.UserId == userId && e.Month == startMonth, ct);
                }
                break;

            case "Holdings":
                if (mapped.TryGetValue("Name", out var hNameObj) && hNameObj != null)
                {
                    var hName = hNameObj.ToString()!.Trim();
                    return await _context.Holdings.AnyAsync(h => h.UserId == userId && h.Name.ToLower() == hName.ToLower(), ct);
                }
                break;
        }

        return false;
    }

    private object? CreateEntityFromMapped(
        string module,
        Dictionary<string, object?> mapped,
        Guid batchId,
        Guid userId,
        List<Category> categories,
        List<LoanAccount> loans,
        List<Holding> holdings)
    {
        var normalized = NormalizeModuleName(module);

        switch (normalized)
        {
            case "Transactions":
                var typeStr = mapped.GetValueOrDefault("Type")?.ToString() ?? "Expense";
                var txType = typeStr.Equals("Income", StringComparison.OrdinalIgnoreCase) || typeStr == "1" ? TransactionType.Income : TransactionType.Expense;
                var amount = mapped.GetValueOrDefault("Amount") is decimal a ? a : 0m;
                var txDate = mapped.GetValueOrDefault("Date") is DateTime d ? d : DateTime.UtcNow;
                var catName = mapped.GetValueOrDefault("Category")?.ToString()?.Trim() ?? "Other";
                var note = mapped.GetValueOrDefault("Note")?.ToString();

                var category = categories.FirstOrDefault(c => string.Equals(c.Name, catName, StringComparison.OrdinalIgnoreCase));
                if (category == null)
                {
                    category = new Category
                    {
                        UserId = userId,
                        Name = catName,
                        Type = txType,
                        Icon = "tag",
                        Color = "#6366f1",
                        IsSystem = false
                    };
                    _context.Categories.Add(category);
                    categories.Add(category);
                }

                return new Transaction
                {
                    UserId = userId,
                    ImportBatchId = batchId,
                    Type = txType,
                    Amount = amount,
                    CategoryId = category.Id,
                    TransactionDate = DateTime.SpecifyKind(txDate, DateTimeKind.Utc),
                    Note = note
                };

            case "LoanAccounts":
                var loanName = mapped.GetValueOrDefault("Name")?.ToString()?.Trim() ?? "Loan";
                var counterparty = mapped.GetValueOrDefault("Counterparty")?.ToString()?.Trim() ?? "Contact";
                var dirStr = mapped.GetValueOrDefault("Direction")?.ToString() ?? "Given";
                var dir = dirStr.Equals("Taken", StringComparison.OrdinalIgnoreCase) || dirStr == "2" ? LoanDirection.Taken : LoanDirection.Given;
                var principal = mapped.GetValueOrDefault("Principal") is decimal p ? p : 0m;
                var rate = mapped.GetValueOrDefault("InterestRate") is decimal r ? r : 0m;
                var intTypeStr = mapped.GetValueOrDefault("InterestType")?.ToString() ?? "None";
                var intType = intTypeStr.Equals("Simple", StringComparison.OrdinalIgnoreCase) ? LoanInterestType.Simple :
                              intTypeStr.Equals("Compound", StringComparison.OrdinalIgnoreCase) ? LoanInterestType.Compound : LoanInterestType.None;
                var startDate = mapped.GetValueOrDefault("StartDate") is DateTime sd ? sd : DateTime.UtcNow;
                var dueDate = mapped.GetValueOrDefault("DueDate") is DateTime dd ? (DateTime?)dd : null;
                var loanNote = mapped.GetValueOrDefault("Note")?.ToString();

                return new LoanAccount
                {
                    UserId = userId,
                    ImportBatchId = batchId,
                    Name = loanName,
                    Counterparty = counterparty,
                    Direction = dir,
                    Principal = principal,
                    InterestRate = rate,
                    InterestType = intType,
                    StartDate = DateTime.SpecifyKind(startDate, DateTimeKind.Utc),
                    DueDate = dueDate.HasValue ? DateTime.SpecifyKind(dueDate.Value, DateTimeKind.Utc) : null,
                    Note = loanNote,
                    Status = LoanStatus.Active
                };

            case "LoanTransactions":
                var targetLoanName = mapped.GetValueOrDefault("LoanAccount")?.ToString()?.Trim() ?? "";
                var targetLoan = loans.FirstOrDefault(l => string.Equals(l.Name, targetLoanName, StringComparison.OrdinalIgnoreCase) ||
                                                           string.Equals(l.Counterparty, targetLoanName, StringComparison.OrdinalIgnoreCase));
                if (targetLoan == null)
                {
                    throw new InvalidOperationException($"Target loan account '{targetLoanName}' not found. Please create the loan account first.");
                }

                var kindStr = mapped.GetValueOrDefault("Kind")?.ToString() ?? "Repayment";
                var kind = kindStr.Equals("Disburse", StringComparison.OrdinalIgnoreCase) ? LoanTransactionKind.Disburse :
                           kindStr.Equals("Interest", StringComparison.OrdinalIgnoreCase) ? LoanTransactionKind.Interest :
                           kindStr.Equals("Penalty", StringComparison.OrdinalIgnoreCase) ? LoanTransactionKind.Penalty : LoanTransactionKind.Repayment;
                var ltAmount = mapped.GetValueOrDefault("Amount") is decimal lta ? lta : 0m;
                var ltDate = mapped.GetValueOrDefault("Date") is DateTime ltd ? ltd : DateTime.UtcNow;
                var ltNote = mapped.GetValueOrDefault("Note")?.ToString();

                return new LoanTransaction
                {
                    UserId = userId,
                    ImportBatchId = batchId,
                    LoanAccountId = targetLoan.Id,
                    Kind = kind,
                    Amount = ltAmount,
                    TransactionDate = DateTime.SpecifyKind(ltDate, DateTimeKind.Utc),
                    Note = ltNote
                };

            case "Epfo":
                var epfDate = mapped.GetValueOrDefault("Month") is DateTime epfd ? epfd : DateTime.UtcNow;
                var ee = mapped.GetValueOrDefault("EmployeeShare") is decimal eev ? eev : 0m;
                var er = mapped.GetValueOrDefault("EmployerShare") is decimal erv ? erv : 0m;
                var eps = mapped.GetValueOrDefault("PensionShare") is decimal epsv ? epsv : 0m;
                var interest = mapped.GetValueOrDefault("Interest") is decimal iv ? iv : 0m;
                var withdrawal = mapped.GetValueOrDefault("Withdrawal") is decimal wv ? wv : 0m;
                var epfNote = mapped.GetValueOrDefault("Note")?.ToString();

                return new EpfEntry
                {
                    UserId = userId,
                    ImportBatchId = batchId,
                    Month = new DateTime(epfDate.Year, epfDate.Month, 1, 0, 0, 0, DateTimeKind.Utc),
                    EmployeeShare = ee,
                    EmployerShare = er,
                    PensionShare = eps,
                    Interest = interest,
                    Withdrawal = withdrawal,
                    Note = epfNote
                };

            case "Holdings":
                var hName = mapped.GetValueOrDefault("Name")?.ToString()?.Trim() ?? "Holding";
                var typeValStr = mapped.GetValueOrDefault("Type")?.ToString() ?? "MutualFund";
                Enum.TryParse<InvestmentType>(typeValStr, true, out var invType);
                var cost = mapped.GetValueOrDefault("InitialInvestedAmount") is decimal c ? c : 0m;
                var units = mapped.GetValueOrDefault("InitialUnits") is decimal u ? (decimal?)u : null;
                var curVal = mapped.GetValueOrDefault("CurrentValue") is decimal cv ? cv : cost;
                var hDate = mapped.GetValueOrDefault("StartDate") is DateTime hd ? hd : DateTime.UtcNow;
                var hNote = mapped.GetValueOrDefault("Note")?.ToString();

                var newHolding = new Holding
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    ImportBatchId = batchId,
                    Name = hName,
                    Type = invType,
                    CurrentValue = curVal,
                    ValueUpdatedAtUtc = DateTime.UtcNow,
                    Note = hNote
                };

                var initialBuy = new InvestmentTransaction
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    ImportBatchId = batchId,
                    HoldingId = newHolding.Id,
                    Kind = InvestmentTransactionKind.Buy,
                    Amount = cost,
                    Units = units,
                    TransactionDate = DateTime.SpecifyKind(hDate, DateTimeKind.Utc),
                    Note = "Initial asset purchase"
                };

                newHolding.Transactions.Add(initialBuy);
                holdings.Add(newHolding);

                return newHolding;

            case "InvestmentTransactions":
                var holdingTargetName = mapped.GetValueOrDefault("HoldingName")?.ToString()?.Trim() ?? "";
                var holding = holdings.FirstOrDefault(h => string.Equals(h.Name, holdingTargetName, StringComparison.OrdinalIgnoreCase));
                if (holding == null)
                {
                    throw new InvalidOperationException($"Target holding '{holdingTargetName}' not found. Please create the holding first.");
                }

                var itKindStr = mapped.GetValueOrDefault("Kind")?.ToString() ?? "Buy";
                Enum.TryParse<InvestmentTransactionKind>(itKindStr, true, out var itKind);
                var itAmount = mapped.GetValueOrDefault("Amount") is decimal ita ? ita : 0m;
                var itUnits = mapped.GetValueOrDefault("Units") is decimal itu ? (decimal?)itu : null;
                var itDate = mapped.GetValueOrDefault("Date") is DateTime itd ? itd : DateTime.UtcNow;
                var itNote = mapped.GetValueOrDefault("Note")?.ToString();

                return new InvestmentTransaction
                {
                    UserId = userId,
                    ImportBatchId = batchId,
                    HoldingId = holding.Id,
                    Kind = itKind,
                    Amount = itAmount,
                    Units = itUnits,
                    TransactionDate = DateTime.SpecifyKind(itDate, DateTimeKind.Utc),
                    Note = itNote
                };

            case "Categories":
                var catTitle = mapped.GetValueOrDefault("Name")?.ToString()?.Trim() ?? "Category";
                var cTypeStr = mapped.GetValueOrDefault("Type")?.ToString() ?? "Expense";
                var cType = cTypeStr.Equals("Income", StringComparison.OrdinalIgnoreCase) ? TransactionType.Income : TransactionType.Expense;
                var color = mapped.GetValueOrDefault("Color")?.ToString() ?? "#4f46e5";
                var icon = mapped.GetValueOrDefault("Icon")?.ToString() ?? "tag";

                return new Category
                {
                    UserId = userId,
                    ImportBatchId = batchId,
                    Name = catTitle,
                    Type = cType,
                    Color = color,
                    Icon = icon,
                    IsSystem = false
                };
        }

        return null;
    }

    private async Task<List<Dictionary<string, object>>> FetchModuleExportRowsAsync(
        string module,
        Guid userId,
        DateTime? from,
        DateTime? to,
        CancellationToken ct)
    {
        var rows = new List<Dictionary<string, object>>();
        var normalized = NormalizeModuleName(module);

        switch (normalized)
        {
            case "Transactions":
                var txQuery = _context.Transactions
                    .Include(t => t.Category)
                    .Where(t => t.UserId == userId);

                if (from.HasValue) txQuery = txQuery.Where(t => t.TransactionDate >= from.Value);
                if (to.HasValue) txQuery = txQuery.Where(t => t.TransactionDate <= to.Value);

                var txs = await txQuery.OrderByDescending(t => t.TransactionDate).ToListAsync(ct);
                foreach (var t in txs)
                {
                    rows.Add(new Dictionary<string, object>
                    {
                        ["Type"] = t.Type.ToString(),
                        ["Amount"] = t.Amount.ToString("0.00", CultureInfo.InvariantCulture),
                        ["Category"] = t.Category?.Name ?? "General",
                        ["Date"] = t.TransactionDate.ToString("dd-MM-yyyy"),
                        ["Note"] = t.Note ?? "",
                        ["ExternalId"] = t.Id.ToString()
                    });
                }
                break;

            case "LoanAccounts":
                var loanQuery = _context.LoanAccounts.Where(l => l.UserId == userId);
                var loans = await loanQuery.OrderByDescending(l => l.StartDate).ToListAsync(ct);
                foreach (var l in loans)
                {
                    rows.Add(new Dictionary<string, object>
                    {
                        ["Name"] = l.Name,
                        ["Counterparty"] = l.Counterparty,
                        ["Direction"] = l.Direction.ToString(),
                        ["Principal"] = l.Principal.ToString("0.00", CultureInfo.InvariantCulture),
                        ["InterestRate"] = l.InterestRate.ToString("0.00", CultureInfo.InvariantCulture),
                        ["InterestType"] = l.InterestType.ToString(),
                        ["StartDate"] = l.StartDate.ToString("dd-MM-yyyy"),
                        ["DueDate"] = l.DueDate?.ToString("dd-MM-yyyy") ?? "",
                        ["Note"] = l.Note ?? "",
                        ["ExternalId"] = l.Id.ToString()
                    });
                }
                break;

            case "LoanTransactions":
                var ltQuery = _context.LoanTransactions.Include(lt => lt.LoanAccount).Where(lt => lt.UserId == userId);
                var loanTxs = await ltQuery.OrderByDescending(lt => lt.TransactionDate).ToListAsync(ct);
                foreach (var lt in loanTxs)
                {
                    rows.Add(new Dictionary<string, object>
                    {
                        ["LoanAccount"] = lt.LoanAccount?.Name ?? "",
                        ["Kind"] = lt.Kind.ToString(),
                        ["Amount"] = lt.Amount.ToString("0.00", CultureInfo.InvariantCulture),
                        ["Date"] = lt.TransactionDate.ToString("dd-MM-yyyy"),
                        ["Note"] = lt.Note ?? "",
                        ["ExternalId"] = lt.Id.ToString()
                    });
                }
                break;

            case "Epfo":
                var epfs = await _context.EpfEntries.Where(e => e.UserId == userId).OrderByDescending(e => e.Month).ToListAsync(ct);
                foreach (var e in epfs)
                {
                    rows.Add(new Dictionary<string, object>
                    {
                        ["Month"] = e.Month.ToString("MM-yyyy"),
                        ["EmployeeShare"] = e.EmployeeShare.ToString("0.00", CultureInfo.InvariantCulture),
                        ["EmployerShare"] = e.EmployerShare.ToString("0.00", CultureInfo.InvariantCulture),
                        ["PensionShare"] = e.PensionShare.ToString("0.00", CultureInfo.InvariantCulture),
                        ["Interest"] = e.Interest.ToString("0.00", CultureInfo.InvariantCulture),
                        ["Withdrawal"] = e.Withdrawal.ToString("0.00", CultureInfo.InvariantCulture),
                        ["Note"] = e.Note ?? "",
                        ["ExternalId"] = e.Id.ToString()
                    });
                }
                break;

            case "Holdings":
                var hlds = await _context.Holdings
                    .Include(h => h.Transactions)
                    .Where(h => h.UserId == userId)
                    .OrderBy(h => h.Name)
                    .ToListAsync(ct);

                foreach (var h in hlds)
                {
                    var buyTxs = h.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Buy).ToList();
                    var investedAmt = buyTxs.Sum(t => t.Amount);
                    var totalUnits = buyTxs.Sum(t => t.Units ?? 0m);

                    rows.Add(new Dictionary<string, object>
                    {
                        ["Name"] = h.Name,
                        ["Type"] = h.Type.ToString(),
                        ["InitialInvestedAmount"] = (investedAmt > 0 ? investedAmt : h.CurrentValue).ToString("0.00", CultureInfo.InvariantCulture),
                        ["InitialUnits"] = totalUnits > 0 ? totalUnits.ToString("0.000", CultureInfo.InvariantCulture) : "",
                        ["CurrentValue"] = h.CurrentValue.ToString("0.00", CultureInfo.InvariantCulture),
                        ["StartDate"] = h.CreatedAtUtc.ToString("dd-MM-yyyy"),
                        ["Note"] = h.Note ?? "",
                        ["ExternalId"] = h.Id.ToString()
                    });
                }
                break;

            case "InvestmentTransactions":
                var invTxs = await _context.InvestmentTransactions.Include(it => it.Holding).Where(it => it.UserId == userId).OrderByDescending(it => it.TransactionDate).ToListAsync(ct);
                foreach (var it in invTxs)
                {
                    rows.Add(new Dictionary<string, object>
                    {
                        ["HoldingName"] = it.Holding?.Name ?? "",
                        ["Kind"] = it.Kind.ToString(),
                        ["Amount"] = it.Amount.ToString("0.00", CultureInfo.InvariantCulture),
                        ["Units"] = it.Units?.ToString("0.000", CultureInfo.InvariantCulture) ?? "",
                        ["Date"] = it.TransactionDate.ToString("dd-MM-yyyy"),
                        ["UpdatedCurrentValue"] = "",
                        ["Note"] = it.Note ?? "",
                        ["ExternalId"] = it.Id.ToString()
                    });
                }
                break;

            case "Categories":
                var cats = await _context.Categories.Where(c => c.UserId == userId && !c.IsSystem).OrderBy(c => c.Name).ToListAsync(ct);
                foreach (var c in cats)
                {
                    rows.Add(new Dictionary<string, object>
                    {
                        ["Name"] = c.Name,
                        ["Type"] = c.Type.ToString(),
                        ["Color"] = c.Color,
                        ["Icon"] = c.Icon,
                        ["ExternalId"] = c.Id.ToString()
                    });
                }
                break;
        }

        return rows;
    }

    private static string SanitizeFileName(string fileName)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return string.Concat(fileName.Where(c => !invalid.Contains(c))).Replace(" ", "_");
    }

    private static string EscapeFormula(string val)
    {
        if (string.IsNullOrEmpty(val)) return "";
        // Security against formula injection (=, +, -, @, \t, \r)
        if (val.StartsWith("=") || val.StartsWith("+") || val.StartsWith("-") || val.StartsWith("@") || val.StartsWith("\t") || val.StartsWith("\r"))
        {
            return "'" + val;
        }
        return val;
    }

    #endregion
}

