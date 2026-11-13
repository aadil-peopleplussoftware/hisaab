namespace Hisaab.Application.Common.Interfaces;

public record TelegramSendResult(
    bool Success,
    string Status, // "Sent", "Failed", "Disabled"
    string? MessageId,
    string? ErrorMessage);

public interface ITelegramBotService
{
    Task<TelegramSendResult> SendMessageAsync(
        string botToken,
        string chatId,
        string message,
        CancellationToken ct = default);
}
