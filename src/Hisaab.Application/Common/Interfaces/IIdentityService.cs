using Hisaab.Application.Common.Models;
using Hisaab.Application.Features.Auth.DTOs;

namespace Hisaab.Application.Common.Interfaces;

public interface IIdentityService
{
    Task<Result<AuthResponseDto>> RegisterAsync(
        string email,
        string password,
        string fullName,
        string? deviceInfo,
        string? ipAddress,
        CancellationToken cancellationToken = default);

    Task<Result<AuthResponseDto>> LoginAsync(
        string email,
        string password,
        string? deviceInfo,
        string? ipAddress,
        CancellationToken cancellationToken = default);

    Task<Result<AuthResponseDto>> RefreshTokenAsync(
        string rawRefreshToken,
        string? deviceInfo,
        string? ipAddress,
        CancellationToken cancellationToken = default);

    Task<Result> LogoutAsync(
        string rawRefreshToken,
        CancellationToken cancellationToken = default);

    Task<Result> RevokeAllSessionsAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<Result<UserProfileDto>> GetProfileAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<Result<UserProfileDto>> UpdateProfileAsync(
        Guid userId,
        string fullName,
        string? avatarUrl,
        string timezone,
        string locale,
        CancellationToken cancellationToken = default);

    Task<Result> ChangePasswordAsync(
        Guid userId,
        string currentPassword,
        string newPassword,
        CancellationToken cancellationToken = default);
}

