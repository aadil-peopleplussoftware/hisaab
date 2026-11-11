using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Api.Controllers;

[Authorize]
[Route("api/v1/khata")]
[ApiController]
public class KhataController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public KhataController(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    private Guid RequireUserId()
    {
        return _currentUserService.UserId ?? throw new UnauthorizedAccessException("User is not authenticated.");
    }

    #region Parties & Entries

    [HttpGet("parties")]
    public async Task<IActionResult> GetParties([FromQuery] string? search, [FromQuery] string? type, CancellationToken ct)
    {
        var userId = RequireUserId();
        var query = _context.LocalKhataParties
            .AsNoTracking()
            .Where(p => p.UserId == userId && !p.IsDeleted);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(s) || (p.Phone != null && p.Phone.Contains(s)) || (p.Notes != null && p.Notes.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            query = query.Where(p => p.Type.ToLower() == type.Trim().ToLower());
        }

        var parties = await query
            .Include(p => p.Entries.Where(e => !e.IsDeleted))
            .OrderByDescending(p => p.CreatedAtUtc)
            .ToListAsync(ct);

        var response = parties.Select(p =>
        {
            var activeEntries = p.Entries.Where(e => !e.IsDeleted).ToList();
            var totalIn = activeEntries.Where(e => e.EntryType == "IN").Sum(e => e.Amount);
            var totalOut = activeEntries.Where(e => e.EntryType == "OUT").Sum(e => e.Amount);
            var netPending = p.Type == "Payable" ? (totalIn - totalOut) : (totalOut - totalIn);
            var lastEntry = activeEntries.OrderByDescending(e => e.Date).FirstOrDefault();

            return new
            {
                p.Id,
                p.Name,
                p.Phone,
                p.Type,
                p.Category,
                p.Notes,
                p.IsSettled,
                p.IsArchived,
                p.CreatedAtUtc,
                TotalIn = totalIn,
                TotalOut = totalOut,
                NetPending = netPending,
                EntriesCount = activeEntries.Count,
                LastTransactionDate = lastEntry?.Date ?? p.CreatedAtUtc
            };
        }).ToList();

        var totalDenaHai = response.Where(p => p.Type == "Payable" && p.NetPending > 0).Sum(p => p.NetPending);
        var totalLenaHai = response.Where(p => p.Type == "Receivable" && p.NetPending > 0).Sum(p => p.NetPending);

        return Ok(new
        {
            parties = response,
            summary = new
            {
                totalParties = response.Count,
                totalDenaHai,
                totalLenaHai,
                netBalance = totalLenaHai - totalDenaHai
            }
        });
    }

    [HttpGet("parties/{id:guid}")]
    public async Task<IActionResult> GetPartyById(Guid id, CancellationToken ct)
    {
        var userId = RequireUserId();
        var party = await _context.LocalKhataParties
            .AsNoTracking()
            .Include(p => p.Entries.Where(e => !e.IsDeleted))
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId && !p.IsDeleted, ct);

        if (party == null) return NotFound(new { message = "Party not found" });

        var entries = party.Entries
            .Where(e => !e.IsDeleted)
            .OrderBy(e => e.Date)
            .ThenBy(e => e.CreatedAtUtc)
            .ToList();

        decimal running = 0;
        var entriesWithBalance = entries.Select(e =>
        {
            if (party.Type == "Payable")
            {
                if (e.EntryType == "IN") running += e.Amount;
                else running -= e.Amount;
            }
            else
            {
                if (e.EntryType == "OUT") running += e.Amount;
                else running -= e.Amount;
            }

            return new
            {
                e.Id,
                e.PartyId,
                e.EntryType,
                e.Amount,
                e.Date,
                e.Category,
                e.Remark,
                e.PaymentMode,
                RunningBalance = running
            };
        }).ToList();

        var totalIn = entries.Where(e => e.EntryType == "IN").Sum(e => e.Amount);
        var totalOut = entries.Where(e => e.EntryType == "OUT").Sum(e => e.Amount);
        var netPending = party.Type == "Payable" ? (totalIn - totalOut) : (totalOut - totalIn);

        return Ok(new
        {
            party.Id,
            party.Name,
            party.Phone,
            party.Type,
            party.Category,
            party.Notes,
            party.IsSettled,
            party.IsArchived,
            party.CreatedAtUtc,
            TotalIn = totalIn,
            TotalOut = totalOut,
            NetPending = netPending,
            Entries = entriesWithBalance.OrderByDescending(e => e.Date).ToList()
        });
    }

    public record CreatePartyDto(string Name, string? Phone, string? Type, string? Category, string? Notes, decimal? InitialAmount, string? InitialType, string? InitialRemark);

    [HttpPost("parties")]
    public async Task<IActionResult> CreateParty([FromBody] CreatePartyDto dto, CancellationToken ct)
    {
        var userId = RequireUserId();
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest(new { message = "Name is required." });

        var party = new LocalKhataParty
        {
            UserId = userId,
            Name = dto.Name.Trim(),
            Phone = dto.Phone?.Trim(),
            Type = dto.Type?.Trim() == "Receivable" ? "Receivable" : "Payable",
            Category = dto.Category?.Trim() ?? "General",
            Notes = dto.Notes?.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        if (dto.InitialAmount.HasValue && dto.InitialAmount.Value > 0)
        {
            var initialEntry = new LocalKhataEntry
            {
                UserId = userId,
                PartyId = party.Id,
                EntryType = dto.InitialType?.ToUpperInvariant() == "OUT" ? "OUT" : "IN",
                Amount = dto.InitialAmount.Value,
                Date = DateTime.UtcNow,
                Category = "Initial / Loan",
                Remark = dto.InitialRemark ?? "Starting balance / Loan",
                PaymentMode = "Cash",
                CreatedAtUtc = DateTime.UtcNow
            };
            party.Entries.Add(initialEntry);
        }

        _context.LocalKhataParties.Add(party);
        await _context.SaveChangesAsync(ct);

        return Ok(new { message = "Party created successfully", id = party.Id });
    }

    public record UpdatePartyDto(string Name, string? Phone, string? Type, string? Category, string? Notes, bool? IsSettled);

    [HttpPut("parties/{id:guid}")]
    public async Task<IActionResult> UpdateParty(Guid id, [FromBody] UpdatePartyDto dto, CancellationToken ct)
    {
        var userId = RequireUserId();
        var party = await _context.LocalKhataParties
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId && !p.IsDeleted, ct);

        if (party == null) return NotFound(new { message = "Party not found" });

        if (!string.IsNullOrWhiteSpace(dto.Name)) party.Name = dto.Name.Trim();
        if (dto.Phone != null) party.Phone = dto.Phone.Trim();
        if (dto.Type != null) party.Type = dto.Type.Trim();
        if (dto.Category != null) party.Category = dto.Category.Trim();
        if (dto.Notes != null) party.Notes = dto.Notes.Trim();
        if (dto.IsSettled.HasValue) party.IsSettled = dto.IsSettled.Value;
        party.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Party updated successfully" });
    }

    [HttpDelete("parties/{id:guid}")]
    public async Task<IActionResult> DeleteParty(Guid id, CancellationToken ct)
    {
        var userId = RequireUserId();
        var party = await _context.LocalKhataParties
            .Include(p => p.Entries)
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId && !p.IsDeleted, ct);

        if (party == null) return NotFound(new { message = "Party not found" });

        party.IsDeleted = true;
        party.DeletedAtUtc = DateTime.UtcNow;
        party.DeletedBy = userId;

        foreach (var entry in party.Entries)
        {
            entry.IsDeleted = true;
            entry.DeletedAtUtc = DateTime.UtcNow;
            entry.DeletedBy = userId;
        }

        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Party deleted successfully" });
    }

    public record AddEntryDto(string EntryType, decimal Amount, DateTime? Date, string? Category, string? Remark, string? PaymentMode);

    [HttpPost("parties/{partyId:guid}/entries")]
    public async Task<IActionResult> AddEntry(Guid partyId, [FromBody] AddEntryDto dto, CancellationToken ct)
    {
        var userId = RequireUserId();
        var party = await _context.LocalKhataParties
            .FirstOrDefaultAsync(p => p.Id == partyId && p.UserId == userId && !p.IsDeleted, ct);

        if (party == null) return NotFound(new { message = "Party not found" });
        if (dto.Amount <= 0) return BadRequest(new { message = "Amount must be greater than zero." });

        var entry = new LocalKhataEntry
        {
            UserId = userId,
            PartyId = partyId,
            EntryType = dto.EntryType?.ToUpperInvariant() == "OUT" ? "OUT" : "IN",
            Amount = dto.Amount,
            Date = dto.Date ?? DateTime.UtcNow,
            Category = string.IsNullOrWhiteSpace(dto.Category) ? "General" : dto.Category.Trim(),
            Remark = dto.Remark?.Trim(),
            PaymentMode = string.IsNullOrWhiteSpace(dto.PaymentMode) ? "Cash" : dto.PaymentMode.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.LocalKhataEntries.Add(entry);
        party.UpdatedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return Ok(new { message = "Entry recorded successfully", id = entry.Id });
    }

    [HttpDelete("entries/{id:guid}")]
    public async Task<IActionResult> DeleteEntry(Guid id, CancellationToken ct)
    {
        var userId = RequireUserId();
        var entry = await _context.LocalKhataEntries
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId && !e.IsDeleted, ct);

        if (entry == null) return NotFound(new { message = "Entry not found" });

        entry.IsDeleted = true;
        entry.DeletedAtUtc = DateTime.UtcNow;
        entry.DeletedBy = userId;

        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Entry deleted successfully" });
    }

    public record UpdateEntryDto(string? EntryType, decimal? Amount, DateTime? Date, string? Category, string? Remark, string? PaymentMode);

    [HttpPut("entries/{id:guid}")]
    public async Task<IActionResult> UpdateEntry(Guid id, [FromBody] UpdateEntryDto dto, CancellationToken ct)
    {
        var userId = RequireUserId();
        var entry = await _context.LocalKhataEntries
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId && !e.IsDeleted, ct);

        if (entry == null) return NotFound(new { message = "Entry not found" });

        if (dto.Amount.HasValue && dto.Amount.Value > 0) entry.Amount = dto.Amount.Value;
        if (!string.IsNullOrWhiteSpace(dto.EntryType)) entry.EntryType = dto.EntryType.ToUpperInvariant() == "OUT" ? "OUT" : "IN";
        if (dto.Date.HasValue) entry.Date = dto.Date.Value;
        if (dto.Category != null) entry.Category = dto.Category.Trim();
        if (dto.Remark != null) entry.Remark = dto.Remark.Trim();
        if (dto.PaymentMode != null) entry.PaymentMode = dto.PaymentMode.Trim();
        entry.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Entry updated successfully" });
    }

    #endregion

    #region Liquidity & Settlement Engine (Matches Image 1)

    [HttpGet("liquidity")]
    public async Task<IActionResult> GetLiquiditySummary([FromQuery] decimal? adjustments, CancellationToken ct)
    {
        var userId = RequireUserId();

        // 1. Calculate pending debts / receivables
        var parties = await _context.LocalKhataParties
            .AsNoTracking()
            .Where(p => p.UserId == userId && !p.IsDeleted && !p.IsSettled)
            .Include(p => p.Entries.Where(e => !e.IsDeleted))
            .ToListAsync(ct);

        decimal totalDenaHai = 0;
        decimal totalLenaHai = 0;
        var debtsBreakdown = new List<object>();

        foreach (var p in parties)
        {
            var totalIn = p.Entries.Where(e => e.EntryType == "IN").Sum(e => e.Amount);
            var totalOut = p.Entries.Where(e => e.EntryType == "OUT").Sum(e => e.Amount);
            var net = p.Type == "Payable" ? (totalIn - totalOut) : (totalOut - totalIn);

            if (p.Type == "Payable" && net > 0)
            {
                totalDenaHai += net;
                debtsBreakdown.Add(new { p.Id, p.Name, p.Type, Pending = net });
            }
            else if (p.Type == "Receivable" && net > 0)
            {
                totalLenaHai += net;
                debtsBreakdown.Add(new { p.Id, p.Name, p.Type, Pending = net });
            }
        }

        // 2. Fetch liquidity accounts (Bank A/Cs, Shares, Cash)
        var accounts = await _context.KhataLiquidityAccounts
            .AsNoTracking()
            .Where(a => a.UserId == userId && !a.IsDeleted)
            .OrderBy(a => a.SortOrder)
            .ThenBy(a => a.CreatedAtUtc)
            .ToListAsync(ct);

        var totalBank = accounts.Where(a => a.AccountType == "Bank").Sum(a => a.Balance);
        var totalShare = accounts.Where(a => a.AccountType == "Share").Sum(a => a.Balance);
        var totalCash = accounts.Where(a => a.AccountType == "Cash").Sum(a => a.Balance);
        var totalBalance = accounts.Sum(a => a.Balance);

        // 3. Exact Excel formula calculation
        var bakiAc = totalBalance - totalDenaHai;
        var adjAmount = adjustments ?? 0;
        var finalInHand = bakiAc - adjAmount;

        return Ok(new
        {
            totalDenaHai,
            totalLenaHai,
            debtsBreakdown,
            accounts = accounts.Select(a => new { a.Id, a.AccountName, a.AccountType, a.Balance, a.Notes }),
            totalBank,
            totalShare,
            totalCash,
            totalBalance,
            bakiAc,
            adjustments = adjAmount,
            finalInHand
        });
    }

    public record SaveLiquidityAccountDto(Guid? Id, string AccountName, string AccountType, decimal Balance, string? Notes);

    [HttpPost("liquidity/accounts")]
    public async Task<IActionResult> SaveLiquidityAccount([FromBody] SaveLiquidityAccountDto dto, CancellationToken ct)
    {
        var userId = RequireUserId();
        if (string.IsNullOrWhiteSpace(dto.AccountName)) return BadRequest(new { message = "Account name is required." });

        if (dto.Id.HasValue && dto.Id.Value != Guid.Empty)
        {
            var acc = await _context.KhataLiquidityAccounts
                .FirstOrDefaultAsync(a => a.Id == dto.Id.Value && a.UserId == userId && !a.IsDeleted, ct);
            if (acc == null) return NotFound(new { message = "Account not found." });

            acc.AccountName = dto.AccountName.Trim();
            acc.AccountType = dto.AccountType;
            acc.Balance = dto.Balance;
            acc.Notes = dto.Notes;
            acc.UpdatedAtUtc = DateTime.UtcNow;
        }
        else
        {
            var acc = new KhataLiquidityAccount
            {
                UserId = userId,
                AccountName = dto.AccountName.Trim(),
                AccountType = dto.AccountType,
                Balance = dto.Balance,
                Notes = dto.Notes,
                CreatedAtUtc = DateTime.UtcNow
            };
            _context.KhataLiquidityAccounts.Add(acc);
        }

        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Liquidity account saved successfully." });
    }

    [HttpDelete("liquidity/accounts/{id:guid}")]
    public async Task<IActionResult> DeleteLiquidityAccount(Guid id, CancellationToken ct)
    {
        var userId = RequireUserId();
        var acc = await _context.KhataLiquidityAccounts
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId && !a.IsDeleted, ct);
        if (acc == null) return NotFound();

        acc.IsDeleted = true;
        acc.DeletedAtUtc = DateTime.UtcNow;
        acc.DeletedBy = userId;
        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Account deleted." });
    }

    #endregion

    #region Event / Shopping Kharcha (Matches Image 2)

    [HttpGet("events")]
    public async Task<IActionResult> GetEvents(CancellationToken ct)
    {
        var userId = RequireUserId();
        var events = await _context.KhataEvents
            .AsNoTracking()
            .Where(e => e.UserId == userId && !e.IsDeleted)
            .Include(e => e.Funds.Where(f => !f.IsDeleted))
            .Include(e => e.Items.Where(i => !i.IsDeleted))
            .OrderByDescending(e => e.Date)
            .ToListAsync(ct);

        var list = events.Select(ev =>
        {
            var totalFunds = ev.Funds.Sum(f => f.Amount);
            var shoppingTotal = ev.Items.Where(i => i.ItemType == "Shopping").Sum(i => i.Amount);
            var localKharchTotal = ev.Items.Where(i => i.ItemType == "LocalKharch").Sum(i => i.Amount);
            var cashHandoverTotal = ev.Items.Where(i => i.ItemType == "CashHandover").Sum(i => i.Amount);
            var totalSpent = ev.Items.Sum(i => i.Amount);
            var remainingBalance = totalFunds - totalSpent;

            return new
            {
                ev.Id,
                ev.Title,
                ev.Date,
                ev.Notes,
                ev.Status,
                totalFunds,
                shoppingTotal,
                localKharchTotal,
                cashHandoverTotal,
                totalSpent,
                remainingBalance,
                fundsCount = ev.Funds.Count,
                itemsCount = ev.Items.Count
            };
        }).ToList();

        return Ok(list);
    }

    [HttpGet("events/{id:guid}")]
    public async Task<IActionResult> GetEventById(Guid id, CancellationToken ct)
    {
        var userId = RequireUserId();
        var ev = await _context.KhataEvents
            .AsNoTracking()
            .Include(e => e.Funds.Where(f => !f.IsDeleted))
            .Include(e => e.Items.Where(i => !i.IsDeleted))
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId && !e.IsDeleted, ct);

        if (ev == null) return NotFound(new { message = "Event not found" });

        var funds = ev.Funds.OrderBy(f => f.Date).ToList();
        var items = ev.Items.OrderBy(i => i.Date).ThenBy(i => i.CreatedAtUtc).ToList();

        var totalFunds = funds.Sum(f => f.Amount);
        var shoppingTotal = items.Where(i => i.ItemType == "Shopping").Sum(i => i.Amount);
        var localKharchTotal = items.Where(i => i.ItemType == "LocalKharch").Sum(i => i.Amount);
        var cashHandoverTotal = items.Where(i => i.ItemType == "CashHandover").Sum(i => i.Amount);
        var totalSpent = items.Sum(i => i.Amount);
        var remainingBalance = totalFunds - totalSpent;

        return Ok(new
        {
            ev.Id,
            ev.Title,
            ev.Date,
            ev.Notes,
            ev.Status,
            totalFunds,
            shoppingTotal,
            localKharchTotal,
            cashHandoverTotal,
            totalSpent,
            remainingBalance,
            funds = funds.Select(f => new { f.Id, f.ContributorName, f.Amount, f.Date, f.Notes }),
            items = items.Select(i => new { i.Id, i.ItemType, i.Description, i.Amount, i.Beneficiary, i.Date })
        });
    }

    public record CreateEventDto(string Title, DateTime? Date, string? Notes);

    [HttpPost("events")]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventDto dto, CancellationToken ct)
    {
        var userId = RequireUserId();
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest(new { message = "Title is required." });

        var ev = new KhataEvent
        {
            UserId = userId,
            Title = dto.Title.Trim(),
            Date = dto.Date ?? DateTime.UtcNow,
            Notes = dto.Notes,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.KhataEvents.Add(ev);
        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Event created", id = ev.Id });
    }

    public record AddFundDto(string ContributorName, decimal Amount, DateTime? Date, string? Notes);

    [HttpPost("events/{eventId:guid}/funds")]
    public async Task<IActionResult> AddEventFund(Guid eventId, [FromBody] AddFundDto dto, CancellationToken ct)
    {
        var userId = RequireUserId();
        var ev = await _context.KhataEvents.FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId && !e.IsDeleted, ct);
        if (ev == null) return NotFound(new { message = "Event not found" });

        var fund = new KhataEventFund
        {
            UserId = userId,
            EventId = eventId,
            ContributorName = dto.ContributorName.Trim(),
            Amount = dto.Amount,
            Date = dto.Date ?? DateTime.UtcNow,
            Notes = dto.Notes,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.KhataEventFunds.Add(fund);
        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Fund contributor added", id = fund.Id });
    }

    public record AddItemDto(string ItemType, string Description, decimal Amount, string? Beneficiary, DateTime? Date);

    [HttpPost("events/{eventId:guid}/items")]
    public async Task<IActionResult> AddEventItem(Guid eventId, [FromBody] AddItemDto dto, CancellationToken ct)
    {
        var userId = RequireUserId();
        var ev = await _context.KhataEvents.FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId && !e.IsDeleted, ct);
        if (ev == null) return NotFound(new { message = "Event not found" });

        var item = new KhataEventItem
        {
            UserId = userId,
            EventId = eventId,
            ItemType = string.IsNullOrWhiteSpace(dto.ItemType) ? "Shopping" : dto.ItemType.Trim(),
            Description = dto.Description.Trim(),
            Amount = dto.Amount,
            Beneficiary = dto.Beneficiary?.Trim(),
            Date = dto.Date ?? DateTime.UtcNow,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.KhataEventItems.Add(item);
        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Item added", id = item.Id });
    }

    [HttpDelete("events/items/{itemId:guid}")]
    public async Task<IActionResult> DeleteEventItem(Guid itemId, CancellationToken ct)
    {
        var userId = RequireUserId();
        var item = await _context.KhataEventItems.FirstOrDefaultAsync(i => i.Id == itemId && i.UserId == userId && !i.IsDeleted, ct);
        if (item == null) return NotFound();

        item.IsDeleted = true;
        item.DeletedAtUtc = DateTime.UtcNow;
        item.DeletedBy = userId;
        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Item deleted" });
    }

    [HttpDelete("events/{id:guid}")]
    public async Task<IActionResult> DeleteEvent(Guid id, CancellationToken ct)
    {
        var userId = RequireUserId();
        var ev = await _context.KhataEvents
            .Include(e => e.Funds)
            .Include(e => e.Items)
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId && !e.IsDeleted, ct);
        if (ev == null) return NotFound();

        ev.IsDeleted = true;
        ev.DeletedAtUtc = DateTime.UtcNow;
        ev.DeletedBy = userId;

        foreach (var f in ev.Funds) { f.IsDeleted = true; f.DeletedAtUtc = DateTime.UtcNow; f.DeletedBy = userId; }
        foreach (var i in ev.Items) { i.IsDeleted = true; i.DeletedAtUtc = DateTime.UtcNow; i.DeletedBy = userId; }

        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Event deleted" });
    }

    public record UpdateEventDto(string? Title, DateTime? Date, string? Notes, string? Status);

    [HttpPut("events/{id:guid}")]
    public async Task<IActionResult> UpdateEvent(Guid id, [FromBody] UpdateEventDto dto, CancellationToken ct)
    {
        var userId = RequireUserId();
        var ev = await _context.KhataEvents.FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId && !e.IsDeleted, ct);
        if (ev == null) return NotFound(new { message = "Event not found" });

        if (!string.IsNullOrWhiteSpace(dto.Title)) ev.Title = dto.Title.Trim();
        if (dto.Date.HasValue) ev.Date = dto.Date.Value;
        if (dto.Notes != null) ev.Notes = dto.Notes.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Status)) ev.Status = dto.Status.Trim();
        ev.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Event updated successfully" });
    }

    public record UpdateItemDto(string? ItemType, string? Description, decimal? Amount, string? Beneficiary, DateTime? Date);

    [HttpPut("events/items/{itemId:guid}")]
    public async Task<IActionResult> UpdateEventItem(Guid itemId, [FromBody] UpdateItemDto dto, CancellationToken ct)
    {
        var userId = RequireUserId();
        var item = await _context.KhataEventItems.FirstOrDefaultAsync(i => i.Id == itemId && i.UserId == userId && !i.IsDeleted, ct);
        if (item == null) return NotFound(new { message = "Item not found" });

        if (!string.IsNullOrWhiteSpace(dto.ItemType)) item.ItemType = dto.ItemType.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Description)) item.Description = dto.Description.Trim();
        if (dto.Amount.HasValue && dto.Amount.Value > 0) item.Amount = dto.Amount.Value;
        if (dto.Beneficiary != null) item.Beneficiary = dto.Beneficiary.Trim();
        if (dto.Date.HasValue) item.Date = dto.Date.Value;
        item.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Item updated successfully" });
    }

    public record UpdateFundDto(string? ContributorName, decimal? Amount, DateTime? Date, string? Notes);

    [HttpPut("events/funds/{fundId:guid}")]
    public async Task<IActionResult> UpdateEventFund(Guid fundId, [FromBody] UpdateFundDto dto, CancellationToken ct)
    {
        var userId = RequireUserId();
        var fund = await _context.KhataEventFunds.FirstOrDefaultAsync(f => f.Id == fundId && f.UserId == userId && !f.IsDeleted, ct);
        if (fund == null) return NotFound(new { message = "Fund contributor not found" });

        if (!string.IsNullOrWhiteSpace(dto.ContributorName)) fund.ContributorName = dto.ContributorName.Trim();
        if (dto.Amount.HasValue && dto.Amount.Value > 0) fund.Amount = dto.Amount.Value;
        if (dto.Date.HasValue) fund.Date = dto.Date.Value;
        if (dto.Notes != null) fund.Notes = dto.Notes.Trim();
        fund.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Fund contributor updated successfully" });
    }

    [HttpDelete("events/funds/{fundId:guid}")]
    public async Task<IActionResult> DeleteEventFund(Guid fundId, CancellationToken ct)
    {
        var userId = RequireUserId();
        var fund = await _context.KhataEventFunds.FirstOrDefaultAsync(f => f.Id == fundId && f.UserId == userId && !f.IsDeleted, ct);
        if (fund == null) return NotFound(new { message = "Fund contributor not found" });

        fund.IsDeleted = true;
        fund.DeletedAtUtc = DateTime.UtcNow;
        fund.DeletedBy = userId;
        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "Fund contributor deleted" });
    }

    [HttpPost("clear-all")]
    public async Task<IActionResult> ClearAllKhataData(CancellationToken ct)
    {
        var userId = RequireUserId();
        var now = DateTime.UtcNow;

        var parties = await _context.LocalKhataParties.Include(p => p.Entries).Where(p => p.UserId == userId && !p.IsDeleted).ToListAsync(ct);
        foreach (var p in parties)
        {
            p.IsDeleted = true;
            p.DeletedAtUtc = now;
            p.DeletedBy = userId;
            foreach (var e in p.Entries) { e.IsDeleted = true; e.DeletedAtUtc = now; e.DeletedBy = userId; }
        }

        var accounts = await _context.KhataLiquidityAccounts.Where(a => a.UserId == userId && !a.IsDeleted).ToListAsync(ct);
        foreach (var a in accounts) { a.IsDeleted = true; a.DeletedAtUtc = now; a.DeletedBy = userId; }

        var events = await _context.KhataEvents.Include(e => e.Funds).Include(e => e.Items).Where(e => e.UserId == userId && !e.IsDeleted).ToListAsync(ct);
        foreach (var ev in events)
        {
            ev.IsDeleted = true;
            ev.DeletedAtUtc = now;
            ev.DeletedBy = userId;
            foreach (var f in ev.Funds) { f.IsDeleted = true; f.DeletedAtUtc = now; f.DeletedBy = userId; }
            foreach (var i in ev.Items) { i.IsDeleted = true; i.DeletedAtUtc = now; i.DeletedBy = userId; }
        }

        await _context.SaveChangesAsync(ct);
        return Ok(new { message = "All local khata data has been cleared." });
    }

    #endregion

    #region Sample Data Seeder (Exact user sheet values)

    [HttpPost("seed-sheet-data")]
    public async Task<IActionResult> SeedSheetData(CancellationToken ct)
    {
        var userId = RequireUserId();

        // 1. Party: Junaid
        var junaid = new LocalKhataParty
        {
            UserId = userId,
            Name = "Junaid Bhai",
            Type = "Payable",
            Category = "Family",
            Notes = "Sheet Passbook: Starting IN 3,00,000, medical/shadi expenses",
            CreatedAtUtc = DateTime.UtcNow.AddDays(-30)
        };
        junaid.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "IN", Amount = 300000, Category = "Fund Received", Remark = "Starting Loan / Fund received", Date = DateTime.UtcNow.AddDays(-28) });
        junaid.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "OUT", Amount = 295, Category = "Medical", Remark = "medical", Date = DateTime.UtcNow.AddDays(-25) });
        junaid.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "OUT", Amount = 50000, Category = "A/c Transfer", Remark = "A/c junaid", Date = DateTime.UtcNow.AddDays(-20) });
        junaid.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "OUT", Amount = 450, Category = "Medical", Remark = "medical", Date = DateTime.UtcNow.AddDays(-15) });
        junaid.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "OUT", Amount = 5000, Category = "Wedding", Remark = "Shadi muskan", Date = DateTime.UtcNow.AddDays(-10) });
        junaid.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "OUT", Amount = 100, Category = "General", Remark = "misc cash", Date = DateTime.UtcNow.AddDays(-5) });
        junaid.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "OUT", Amount = 290, Category = "General", Remark = "misc cash", Date = DateTime.UtcNow.AddDays(-2) });

        // 2. Party: Mosin
        var mosin = new LocalKhataParty
        {
            UserId = userId,
            Name = "Mosin",
            Type = "Payable",
            Category = "Family",
            Notes = "Sheet Passbook: IN 2,29,320, OUT 90,000, Pending 1,39,320",
            CreatedAtUtc = DateTime.UtcNow.AddDays(-30)
        };
        mosin.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "IN", Amount = 229320, Category = "Fund Received", Remark = "Received from Mosin", Date = DateTime.UtcNow.AddDays(-25) });
        mosin.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "OUT", Amount = 90000, Category = "Payment", Remark = "Repayment / Paid out", Date = DateTime.UtcNow.AddDays(-15) });

        // 3. Other Loans from Sheet Table 1
        var shahid = new LocalKhataParty { UserId = userId, Name = "Shahid Khan", Type = "Payable", Category = "Friend / Lender", Notes = "Sheet Loan: 50,000", CreatedAtUtc = DateTime.UtcNow.AddDays(-20) };
        shahid.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "IN", Amount = 50000, Category = "Loan", Remark = "Loan taken", Date = DateTime.UtcNow.AddDays(-20) });

        var baji = new LocalKhataParty { UserId = userId, Name = "Baji", Type = "Payable", Category = "Family", Notes = "Sheet Loan: Multiple entries (50k, 50k, 30k, 5k)", CreatedAtUtc = DateTime.UtcNow.AddDays(-20) };
        baji.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "IN", Amount = 50000, Category = "Loan", Remark = "Baji loan 1", Date = DateTime.UtcNow.AddDays(-18) });
        baji.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "IN", Amount = 50000, Category = "Loan", Remark = "Baji loan 2", Date = DateTime.UtcNow.AddDays(-16) });
        baji.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "IN", Amount = 30000, Category = "Loan", Remark = "Baji loan 3", Date = DateTime.UtcNow.AddDays(-14) });
        baji.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "IN", Amount = 5000, Category = "Loan", Remark = "Baji loan 4", Date = DateTime.UtcNow.AddDays(-10) });

        var nanajaan = new LocalKhataParty { UserId = userId, Name = "Nanajaan", Type = "Payable", Category = "Family", Notes = "Sheet Loan: 50,000", CreatedAtUtc = DateTime.UtcNow.AddDays(-15) };
        nanajaan.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "IN", Amount = 50000, Category = "Loan", Remark = "Nanajaan loan", Date = DateTime.UtcNow.AddDays(-15) });

        var bushra = new LocalKhataParty { UserId = userId, Name = "Bushra", Type = "Payable", Category = "Family", Notes = "Sheet Loan: 10,000 + 6,000 Pune shopping", CreatedAtUtc = DateTime.UtcNow.AddDays(-12) };
        bushra.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "IN", Amount = 10000, Category = "Loan", Remark = "Bushra loan", Date = DateTime.UtcNow.AddDays(-12) });
        bushra.Entries.Add(new LocalKhataEntry { UserId = userId, EntryType = "IN", Amount = 6000, Category = "Shopping", Remark = "shopping Pune se liya tha Bushra", Date = DateTime.UtcNow.AddDays(-10) });

        _context.LocalKhataParties.AddRange(junaid, mosin, shahid, baji, nanajaan, bushra);

        // 4. Liquidity Accounts from Sheet Table
        var accs = new List<KhataLiquidityAccount>
        {
            new KhataLiquidityAccount { UserId = userId, AccountName = "Main Bank A/C 1", AccountType = "Bank", Balance = 123000, SortOrder = 1 },
            new KhataLiquidityAccount { UserId = userId, AccountName = "Savings Bank A/C 2", AccountType = "Bank", Balance = 160000, SortOrder = 2 },
            new KhataLiquidityAccount { UserId = userId, AccountName = "Share Trading Primary", AccountType = "Share", Balance = 212000, SortOrder = 3 },
            new KhataLiquidityAccount { UserId = userId, AccountName = "Share Trading Smallcap", AccountType = "Share", Balance = 17000, SortOrder = 4 },
            new KhataLiquidityAccount { UserId = userId, AccountName = "Share Trading Swing", AccountType = "Share", Balance = 40000, SortOrder = 5 }
        };
        _context.KhataLiquidityAccounts.AddRange(accs);

        // 5. Shopping & Trip Event (Image 2)
        var tripEvent = new KhataEvent
        {
            UserId = userId,
            Title = "Family Wedding & Pune Shopping Trip",
            Date = DateTime.UtcNow.AddDays(-7),
            Notes = "Complete expense list: Shopping (53,110), Local pocket expenses (7,539), Cash given to Bushra (30,000)",
            Status = "Active"
        };

        tripEvent.Funds.Add(new KhataEventFund { UserId = userId, ContributorName = "Abba ne dale", Amount = 45000, Date = DateTime.UtcNow.AddDays(-7) });
        tripEvent.Funds.Add(new KhataEventFund { UserId = userId, ContributorName = "Aadil Khan", Amount = 46719, Date = DateTime.UtcNow.AddDays(-7) });

        // Shopping items
        tripEvent.Items.Add(new KhataEventItem { UserId = userId, ItemType = "Shopping", Description = "Burka", Amount = 1650, Beneficiary = "Family" });
        tripEvent.Items.Add(new KhataEventItem { UserId = userId, ItemType = "Shopping", Description = "mere shirt 3", Amount = 1500, Beneficiary = "Aadil" });
        tripEvent.Items.Add(new KhataEventItem { UserId = userId, ItemType = "Shopping", Description = "shar dress", Amount = 8500, Beneficiary = "Family" });
        tripEvent.Items.Add(new KhataEventItem { UserId = userId, ItemType = "Shopping", Description = "abba shirt", Amount = 960, Beneficiary = "Abba" });
        tripEvent.Items.Add(new KhataEventItem { UserId = userId, ItemType = "Shopping", Description = "ayyat dress", Amount = 2600, Beneficiary = "Ayyat" });
        tripEvent.Items.Add(new KhataEventItem { UserId = userId, ItemType = "Shopping", Description = "bangel", Amount = 400, Beneficiary = "Family" });
        tripEvent.Items.Add(new KhataEventItem { UserId = userId, ItemType = "Shopping", Description = "local", Amount = 400, Beneficiary = "Local" });
        tripEvent.Items.Add(new KhataEventItem { UserId = userId, ItemType = "Shopping", Description = "zaid,huzaif,aadil tshirt", Amount = 2200, Beneficiary = "Zaid, Huzaif, Aadil" });
        tripEvent.Items.Add(new KhataEventItem { UserId = userId, ItemType = "Shopping", Description = "advance for zaid,huzaif,aadil", Amount = 15000, Beneficiary = "Zaid, Huzaif, Aadil" });
        tripEvent.Items.Add(new KhataEventItem { UserId = userId, ItemType = "Shopping", Description = "atm cash", Amount = 2900, Beneficiary = "Cash" });
        tripEvent.Items.Add(new KhataEventItem { UserId = userId, ItemType = "Shopping", Description = "local shopping", Amount = 500, Beneficiary = "Shopping" });
        tripEvent.Items.Add(new KhataEventItem { UserId = userId, ItemType = "Shopping", Description = "pending", Amount = 12000, Beneficiary = "Pending item" });
        tripEvent.Items.Add(new KhataEventItem { UserId = userId, ItemType = "Shopping", Description = "busra extra", Amount = 5000, Beneficiary = "Bushra" });

        // Local expenses
        decimal[] localAmounts = { 120, 80, 130, 70, 160, 120, 120, 485, 60, 100, 40, 51, 91, 90, 1400, 2200, 12, 110, 900, 1200 };
        string[] localDescs = { "train", "nasta", "local auto", "tea", "travel", "rickshaw", "auto", "khana hotel", "nasta", "snacks", "parking", "auto", "travel", "tea", "hotel stay", "bus ticket", "water", "tea nasta", "hotel khana", "hotel khana" };

        for (int i = 0; i < localAmounts.Length; i++)
        {
            tripEvent.Items.Add(new KhataEventItem
            {
                UserId = userId,
                ItemType = "LocalKharch",
                Description = localDescs[i],
                Amount = localAmounts[i],
                Beneficiary = "Trip Expense"
            });
        }

        // Cash handover
        tripEvent.Items.Add(new KhataEventItem
        {
            UserId = userId,
            ItemType = "CashHandover",
            Description = "bushra ko diya",
            Amount = 30000,
            Beneficiary = "Bushra"
        });

        _context.KhataEvents.Add(tripEvent);
        await _context.SaveChangesAsync(ct);

        return Ok(new { message = "Sample sheet data imported successfully! You can view Junaid, Mosin, Loans, Liquidity, and Shopping." });
    }

    #endregion
}
