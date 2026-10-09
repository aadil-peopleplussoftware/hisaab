using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Hisaab.IntegrationTests;

public class HealthCheckTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public HealthCheckTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task HealthEndpoint_ShouldReturnHealthyStatus()
    {
        // Act
        var response = await _client.GetAsync("/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("Healthy");
    }

    [Fact]
    public async Task Request_ShouldIncludeOwaspSecurityHeaders()
    {
        // Act
        var response = await _client.GetAsync("/health");

        // Assert
        response.Headers.Should().ContainKey("X-Frame-Options")
            .WhoseValue.Should().Contain("DENY");

        response.Headers.Should().ContainKey("X-Content-Type-Options")
            .WhoseValue.Should().Contain("nosniff");

        response.Headers.Should().ContainKey("Referrer-Policy")
            .WhoseValue.Should().Contain("strict-origin-when-cross-origin");

        response.Headers.Should().ContainKey("Content-Security-Policy");
    }
}

