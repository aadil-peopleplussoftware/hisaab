namespace Hisaab.Application.Common.Interfaces;

public record DiscordSendResult(
    bool Success,
    string Status, // "Sent", "Failed", "Disabled"
    string? ErrorMessage);

public record DiscordEmbedField(
    string Name,
    string Value,
    bool Inline = true);

public interface IDiscordWebhookService
{
    Task<DiscordSendResult> SendEmbedAlertAsync(
        string webhookUrl,
        string title,
        string description,
        int colorHex,
        List<DiscordEmbedField>? fields = null,
        CancellationToken ct = default);
}
