using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.MarketAi.DTOs;
using Hisaab.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Api.Controllers;

[AllowAnonymous]
[Route("api/v1/my-assistant")]
public class MyAssistantController : ApiControllerBase
{
    private readonly IMyAssistantAgent _assistantAgent;
    private readonly IAlertDispatcherAgent _alertDispatcher;
    private readonly IStockMarketService _stockMarketService;
    private readonly ITelegramBotService _telegramService;
    private readonly IDiscordWebhookService _discordService;
    private readonly INtfyService _ntfyService;
    private readonly IApplicationDbContext _context;

    public MyAssistantController(
        IMyAssistantAgent assistantAgent,
        IAlertDispatcherAgent alertDispatcher,
        IStockMarketService stockMarketService,
        ITelegramBotService telegramService,
        IDiscordWebhookService discordService,
        INtfyService ntfyService,
        IApplicationDbContext context)
    {
        _assistantAgent = assistantAgent;
        _alertDispatcher = alertDispatcher;
        _stockMarketService = stockMarketService;
        _telegramService = telegramService;
        _discordService = discordService;
        _ntfyService = ntfyService;
        _context = context;
    }

    [HttpGet("overview")]
    [ProducesResponseType(typeof(MyAssistantOverviewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOverview(CancellationToken cancellationToken)
    {
        var userId = CurrentUserService.UserId ?? Guid.Empty;
        var overview = await _assistantAgent.GetOverviewAsync(userId, cancellationToken);
        return Ok(overview);
    }

    [HttpPost("stocks")]
    [ProducesResponseType(typeof(Guid), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddStock(
        [FromBody] AddMyAssistantStockRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Ticker))
        {
            return BadRequest(new { message = "Stock Ticker symbol is required." });
        }

        if (request.BuyPrice <= 0 || request.Quantity <= 0)
        {
            return BadRequest(new { message = "Buy price and quantity must be greater than zero." });
        }

        var userId = CurrentUserService.UserId ?? Guid.Empty;
        var cleanTicker = request.Ticker.Trim().ToUpperInvariant();
        if (!cleanTicker.Contains('.') && !cleanTicker.StartsWith('^'))
        {
            cleanTicker += ".NS";
        }

        string companyName = request.CompanyName ?? string.Empty;
        if (string.IsNullOrWhiteSpace(companyName))
        {
            var quote = await _stockMarketService.GetQuoteAsync(cleanTicker, cancellationToken);
            companyName = quote.CompanyName;
        }

        var holding = new StockHolding
        {
            UserId = userId,
            Ticker = cleanTicker,
            CompanyName = companyName,
            Exchange = cleanTicker.EndsWith(".BO", StringComparison.OrdinalIgnoreCase) ? "BSE" : "NSE",
            BuyPrice = request.BuyPrice,
            Quantity = request.Quantity,
            PurchaseDate = DateTime.UtcNow,
            TargetPrice = request.TargetPrice,
            TargetProfitPerShare = request.TargetProfitPerShare,
            StopLossPrice = request.StopLossPrice,
            Notes = request.Notes,
            IsArchived = false,
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.StockHoldings.Add(holding);
        await _context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetOverview), new { id = holding.Id }, holding.Id);
    }

    [HttpPut("stocks/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStock(
        [FromRoute] Guid id,
        [FromBody] UpdateMyAssistantStockRequest request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUserService.UserId ?? Guid.Empty;
        var holding = await _context.StockHoldings
            .FirstOrDefaultAsync(h => h.Id == id && (userId == Guid.Empty || h.UserId == userId), cancellationToken);

        if (holding == null) return NotFound(new { message = "Tracked stock holding not found." });

        if (request.BuyPrice > 0) holding.BuyPrice = request.BuyPrice;
        if (request.Quantity > 0) holding.Quantity = request.Quantity;
        holding.TargetPrice = request.TargetPrice;
        holding.TargetProfitPerShare = request.TargetProfitPerShare;
        holding.StopLossPrice = request.StopLossPrice;
        if (request.Notes != null) holding.Notes = request.Notes;
        holding.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, id });
    }

    [HttpDelete("stocks/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteStock(
        [FromRoute] Guid id,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUserService.UserId ?? Guid.Empty;
        var holding = await _context.StockHoldings
            .FirstOrDefaultAsync(h => h.Id == id && (userId == Guid.Empty || h.UserId == userId), cancellationToken);

        if (holding == null) return NotFound(new { message = "Tracked stock holding not found." });

        holding.IsDeleted = true;
        holding.DeletedAtUtc = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpGet("settings")]
    [ProducesResponseType(typeof(MarketAgentUserSettingDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSettings(CancellationToken cancellationToken)
    {
        var userId = CurrentUserService.UserId ?? Guid.Empty;
        var setting = await _context.MarketAgentUserSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);

        if (setting == null)
        {
            return Ok(new MarketAgentUserSettingDto(
                WhatsAppPhoneNumber: "+91 98765 43210",
                EmailAddress: "investor@example.com",
                EnablePreMarketScan: true,
                EnableTargetHitAlerts: true,
                EnableStopLossAlerts: true,
                EnableEmailDispatch: true,
                EnableWhatsAppDispatch: true,
                PreMarketScanTime: "08:45",
                LastPreMarketReportDate: null,
                EnableMarketOpenAlerts: true,
                EnableMarketCloseAlerts: true,
                LastMarketOpenReportDate: null,
                LastMarketCloseReportDate: null,
                WhatsAppProvider: "CallMeBot",
                WhatsAppApiKey: null,
                WhatsAppInstanceId: null,
                WhatsAppWebhookUrl: null
            ));
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
            setting.LastPreMarketReportDate,
            setting.EnableMarketOpenAlerts,
            setting.EnableMarketCloseAlerts,
            setting.LastMarketOpenReportDate,
            setting.LastMarketCloseReportDate,
            setting.WhatsAppProvider ?? "CallMeBot",
            setting.WhatsAppApiKey,
            setting.WhatsAppInstanceId,
            setting.WhatsAppWebhookUrl
        ));
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings(
        [FromBody] UpdateMarketAgentUserSettingRequest request,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUserService.UserId ?? Guid.Empty;
        var setting = await _context.MarketAgentUserSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.UserId == userId || s.UserId == Guid.Empty, cancellationToken);

        if (setting == null)
        {
            setting = new MarketAgentUserSetting
            {
                UserId = userId,
                WhatsAppPhoneNumber = request.WhatsAppPhoneNumber,
                WhatsAppProvider = request.WhatsAppProvider ?? "CallMeBot",
                WhatsAppApiKey = request.WhatsAppApiKey,
                WhatsAppInstanceId = request.WhatsAppInstanceId,
                WhatsAppWebhookUrl = request.WhatsAppWebhookUrl,
                EmailAddress = request.EmailAddress,
                EnablePreMarketScan = request.EnablePreMarketScan,
                EnableMarketOpenAlerts = request.EnableMarketOpenAlerts,
                EnableMarketCloseAlerts = request.EnableMarketCloseAlerts,
                EnableTargetHitAlerts = request.EnableTargetHitAlerts,
                EnableStopLossAlerts = request.EnableStopLossAlerts,
                EnableEmailDispatch = request.EnableEmailDispatch,
                EnableWhatsAppDispatch = request.EnableWhatsAppDispatch,
                EnableTelegramDispatch = request.EnableTelegramDispatch,
                TelegramBotToken = request.TelegramBotToken,
                TelegramChatId = request.TelegramChatId,
                EnableDiscordDispatch = request.EnableDiscordDispatch,
                DiscordWebhookUrl = request.DiscordWebhookUrl,
                EnableNtfyDispatch = request.EnableNtfyDispatch,
                NtfyTopic = request.NtfyTopic,
                NtfyServerUrl = request.NtfyServerUrl ?? "https://ntfy.sh",
                PreMarketScanTime = request.PreMarketScanTime ?? "08:45",
                CreatedAtUtc = DateTime.UtcNow
            };
            _context.MarketAgentUserSettings.Add(setting);
        }
        else
        {
            if (userId != Guid.Empty && setting.UserId == Guid.Empty)
            {
                setting.UserId = userId;
            }
            setting.WhatsAppPhoneNumber = request.WhatsAppPhoneNumber;
            setting.WhatsAppProvider = request.WhatsAppProvider ?? "CallMeBot";
            setting.WhatsAppApiKey = request.WhatsAppApiKey;
            setting.WhatsAppInstanceId = request.WhatsAppInstanceId;
            setting.WhatsAppWebhookUrl = request.WhatsAppWebhookUrl;
            setting.EmailAddress = request.EmailAddress;
            setting.EnablePreMarketScan = request.EnablePreMarketScan;
            setting.EnableMarketOpenAlerts = request.EnableMarketOpenAlerts;
            setting.EnableMarketCloseAlerts = request.EnableMarketCloseAlerts;
            setting.EnableTargetHitAlerts = request.EnableTargetHitAlerts;
            setting.EnableStopLossAlerts = request.EnableStopLossAlerts;
            setting.EnableEmailDispatch = request.EnableEmailDispatch;
            setting.EnableWhatsAppDispatch = request.EnableWhatsAppDispatch;
            setting.EnableTelegramDispatch = request.EnableTelegramDispatch;
            setting.TelegramBotToken = request.TelegramBotToken;
            setting.TelegramChatId = request.TelegramChatId;
            setting.EnableDiscordDispatch = request.EnableDiscordDispatch;
            setting.DiscordWebhookUrl = request.DiscordWebhookUrl;
            setting.EnableNtfyDispatch = request.EnableNtfyDispatch;
            setting.NtfyTopic = request.NtfyTopic;
            if (!string.IsNullOrWhiteSpace(request.NtfyServerUrl))
            {
                setting.NtfyServerUrl = request.NtfyServerUrl;
            }
            if (!string.IsNullOrWhiteSpace(request.PreMarketScanTime))
            {
                setting.PreMarketScanTime = request.PreMarketScanTime;
            }
            setting.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true });
    }

    [HttpPost("agent/check-now")]
    public async Task<IActionResult> CheckTargetAndStopLossNow(CancellationToken cancellationToken)
    {
        var userId = CurrentUserService.UserId ?? Guid.Empty;
        var triggeredAlerts = await _assistantAgent.CheckTargetAndStopLossBreachesAsync(userId, forceCheck: true, cancellationToken);

        var setting = await _context.MarketAgentUserSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.UserId == userId || s.UserId == Guid.Empty, cancellationToken);

        if (setting == null)
        {
            setting = new MarketAgentUserSetting
            {
                UserId = userId,
                WhatsAppPhoneNumber = "+91 98765 43210",
                EmailAddress = "investor@example.com",
                WhatsAppProvider = "CallMeBot",
                EnableMarketOpenAlerts = true,
                EnableMarketCloseAlerts = true,
                EnableTargetHitAlerts = true,
                EnableStopLossAlerts = true,
                EnableEmailDispatch = true,
                EnableWhatsAppDispatch = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            _context.MarketAgentUserSettings.Add(setting);
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (triggeredAlerts.Count > 0)
        {
            foreach (var alert in triggeredAlerts)
            {
                await _alertDispatcher.DispatchTargetOrLossAlertAsync(alert, setting, cancellationToken);
            }
        }

        return Ok(new { success = true, triggeredCount = triggeredAlerts.Count, alerts = triggeredAlerts });
    }

    [HttpPost("agent/open-scan-now")]
    [ProducesResponseType(typeof(MarketOpenDailyReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RunMarketOpenScanNow(CancellationToken cancellationToken)
    {
        var userId = CurrentUserService.UserId ?? Guid.Empty;
        var report = await _assistantAgent.GenerateMarketOpenReportAsync(userId, cancellationToken);

        var setting = await _context.MarketAgentUserSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.UserId == userId || s.UserId == Guid.Empty, cancellationToken);

        if (setting == null)
        {
            setting = new MarketAgentUserSetting
            {
                UserId = userId,
                WhatsAppPhoneNumber = "+91 98765 43210",
                EmailAddress = "investor@example.com",
                WhatsAppProvider = "CallMeBot",
                EnableMarketOpenAlerts = true,
                EnableMarketCloseAlerts = true,
                EnableTargetHitAlerts = true,
                EnableStopLossAlerts = true,
                EnableEmailDispatch = true,
                EnableWhatsAppDispatch = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            _context.MarketAgentUserSettings.Add(setting);
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (report.TotalHoldingsTracked > 0)
        {
            await _alertDispatcher.DispatchMarketOpenReportAsync(report, setting, cancellationToken);
        }

        return Ok(report);
    }

    [HttpPost("agent/close-scan-now")]
    [ProducesResponseType(typeof(MarketCloseDailyReportDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> RunMarketCloseScanNow(CancellationToken cancellationToken)
    {
        var userId = CurrentUserService.UserId ?? Guid.Empty;
        var report = await _assistantAgent.GenerateMarketCloseReportAsync(userId, cancellationToken);

        var setting = await _context.MarketAgentUserSettings
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.UserId == userId || s.UserId == Guid.Empty, cancellationToken);

        if (setting == null)
        {
            setting = new MarketAgentUserSetting
            {
                UserId = userId,
                WhatsAppPhoneNumber = "+91 98765 43210",
                EmailAddress = "investor@example.com",
                WhatsAppProvider = "CallMeBot",
                EnableMarketOpenAlerts = true,
                EnableMarketCloseAlerts = true,
                EnableTargetHitAlerts = true,
                EnableStopLossAlerts = true,
                EnableEmailDispatch = true,
                EnableWhatsAppDispatch = true,
                CreatedAtUtc = DateTime.UtcNow
            };
            _context.MarketAgentUserSettings.Add(setting);
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (report.TotalHoldingsTracked > 0)
        {
            await _alertDispatcher.DispatchMarketCloseReportAsync(report, setting, cancellationToken);
        }

        return Ok(report);
    }

    [HttpPost("agent/test-alert")]
    [ProducesResponseType(typeof(MarketAgentAlertLogDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> SendTestAlert(
        [FromBody] TestNotificationRequest? req,
        CancellationToken cancellationToken)
    {
        var userId = CurrentUserService.UserId ?? Guid.Empty;
        var log = await _alertDispatcher.SendTestNotificationAsync(
            userId,
            req?.WhatsAppPhoneNumber,
            req?.EmailAddress,
            req?.TelegramBotToken,
            req?.TelegramChatId,
            req?.DiscordWebhookUrl,
            req?.NtfyTopic,
            cancellationToken);

        return Ok(log);
    }

    [HttpPost("channels/test-telegram")]
    public async Task<IActionResult> TestTelegram(
        [FromBody] TelegramTestRequest request,
        CancellationToken cancellationToken)
    {
        var msg = "🤖 *HISAAB SENTINEL - TELEGRAM BOT CONNECTED!*\n━━━━━━━━━━━━━━━━━━━━\n✅ Test Alert received successfully!\n\nLive Target Hit & Stop-Loss notifications will ring your phone immediately.";
        var result = await _telegramService.SendMessageAsync(request.BotToken, request.ChatId, msg, cancellationToken);
        return Ok(result);
    }

    [HttpPost("channels/test-discord")]
    public async Task<IActionResult> TestDiscord(
        [FromBody] DiscordTestRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _discordService.SendEmbedAlertAsync(
            request.WebhookUrl,
            "🎮 Hisaab Sentinel - Discord Webhook Connected!",
            "Aapka Discord channel successfully linked ho chuka hai! Live market events aur Target / Stop-Loss breach notifications yahan instant deliver honge.",
            0x16A34A,
            new List<DiscordEmbedField>
            {
                new("Channel Status", "🟢 Connected & Active", true),
                new("Auto-Sentinel", "Enabled", true)
            },
            cancellationToken);
        return Ok(result);
    }

    [HttpPost("channels/test-ntfy")]
    public async Task<IActionResult> TestNtfy(
        [FromBody] NtfyTestRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _ntfyService.SendPushNotificationAsync(
            request.Topic,
            "🔔 Hisaab Sentinel - Mobile Push Active",
            "Aapka ntfy.sh topic connect ho gaya hai! Live share alerts bina kisi account ke instant aapke mobile par aayenge.",
            "high",
            new List<string> { "white_check_mark", "rocket" },
            request.ServerUrl,
            cancellationToken);
        return Ok(result);
    }

    [HttpGet("logs")]
    [ProducesResponseType(typeof(List<MarketAgentAlertLogDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLogs(CancellationToken cancellationToken)
    {
        var userId = CurrentUserService.UserId ?? Guid.Empty;
        var logs = await _context.MarketAgentAlertLogs
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(l => userId == Guid.Empty || l.UserId == userId)
            .OrderByDescending(l => l.CreatedAtUtc)
            .Take(30)
            .ToListAsync(cancellationToken);

        var tz = TimeZoneInfo.FindSystemTimeZoneById(OperatingSystem.IsWindows() ? "India Standard Time" : "Asia/Kolkata");
        var dtos = logs.Select(l =>
        {
            var lIst = TimeZoneInfo.ConvertTimeFromUtc(l.CreatedAtUtc, tz);
            return new MarketAgentAlertLogDto(
                l.Id, l.Ticker, l.CompanyName, l.AlertType, l.Title, l.Message,
                l.TriggerPrice, l.TargetPrice, l.ProfitOrLossAmount,
                l.WhatsAppStatus, l.EmailStatus, l.WhatsAppClickUrl,
                l.CreatedAtUtc, lIst.ToString("dd MMM yyyy, hh:mm tt"),
                l.TelegramStatus, l.DiscordStatus, l.NtfyStatus
            );
        }).ToList();

        return Ok(dtos);
    }

    [HttpGet("search-stocks")]
    [ProducesResponseType(typeof(List<StockSearchResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchStocks(
        [FromQuery] string? query,
        CancellationToken cancellationToken)
    {
        var results = await _stockMarketService.SearchStocksAsync(query ?? string.Empty, cancellationToken);
        return Ok(results);
    }
}

public record TelegramTestRequest(string BotToken, string ChatId);
public record DiscordTestRequest(string WebhookUrl);
public record NtfyTestRequest(string Topic, string? ServerUrl = null);
