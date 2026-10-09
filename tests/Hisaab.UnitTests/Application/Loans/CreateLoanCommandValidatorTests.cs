using FluentAssertions;
using Hisaab.Application.Features.Loans.Commands;
using Hisaab.Domain.Enums;
using Xunit;

namespace Hisaab.UnitTests.Application.Loans;

public class CreateLoanCommandValidatorTests
{
    private readonly CreateLoanAccountCommandValidator _accountValidator = new();
    private readonly CreateLoanTransactionCommandValidator _txnValidator = new();

    [Fact]
    public void Validate_ValidLoanAccount_ShouldNotHaveErrors()
    {
        var command = new CreateLoanAccountCommand(
            "Friend Loan",
            "Rohit Sharma",
            LoanDirection.Given,
            50000m,
            10m,
            LoanInterestType.Simple,
            DateTime.UtcNow,
            DateTime.UtcNow.AddMonths(6),
            "Personal loan"
        );

        var result = _accountValidator.Validate(command);
        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_EmptyNameOrCounterparty_ShouldHaveValidationError(string empty)
    {
        var command = new CreateLoanAccountCommand(
            empty,
            empty,
            LoanDirection.Given,
            50000m,
            10m,
            LoanInterestType.Simple,
            DateTime.UtcNow,
            null,
            null
        );

        var result = _accountValidator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Name");
        result.Errors.Should().Contain(e => e.PropertyName == "Counterparty");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-500)]
    public void Validate_NonPositivePrincipal_ShouldHaveValidationError(decimal principal)
    {
        var command = new CreateLoanAccountCommand(
            "Car Loan",
            "SBI Bank",
            LoanDirection.Taken,
            principal,
            8.5m,
            LoanInterestType.Compound,
            DateTime.UtcNow,
            null,
            null
        );

        var result = _accountValidator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Principal");
    }

    [Fact]
    public void Validate_DueDateBeforeStartDate_ShouldHaveValidationError()
    {
        var now = DateTime.UtcNow;
        var command = new CreateLoanAccountCommand(
            "Emergency Loan",
            "Aakash",
            LoanDirection.Given,
            25000m,
            0m,
            LoanInterestType.None,
            now,
            now.AddDays(-1), // Due date before start date
            null
        );

        var result = _accountValidator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "DueDate");
    }

    [Fact]
    public void Validate_ValidLoanTransaction_ShouldNotHaveErrors()
    {
        var command = new CreateLoanTransactionCommand(
            Guid.NewGuid(),
            LoanTransactionKind.Repayment,
            10000m,
            DateTime.UtcNow,
            "Partial repayment"
        );

        var result = _txnValidator.Validate(command);
        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-100)]
    public void Validate_NonPositiveTransactionAmount_ShouldHaveValidationError(decimal amount)
    {
        var command = new CreateLoanTransactionCommand(
            Guid.NewGuid(),
            LoanTransactionKind.Repayment,
            amount,
            DateTime.UtcNow,
            "Invalid"
        );

        var result = _txnValidator.Validate(command);
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Amount");
    }
}

