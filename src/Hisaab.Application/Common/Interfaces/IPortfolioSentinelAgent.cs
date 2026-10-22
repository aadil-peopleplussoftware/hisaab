using Hisaab.Application.Features.MarketAi.DTOs;

namespace Hisaab.Application.Common.Interfaces;

public interface IPortfolioSentinelAgent
{
    Task<List<PortfolioTargetHitAlertDto>> CheckPortfolioTargetsAndStopLossAsync(Guid? targetUserId = null, CancellationToken ct = default);
}

