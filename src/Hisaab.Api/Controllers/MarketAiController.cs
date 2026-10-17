using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.MarketAi.Commands;
using Hisaab.Application.Features.MarketAi.DTOs;
using Hisaab.Application.Features.MarketAi.Queries;
using Hisaab.Domain.Entities;
using Hisaab.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Api.Controllers;

[Authorize]
[Route("api/v1/market-ai")]
public class MarketAiController : ApiControllerBase
{
    private readonly IStockMarketService _stockMarketService;
    private readonly IPreMarketIntelligenceAgent _preMarketAgent;
    private readonly IPortfolioSentinelAgent _portfolioSentinelAgent;
    private readonly IAlertDispatcherAgent _alertDispatcherAgent;
    private readonly IApplicationDbContext _context;

    public MarketAiController(
        IStockMarketService stockMarketService,
        IPreMarketIntelligenceAgent preMarketAgent,
        IPortfolioSentinelAgent portfolioSentinelAgent,
        IAlertDispatcherAgent alertDispatcherAgent,
        IApplicationDbContext context)
    {
        _stockMarketService = stockMarketService;
        _preMarketAgent = preMarketAgent;
        _portfolioSentinelAgent = portfolioSentinelAgent;
        _alertDispatcherAgent = alertDispatcherAgent;
        _context = context;
    }

    [HttpGet("overview")]
    [ProducesResponseType(typeof(MarketAiPortfolioOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOverview(CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetMarketAiOverviewQuery(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("holdings")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateHolding(
        [FromBody] CreateStockHoldingRequest request,
        CancellationToken cancellationToken)
    {
        var command = new CreateStockHoldingCommand(
            request.Ticker,
            request.CompanyName,
            request.Exchange,
            request.BuyPrice,
            request.Quantity,
            request.PurchaseDate,
            request.TargetProfitPerShare,
            request.TargetPrice,
            request.StopLossPrice,
            request.Notes
        );

        var id = await Mediator.Send(command, cancellationToken);
        return CreatedAtAction(nameof(GetOverview), new { id }, id);
    }

    [HttpPut("holdings/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateHolding(
        [FromRoute] Guid id,
        [FromBody] UpdateStockHoldingRequest request,
        CancellationToken cancellationToken)
    {
        var command = new UpdateStockHoldingCommand(
            id,
            request.BuyPrice,
            request.Quantity,
            request.TargetProfitPerShare,
            request.TargetPrice,
            request.StopLossPrice,
            request.Notes
        );

        await Mediator.Send(command, cancellationToken);
        return Ok(new { success = true, id });
    }

    [HttpDelete("holdings/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteHolding(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        await Mediator.Send(new DeleteStockHoldingCommand(id), cancellationToken);
        return NoContent();
    }

    [AllowAnonymous]
    [HttpGet("screener")]
    [ProducesResponseType(typeof(List<MarketScreenerStockDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetScreener(CancellationToken cancellationToken)
    {
        var opportunities = await _stockMarketService.GetScreenerOpportunitiesAsync(cancellationToken);
        return Ok(opportunities);
    }

    [AllowAnonymous]
    [HttpGet("quote/{ticker}")]
    [ProducesResponseType(typeof(MarketQuoteDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetQuote(
        [FromRoute] string ticker,
        CancellationToken cancellationToken)
    {
        var quote = await _stockMarketService.GetQuoteAsync(ticker, cancellationToken);
        return Ok(quote);
    }

    [AllowAnonymous]
    [HttpGet("search")]
    [ProducesResponseType(typeof(List<StockSearchResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchStocks(
        [FromQuery] string? query,
        CancellationToken cancellationToken)
    {
        var results = await _stockMarketService.SearchStocksAsync(query ?? string.Empty, cancellationToken);
        return Ok(results);
    }

    [AllowAnonymous]
    [HttpPost("ask")]
    [ProducesResponseType(typeof(AskMarketAiResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> AskAi(
        [FromBody] AskMarketAiRequest request,
        CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new AskMarketAiQuery(request.Question, request.SelectedTicker), cancellationToken);
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("agents/status")]
    [ProducesResponseType(typeof(MarketAgentStatusDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAgentStatus(CancellationToken cancellationToken)
    {
        var ist = MarketAgentWorkerService.GetIndianStandardTime();
        int hour = ist.Hour;
        int minute = ist.Minute;
        bool isMarketOpen = ((hour == 9 && minute >= 15) || (hour > 9 && hour < 15) || (hour == 15 && minute <= 30))
            && ist.DayOfWeek != DayOfWeek.Saturday && ist.DayOfWeek != DayOfWeek.Sunday;

        var userId = CurrentUserService.UserId ?? Guid.Empty;

        var recentLogs = await _context.MarketAgentAlertLogs
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(l => userId == Guid.Empty || l.UserId == userId)
            .OrderByDescending(l => l.CreatedAtUtc)
            .Take(10)
            .ToListAsync(cancellationToken);

        var logDtos = recentLogs.Select(l =>
        {
            var lIst = TimeZoneInfo.ConvertTimeFromUtc(l.CreatedAtUtc,
                TimeZoneInfo.FindSystemTimeZoneById(OperatingSystem.IsWindows() ? "India Standard Time" : "Asia/Kolkata"));
            return new MarketAgentAlertLogDto(
                l.Id, l.Ticker, l.CompanyName, l.AlertType, l.Title, l.Message,
                l.TriggerPrice, l.TargetPrice, l.ProfitOrLossAmount,
                l.WhatsAppStatus, l.EmailStatus, l.WhatsAppClickUrl,
                l.CreatedAtUtc, lIst.ToString("dd MMM, hh:mm tt")
            );
        }).ToList();

        var dto = new MarketAgentStatusDto(
            CurrentTimeIst: ist.ToString("dd MMM yyyy, hh:mm:ss tt") + " IST",
            IsMarketOpen: isMarketOpen,
            MarketStatusText: isMarketOpen ? "🟢 Indian Market is LIVE (09:15 - 15:30 IST)" : "🔴 Indian Market is Closed (Next Session: 09:15 AM IST)",
            PreMarketAgentStatus: "Active (Scheduled Daily at 08:45 AM IST)",
            PortfolioSentinelAgentStatus: "Active (Real-Time Target & Stop-Loss Watcher)",
            AlertDispatcherAgentStatus: "Active (WhatsApp & Email Engine Ready)",
            NextPreMarketRunTimeIst: "Tomorrow, 08:45 AM IST",
            TotalAlertsDispatchedToday: MarketAgentWorkerService.TotalAlertsDispatchedSession,
            RecentAlerts: logDtos
        );

        return Ok(dto);
    }

    [AllowAnonymous]
    [HttpGet("agents/pre-market/today")]
    [ProducesResponseType(typeof(PreMarketDailyReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTodayPreMarketReport(CancellationToken cancellationToken)
    {
        var report = await _preMarketAgent.GenerateDailyBriefingAsync(cancellationToken);
        return Ok(report);
    }

    [AllowAnonymous]
    [HttpPost("agents/pre-market/run-now")]
    [ProducesResponseType(typeof(PreMarketDailyReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RunPreMarketScanNow(CancellationToken cancellationToken)
    {
        var report = await _preMarketAgent.GenerateDailyBriefingAsync(cancellationToken);
        var userId = CurrentUserService.UserId;

        if (userId.HasValue && userId.Value != Guid.Empty)
        {
            var setting = await _context.MarketAgentUserSettings
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.UserId == userId.Value, cancellationToken);

            if (setting != null)
            {
                await _alertDispatcherAgent.DispatchPreMarketReportAsync(report, setting, cancellationToken);
            }
        }

        return Ok(report);
    }

    [AllowAnonymous]
    [HttpPost("agents/sentinel/check-now")]
    public async Task<IActionResult> CheckPortfolioSentinelNow(CancellationToken cancellationToken)
    {
        var userId = CurrentUserService.UserId;
        var triggeredAlerts = await _portfolioSentinelAgent.CheckPortfolioTargetsAndStopLossAsync(userId, cancellationToken);

        if (userId.HasValue && userId.Value != Guid.Empty && triggeredAlerts.Count > 0)
        {
            var setting = await _context.MarketAgentUserSettings
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.UserId == userId.Value, cancellationToken);

            if (setting != null)
            {
                foreach (var alert in triggeredAlerts)
                {
                    await _alertDispatcherAgent.DispatchTargetOrLossAlertAsync(alert, setting, cancellationToken);
                }
            }
        }

        return Ok(new { success = true, triggeredCount = triggeredAlerts.Count, alerts = triggeredAlerts });
    }

    [AllowAnonymous]
    [HttpGet("agents/settings")]
    [ProducesResponseType(typeof(MarketAgentUserSettingDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAgentSettings(CancellationToken cancellationToken)
    {
        var userId = CurrentUserService.UserId ?? Guid.Empty;
        var setting = await _context.MarketAgentUserSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);

        if (setting == null)
        {
            var defaultDto = new MarketAgentUserSettingDto(
                WhatsAppPhoneNumber: "+91 98765 43210",
                EmailAddress: "investor@example.com",
                EnablePreMarketScan: true,
                EnableTargetHitAlerts: true,
                EnableStopLossAlerts: true,
                EnableEmailDispatch: true,
                EnableWhatsAppDispatch: true,
                PreMarketScanTime: "08:45",
                LastPreMarketReportDate: null
            );
            return Ok(defaultDto);
        }

        return Ok(new MarketAgentUserSettingDto(
            setting.WhatsAppPhoneNumber,
            setting.EmailAddress,
            setting.EnablePreMarketScan,
            setting.EnableTargetHitAlerts,
            setting.EnableStopLossAlerts,
            setting.EnableEmailDispatch,
            setting.EnableWhatsAppDispatch,
            setting.PreMarketScanTime,
            setting.LastPreMarketReportDate
        ));
    }

    [AllowAnonymous]
    [HttpPut("agents/settings")]
    public async Task<IActionResult> UpdateAgentSettings(
        [FromBody] UpdateMarketAgentUserSettingRequest request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUserService.UserId ?? Guid.Empty;
        var setting = await _context.MarketAgentUserSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);

        if (setting == null)
        {
            setting = new MarketAgentUserSetting
            {
                UserId = userId,
                WhatsAppPhoneNumber = request.WhatsAppPhoneNumber,
                EmailAddress = request.EmailAddress,
                EnablePreMarketScan = request.EnablePreMarketScan,
                EnableTargetHitAlerts = request.EnableTargetHitAlerts,
                EnableStopLossAlerts = request.EnableStopLossAlerts,
                EnableEmailDispatch = request.EnableEmailDispatch,
                EnableWhatsAppDispatch = request.EnableWhatsAppDispatch,
                PreMarketScanTime = request.PreMarketScanTime ?? "08:45",
                CreatedAtUtc = DateTime.UtcNow
            };
            _context.MarketAgentUserSettings.Add(setting);
        }
        else
        {
            setting.WhatsAppPhoneNumber = request.WhatsAppPhoneNumber;
            setting.EmailAddress = request.EmailAddress;
            setting.EnablePreMarketScan = request.EnablePreMarketScan;
            setting.EnableTargetHitAlerts = request.EnableTargetHitAlerts;
            setting.EnableStopLossAlerts = request.EnableStopLossAlerts;
            setting.EnableEmailDispatch = request.EnableEmailDispatch;
            setting.EnableWhatsAppDispatch = request.EnableWhatsAppDispatch;
            if (!string.IsNullOrWhiteSpace(request.PreMarketScanTime))
            {
                setting.PreMarketScanTime = request.PreMarketScanTime;
            }
            setting.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true });
    }

    [AllowAnonymous]
    [HttpPost("agents/test-notification")]
    [ProducesResponseType(typeof(MarketAgentAlertLogDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SendTestNotification(
        [FromBody] TestNotificationRequest? req,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUserService.UserId ?? Guid.Empty;
        var log = await _alertDispatcherAgent.SendTestNotificationAsync(
            userId,
            req?.WhatsAppPhoneNumber,
            req?.EmailAddress,
            cancellationToken);

        return Ok(log);
    }

    [AllowAnonymous]
    [HttpGet("agents/logs")]
    [ProducesResponseType(typeof(List<MarketAgentAlertLogDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAgentAlertLogs(CancellationToken cancellationToken)
    {
        var userId = CurrentUserService.UserId ?? Guid.Empty;
        var logs = await _context.MarketAgentAlertLogs
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(l => userId == Guid.Empty || l.UserId == userId)
            .OrderByDescending(l => l.CreatedAtUtc)
            .Take(30)
            .ToListAsync(cancellationToken);

        var logDtos = logs.Select(l =>
        {
            var lIst = TimeZoneInfo.ConvertTimeFromUtc(l.CreatedAtUtc,
                TimeZoneInfo.FindSystemTimeZoneById(OperatingSystem.IsWindows() ? "India Standard Time" : "Asia/Kolkata"));
            return new MarketAgentAlertLogDto(
                l.Id, l.Ticker, l.CompanyName, l.AlertType, l.Title, l.Message,
                l.TriggerPrice, l.TargetPrice, l.ProfitOrLossAmount,
                l.WhatsAppStatus, l.EmailStatus, l.WhatsAppClickUrl,
                l.CreatedAtUtc, lIst.ToString("dd MMM yyyy, hh:mm tt")
            );
        }).ToList();

        return Ok(logDtos);
    }
}

