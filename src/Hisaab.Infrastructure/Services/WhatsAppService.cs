using System.Net.Http.Json;
using Hisaab.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Hisaab.Infrastructure.Services;

public class WhatsAppService : IWhatsAppService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<WhatsAppService> _logger;
    private readonly HttpClient _httpClient;

    public WhatsAppService(
        IConfiguration configuration,
        ILogger<WhatsAppService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("WhatsAppClient");
    }

    public async Task<WhatsAppSendResult> SendWhatsAppMessageAsync(
        string phoneNumber,
        string message,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            return new WhatsAppSendResult(false, "Failed", null, null, "Phone number is empty");
        }

        var cleanPhone = CleanPhoneNumber(phoneNumber);
        var clickUrl = GenerateWhatsAppClickUrl(cleanPhone, message);

        var webhookUrl = _configuration["WhatsApp:WebhookUrl"];
        var apiKey = _configuration["WhatsApp:ApiKey"];
        var provider = _configuration["WhatsApp:Provider"]?.ToLowerInvariant() ?? "simulated";

        // If Webhook or API is configured, attempt direct delivery
        if (!string.IsNullOrWhiteSpace(webhookUrl))
        {
            try
            {
                var payload = new
                {
                    to = cleanPhone,
                    body = message,
                    timestamp = DateTime.UtcNow
                };

                using var req = new HttpRequestMessage(HttpMethod.Post, webhookUrl);
                if (!string.IsNullOrWhiteSpace(apiKey))
                {
                    req.Headers.Add("Authorization", $"Bearer {apiKey}");
                }
                req.Content = JsonContent.Create(payload);

                var res = await _httpClient.SendAsync(req, ct);
                if (res.IsSuccessStatusCode)
                {
                    _logger.LogInformation("✅ [WHATSAPP DISPATCHED] To: {Phone} via Webhook", cleanPhone);
                    return new WhatsAppSendResult(true, "Sent", Guid.NewGuid().ToString("N"), clickUrl, null);
                }

                _logger.LogWarning("⚠️ [WHATSAPP HTTP ERROR] Webhook status: {Status}", res.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "⚠️ [WHATSAPP EXCEPTION] Failed dispatching to webhook: {Message}", ex.Message);
            }
        }

        // Development / Fallback mode: generate verified 1-click WhatsApp deep link
        _logger.LogInformation(
            "📲 [WHATSAPP ALERT READY]\nRecipient: +{Phone}\nMessage Preview:\n{Msg}\nWhatsApp Click-to-Send Link: {Url}",
            cleanPhone, message, clickUrl);

        return new WhatsAppSendResult(true, "Ready", Guid.NewGuid().ToString("N"), clickUrl, null);
    }

    public string GenerateWhatsAppClickUrl(string phoneNumber, string message)
    {
        var clean = CleanPhoneNumber(phoneNumber);
        var encoded = Uri.EscapeDataString(message);
        return $"https://wa.me/{clean}?text={encoded}";
    }

    private static string CleanPhoneNumber(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "919999999999";

        // Remove all non-digits
        var digitsOnly = new string(raw.Where(char.IsDigit).ToArray());

        // Default to India (+91) if 10-digit number
        if (digitsOnly.Length == 10)
        {
            return "91" + digitsOnly;
        }

        // If starts with 0 and followed by 10 digits
        if (digitsOnly.Length == 11 && digitsOnly.StartsWith('0'))
        {
            return "91" + digitsOnly.Substring(1);
        }

        return digitsOnly;
    }
}

