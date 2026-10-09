namespace Hisaab.Application.Features.Auth.DTOs;

public record UserDto(
    Guid Id,
    string Email,
    string FullName,
    string? AvatarUrl,
    string Role,
    string Timezone,
    string Locale
);

public record AuthResponseDto(
    string AccessToken,
    string RefreshToken,
    int ExpiresInSeconds,
    UserDto User
);

public record UserProfileDto(
    Guid Id,
    string Email,
    string FullName,
    string? AvatarUrl,
    string Role,
    string Timezone,
    string Locale,
    DateTime CreatedAtUtc
);

