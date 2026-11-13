using Hisaab.Application.Features.MarketAi.DTOs;
using Hisaab.Domain.Entities;

namespace Hisaab.Application.Common.Interfaces;

public interface IAlertDispatcherAgent
{
    Task<bool> DispatchPreMarketReportAsync(PreMarketDailyReportDto report, MarketAgentUserSetting setting, CancellationToken ct = default);
    Task<bool> DispatchMarketOpenReportAsync(MarketOpenDailyReportDto report, MarketAgentUserSetting setting, CancellationToken ct = default);
    Task<bool> DispatchMarketCloseReportAsync(MarketCloseDailyReportDto report, MarketAgentUserSetting setting, CancellationToken ct = default);
    Task<bool> DispatchTargetOrLossAlertAsync(PortfolioTargetHitAlertDto alert, MarketAgentUserSetting setting, CancellationToken ct = default);
    Task<MarketAgentAlertLogDto> SendTestNotificationAsync(
        Guid userId,
        string? customPhone = null,
        string? customEmail = null,
        string? customTelegramToken = null,
        string? customTelegramChatId = null,
        string? customDiscordUrl = null,
        string? customNtfyTopic = null,
        CancellationToken ct = default);
}

