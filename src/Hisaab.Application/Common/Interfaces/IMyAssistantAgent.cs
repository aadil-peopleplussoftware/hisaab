using Hisaab.Application.Features.MarketAi.DTOs;

namespace Hisaab.Application.Common.Interfaces;

public interface IMyAssistantAgent
{
    Task<MyAssistantOverviewDto> GetOverviewAsync(Guid? userId, CancellationToken ct = default);
    Task<MarketOpenDailyReportDto> GenerateMarketOpenReportAsync(Guid? userId, CancellationToken ct = default);
    Task<MarketCloseDailyReportDto> GenerateMarketCloseReportAsync(Guid? userId, CancellationToken ct = default);
    Task<List<PortfolioTargetHitAlertDto>> CheckTargetAndStopLossBreachesAsync(Guid? userId, bool forceCheck = false, CancellationToken ct = default);
}
