using System.Net;
using FluentAssertions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using Xunit;

namespace Hisaab.UnitTests.Infrastructure;

public class MultiChannelAlertServiceTests
{
    private class FakeHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responseFactory;

        public FakeHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
        {
            _responseFactory = responseFactory;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(_responseFactory(request));
        }
    }

    [Fact]
    public async Task TelegramBotService_ShouldReturnSent_WhenApiReturnsSuccess()
    {
        // Arrange
        var handler = new FakeHttpMessageHandler(req => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("{\"ok\":true,\"result\":{\"message_id\":1234}}")
        });

        var factory = Substitute.For<IHttpClientFactory>();
        factory.CreateClient("TelegramClient").Returns(new HttpClient(handler));

        var service = new TelegramBotService(factory, NullLogger<TelegramBotService>.Instance);

        // Act
        var result = await service.SendMessageAsync("123456:ABC-DEF1234ghIkl", "987654321", "Test Message");

        // Assert
        result.Success.Should().BeTrue();
        result.Status.Should().Be("Sent");
    }

    [Fact]
    public async Task TelegramBotService_ShouldReturnDisabled_WhenTokenOrChatIdMissing()
    {
        // Arrange
        var factory = Substitute.For<IHttpClientFactory>();
        var service = new TelegramBotService(factory, NullLogger<TelegramBotService>.Instance);

        // Act
        var result = await service.SendMessageAsync("", "", "Test");

        // Assert
        result.Success.Should().BeFalse();
        result.Status.Should().Be("Disabled");
    }

    [Fact]
    public async Task DiscordWebhookService_ShouldReturnSent_WhenWebhookReturnsSuccess()
    {
        // Arrange
        var handler = new FakeHttpMessageHandler(req => new HttpResponseMessage(HttpStatusCode.NoContent));

        var factory = Substitute.For<IHttpClientFactory>();
        factory.CreateClient("DiscordClient").Returns(new HttpClient(handler));

        var service = new DiscordWebhookService(factory, NullLogger<DiscordWebhookService>.Instance);

        // Act
        var result = await service.SendEmbedAlertAsync(
            "https://discord.com/api/webhooks/123/abc",
            "🎯 Target Hit",
            "Dixon Tech hit target profit",
            0x16A34A);

        // Assert
        result.Success.Should().BeTrue();
        result.Status.Should().Be("Sent");
    }

    [Fact]
    public async Task NtfyService_ShouldReturnSent_WhenServerReturnsSuccess()
    {
        // Arrange
        var handler = new FakeHttpMessageHandler(req => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("{\"id\":\"abc\",\"event\":\"message\"}")
        });

        var factory = Substitute.For<IHttpClientFactory>();
        factory.CreateClient("NtfyClient").Returns(new HttpClient(handler));

        var service = new NtfyService(factory, NullLogger<NtfyService>.Instance);

        // Act
        var result = await service.SendPushNotificationAsync(
            "hisaab-test-topic",
            "🔔 Market Bell",
            "Market opened at 09:15 AM");

        // Assert
        result.Success.Should().BeTrue();
        result.Status.Should().Be("Sent");
    }
}
