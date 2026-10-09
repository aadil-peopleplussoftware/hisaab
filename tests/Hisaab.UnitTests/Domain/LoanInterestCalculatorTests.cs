using FluentAssertions;
using Hisaab.Domain.Enums;
using Hisaab.Domain.Services;
using Xunit;

namespace Hisaab.UnitTests.Domain;

public class LoanInterestCalculatorTests
{
    [Fact]
    public void CalculateAccruedInterest_SimpleInterestOneYear_ReturnsExactAmount()
    {
        // Arrange
        var principal = 100000m;
        var annualRate = 10m;
        var startDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var asOfDate = startDate.AddDays(365);

        // Act
        var interest = LoanInterestCalculator.CalculateAccruedInterest(
            principal,
            annualRate,
            LoanInterestType.Simple,
            startDate,
            asOfDate);

        // Assert
        // 100,000 * 10% * 1 = 10,000
        interest.Should().Be(10000m);
    }

    [Fact]
    public void CalculateAccruedInterest_SimpleInterestHalfYear_ReturnsProportionalAmount()
    {
        // Arrange
        var principal = 50000m;
        var annualRate = 12m;
        var startDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var asOfDate = startDate.AddDays(182.5);

        // Act
        var interest = LoanInterestCalculator.CalculateAccruedInterest(
            principal,
            annualRate,
            LoanInterestType.Simple,
            startDate,
            asOfDate);

        // Assert: 50,000 * 12% * 0.5 = 3000
        interest.Should().BeApproximately(3000m, 1m);
    }

    [Fact]
    public void CalculateAccruedInterest_CompoundInterestMonthlyCompounding_ReturnsCorrectAccrual()
    {
        // Arrange
        var principal = 100000m;
        var annualRate = 12m; // 1% per month
        var startDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var asOfDate = startDate.AddDays(365); // 1 year

        // Act
        var interest = LoanInterestCalculator.CalculateAccruedInterest(
            principal,
            annualRate,
            LoanInterestType.Compound,
            startDate,
            asOfDate);

        // Assert: 100,000 * (1.01)^12 - 100,000 = 12,682.50
        interest.Should().BeApproximately(12682.50m, 5m);
    }

    [Theory]
    [InlineData(0, 10, LoanInterestType.Simple)]
    [InlineData(100000, 0, LoanInterestType.Simple)]
    [InlineData(100000, 10, LoanInterestType.None)]
    public void CalculateAccruedInterest_ZeroOrNone_ReturnsZero(
        decimal principal,
        decimal rate,
        LoanInterestType type)
    {
        var startDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var asOfDate = startDate.AddDays(365);

        var interest = LoanInterestCalculator.CalculateAccruedInterest(
            principal,
            rate,
            type,
            startDate,
            asOfDate);

        interest.Should().Be(0m);
    }

    [Fact]
    public void CalculateAccruedInterest_AsOfDateBeforeStartDate_ReturnsZero()
    {
        var startDate = new DateTime(2025, 5, 1, 0, 0, 0, DateTimeKind.Utc);
        var asOfDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        var interest = LoanInterestCalculator.CalculateAccruedInterest(
            100000m,
            10m,
            LoanInterestType.Simple,
            startDate,
            asOfDate);

        interest.Should().Be(0m);
    }

    [Fact]
    public void CalculateDailyInterest_ValidInputs_ReturnsExpectedDailyAmount()
    {
        // 100,000 * 10% / 365 = 27.40
        var daily = LoanInterestCalculator.CalculateDailyInterest(100000m, 10m);
        daily.Should().Be(27.40m);
    }
}

