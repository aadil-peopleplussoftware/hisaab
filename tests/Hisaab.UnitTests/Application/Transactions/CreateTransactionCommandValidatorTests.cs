using FluentAssertions;
using Hisaab.Application.Features.Transactions.Commands.CreateTransaction;
using Hisaab.Domain.Enums;
using Xunit;

namespace Hisaab.UnitTests.Application.Transactions;

public class CreateTransactionCommandValidatorTests
{
    private readonly CreateTransactionCommandValidator _validator = new();

    [Fact]
    public void Validate_ValidCommand_ShouldNotHaveErrors()
    {
        var command = new CreateTransactionCommand(
            TransactionType.Expense,
            1500.50m,
            Guid.NewGuid(),
            DateTime.UtcNow,
            "Grocery shopping"
        );

        var result = _validator.Validate(command);
        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-50)]
    public void Validate_NonPositiveAmount_ShouldHaveValidationError(decimal amount)
    {
        var command = new CreateTransactionCommand(
            TransactionType.Expense,
            amount,
            Guid.NewGuid(),
            DateTime.UtcNow
        );

        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Amount");
    }

    [Fact]
    public void Validate_EmptyCategory_ShouldHaveValidationError()
    {
        var command = new CreateTransactionCommand(
            TransactionType.Income,
            50000m,
            Guid.Empty,
            DateTime.UtcNow
        );

        var result = _validator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "CategoryId");
    }
}

