using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.TradeDesk.Commands;
using Hisaab.Application.Features.TradeDesk.DTOs;
using Hisaab.Application.Features.TradeDesk.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hisaab.Api.Controllers;

[Authorize]
[Route("api/v1/trade-desk")]
[Route("api/v1/tradedesk")]
public class TradeDeskController : ApiControllerBase
{
    private readonly IStockMarketService _stockMarketService;
    private readonly IIpoMarketService _ipoMarketService;

    public TradeDeskController(
        IStockMarketService stockMarketService,
        IIpoMarketService ipoMarketService)
    {
        _stockMarketService = stockMarketService;
        _ipoMarketService = ipoMarketService;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var result = await Mediator.Send(new GetTradeDeskOverviewQuery());
        return Ok(result);
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var result = await Mediator.Send(new GetTradeDeskDashboardQuery());
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("search-stocks")]
    public async Task<IActionResult> SearchStocks([FromQuery] string? query, CancellationToken ct)
    {
        var results = await _stockMarketService.SearchStocksAsync(query ?? string.Empty, ct);
        return Ok(results);
    }

    [AllowAnonymous]
    [HttpGet("quote/{ticker}")]
    public async Task<IActionResult> GetQuote(string ticker, CancellationToken ct)
    {
        var quote = await _stockMarketService.GetQuoteAsync(ticker, ct);
        return Ok(quote);
    }

    [AllowAnonymous]
    [HttpGet("live-ipos")]
    public async Task<IActionResult> GetLiveIpos([FromQuery] string? query, CancellationToken ct)
    {
        var ipos = await _ipoMarketService.GetLiveIposAsync(query, ct);
        return Ok(ipos);
    }

    [HttpPost("trades")]
    public async Task<IActionResult> CreateTrade([FromBody] CreateTradeOrderCommand command)
    {
        var id = await Mediator.Send(command);
        return Ok(new { id, message = "Trade order created successfully." });
    }

    [HttpPost("trades/{id:guid}/close")]
    public async Task<IActionResult> CloseTrade(Guid id, [FromBody] CloseTradeOrderRequest request)
    {
        var success = await Mediator.Send(new CloseTradeOrderCommand(id, request.SellPrice, request.SellDate, request.TotalCharges, request.Notes));
        if (!success) return NotFound(new { message = "Trade order not found." });
        return Ok(new { message = "Trade closed & net realized P&L calculated successfully." });
    }

    [HttpPut("trades/{id:guid}/close")]
    [HttpPut("trades/{id:guid}/charges")]
    public async Task<IActionResult> UpdateClosedTrade(Guid id, [FromBody] CloseTradeOrderRequest request)
    {
        var success = await Mediator.Send(new UpdateClosedTradeOrderCommand(id, request.SellPrice, request.SellDate, request.TotalCharges, request.Notes));
        if (!success) return NotFound(new { message = "Trade order not found." });
        return Ok(new { message = "Closed trade details and charges updated successfully." });
    }

    [HttpPost("trades/{id:guid}/reopen")]
    public async Task<IActionResult> ReopenTrade(Guid id)
    {
        var success = await Mediator.Send(new ReopenTradeOrderCommand(id));
        if (!success) return NotFound(new { message = "Trade order not found." });
        return Ok(new { message = "Trade reopened successfully and moved back to active trades." });
    }

    [HttpDelete("trades/{id:guid}")]
    public async Task<IActionResult> DeleteTrade(Guid id)
    {
        var success = await Mediator.Send(new DeleteTradeOrderCommand(id));
        if (!success) return NotFound(new { message = "Trade order not found." });
        return Ok(new { message = "Trade order deleted successfully." });
    }

    [HttpPost("ipos")]
    public async Task<IActionResult> CreateIpo([FromBody] CreateIpoApplicationCommand command)
    {
        var id = await Mediator.Send(command);
        return Ok(new { id, message = "IPO application recorded successfully." });
    }

    [HttpPut("ipos/{id:guid}/status")]
    public async Task<IActionResult> UpdateIpoStatus(Guid id, [FromBody] UpdateIpoStatusRequest request)
    {
        var success = await Mediator.Send(new UpdateIpoStatusCommand(
            id,
            request.Status,
            request.SharesAllotted,
            request.ListingPrice,
            request.SellPrice,
            request.SellDate,
            request.Notes
        ));
        if (!success) return NotFound(new { message = "IPO application not found." });
        return Ok(new { message = "IPO status updated successfully." });
    }

    [HttpDelete("ipos/{id:guid}")]
    public async Task<IActionResult> DeleteIpo(Guid id)
    {
        var success = await Mediator.Send(new DeleteIpoApplicationCommand(id));
        if (!success) return NotFound(new { message = "IPO application not found." });
        return Ok(new { message = "IPO application deleted successfully." });
    }
}

public record CloseTradeOrderRequest(
    decimal SellPrice,
    DateTime SellDate,
    decimal TotalCharges = 0,
    string? Notes = null
);

public record UpdateIpoStatusRequest(
    Hisaab.Domain.Entities.IpoApplicationStatus Status,
    int? SharesAllotted,
    decimal? ListingPrice,
    decimal? SellPrice,
    DateTime? SellDate,
    string? Notes
);

