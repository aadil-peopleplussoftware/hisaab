using Hisaab.Application.Features.Auth.Commands.ChangePassword;
using Hisaab.Application.Features.Auth.Commands.Login;
using Hisaab.Application.Features.Auth.Commands.Logout;
using Hisaab.Application.Features.Auth.Commands.RefreshToken;
using Hisaab.Application.Features.Auth.Commands.Register;
using Hisaab.Application.Features.Auth.Commands.UpdateProfile;
using Hisaab.Application.Features.Auth.DTOs;
using Hisaab.Application.Features.Auth.Queries.GetProfile;
using Hisaab.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hisaab.Api.Controllers;

public class AuthController : ApiControllerBase
{
    private readonly IIdentityService _identityService;
    private const string RefreshTokenCookieName = "hisaab_refresh_token";

    public AuthController(IIdentityService identityService)
    {
        _identityService = identityService;
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        var command = new RegisterCommand(
            request.Email,
            request.Password,
            request.FullName,
            Request.Headers["User-Agent"].ToString(),
            HttpContext.Connection.RemoteIpAddress?.ToString());

        var result = await Mediator.Send(command, cancellationToken);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors });
        }

        SetRefreshTokenCookie(result.Data!.RefreshToken);
        return Ok(result.Data);
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var command = new LoginCommand(
            request.Email,
            request.Password,
            request.RememberMe,
            Request.Headers["User-Agent"].ToString(),
            HttpContext.Connection.RemoteIpAddress?.ToString());

        var result = await Mediator.Send(command, cancellationToken);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors });
        }

        SetRefreshTokenCookie(result.Data!.RefreshToken, request.RememberMe);
        return Ok(result.Data);
    }

    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest? request, CancellationToken cancellationToken)
    {
        var token = request?.RefreshToken ?? Request.Cookies[RefreshTokenCookieName];

        if (string.IsNullOrWhiteSpace(token))
        {
            return Unauthorized(new { errors = new[] { "Session expired or missing refresh token." } });
        }

        var command = new RefreshTokenCommand(
            token,
            Request.Headers["User-Agent"].ToString(),
            HttpContext.Connection.RemoteIpAddress?.ToString());

        var result = await Mediator.Send(command, cancellationToken);
        if (!result.Succeeded)
        {
            ClearRefreshTokenCookie();
            return Unauthorized(new { errors = result.Errors });
        }

        SetRefreshTokenCookie(result.Data!.RefreshToken, true);
        return Ok(result.Data);
    }

    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest? request, CancellationToken cancellationToken)
    {
        var token = request?.RefreshToken ?? Request.Cookies[RefreshTokenCookieName];

        if (!string.IsNullOrWhiteSpace(token))
        {
            await Mediator.Send(new LogoutCommand(token), cancellationToken);
        }

        ClearRefreshTokenCookie();
        return Ok(new { message = "Logged out successfully." });
    }

    [Authorize]
    [HttpGet("profile")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
    {
        var result = await Mediator.Send(new GetProfileQuery(), cancellationToken);
        if (!result.Succeeded)
        {
            return NotFound(new { errors = result.Errors });
        }

        return Ok(result.Data);
    }

    [Authorize]
    [HttpPut("profile")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var command = new UpdateProfileCommand(request.FullName, request.AvatarUrl, request.Timezone, request.Locale);
        var result = await Mediator.Send(command, cancellationToken);

        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors });
        }

        return Ok(result.Data);
    }

    [Authorize]
    [HttpPost("change-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var command = new ChangePasswordCommand(request.CurrentPassword, request.NewPassword);
        var result = await Mediator.Send(command, cancellationToken);

        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors });
        }

        Response.Cookies.Delete(RefreshTokenCookieName);
        return Ok(new { message = "Password updated successfully. Please log in again." });
    }

    [HttpPost("google")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _identityService.ExternalLoginAsync(
            request.Email,
            request.FullName ?? request.Email.Split('@')[0],
            request.AvatarUrl,
            Request.Headers["User-Agent"].ToString(),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);

        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors });
        }

        SetRefreshTokenCookie(result.Data!.RefreshToken);
        return Ok(result.Data);
    }

    [HttpPost("send-otp")]
    [ProducesResponseType(typeof(OtpResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SendOtp([FromBody] SendOtpRequest request, CancellationToken cancellationToken)
    {
        var result = await _identityService.SendOtpAsync(request.Identifier, cancellationToken);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors });
        }

        return Ok(result.Data);
    }

    [HttpPost("verify-otp")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request, CancellationToken cancellationToken)
    {
        var result = await _identityService.VerifyOtpAsync(
            request.Identifier,
            request.Code,
            Request.Headers["User-Agent"].ToString(),
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);

        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors });
        }

        SetRefreshTokenCookie(result.Data!.RefreshToken);
        return Ok(result.Data);
    }

    [HttpPost("forgot-password")]
    [ProducesResponseType(typeof(ForgotPasswordResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var result = await _identityService.ForgotPasswordAsync(request.Email, cancellationToken);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors });
        }

        return Ok(result.Data);
    }

    [HttpPost("reset-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var result = await _identityService.ResetPasswordAsync(request.Email, request.Token, request.NewPassword, cancellationToken);
        if (!result.Succeeded)
        {
            return BadRequest(new { errors = result.Errors });
        }

        return Ok(new { message = result.Data });
    }

    private void SetRefreshTokenCookie(string token, bool rememberMe = true)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true, // Strict HTTPS / TLS requirement
            SameSite = SameSiteMode.Lax, // Allows top-level navigation while securing cross-origin requests
            Path = "/",
            Expires = rememberMe
                ? DateTimeOffset.UtcNow.AddDays(30) // Freshdesk / Google style 30-day persistent session
                : DateTimeOffset.UtcNow.AddDays(1)
        };

        Response.Cookies.Append(RefreshTokenCookieName, token, cookieOptions);
    }

    private void ClearRefreshTokenCookie()
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.AddDays(-1)
        };

        Response.Cookies.Delete(RefreshTokenCookieName, cookieOptions);
    }
}

public record RegisterRequest(string Email, string Password, string FullName);
public record LoginRequest(string Email, string Password, bool RememberMe = true);
public record RefreshTokenRequest(string? RefreshToken);
public record UpdateProfileRequest(string FullName, string? AvatarUrl, string Timezone, string Locale);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record GoogleLoginRequest(string Email, string? FullName, string? AvatarUrl);
public record SendOtpRequest(string Identifier);
public record VerifyOtpRequest(string Identifier, string Code);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Email, string Token, string NewPassword);

