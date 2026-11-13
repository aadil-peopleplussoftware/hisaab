namespace Hisaab.Application.Common.Interfaces;

public record NtfySendResult(
    bool Success,
    string Status, // "Sent", "Failed", "Disabled"
    string? ErrorMessage);

public interface INtfyService
{
    Task<NtfySendResult> SendPushNotificationAsync(
        string topic,
        string title,
        string message,
        string priority = "high",
        List<string>? tags = null,
        string? serverUrl = null,
        CancellationToken ct = default);
}
