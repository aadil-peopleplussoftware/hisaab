using Hisaab.Application.Features.MarketAi.DTOs;
using Hisaab.Domain.Entities;

namespace Hisaab.Application.Common.Interfaces;

public interface IAlertDispatcherAgent
{
    Task<bool> DispatchPreMarketReportAsync(PreMarketDailyReportDto report, MarketAgentUserSetting setting, CancellationToken ct = default);
    Task<bool> DispatchTargetOrLossAlertAsync(PortfolioTargetHitAlertDto alert, MarketAgentUserSetting setting, CancellationToken ct = default);
    Task<MarketAgentAlertLogDto> SendTestNotificationAsync(Guid userId, string? customPhone = null, string? customEmail = null, CancellationToken ct = default);
}

