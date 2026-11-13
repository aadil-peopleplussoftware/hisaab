using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.MarketAi.DTOs;
using Hisaab.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Hisaab.Infrastructure.Services;

public class MarketAgentWorkerService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MarketAgentWorkerService> _logger;

    public static DateTime LastHeartbeatUtc { get; private set; } = DateTime.UtcNow;
    public static DateTime? LastPreMarketRunUtc { get; private set; }
    public static DateTime? LastMarketOpenRunUtc { get; private set; }
    public static DateTime? LastMarketCloseRunUtc { get; private set; }
    public static DateTime? LastSentinelRunUtc { get; private set; }
    public static int TotalAlertsDispatchedSession { get; private set; } = 0;

    public MarketAgentWorkerService(
        IServiceScopeFactory scopeFactory,
        ILogger<MarketAgentWorkerService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("🤖 [MARKET AGENT WORKER] Initialized & listening for Indian market sessions (IST)...");

        // Initial brief delay to allow app startup
        await Task.Delay(5000, stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                LastHeartbeatUtc = DateTime.UtcNow;
                var ist = GetIndianStandardTime();
                int hour = ist.Hour;
                int minute = ist.Minute;
                string todayStr = ist.ToString("yyyy-MM-dd");
                bool isWeekday = ist.DayOfWeek != DayOfWeek.Saturday && ist.DayOfWeek != DayOfWeek.Sunday;

                // 1. Morning Pre-Market Check (Between 8:45 AM and 9:10 AM IST)
                bool isPreMarketWindow = (hour == 8 && minute >= 45) || (hour == 9 && minute <= 10);
                if (isPreMarketWindow && isWeekday)
                {
                    await CheckAndRunPreMarketBriefingAsync(todayStr, stoppingToken);
                }

                // 2. Market Open Routine (09:15 AM to 09:25 AM IST)
                bool isMarketOpenWindow = (hour == 9 && minute >= 15 && minute <= 25) && isWeekday;
                if (isMarketOpenWindow)
                {
                    await CheckAndRunMarketOpenBriefingAsync(todayStr, stoppingToken);
                }

                // 3. Active Trading Hours Check (9:15 AM to 3:30 PM IST)
                bool isMarketHours = ((hour == 9 && minute >= 15) || (hour > 9 && hour < 15) || (hour == 15 && minute <= 30)) && isWeekday;
                if (isMarketHours)
                {
                    await CheckPortfolioSentinelAsync(stoppingToken);
                }

                // 4. Market Close Routine (03:30 PM to 03:45 PM IST)
                bool isMarketCloseWindow = (hour == 15 && minute >= 30 && minute <= 45) && isWeekday;
                if (isMarketCloseWindow)
                {
                    await CheckAndRunMarketCloseSummaryAsync(todayStr, stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "⚠️ [MARKET AGENT WORKER EXCEPTION] Error in background cycle: {Message}", ex.Message);
            }

            // Sleep 60 seconds between worker checks
            await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);
        }
    }

    private async Task CheckAndRunPreMarketBriefingAsync(string todayStr, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var preMarketAgent = scope.ServiceProvider.GetRequiredService<IPreMarketIntelligenceAgent>();
        var dispatcher = scope.ServiceProvider.GetRequiredService<IAlertDispatcherAgent>();

        var settingsToRun = await context.MarketAgentUserSettings
            .IgnoreQueryFilters()
            .Where(s => s.EnablePreMarketScan && (s.LastPreMarketReportDate == null || s.LastPreMarketReportDate != todayStr))
            .ToListAsync(ct);

        if (settingsToRun.Count == 0) return;

        _logger.LogInformation("🌅 [WORKER] Generating pre-market report for {Count} users at 8:45 AM IST...", settingsToRun.Count);

        var report = await preMarketAgent.GenerateDailyBriefingAsync(ct);
        LastPreMarketRunUtc = DateTime.UtcNow;

        foreach (var setting in settingsToRun)
        {
            var success = await dispatcher.DispatchPreMarketReportAsync(report, setting, ct);
            if (success)
            {
                TotalAlertsDispatchedSession++;
            }
        }
    }

    private async Task CheckAndRunMarketOpenBriefingAsync(string todayStr, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var assistantAgent = scope.ServiceProvider.GetRequiredService<IMyAssistantAgent>();
        var dispatcher = scope.ServiceProvider.GetRequiredService<IAlertDispatcherAgent>();

        var settingsToRun = await context.MarketAgentUserSettings
            .IgnoreQueryFilters()
            .Where(s => s.EnableMarketOpenAlerts && (s.LastMarketOpenReportDate == null || s.LastMarketOpenReportDate != todayStr))
            .ToListAsync(ct);

        if (settingsToRun.Count == 0) return;

        _logger.LogInformation("🔔 [MY ASSISTANT WORKER] Generating 09:15 AM Market Open reports for {Count} users...", settingsToRun.Count);
        LastMarketOpenRunUtc = DateTime.UtcNow;

        foreach (var setting in settingsToRun)
        {
            var report = await assistantAgent.GenerateMarketOpenReportAsync(setting.UserId, ct);
            if (report.TotalHoldingsTracked > 0)
            {
                var success = await dispatcher.DispatchMarketOpenReportAsync(report, setting, ct);
                if (success)
                {
                    TotalAlertsDispatchedSession++;
                }
            }
        }
    }

    private async Task CheckAndRunMarketCloseSummaryAsync(string todayStr, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var assistantAgent = scope.ServiceProvider.GetRequiredService<IMyAssistantAgent>();
        var dispatcher = scope.ServiceProvider.GetRequiredService<IAlertDispatcherAgent>();

        var settingsToRun = await context.MarketAgentUserSettings
            .IgnoreQueryFilters()
            .Where(s => s.EnableMarketCloseAlerts && (s.LastMarketCloseReportDate == null || s.LastMarketCloseReportDate != todayStr))
            .ToListAsync(ct);

        if (settingsToRun.Count == 0) return;

        _logger.LogInformation("🌆 [MY ASSISTANT WORKER] Generating 03:30 PM Market Close summaries for {Count} users...", settingsToRun.Count);
        LastMarketCloseRunUtc = DateTime.UtcNow;

        foreach (var setting in settingsToRun)
        {
            var report = await assistantAgent.GenerateMarketCloseReportAsync(setting.UserId, ct);
            if (report.TotalHoldingsTracked > 0)
            {
                var success = await dispatcher.DispatchMarketCloseReportAsync(report, setting, ct);
                if (success)
                {
                    TotalAlertsDispatchedSession++;
                }
            }
        }
    }

    private async Task CheckPortfolioSentinelAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var sentinelAgent = scope.ServiceProvider.GetRequiredService<IPortfolioSentinelAgent>();
        var dispatcher = scope.ServiceProvider.GetRequiredService<IAlertDispatcherAgent>();

        LastSentinelRunUtc = DateTime.UtcNow;

        var triggeredAlerts = await sentinelAgent.CheckPortfolioTargetsAndStopLossAsync(null, ct);
        if (triggeredAlerts.Count == 0) return;

        _logger.LogInformation("🎯 [WORKER] Sentinel detected {Count} target/stop-loss triggers!", triggeredAlerts.Count);

        foreach (var alert in triggeredAlerts)
        {
            var setting = await context.MarketAgentUserSettings
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.UserId == alert.UserId, ct);

            if (setting == null) continue;

            var dispatched = await dispatcher.DispatchTargetOrLossAlertAsync(alert, setting, ct);
            if (dispatched)
            {
                TotalAlertsDispatchedSession++;
            }
        }
    }

    public static DateTime GetIndianStandardTime(DateTime? utcNow = null)
    {
        var utc = utcNow ?? DateTime.UtcNow;
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById(
                OperatingSystem.IsWindows() ? "India Standard Time" : "Asia/Kolkata");
            return TimeZoneInfo.ConvertTimeFromUtc(utc, tz);
        }
        catch
        {
            return utc.AddHours(5).AddMinutes(30);
        }
    }
}
