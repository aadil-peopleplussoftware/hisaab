using FluentAssertions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.MarketAi.DTOs;
using Hisaab.Domain.Entities;
using Hisaab.Infrastructure.Persistence;
using Hisaab.Infrastructure.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace Hisaab.UnitTests.Infrastructure;

public class MyAssistantAgentTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly ApplicationDbContext _context;
    private readonly IStockMarketService _stockMarketService;
    private readonly MyAssistantAgent _agent;
    private readonly Guid _userId = Guid.NewGuid();

    public MyAssistantAgentTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(_connection)
            .Options;

        var currentUserService = Substitute.For<ICurrentUserService>();
        currentUserService.UserId.Returns(_userId);
        var dateTimeService = Substitute.For<IDateTimeService>();
        dateTimeService.UtcNow.Returns(DateTime.UtcNow);

        _context = new ApplicationDbContext(options, currentUserService, dateTimeService);
        _context.Database.EnsureCreated();

        _stockMarketService = Substitute.For<IStockMarketService>();
        _agent = new MyAssistantAgent(_context, _stockMarketService, NullLogger<MyAssistantAgent>.Instance);
    }

    [Fact]
    public async Task CheckTargetAndStopLossBreaches_ShouldTriggerTargetHitAlert_WhenCMPReachesTarget()
    {
        // Arrange
        var holding = new StockHolding
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            Ticker = "RELIANCE.NS",
            CompanyName = "Reliance Industries Ltd",
            BuyPrice = 2800m,
            Quantity = 10m,
            TargetPrice = 3000m,
            StopLossPrice = 2700m,
            PurchaseDate = DateTime.UtcNow
        };
        _context.StockHoldings.Add(holding);
        await _context.SaveChangesAsync();

        var quote = new MarketQuoteDto(
            Ticker: "RELIANCE.NS",
            CompanyName: "Reliance Industries Ltd",
            Exchange: "NSE",
            CurrentPrice: 3050m,
            DayChange: 50m,
            DayChangePercent: 1.67m,
            DayHigh: 3060m,
            DayLow: 2980m,
            High52Week: 3200m,
            Low52Week: 2200m,
            Volume: 1000000,
            LastUpdatedUtc: DateTime.UtcNow,
            IsMarketOpen: true,
            OpenPrice: 2990m,
            PreviousClose: 3000m
        );

        _stockMarketService.GetQuotesAsync(Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>())
            .Returns(new Dictionary<string, MarketQuoteDto>(StringComparer.OrdinalIgnoreCase)
            {
                ["RELIANCE.NS"] = quote
            });

        // Act
        var alerts = await _agent.CheckTargetAndStopLossBreachesAsync(_userId);

        // Assert
        alerts.Should().HaveCount(1);
        var alert = alerts[0];
        alert.Ticker.Should().Be("RELIANCE.NS");
        alert.AlertType.Should().Be("TARGET_PRICE_REACHED");
        alert.CurrentPrice.Should().Be(3050m);
        alert.TotalProfit.Should().Be(2500m); // (3050 - 2800) * 10
        alert.FormattedWhatsAppMessage.Should().Contain("TARGET PRICE REACHED");
        alert.FormattedWhatsAppMessage.Should().Contain("Reliance Industries Ltd");
        alert.FormattedWhatsAppMessage.Should().Contain("Total P&L");
    }

    [Fact]
    public async Task CheckTargetAndStopLossBreaches_ShouldTriggerStopLossAlert_WhenCMPDropsBelowStopLoss()
    {
        // Arrange
        var holding = new StockHolding
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            Ticker = "TCS.NS",
            CompanyName = "Tata Consultancy Services",
            BuyPrice = 4000m,
            Quantity = 5m,
            TargetPrice = 4400m,
            StopLossPrice = 3850m,
            PurchaseDate = DateTime.UtcNow
        };
        _context.StockHoldings.Add(holding);
        await _context.SaveChangesAsync();

        var quote = new MarketQuoteDto(
            Ticker: "TCS.NS",
            CompanyName: "Tata Consultancy Services",
            Exchange: "NSE",
            CurrentPrice: 3800m,
            DayChange: -100m,
            DayChangePercent: -2.56m,
            DayHigh: 3950m,
            DayLow: 3790m,
            High52Week: 4500m,
            Low52Week: 3300m,
            Volume: 500000,
            LastUpdatedUtc: DateTime.UtcNow,
            IsMarketOpen: true,
            OpenPrice: 3880m,
            PreviousClose: 3900m
        );

        _stockMarketService.GetQuotesAsync(Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>())
            .Returns(new Dictionary<string, MarketQuoteDto>(StringComparer.OrdinalIgnoreCase)
            {
                ["TCS.NS"] = quote
            });

        // Act
        var alerts = await _agent.CheckTargetAndStopLossBreachesAsync(_userId);

        // Assert
        alerts.Should().HaveCount(1);
        var alert = alerts[0];
        alert.Ticker.Should().Be("TCS.NS");
        alert.AlertType.Should().Be("STOP_LOSS_BREACHED");
        alert.CurrentPrice.Should().Be(3800m);
        alert.FormattedWhatsAppMessage.Should().Contain("STOP-LOSS BREACHED");
        alert.FormattedWhatsAppMessage.Should().Contain("Dhyan dein!");
    }

    [Fact]
    public async Task GenerateMarketOpenReport_ShouldIncludeAccurateOpenPriceAndGapAnalysis()
    {
        // Arrange
        var holding = new StockHolding
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            Ticker = "INFY.NS",
            CompanyName = "Infosys Ltd",
            BuyPrice = 1800m,
            Quantity = 20m,
            TargetPrice = 2000m,
            StopLossPrice = 1700m,
            PurchaseDate = DateTime.UtcNow
        };
        _context.StockHoldings.Add(holding);
        await _context.SaveChangesAsync();

        var quote = new MarketQuoteDto(
            Ticker: "INFY.NS",
            CompanyName: "Infosys Ltd",
            Exchange: "NSE",
            CurrentPrice: 1850m,
            DayChange: 30m,
            DayChangePercent: 1.65m,
            DayHigh: 1860m,
            DayLow: 1840m,
            High52Week: 2000m,
            Low52Week: 1350m,
            Volume: 800000,
            LastUpdatedUtc: DateTime.UtcNow,
            IsMarketOpen: true,
            OpenPrice: 1845m,
            PreviousClose: 1820m
        );

        _stockMarketService.GetQuotesAsync(Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>())
            .Returns(new Dictionary<string, MarketQuoteDto>(StringComparer.OrdinalIgnoreCase)
            {
                ["INFY.NS"] = quote
            });

        // Act
        var report = await _agent.GenerateMarketOpenReportAsync(_userId);

        // Assert
        report.TotalHoldingsTracked.Should().Be(1);
        report.Stocks.Should().HaveCount(1);
        var stock = report.Stocks[0];
        stock.OpenPrice.Should().Be(1845m);
        stock.PreviousClose.Should().Be(1820m);
        stock.GapPercentage.Should().Be(1.37m);
        stock.GapStatus.Should().Be("GAP_UP");
        report.FormattedWhatsAppMessage.Should().Contain("MARKET OPEN REPORT");
        report.FormattedWhatsAppMessage.Should().Contain("1,845.00");
    }

    [Fact]
    public async Task GenerateMarketCloseReport_ShouldCalculateDayPnlAndClosePrice()
    {
        // Arrange
        var holding = new StockHolding
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            Ticker = "HDFCBANK.NS",
            CompanyName = "HDFC Bank Ltd",
            BuyPrice = 1600m,
            Quantity = 10m,
            TargetPrice = 1750m,
            StopLossPrice = 1520m,
            PurchaseDate = DateTime.UtcNow
        };
        _context.StockHoldings.Add(holding);
        await _context.SaveChangesAsync();

        var quote = new MarketQuoteDto(
            Ticker: "HDFCBANK.NS",
            CompanyName: "HDFC Bank Ltd",
            Exchange: "NSE",
            CurrentPrice: 1680m,
            DayChange: 25m,
            DayChangePercent: 1.51m,
            DayHigh: 1690m,
            DayLow: 1650m,
            High52Week: 1800m,
            Low52Week: 1350m,
            Volume: 1200000,
            LastUpdatedUtc: DateTime.UtcNow,
            IsMarketOpen: false,
            OpenPrice: 1660m,
            PreviousClose: 1655m
        );

        _stockMarketService.GetQuotesAsync(Arg.Any<IEnumerable<string>>(), Arg.Any<CancellationToken>())
            .Returns(new Dictionary<string, MarketQuoteDto>(StringComparer.OrdinalIgnoreCase)
            {
                ["HDFCBANK.NS"] = quote
            });

        // Act
        var report = await _agent.GenerateMarketCloseReportAsync(_userId);

        // Assert
        report.TotalHoldingsTracked.Should().Be(1);
        report.DayTotalGainLoss.Should().Be(250m); // 25 * 10
        report.OverallTotalGainLoss.Should().Be(800m); // (1680 - 1600) * 10
        report.Stocks[0].ClosePrice.Should().Be(1680m);
        report.FormattedWhatsAppMessage.Should().Contain("MARKET CLOSE REPORT");
        report.FormattedWhatsAppMessage.Should().Contain("800.00");
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }
}
