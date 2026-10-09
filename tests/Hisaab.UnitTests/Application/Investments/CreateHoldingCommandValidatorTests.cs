using FluentAssertions;
using Hisaab.Application.Features.Investments.Commands;
using Hisaab.Domain.Enums;
using Xunit;

namespace Hisaab.UnitTests.Application.Investments;

public class CreateHoldingCommandValidatorTests
{
    private readonly CreateHoldingCommandValidator _validator = new();

    [Fact]
    public void Validate_ValidHolding_ShouldNotHaveErrors()
    {
        var command = new CreateHoldingCommand(
            Name: "Parag Parikh Flexi Cap Fund",
            Type: InvestmentType.MutualFund,
            InitialInvestedAmount: 10000m,
            InitialUnits: 125.5m,
            CurrentValue: 12000m
        );

        var result = _validator.Validate(command);
        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_EmptyName_ShouldHaveValidationError(string emptyName)
    {
        var command = new CreateHoldingCommand(
            Name: emptyName,
            Type: InvestmentType.Stock,
            InitialInvestedAmount: 5000m
        );

        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Name");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-500)]
    public void Validate_NonPositiveInvestedAmount_ShouldHaveValidationError(decimal nonPositiveAmount)
    {
        var command = new CreateHoldingCommand(
            Name: "Reliance Industries",
            Type: InvestmentType.Stock,
            InitialInvestedAmount: nonPositiveAmount
        );

        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "InitialInvestedAmount");
    }

    [Fact]
    public void Validate_NegativeCurrentValue_ShouldHaveValidationError()
    {
        var command = new CreateHoldingCommand(
            Name: "Sovereign Gold Bond",
            Type: InvestmentType.Gold,
            InitialInvestedAmount: 15000m,
            CurrentValue: -100m
        );

        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "CurrentValue");
    }
}

