namespace Hisaab.Application.Common.Interfaces;

public record WhatsAppSendResult(
    bool Success,
    string Status,
    string? MessageId,
    string? ClickUrl,
    string? ErrorMessage
);

public interface IWhatsAppService
{
    Task<WhatsAppSendResult> SendWhatsAppMessageAsync(string phoneNumber, string message, CancellationToken ct = default);
    string GenerateWhatsAppClickUrl(string phoneNumber, string message);
}

