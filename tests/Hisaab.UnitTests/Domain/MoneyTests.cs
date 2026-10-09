using FluentAssertions;
using Hisaab.Domain.ValueObjects;
using Xunit;

namespace Hisaab.UnitTests.Domain;

public class MoneyTests
{
    [Fact]
    public void Money_ShouldRoundToTwoDecimalPlaces()
    {
        // Arrange & Act
        var money = new Money(123.456m);

        // Assert
        money.Amount.Should().Be(123.46m);
    }

    [Fact]
    public void Money_ShouldAddAmountsWithSameCurrency()
    {
        // Arrange
        var m1 = new Money(100.50m);
        var m2 = new Money(200.25m);

        // Act
        var result = m1 + m2;

        // Assert
        result.Amount.Should().Be(300.75m);
        result.Currency.Should().Be("INR");
    }

    [Fact]
    public void Money_ShouldSubtractAmountsWithSameCurrency()
    {
        // Arrange
        var m1 = new Money(500.00m);
        var m2 = new Money(150.25m);

        // Act
        var result = m1 - m2;

        // Assert
        result.Amount.Should().Be(349.75m);
    }

    [Fact]
    public void Money_ShouldThrowWhenAddingDifferentCurrencies()
    {
        // Arrange
        var m1 = new Money(100m, "INR");
        var m2 = new Money(100m, "USD");

        // Act
        var act = () => { _ = m1 + m2; };

        // Assert
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*different currencies*");
    }

    [Fact]
    public void Money_ShouldFormatAccordingToIndianNumberingSystem()
    {
        // Arrange
        var money = new Money(125000.00m);

        // Act
        var formatted = money.ToIndianFormat();

        // Assert - Expecting ₹1,25,000.00
        formatted.Should().Be("₹1,25,000.00");
    }

    [Fact]
    public void Money_ShouldSupportComparisonOperators()
    {
        // Arrange
        var smaller = new Money(100m);
        var larger = new Money(200m);

        // Assert
        (smaller < larger).Should().BeTrue();
        (larger > smaller).Should().BeTrue();
        (smaller <= larger).Should().BeTrue();
        (larger >= smaller).Should().BeTrue();
        (smaller == new Money(100m)).Should().BeTrue();
    }
}

