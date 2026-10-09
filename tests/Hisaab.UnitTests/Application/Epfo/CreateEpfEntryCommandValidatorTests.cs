using FluentAssertions;
using Hisaab.Application.Features.Epfo.Commands;
using Xunit;

namespace Hisaab.UnitTests.Application.Epfo;

public class CreateEpfEntryCommandValidatorTests
{
    private readonly CreateEpfEntryCommandValidator _validator = new();

    [Fact]
    public void Validate_ValidCommand_ShouldNotHaveErrors()
    {
        var command = new CreateEpfEntryCommand(
            Month: new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
            EmployeeShare: 1800m,
            EmployerShare: 550m,
            PensionShare: 1250m,
            Interest: 0m,
            Withdrawal: 0m,
            Note: "October 2026 salary"
        );

        var result = _validator.Validate(command);
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_AllZeroAmounts_ShouldHaveValidationError()
    {
        var command = new CreateEpfEntryCommand(
            Month: new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
            EmployeeShare: 0m,
            EmployerShare: 0m,
            PensionShare: 0m,
            Interest: 0m,
            Withdrawal: 0m
        );

        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
    }

    [Theory]
    [InlineData(-100)]
    public void Validate_NegativeEmployeeShare_ShouldHaveValidationError(decimal negativeAmount)
    {
        var command = new CreateEpfEntryCommand(
            Month: new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
            EmployeeShare: negativeAmount,
            EmployerShare: 500m,
            PensionShare: 1250m
        );

        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "EmployeeShare");
    }

    [Fact]
    public void Validate_EmptyMonth_ShouldHaveValidationError()
    {
        var command = new CreateEpfEntryCommand(
            Month: default,
            EmployeeShare: 1800m,
            EmployerShare: 550m,
            PensionShare: 1250m
        );

        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Month");
    }
}

