using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Hisaab.Application.Features.Auth.DTOs;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Hisaab.IntegrationTests;

public class AuthEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AuthEndpointsTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Register_WithValidData_ShouldReturnOkAndTokens()
    {
        // Arrange
        var uniqueEmail = $"user_{Guid.NewGuid()}@hisaab.com";
        var payload = new
        {
            Email = uniqueEmail,
            Password = "P@ssword123!",
            FullName = "Rahul Sharma"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", payload);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var authResponse = await response.Content.ReadFromJsonAsync<AuthResponseDto>();
        authResponse.Should().NotBeNull();
        authResponse!.AccessToken.Should().NotBeNullOrWhiteSpace();
        authResponse.User.Email.Should().Be(uniqueEmail.ToLowerInvariant());
        authResponse.User.FullName.Should().Be("Rahul Sharma");

        // Verify httpOnly cookie set
        response.Headers.Should().ContainKey("Set-Cookie");
        var cookieHeader = response.Headers.GetValues("Set-Cookie").FirstOrDefault();
        cookieHeader.Should().Contain("hisaab_refresh_token=");
        cookieHeader.Should().Contain("httponly");
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_ShouldReturnBadRequest()
    {
        // Arrange
        var email = $"dup_{Guid.NewGuid()}@hisaab.com";
        var payload = new
        {
            Email = email,
            Password = "P@ssword123!",
            FullName = "Duplicate User"
        };

        var firstResp = await _client.PostAsJsonAsync("/api/v1/auth/register", payload);
        firstResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Act - register same email again
        var secondResp = await _client.PostAsJsonAsync("/api/v1/auth/register", payload);

        // Assert
        secondResp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var content = await secondResp.Content.ReadAsStringAsync();
        content.Should().Contain("already exists");
    }

    [Fact]
    public async Task Login_WithInvalidCredentials_ShouldReturnBadRequest()
    {
        // Arrange
        var payload = new
        {
            Email = "nonexistent@hisaab.com",
            Password = "WrongPassword123!"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", payload);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
