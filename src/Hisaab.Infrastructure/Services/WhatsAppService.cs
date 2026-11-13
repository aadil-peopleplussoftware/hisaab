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
        string? customProvider = null,
        string? customApiKey = null,
        string? customInstanceId = null,
        string? customWebhookUrl = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            return new WhatsAppSendResult(false, "Failed", null, null, "Phone number is empty");
        }

        var cleanPhone = CleanPhoneNumber(phoneNumber);
        var clickUrl = GenerateWhatsAppClickUrl(cleanPhone, message);

        var provider = (!string.IsNullOrWhiteSpace(customProvider) ? customProvider : (_configuration["WhatsApp:Provider"] ?? "CallMeBot")).Trim();
        var apiKey = !string.IsNullOrWhiteSpace(customApiKey) ? customApiKey.Trim() : _configuration["WhatsApp:ApiKey"]?.Trim();
        var instanceId = !string.IsNullOrWhiteSpace(customInstanceId) ? customInstanceId.Trim() : _configuration["WhatsApp:InstanceId"]?.Trim();
        var webhookUrl = !string.IsNullOrWhiteSpace(customWebhookUrl) ? customWebhookUrl.Trim() : _configuration["WhatsApp:WebhookUrl"]?.Trim();

        // 1. CallMeBot Integration (100% Free & Zero-Setup Personal Bot)
        if (provider.Equals("CallMeBot", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var encoded = Uri.EscapeDataString(message);
                var callMeBotUrl = $"https://api.callmebot.com/whatsapp.php?phone={cleanPhone}&text={encoded}&apikey={apiKey}";
                var res = await _httpClient.GetAsync(callMeBotUrl, ct);
                if (res.IsSuccessStatusCode)
                {
                    _logger.LogInformation("✅ [WHATSAPP CALLMEBOT SENT] Bot message sent successfully to +{Phone}", cleanPhone);
                    return new WhatsAppSendResult(true, "Sent", Guid.NewGuid().ToString("N"), clickUrl, null);
                }
                var errContent = await res.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("⚠️ [WHATSAPP CALLMEBOT ERROR] Status: {Status}, Content: {Err}", res.StatusCode, errContent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "⚠️ [WHATSAPP CALLMEBOT EXCEPTION] {Message}", ex.Message);
            }
        }

        // 2. UltraMsg Integration (QR code scan linked bot)
        if (provider.Equals("UltraMsg", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(instanceId) && !string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var ultraMsgUrl = $"https://api.ultramsg.com/{instanceId}/messages/chat";
                var formValues = new Dictionary<string, string>
                {
                    ["token"] = apiKey,
                    ["to"] = cleanPhone,
                    ["body"] = message
                };
                var res = await _httpClient.PostAsync(ultraMsgUrl, new FormUrlEncodedContent(formValues), ct);
                if (res.IsSuccessStatusCode)
                {
                    _logger.LogInformation("✅ [WHATSAPP ULTRAMSG SENT] Bot message dispatched to +{Phone}", cleanPhone);
                    return new WhatsAppSendResult(true, "Sent", Guid.NewGuid().ToString("N"), clickUrl, null);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "⚠️ [WHATSAPP ULTRAMSG EXCEPTION] {Message}", ex.Message);
            }
        }

        // 3. Webhook / Cloud API Delivery
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

        // 4. Default / 1-Click Link Mode: Generates verified 1-click WhatsApp deep link
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

