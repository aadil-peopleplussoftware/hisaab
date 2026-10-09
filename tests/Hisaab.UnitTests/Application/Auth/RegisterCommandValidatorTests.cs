using FluentAssertions;
using Hisaab.Application.Features.Auth.Commands.Register;
using Xunit;

namespace Hisaab.UnitTests.Application.Auth;

public class RegisterCommandValidatorTests
{
    private readonly RegisterCommandValidator _validator = new();

    [Fact]
    public void Validate_ValidCommand_ShouldNotHaveErrors()
    {
        var command = new RegisterCommand("test@hisaab.com", "P@ssword123!", "John Doe");
        var result = _validator.Validate(command);

        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("invalid-email")]
    [InlineData("@missinguser.com")]
    public void Validate_InvalidEmail_ShouldHaveValidationError(string email)
    {
        var command = new RegisterCommand(email, "P@ssword123!", "John Doe");
        var result = _validator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Email");
    }

    [Theory]
    [InlineData("short1!")] // < 8 chars
    [InlineData("alllowercase1!")] // missing uppercase
    [InlineData("ALLUPPERCASE1!")] // missing lowercase
    [InlineData("NoNumberAtAll!")] // missing digit
    [InlineData("NoSpecialChar123")] // missing special char
    public void Validate_WeakPassword_ShouldHaveValidationError(string password)
    {
        var command = new RegisterCommand("test@hisaab.com", password, "John Doe");
        var result = _validator.Validate(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Password");
    }
}
