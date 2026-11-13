using System.Text;
using Hisaab.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace Hisaab.Infrastructure.Services;

public class NtfyService : INtfyService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<NtfyService> _logger;

    public NtfyService(
        IHttpClientFactory httpClientFactory,
        ILogger<NtfyService> logger)
    {
        _httpClient = httpClientFactory.CreateClient("NtfyClient");
        _logger = logger;
    }

    public async Task<NtfySendResult> SendPushNotificationAsync(
        string topic,
        string title,
        string message,
        string priority = "high",
        List<string>? tags = null,
        string? serverUrl = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(topic))
        {
            return new NtfySendResult(false, "Disabled", "ntfy topic is empty");
        }

        var baseServer = string.IsNullOrWhiteSpace(serverUrl) ? "https://ntfy.sh" : serverUrl.TrimEnd('/');
        var cleanTopic = topic.Trim().TrimStart('/');
        var url = $"{baseServer}/{cleanTopic}";

        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, url);
            req.Content = new StringContent(message, Encoding.UTF8, "text/plain");

            if (!string.IsNullOrWhiteSpace(title))
            {
                req.Headers.Add("Title", title);
            }

            req.Headers.Add("Priority", priority);

            if (tags != null && tags.Count > 0)
            {
                req.Headers.Add("Tags", string.Join(",", tags));
            }

            var res = await _httpClient.SendAsync(req, ct);
            if (res.IsSuccessStatusCode)
            {
                _logger.LogInformation("✅ [NTFY SENT] Push alert dispatched to topic {Topic}", cleanTopic);
                return new NtfySendResult(true, "Sent", null);
            }

            var err = await res.Content.ReadAsStringAsync(ct);
            _logger.LogError("❌ [NTFY ERROR] Server responded with {StatusCode}: {Error}", res.StatusCode, err);
            return new NtfySendResult(false, "Failed", err);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ [NTFY EXCEPTION] {Message}", ex.Message);
            return new NtfySendResult(false, "Failed", ex.Message);
        }
    }
}
