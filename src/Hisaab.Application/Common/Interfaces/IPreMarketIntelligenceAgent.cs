using Hisaab.Application.Features.MarketAi.DTOs;

namespace Hisaab.Application.Common.Interfaces;

public interface IPreMarketIntelligenceAgent
{
    Task<PreMarketDailyReportDto> GenerateDailyBriefingAsync(CancellationToken ct = default);
}

