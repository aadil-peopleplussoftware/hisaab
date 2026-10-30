using Hisaab.Application.Features.TradeDesk.DTOs;

namespace Hisaab.Application.Common.Interfaces;

public interface IIpoMarketService
{
    Task<List<LiveIpoDto>> GetLiveIposAsync(string? query = null, CancellationToken ct = default);
}

