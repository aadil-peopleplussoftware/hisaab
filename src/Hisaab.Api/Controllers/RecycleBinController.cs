using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.RecycleBin.DTOs;
using Hisaab.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Api.Controllers;

[Authorize]
[Route("api/v1/recycle-bin")]
public class RecycleBinController : ApiControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;
    private readonly IDeletionPermissionService _deletionPermissionService;

    public RecycleBinController(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IAuditService auditService,
        IDeletionPermissionService deletionPermissionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _auditService = auditService;
        _deletionPermissionService = deletionPermissionService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(RecycleBinResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecycleBinItems(
        [FromQuery] string? module = "all",
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.UserId.HasValue) return Unauthorized();
        var userId = _currentUserService.UserId.Value;

        var items = new List<RecycleBinItemDto>();

        // 1. Transactions
        var txList = await _context.Transactions.IgnoreQueryFilters()
            .Include(t => t.Category)
            .Where(t => t.UserId == userId && t.IsDeleted)
            .OrderByDescending(t => t.DeletedAtUtc)
            .ToListAsync(cancellationToken);

        var txItems = txList.Select(t => new RecycleBinItemDto(
            t.Id,
            "Transactions",
            t.Type == TransactionType.Income ? "Income" : "Expense",
            t.Category != null ? $"{t.Category.Name} ({(t.Type == TransactionType.Income ? "Income" : "Expense")})" : "Transaction",
            t.Note,
            t.Amount,
            "INR",
            t.DeletedAtUtc ?? t.UpdatedAtUtc ?? t.CreatedAtUtc,
            t.TransactionDate
        )).ToList();

        // 2. Categories
        var catList = await _context.Categories.IgnoreQueryFilters()
            .Where(c => c.UserId == userId && c.IsDeleted && !c.IsSystem)
            .OrderByDescending(c => c.DeletedAtUtc)
            .ToListAsync(cancellationToken);

        var catItems = catList.Select(c => new RecycleBinItemDto(
            c.Id,
            "Categories",
            c.Type == TransactionType.Income ? "Income Category" : "Expense Category",
            c.Name,
            $"Icon: {c.Icon}, Color: {c.Color}",
            null,
            null,
            c.DeletedAtUtc ?? c.UpdatedAtUtc ?? c.CreatedAtUtc,
            c.CreatedAtUtc
        )).ToList();

        // 3. Loans
        var loanList = await _context.LoanAccounts.IgnoreQueryFilters()
            .Where(l => l.UserId == userId && l.IsDeleted)
            .OrderByDescending(l => l.DeletedAtUtc)
            .ToListAsync(cancellationToken);

        var loanItems = loanList.Select(l => new RecycleBinItemDto(
            l.Id,
            "Loans",
            l.Direction == LoanDirection.Given ? "Loan (Given)" : "Loan (Taken)",
            l.Name,
            $"Counterparty: {l.Counterparty} | Rate: {l.InterestRate}% ({l.InterestType})",
            l.Principal,
            "INR",
            l.DeletedAtUtc ?? l.UpdatedAtUtc ?? l.CreatedAtUtc,
            l.StartDate
        )).ToList();

        var loanTxList = await _context.LoanTransactions.IgnoreQueryFilters()
            .Include(lt => lt.LoanAccount)
            .Where(lt => lt.UserId == userId && lt.IsDeleted)
            .OrderByDescending(lt => lt.DeletedAtUtc)
            .ToListAsync(cancellationToken);

        var loanTxItems = loanTxList.Select(lt => new RecycleBinItemDto(
            lt.Id,
            "Loans",
            $"Loan {lt.Kind}",
            lt.LoanAccount != null ? $"{lt.LoanAccount.Name} - {lt.Kind}" : $"Loan Payment ({lt.Kind})",
            lt.Note,
            lt.Amount,
            "INR",
            lt.DeletedAtUtc ?? lt.UpdatedAtUtc ?? lt.CreatedAtUtc,
            lt.TransactionDate
        )).ToList();

        var allLoanItems = loanItems.Concat(loanTxItems).ToList();

        // 4. EPFO
        var epfList = await _context.EpfEntries.IgnoreQueryFilters()
            .Where(e => e.UserId == userId && e.IsDeleted)
            .OrderByDescending(e => e.DeletedAtUtc)
            .ToListAsync(cancellationToken);

        var epfItems = epfList.Select(e => new RecycleBinItemDto(
            e.Id,
            "Epfo",
            "EPFO Passbook Entry",
            $"EPFO - {e.Month:MMMM yyyy}",
            e.Note ?? $"Employee: ₹{e.EmployeeShare:N0}, Employer: ₹{e.EmployerShare:N0}, Pension: ₹{e.PensionShare:N0}",
            e.EmployeeShare + e.EmployerShare,
            "INR",
            e.DeletedAtUtc ?? e.UpdatedAtUtc ?? e.CreatedAtUtc,
            e.Month
        )).ToList();

        // 5. Investments
        var holdingList = await _context.Holdings.IgnoreQueryFilters()
            .Where(h => h.UserId == userId && h.IsDeleted)
            .OrderByDescending(h => h.DeletedAtUtc)
            .ToListAsync(cancellationToken);

        var holdingItems = holdingList.Select(h => new RecycleBinItemDto(
            h.Id,
            "Investments",
            $"Holding ({h.Type})",
            h.Name,
            h.Note ?? $"Asset Class: {h.Type}",
            h.CurrentValue,
            "INR",
            h.DeletedAtUtc ?? h.UpdatedAtUtc ?? h.CreatedAtUtc,
            h.CreatedAtUtc
        )).ToList();

        var invTxList = await _context.InvestmentTransactions.IgnoreQueryFilters()
            .Include(it => it.Holding)
            .Where(it => it.UserId == userId && it.IsDeleted)
            .OrderByDescending(it => it.DeletedAtUtc)
            .ToListAsync(cancellationToken);

        var invTxItems = invTxList.Select(it => new RecycleBinItemDto(
            it.Id,
            "Investments",
            $"Investment {it.Kind}",
            it.Holding != null ? $"{it.Holding.Name} - {it.Kind}" : $"Investment - {it.Kind}",
            it.Note ?? (it.Units.HasValue ? $"Units: {it.Units.Value}" : null),
            it.Amount,
            "INR",
            it.DeletedAtUtc ?? it.UpdatedAtUtc ?? it.CreatedAtUtc,
            it.TransactionDate
        )).ToList();

        var allInvItems = holdingItems.Concat(invTxItems).ToList();

        // 6. Business
        var bizList = await _context.Businesses.IgnoreQueryFilters()
            .Where(b => b.UserId == userId && b.IsDeleted)
            .OrderByDescending(b => b.DeletedAtUtc)
            .ToListAsync(cancellationToken);

        var bizItems = bizList.Select(b => new RecycleBinItemDto(
            b.Id,
            "Business",
            $"Business ({b.Type})",
            b.Name,
            b.Description ?? b.LegalName ?? $"Currency: {b.Currency}",
            null,
            b.Currency,
            b.DeletedAtUtc ?? b.UpdatedAtUtc ?? b.CreatedAtUtc,
            b.CreatedAtUtc
        )).ToList();

        var bizTxList = await _context.BusinessTransactions.IgnoreQueryFilters()
            .Include(bt => bt.Business)
            .Where(bt => bt.UserId == userId && bt.IsDeleted)
            .OrderByDescending(bt => bt.DeletedAtUtc)
            .ToListAsync(cancellationToken);

        var bizTxItems = bizTxList.Select(bt => new RecycleBinItemDto(
            bt.Id,
            "Business",
            $"Business {bt.Type}",
            bt.Business != null ? $"{bt.Business.Name} - {bt.Counterparty}" : $"Business Txn - {bt.Counterparty}",
            bt.Description ?? $"Invoice: {bt.InvoiceNumber ?? "N/A"} | Category: {bt.Category}",
            bt.TotalAmount,
            bt.Business?.Currency ?? "INR",
            bt.DeletedAtUtc ?? bt.UpdatedAtUtc ?? bt.CreatedAtUtc,
            bt.TransactionDate
        )).ToList();

        var allBizItems = bizItems.Concat(bizTxItems).ToList();

        // Module Counts
        var counts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            ["transactions"] = txItems.Count,
            ["categories"] = catItems.Count,
            ["loans"] = allLoanItems.Count,
            ["epfo"] = epfItems.Count,
            ["investments"] = allInvItems.Count,
            ["business"] = allBizItems.Count,
            ["all"] = txItems.Count + catItems.Count + allLoanItems.Count + epfItems.Count + allInvItems.Count + allBizItems.Count
        };

        // Filter by requested module
        var mod = (module ?? "all").ToLowerInvariant();
        IEnumerable<RecycleBinItemDto> filtered = mod switch
        {
            "transactions" => txItems,
            "categories" => catItems,
            "loans" => allLoanItems,
            "epfo" => epfItems,
            "investments" => allInvItems,
            "business" => allBizItems,
            _ => txItems.Concat(catItems).Concat(allLoanItems).Concat(epfItems).Concat(allInvItems).Concat(allBizItems)
        };

        // Search filter
        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.Trim().ToLowerInvariant();
            filtered = filtered.Where(x =>
                x.Title.ToLowerInvariant().Contains(q) ||
                (x.Description != null && x.Description.ToLowerInvariant().Contains(q)) ||
                x.SubType.ToLowerInvariant().Contains(q) ||
                (x.Amount.HasValue && x.Amount.Value.ToString().Contains(q))
            );
        }

        var allFilteredList = filtered.OrderByDescending(x => x.DeletedAtUtc).ToList();
        var totalCount = allFilteredList.Count;

        var pagedItems = allFilteredList
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(new RecycleBinResponseDto(pagedItems, totalCount, page, pageSize, counts));
    }

    [HttpPost("{module}/{id:guid}/restore")]
    public async Task<IActionResult> RestoreItem(
        [FromRoute] string module,
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        if (!_currentUserService.UserId.HasValue) return Unauthorized();
        var userId = _currentUserService.UserId.Value;

        var mod = module.ToLowerInvariant();
        bool restored = false;
        string itemTitle = string.Empty;

        switch (mod)
        {
            case "transactions":
                var tx = await _context.Transactions.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, cancellationToken);
                if (tx != null)
                {
                    tx.IsDeleted = false;
                    tx.DeletedAtUtc = null;
                    tx.DeletedBy = null;
                    // If category is soft-deleted, auto-restore category as well
                    var cat = await _context.Categories.IgnoreQueryFilters()
                        .FirstOrDefaultAsync(c => c.Id == tx.CategoryId, cancellationToken);
                    if (cat != null && cat.IsDeleted)
                    {
                        cat.IsDeleted = false;
                        cat.DeletedAtUtc = null;
                        cat.DeletedBy = null;
                    }
                    restored = true;
                    itemTitle = $"Transaction ({tx.Amount})";
                }
                break;

            case "categories":
                var cItem = await _context.Categories.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId, cancellationToken);
                if (cItem != null)
                {
                    cItem.IsDeleted = false;
                    cItem.DeletedAtUtc = null;
                    cItem.DeletedBy = null;
                    restored = true;
                    itemTitle = $"Category '{cItem.Name}'";
                }
                break;

            case "loans":
                var loan = await _context.LoanAccounts.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(l => l.Id == id && l.UserId == userId, cancellationToken);
                if (loan != null)
                {
                    loan.IsDeleted = false;
                    loan.DeletedAtUtc = null;
                    loan.DeletedBy = null;
                    restored = true;
                    itemTitle = $"Loan '{loan.Name}'";
                }
                else
                {
                    var loanTx = await _context.LoanTransactions.IgnoreQueryFilters()
                        .FirstOrDefaultAsync(lt => lt.Id == id && lt.UserId == userId, cancellationToken);
                    if (loanTx != null)
                    {
                        loanTx.IsDeleted = false;
                        loanTx.DeletedAtUtc = null;
                        loanTx.DeletedBy = null;
                        // Restore parent loan if deleted
                        var parentLoan = await _context.LoanAccounts.IgnoreQueryFilters()
                            .FirstOrDefaultAsync(l => l.Id == loanTx.LoanAccountId, cancellationToken);
                        if (parentLoan != null && parentLoan.IsDeleted)
                        {
                            parentLoan.IsDeleted = false;
                            parentLoan.DeletedAtUtc = null;
                            parentLoan.DeletedBy = null;
                        }
                        restored = true;
                        itemTitle = $"Loan Transaction ({loanTx.Amount})";
                    }
                }
                break;

            case "epfo":
                var epf = await _context.EpfEntries.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId, cancellationToken);
                if (epf != null)
                {
                    epf.IsDeleted = false;
                    epf.DeletedAtUtc = null;
                    epf.DeletedBy = null;
                    restored = true;
                    itemTitle = $"EPFO {epf.Month:MMM yyyy}";
                }
                break;

            case "investments":
                var holding = await _context.Holdings.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(h => h.Id == id && h.UserId == userId, cancellationToken);
                if (holding != null)
                {
                    holding.IsDeleted = false;
                    holding.DeletedAtUtc = null;
                    holding.DeletedBy = null;
                    restored = true;
                    itemTitle = $"Holding '{holding.Name}'";
                }
                else
                {
                    var invTx = await _context.InvestmentTransactions.IgnoreQueryFilters()
                        .FirstOrDefaultAsync(it => it.Id == id && it.UserId == userId, cancellationToken);
                    if (invTx != null)
                    {
                        invTx.IsDeleted = false;
                        invTx.DeletedAtUtc = null;
                        invTx.DeletedBy = null;
                        // Restore parent holding if deleted
                        var parentHolding = await _context.Holdings.IgnoreQueryFilters()
                            .FirstOrDefaultAsync(h => h.Id == invTx.HoldingId, cancellationToken);
                        if (parentHolding != null && parentHolding.IsDeleted)
                        {
                            parentHolding.IsDeleted = false;
                            parentHolding.DeletedAtUtc = null;
                            parentHolding.DeletedBy = null;
                        }
                        restored = true;
                        itemTitle = $"Investment Transaction ({invTx.Amount})";
                    }
                }
                break;

            case "business":
                var biz = await _context.Businesses.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId, cancellationToken);
                if (biz != null)
                {
                    biz.IsDeleted = false;
                    biz.DeletedAtUtc = null;
                    biz.DeletedBy = null;
                    restored = true;
                    itemTitle = $"Business '{biz.Name}'";
                }
                else
                {
                    var bizTx = await _context.BusinessTransactions.IgnoreQueryFilters()
                        .FirstOrDefaultAsync(bt => bt.Id == id && bt.UserId == userId, cancellationToken);
                    if (bizTx != null)
                    {
                        bizTx.IsDeleted = false;
                        bizTx.DeletedAtUtc = null;
                        bizTx.DeletedBy = null;
                        // Restore parent business if deleted
                        var parentBiz = await _context.Businesses.IgnoreQueryFilters()
                            .FirstOrDefaultAsync(b => b.Id == bizTx.BusinessId, cancellationToken);
                        if (parentBiz != null && parentBiz.IsDeleted)
                        {
                            parentBiz.IsDeleted = false;
                            parentBiz.DeletedAtUtc = null;
                            parentBiz.DeletedBy = null;
                        }
                        restored = true;
                        itemTitle = $"Business Transaction ({bizTx.TotalAmount})";
                    }
                }
                break;

            default:
                return BadRequest(new { error = $"Unknown module '{module}'." });
        }

        if (!restored)
        {
            return NotFound(new { error = "Item not found in Recycle Bin." });
        }

        await _context.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("RecycleBinRestore", module, id.ToString(), $"Restored {itemTitle} from recycle bin", cancellationToken);

        return Ok(new { message = $"Successfully restored {itemTitle}." });
    }

    [HttpDelete("{module}/{id:guid}/permanent")]
    public async Task<IActionResult> PermanentDeleteItem(
        [FromRoute] string module,
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        if (!_currentUserService.UserId.HasValue) return Unauthorized();
        var userId = _currentUserService.UserId.Value;

        var mod = module.ToLowerInvariant();
        int affected = 0;

        switch (mod)
        {
            case "transactions":
                affected = await _context.Transactions.IgnoreQueryFilters()
                    .Where(t => t.Id == id && t.UserId == userId)
                    .ExecuteDeleteAsync(cancellationToken);
                break;

            case "categories":
                var hasReferencingTx = await _context.Transactions.IgnoreQueryFilters()
                    .AnyAsync(t => t.CategoryId == id, cancellationToken);
                if (hasReferencingTx)
                {
                    return BadRequest(new { error = "Cannot permanently delete category because transactions are still associated with it. Please delete or reassign those transactions first." });
                }
                affected = await _context.Categories.IgnoreQueryFilters()
                    .Where(c => c.Id == id && c.UserId == userId && !c.IsSystem)
                    .ExecuteDeleteAsync(cancellationToken);
                break;

            case "loans":
                // Try deleting loan account first (and child transactions)
                var loanExists = await _context.LoanAccounts.IgnoreQueryFilters()
                    .AnyAsync(l => l.Id == id && l.UserId == userId, cancellationToken);
                if (loanExists)
                {
                    await _context.LoanTransactions.IgnoreQueryFilters()
                        .Where(lt => lt.LoanAccountId == id && lt.UserId == userId)
                        .ExecuteDeleteAsync(cancellationToken);
                    affected = await _context.LoanAccounts.IgnoreQueryFilters()
                        .Where(l => l.Id == id && l.UserId == userId)
                        .ExecuteDeleteAsync(cancellationToken);
                }
                else
                {
                    affected = await _context.LoanTransactions.IgnoreQueryFilters()
                        .Where(lt => lt.Id == id && lt.UserId == userId)
                        .ExecuteDeleteAsync(cancellationToken);
                }
                break;

            case "epfo":
                affected = await _context.EpfEntries.IgnoreQueryFilters()
                    .Where(e => e.Id == id && e.UserId == userId)
                    .ExecuteDeleteAsync(cancellationToken);
                break;

            case "investments":
                var holdingExists = await _context.Holdings.IgnoreQueryFilters()
                    .AnyAsync(h => h.Id == id && h.UserId == userId, cancellationToken);
                if (holdingExists)
                {
                    await _context.InvestmentTransactions.IgnoreQueryFilters()
                        .Where(it => it.HoldingId == id && it.UserId == userId)
                        .ExecuteDeleteAsync(cancellationToken);
                    affected = await _context.Holdings.IgnoreQueryFilters()
                        .Where(h => h.Id == id && h.UserId == userId)
                        .ExecuteDeleteAsync(cancellationToken);
                }
                else
                {
                    affected = await _context.InvestmentTransactions.IgnoreQueryFilters()
                        .Where(it => it.Id == id && it.UserId == userId)
                        .ExecuteDeleteAsync(cancellationToken);
                }
                break;

            case "business":
                var bizExists = await _context.Businesses.IgnoreQueryFilters()
                    .AnyAsync(b => b.Id == id && b.UserId == userId, cancellationToken);
                if (bizExists)
                {
                    await _context.BusinessTransactions.IgnoreQueryFilters()
                        .Where(bt => bt.BusinessId == id && bt.UserId == userId)
                        .ExecuteDeleteAsync(cancellationToken);
                    affected = await _context.Businesses.IgnoreQueryFilters()
                        .Where(b => b.Id == id && b.UserId == userId)
                        .ExecuteDeleteAsync(cancellationToken);
                }
                else
                {
                    affected = await _context.BusinessTransactions.IgnoreQueryFilters()
                        .Where(bt => bt.Id == id && bt.UserId == userId)
                        .ExecuteDeleteAsync(cancellationToken);
                }
                break;

            default:
                return BadRequest(new { error = $"Unknown module '{module}'." });
        }

        if (affected == 0)
        {
            return NotFound(new { error = "Record not found or already permanently deleted." });
        }

        await _auditService.LogAsync("RecycleBinPermanentDelete", module, id.ToString(), $"Permanently purged {module} record from database", cancellationToken);

        return Ok(new { message = "Item permanently deleted from database." });
    }

    [HttpDelete("empty")]
    public async Task<IActionResult> EmptyRecycleBin(
        [FromQuery] string? module = null,
        CancellationToken cancellationToken = default)
    {
        if (!_currentUserService.UserId.HasValue) return Unauthorized();
        var userId = _currentUserService.UserId.Value;

        var mod = (module ?? "all").ToLowerInvariant();
        int totalDeleted = 0;

        if (mod == "all" || mod == "transactions")
        {
            totalDeleted += await _context.Transactions.IgnoreQueryFilters()
                .Where(t => t.UserId == userId && t.IsDeleted)
                .ExecuteDeleteAsync(cancellationToken);
        }

        if (mod == "all" || mod == "categories")
        {
            // Only delete categories not referenced by any transactions
            var candidateCatIds = await _context.Categories.IgnoreQueryFilters()
                .Where(c => c.UserId == userId && c.IsDeleted && !c.IsSystem)
                .Select(c => c.Id)
                .ToListAsync(cancellationToken);

            var referencedCatIds = await _context.Transactions.IgnoreQueryFilters()
                .Where(t => candidateCatIds.Contains(t.CategoryId))
                .Select(t => t.CategoryId)
                .Distinct()
                .ToListAsync(cancellationToken);

            var safeCatIds = candidateCatIds.Except(referencedCatIds).ToList();
            if (safeCatIds.Count > 0)
            {
                totalDeleted += await _context.Categories.IgnoreQueryFilters()
                    .Where(c => safeCatIds.Contains(c.Id))
                    .ExecuteDeleteAsync(cancellationToken);
            }
        }

        if (mod == "all" || mod == "loans")
        {
            totalDeleted += await _context.LoanTransactions.IgnoreQueryFilters()
                .Where(lt => lt.UserId == userId && lt.IsDeleted)
                .ExecuteDeleteAsync(cancellationToken);

            totalDeleted += await _context.LoanAccounts.IgnoreQueryFilters()
                .Where(l => l.UserId == userId && l.IsDeleted)
                .ExecuteDeleteAsync(cancellationToken);
        }

        if (mod == "all" || mod == "epfo")
        {
            totalDeleted += await _context.EpfEntries.IgnoreQueryFilters()
                .Where(e => e.UserId == userId && e.IsDeleted)
                .ExecuteDeleteAsync(cancellationToken);
        }

        if (mod == "all" || mod == "investments")
        {
            totalDeleted += await _context.InvestmentTransactions.IgnoreQueryFilters()
                .Where(it => it.UserId == userId && it.IsDeleted)
                .ExecuteDeleteAsync(cancellationToken);

            totalDeleted += await _context.Holdings.IgnoreQueryFilters()
                .Where(h => h.UserId == userId && h.IsDeleted)
                .ExecuteDeleteAsync(cancellationToken);
        }

        if (mod == "all" || mod == "business")
        {
            totalDeleted += await _context.BusinessTransactions.IgnoreQueryFilters()
                .Where(bt => bt.UserId == userId && bt.IsDeleted)
                .ExecuteDeleteAsync(cancellationToken);

            totalDeleted += await _context.Businesses.IgnoreQueryFilters()
                .Where(b => b.UserId == userId && b.IsDeleted)
                .ExecuteDeleteAsync(cancellationToken);
        }

        await _auditService.LogAsync("RecycleBinEmptied", mod, userId.ToString(), $"Purged {totalDeleted} records from recycle bin", cancellationToken);

        return Ok(new { message = $"Recycle bin emptied. {totalDeleted} record(s) permanently removed.", purgedCount = totalDeleted });
    }
}

