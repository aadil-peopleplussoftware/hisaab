using FluentAssertions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Common.Models;
using Hisaab.Application.Features.Auth.Commands.Register;
using Hisaab.Application.Features.Auth.DTOs;
using NSubstitute;
using Xunit;

namespace Hisaab.UnitTests.Application.Auth;

public class RegisterCommandHandlerTests
{
    private readonly IIdentityService _identityService = Substitute.For<IIdentityService>();

    [Fact]
    public async Task Handle_WhenValidRequest_ShouldCallIdentityService()
    {
        // Arrange
        var command = new RegisterCommand("user@hisaab.com", "P@ssword123!", "Jane Doe");
        var userDto = new UserDto(Guid.NewGuid(), "user@hisaab.com", "Jane Doe", null, "User", "Asia/Kolkata", "en-IN");
        var authResponse = new AuthResponseDto("access-token-123", "refresh-token-123", 900, userDto);

        _identityService.RegisterAsync(command.Email, command.Password, command.FullName, Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<CancellationToken>())
            .Returns(Result<AuthResponseDto>.Success(authResponse));

        var handler = new RegisterCommandHandler(_identityService);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Succeeded.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.AccessToken.Should().Be("access-token-123");
        result.Data.User.Email.Should().Be("user@hisaab.com");
    }
}
