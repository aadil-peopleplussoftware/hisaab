using System.Net.Http.Json;
using Hisaab.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace Hisaab.Infrastructure.Services;

public class DiscordWebhookService : IDiscordWebhookService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<DiscordWebhookService> _logger;

    public DiscordWebhookService(
        IHttpClientFactory httpClientFactory,
        ILogger<DiscordWebhookService> logger)
    {
        _httpClient = httpClientFactory.CreateClient("DiscordClient");
        _logger = logger;
    }

    public async Task<DiscordSendResult> SendEmbedAlertAsync(
        string webhookUrl,
        string title,
        string description,
        int colorHex,
        List<DiscordEmbedField>? fields = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(webhookUrl))
        {
            return new DiscordSendResult(false, "Disabled", "Discord webhook URL is empty");
        }

        var cleanUrl = webhookUrl.Trim();

        try
        {
            var embedFields = fields?.Select(f => new
            {
                name = f.Name,
                value = f.Value,
                @inline = f.Inline
            }).ToList();

            var payload = new
            {
                username = "Hisaab Market Sentinel",
                avatar_url = "https://img.icons8.com/color/96/bullish.png",
                embeds = new[]
                {
                    new
                    {
                        title = title,
                        description = description,
                        color = colorHex,
                        fields = embedFields,
                        footer = new
                        {
                            text = "Hisaab Autonomous Stock Agent • Indian Market Live",
                            icon_url = "https://img.icons8.com/color/48/india-flag.png"
                        },
                        timestamp = DateTime.UtcNow.ToString("o")
                    }
                }
            };

            var res = await _httpClient.PostAsJsonAsync(cleanUrl, payload, ct);
            if (res.IsSuccessStatusCode)
            {
                _logger.LogInformation("✅ [DISCORD SENT] Embed alert posted to webhook successfully.");
                return new DiscordSendResult(true, "Sent", null);
            }

            var err = await res.Content.ReadAsStringAsync(ct);
            _logger.LogError("❌ [DISCORD ERROR] Webhook responded with {StatusCode}: {Error}", res.StatusCode, err);
            return new DiscordSendResult(false, "Failed", err);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ [DISCORD EXCEPTION] {Message}", ex.Message);
            return new DiscordSendResult(false, "Failed", ex.Message);
        }
    }
}
