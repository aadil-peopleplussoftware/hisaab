using System.Text;
using System.Text.Json;
using ClosedXML.Excel;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Enums;
using Hisaab.Domain.ValueObjects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Api.Controllers;

[Authorize]
[Route("api/v1/settings")]
public class SettingsController : ApiControllerBase
{
    private readonly IIdentityService _identityService;
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;
    private readonly IDateTimeService _dateTimeService;
    private readonly IDeletionPermissionService _deletionPermissionService;

    public SettingsController(
        IIdentityService identityService,
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IAuditService auditService,
        IDateTimeService dateTimeService,
        IDeletionPermissionService deletionPermissionService)
    {
        _identityService = identityService;
        _context = context;
        _currentUserService = currentUserService;
        _auditService = auditService;
        _dateTimeService = dateTimeService;
        _deletionPermissionService = deletionPermissionService;
    }

    [HttpGet("deletion-permissions")]
    public async Task<IActionResult> GetDeletionPermissions(CancellationToken cancellationToken)
    {
        if (!_currentUserService.UserId.HasValue) return Unauthorized();
        var permissions = await _deletionPermissionService.GetPermissionsAsync(_currentUserService.UserId.Value, cancellationToken);
        return Ok(permissions);
    }

    [HttpPut("deletion-permissions")]
    public async Task<IActionResult> UpdateDeletionPermissions([FromBody] Dictionary<string, bool> permissions, CancellationToken cancellationToken)
    {
        if (!_currentUserService.UserId.HasValue) return Unauthorized();
        var updated = await _deletionPermissionService.UpdatePermissionsAsync(_currentUserService.UserId.Value, permissions, cancellationToken);
        await _auditService.LogAsync("DeletionPermissionsUpdated", "User", _currentUserService.UserId.ToString(), "Updated module deletion permissions", cancellationToken);
        return Ok(updated);
    }

    [HttpGet("preferences")]
    public async Task<IActionResult> GetPreferences(CancellationToken cancellationToken)
    {
        if (!_currentUserService.UserId.HasValue) return Unauthorized();

        var profile = await _identityService.GetProfileAsync(_currentUserService.UserId.Value, cancellationToken);
        if (!profile.Succeeded)
        {
            return NotFound(new { error = profile.Errors.FirstOrDefault() });
        }
        return Ok(profile.Data);
    }

    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreferences([FromBody] UpdatePreferencesRequest request, CancellationToken cancellationToken)
    {
        if (!_currentUserService.UserId.HasValue) return Unauthorized();

        var result = await _identityService.UpdateProfileAsync(
            _currentUserService.UserId.Value,
            request.FullName,
            request.AvatarUrl,
            request.Timezone ?? "Asia/Kolkata",
            request.Locale ?? "en-IN",
            cancellationToken);

        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors });
        }

        await _auditService.LogAsync("UserPreferencesUpdated", "User", _currentUserService.UserId.ToString(), "Updated user profile & locale settings", cancellationToken);
        return Ok(result.Data);
    }

    [HttpGet("export/json")]
    public async Task<IActionResult> ExportAllDataJson(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;

        var categories = await _context.Categories.AsNoTracking().Where(c => c.UserId == userId).ToListAsync(cancellationToken);
        var transactions = await _context.Transactions.AsNoTracking().Where(t => t.UserId == userId).ToListAsync(cancellationToken);
        var loans = await _context.LoanAccounts.AsNoTracking().Include(l => l.Transactions).Where(l => l.UserId == userId).ToListAsync(cancellationToken);
        var epfEntries = await _context.EpfEntries.AsNoTracking().Where(e => e.UserId == userId).ToListAsync(cancellationToken);
        var holdings = await _context.Holdings.AsNoTracking().Include(h => h.Transactions).Where(h => h.UserId == userId).ToListAsync(cancellationToken);

        var exportPackage = new
        {
            ExportMetadata = new
            {
                App = "Hisaab Enterprise Personal Finance",
                Version = "1.0.0",
                ExportedAtUtc = _dateTimeService.UtcNow,
                UserId = userId,
                UserEmail = _currentUserService.Email
            },
            Categories = categories.Select(c => new { c.Id, c.Name, c.Type, c.Icon, c.Color }),
            Transactions = transactions.Select(t => new { t.Id, t.Type, t.Amount, t.CategoryId, t.TransactionDate, t.Note }),
            Loans = loans.Select(l => new
            {
                l.Id,
                l.Name,
                l.Counterparty,
                l.Direction,
                l.Principal,
                l.InterestRate,
                l.InterestType,
                l.StartDate,
                l.DueDate,
                l.Status,
                Transactions = l.Transactions.Select(lt => new { lt.Id, lt.Kind, lt.Amount, lt.TransactionDate, lt.Note })
            }),
            Epfo = epfEntries.Select(e => new { e.Id, e.Month, e.EmployeeShare, e.EmployerShare, e.PensionShare, e.Interest, e.Withdrawal, e.Note }),
            Investments = holdings.Select(h => new
            {
                h.Id,
                h.Name,
                h.Type,
                h.CurrentValue,
                Transactions = h.Transactions.Select(ht => new { ht.Id, ht.Kind, ht.Amount, ht.Units, ht.TransactionDate, ht.Note })
            })
        };

        var json = JsonSerializer.Serialize(exportPackage, new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
        var bytes = Encoding.UTF8.GetBytes(json);

        await _auditService.LogAsync("FullDataExported_JSON", "User", userId.ToString(), "User exported complete JSON archive", cancellationToken);

        return File(bytes, "application/json", $"Hisaab_Complete_Backup_{DateTime.UtcNow:yyyyMMdd_HHmmss}.json");
    }

    [HttpGet("export/excel")]
    public async Task<IActionResult> ExportAllDataExcel(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;

        var transactions = await _context.Transactions.AsNoTracking().Include(t => t.Category).Where(t => t.UserId == userId).OrderByDescending(t => t.TransactionDate).ToListAsync(cancellationToken);
        var loans = await _context.LoanAccounts.AsNoTracking().Include(l => l.Transactions).Where(l => l.UserId == userId).ToListAsync(cancellationToken);
        var epfEntries = await _context.EpfEntries.AsNoTracking().Where(e => e.UserId == userId).OrderBy(e => e.Month).ToListAsync(cancellationToken);
        var holdings = await _context.Holdings.AsNoTracking().Include(h => h.Transactions).Where(h => h.UserId == userId).ToListAsync(cancellationToken);

        using var workbook = new XLWorkbook();

        // Sheet 1: Summary Overview
        var wsOverview = workbook.Worksheets.Add("Overview");
        wsOverview.Cell(1, 1).Value = "Hisaab - Master Financial Data Export";
        wsOverview.Cell(1, 1).Style.Font.Bold = true;
        wsOverview.Cell(1, 1).Style.Font.FontSize = 14;
        wsOverview.Cell(2, 1).Value = $"User ID: {userId} | Generated: {_dateTimeService.NowInKolkata:yyyy-MM-dd HH:mm} IST";

        wsOverview.Cell(4, 1).Value = "Module";
        wsOverview.Cell(4, 2).Value = "Total Records";
        var ovRange = wsOverview.Range(4, 1, 4, 2);
        ovRange.Style.Font.Bold = true;
        ovRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#4F46E5");
        ovRange.Style.Font.FontColor = XLColor.White;

        wsOverview.Cell(5, 1).Value = "Transactions";
        wsOverview.Cell(5, 2).Value = transactions.Count;
        wsOverview.Cell(6, 1).Value = "Loan Accounts";
        wsOverview.Cell(6, 2).Value = loans.Count;
        wsOverview.Cell(7, 1).Value = "EPFO Monthly Records";
        wsOverview.Cell(7, 2).Value = epfEntries.Count;
        wsOverview.Cell(8, 1).Value = "Investment Holdings";
        wsOverview.Cell(8, 2).Value = holdings.Count;
        wsOverview.Columns().AdjustToContents();

        // Sheet 2: Transactions
        var wsTx = workbook.Worksheets.Add("Transactions");
        wsTx.Cell(1, 1).Value = "Date";
        wsTx.Cell(1, 2).Value = "Type";
        wsTx.Cell(1, 3).Value = "Category";
        wsTx.Cell(1, 4).Value = "Amount (INR)";
        wsTx.Cell(1, 5).Value = "Note";
        var txHead = wsTx.Range(1, 1, 1, 5);
        txHead.Style.Font.Bold = true;
        txHead.Style.Fill.BackgroundColor = XLColor.FromHtml("#0D9488");
        txHead.Style.Font.FontColor = XLColor.White;

        int row = 2;
        foreach (var t in transactions)
        {
            wsTx.Cell(row, 1).Value = t.TransactionDate.ToString("yyyy-MM-dd");
            wsTx.Cell(row, 2).Value = t.Type.ToString();
            wsTx.Cell(row, 3).Value = t.Category?.Name ?? "Uncategorized";
            wsTx.Cell(row, 4).Value = t.Amount;
            wsTx.Cell(row, 5).Value = t.Note ?? string.Empty;
            row++;
        }
        wsTx.Columns().AdjustToContents();

        // Sheet 3: Loans
        var wsLoans = workbook.Worksheets.Add("Loans");
        wsLoans.Cell(1, 1).Value = "Name";
        wsLoans.Cell(1, 2).Value = "Counterparty";
        wsLoans.Cell(1, 3).Value = "Direction";
        wsLoans.Cell(1, 4).Value = "Principal";
        wsLoans.Cell(1, 5).Value = "Outstanding";
        wsLoans.Cell(1, 6).Value = "Status";
        var loansHead = wsLoans.Range(1, 1, 1, 6);
        loansHead.Style.Font.Bold = true;
        loansHead.Style.Fill.BackgroundColor = XLColor.FromHtml("#D97706");
        loansHead.Style.Font.FontColor = XLColor.White;

        row = 2;
        foreach (var l in loans)
        {
            var disburse = l.Transactions.Where(t => t.Kind == LoanTransactionKind.Disburse).Sum(t => t.Amount);
            var repayment = l.Transactions.Where(t => t.Kind == LoanTransactionKind.Repayment).Sum(t => t.Amount);
            var interest = l.Transactions.Where(t => t.Kind == LoanTransactionKind.Interest).Sum(t => t.Amount);
            var penalty = l.Transactions.Where(t => t.Kind == LoanTransactionKind.Penalty).Sum(t => t.Amount);
            var outstanding = (disburse + interest + penalty) - repayment;

            wsLoans.Cell(row, 1).Value = l.Name;
            wsLoans.Cell(row, 2).Value = l.Counterparty;
            wsLoans.Cell(row, 3).Value = l.Direction.ToString();
            wsLoans.Cell(row, 4).Value = l.Principal;
            wsLoans.Cell(row, 5).Value = outstanding;
            wsLoans.Cell(row, 6).Value = l.Status.ToString();
            row++;
        }
        wsLoans.Columns().AdjustToContents();

        // Sheet 4: EPFO
        var wsEpf = workbook.Worksheets.Add("EPFO");
        wsEpf.Cell(1, 1).Value = "Month";
        wsEpf.Cell(1, 2).Value = "Employee Share";
        wsEpf.Cell(1, 3).Value = "Employer Share";
        wsEpf.Cell(1, 4).Value = "Pension Share";
        wsEpf.Cell(1, 5).Value = "Interest";
        wsEpf.Cell(1, 6).Value = "Withdrawal";
        var epfHead = wsEpf.Range(1, 1, 1, 6);
        epfHead.Style.Font.Bold = true;
        epfHead.Style.Fill.BackgroundColor = XLColor.FromHtml("#2563EB");
        epfHead.Style.Font.FontColor = XLColor.White;

        row = 2;
        foreach (var e in epfEntries)
        {
            wsEpf.Cell(row, 1).Value = e.Month.ToString("yyyy-MM");
            wsEpf.Cell(row, 2).Value = e.EmployeeShare;
            wsEpf.Cell(row, 3).Value = e.EmployerShare;
            wsEpf.Cell(row, 4).Value = e.PensionShare;
            wsEpf.Cell(row, 5).Value = e.Interest;
            wsEpf.Cell(row, 6).Value = e.Withdrawal;
            row++;
        }
        wsEpf.Columns().AdjustToContents();

        // Sheet 5: Investments
        var wsInv = workbook.Worksheets.Add("Investments");
        wsInv.Cell(1, 1).Value = "Holding";
        wsInv.Cell(1, 2).Value = "Type";
        wsInv.Cell(1, 3).Value = "Invested";
        wsInv.Cell(1, 4).Value = "Current Value";
        wsInv.Cell(1, 5).Value = "Gain / Loss";
        var invHead = wsInv.Range(1, 1, 1, 5);
        invHead.Style.Font.Bold = true;
        invHead.Style.Fill.BackgroundColor = XLColor.FromHtml("#7C3AED");
        invHead.Style.Font.FontColor = XLColor.White;

        row = 2;
        foreach (var h in holdings)
        {
            var bought = h.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Buy).Sum(t => t.Amount);
            var sold = h.Transactions.Where(t => t.Kind == InvestmentTransactionKind.Sell).Sum(t => t.Amount);
            var invested = Math.Max(0m, bought - sold);
            var gain = h.CurrentValue - invested;

            wsInv.Cell(row, 1).Value = h.Name;
            wsInv.Cell(row, 2).Value = h.Type.ToString();
            wsInv.Cell(row, 3).Value = invested;
            wsInv.Cell(row, 4).Value = h.CurrentValue;
            wsInv.Cell(row, 5).Value = gain;
            row++;
        }
        wsInv.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);

        await _auditService.LogAsync("FullDataExported_Excel", "User", userId.ToString(), "User exported complete Excel archive", cancellationToken);

        return File(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Hisaab_All_Data_{DateTime.UtcNow:yyyyMMdd}.xlsx");
    }

    [HttpPost("account/delete")]
    public async Task<IActionResult> DeleteAccount(CancellationToken cancellationToken)
    {
        if (!_currentUserService.UserId.HasValue) return Unauthorized();

        var userId = _currentUserService.UserId.Value;
        var result = await _identityService.DeleteAccountAsync(userId, cancellationToken);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors });
        }

        await _auditService.LogAsync("AccountDeletionRequested", "User", userId.ToString(), "User requested full account deletion", cancellationToken);

        return Ok(new { message = "Your account has been deleted in compliance with data privacy regulations. All sessions revoked." });
    }
}

public record UpdatePreferencesRequest(string FullName, string? AvatarUrl, string? Timezone, string? Locale);
