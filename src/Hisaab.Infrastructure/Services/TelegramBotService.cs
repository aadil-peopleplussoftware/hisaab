using System.Net.Http.Json;
using System.Text.Json;
using Hisaab.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace Hisaab.Infrastructure.Services;

public class TelegramBotService : ITelegramBotService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<TelegramBotService> _logger;

    public TelegramBotService(
        IHttpClientFactory httpClientFactory,
        ILogger<TelegramBotService> logger)
    {
        _httpClient = httpClientFactory.CreateClient("TelegramClient");
        _logger = logger;
    }

    public async Task<TelegramSendResult> SendMessageAsync(
        string botToken,
        string chatId,
        string message,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(botToken) || string.IsNullOrWhiteSpace(chatId))
        {
            return new TelegramSendResult(false, "Disabled", null, "Bot token or Chat ID is empty");
        }

        var cleanToken = botToken.Trim();
        var cleanChatId = chatId.Trim();
        var url = $"https://api.telegram.org/bot{cleanToken}/sendMessage";

        try
        {
            // 1. Try sending with Markdown formatting
            var payload = new
            {
                chat_id = cleanChatId,
                text = message,
                parse_mode = "Markdown",
                disable_web_page_preview = false
            };

            var res = await _httpClient.PostAsJsonAsync(url, payload, ct);
            if (res.IsSuccessStatusCode)
            {
                var content = await res.Content.ReadAsStringAsync(ct);
                _logger.LogInformation("✅ [TELEGRAM SENT] Message dispatched to chat {ChatId}", cleanChatId);
                return new TelegramSendResult(true, "Sent", Guid.NewGuid().ToString("N"), null);
            }

            // 2. If Markdown parsing error, fallback to plain text
            var err = await res.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("⚠️ [TELEGRAM MARKDOWN FAILED] Retrying with plain text. Error: {Error}", err);

            var fallbackPayload = new
            {
                chat_id = cleanChatId,
                text = message,
                disable_web_page_preview = false
            };

            var fallbackRes = await _httpClient.PostAsJsonAsync(url, fallbackPayload, ct);
            if (fallbackRes.IsSuccessStatusCode)
            {
                _logger.LogInformation("✅ [TELEGRAM SENT PLAINTEXT] Message dispatched to chat {ChatId}", cleanChatId);
                return new TelegramSendResult(true, "Sent", Guid.NewGuid().ToString("N"), null);
            }

            var finalErr = await fallbackRes.Content.ReadAsStringAsync(ct);
            _logger.LogError("❌ [TELEGRAM ERROR] Failed to send message to chat {ChatId}: {Error}", cleanChatId, finalErr);
            return new TelegramSendResult(false, "Failed", null, finalErr);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ [TELEGRAM EXCEPTION] {Message}", ex.Message);
            return new TelegramSendResult(false, "Failed", null, ex.Message);
        }
    }
}
