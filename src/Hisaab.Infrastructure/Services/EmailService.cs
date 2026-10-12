using System.Net;
using System.Net.Mail;
using Hisaab.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Hisaab.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(toEmail)) return false;

        var host = _configuration["Smtp:Host"] ?? "smtp.gmail.com";
        var port = int.TryParse(_configuration["Smtp:Port"], out var p) ? p : 587;
        var enableSsl = !bool.TryParse(_configuration["Smtp:EnableSsl"], out var ssl) || ssl;
        var username = _configuration["Smtp:Username"];
        var password = _configuration["Smtp:Password"];
        var senderEmail = _configuration["Smtp:SenderEmail"] ?? "no-reply@hisaab.app";
        var senderName = _configuration["Smtp:SenderName"] ?? "Hisaab Finance OS";

        // If credentials are not configured in appsettings.json, log for development
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogInformation(
                "📧 [EMAIL DISPATCH - SMTP NOT CONFIGURED]\nTo: {ToEmail}\nSubject: {Subject}\nNote: Configure 'Smtp:Username' & 'Smtp:Password' (Gmail App Password) in appsettings.json for direct inbox delivery.",
                toEmail, subject);
            return false;
        }

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(senderEmail, senderName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };
            message.To.Add(toEmail);

            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(username, password),
                Timeout = 10000
            };

            await client.SendMailAsync(message, cancellationToken);
            _logger.LogInformation("✅ [REAL EMAIL SENT] To: {ToEmail} via {Host}:{Port}", toEmail, host, port);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "⚠️ [SMTP ERROR] Could not dispatch email to {ToEmail}: {Error}", toEmail, ex.Message);
            return false;
        }
    }
}

