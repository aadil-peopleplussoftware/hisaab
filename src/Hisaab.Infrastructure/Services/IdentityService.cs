using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Common.Models;
using Hisaab.Application.Features.Auth.DTOs;
using Hisaab.Domain.Entities;
using Hisaab.Infrastructure.Identity;
using Hisaab.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Infrastructure.Services;

public class IdentityService : IIdentityService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<ApplicationRole> _roleManager;
    private readonly ApplicationDbContext _dbContext;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IDateTimeService _dateTimeService;

    public IdentityService(
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager,
        ApplicationDbContext dbContext,
        IJwtTokenGenerator jwtTokenGenerator,
        IDateTimeService dateTimeService)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _dbContext = dbContext;
        _jwtTokenGenerator = jwtTokenGenerator;
        _dateTimeService = dateTimeService;
    }

    public async Task<Result<AuthResponseDto>> RegisterAsync(
        string email,
        string password,
        string fullName,
        string? deviceInfo,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        var existingUser = await _userManager.FindByEmailAsync(normalizedEmail);
        if (existingUser != null)
        {
            return Result<AuthResponseDto>.Failure("An account with this email address already exists.");
        }

        var user = new ApplicationUser
        {
            UserName = normalizedEmail,
            Email = normalizedEmail,
            FullName = fullName.Trim(),
            Timezone = "Asia/Kolkata",
            Locale = "en-IN",
            CreatedAtUtc = _dateTimeService.UtcNow,
            IsActive = true,
            EmailConfirmed = true // Enabled for frictionless testing/onboarding
        };

        var createResult = await _userManager.CreateAsync(user, password);
        if (!createResult.Succeeded)
        {
            return Result<AuthResponseDto>.Failure(createResult.Errors.Select(e => e.Description));
        }

        // Ensure "User" role exists and assign
        if (!await _roleManager.RoleExistsAsync("User"))
        {
            await _roleManager.CreateAsync(new ApplicationRole("User"));
        }
        await _userManager.AddToRoleAsync(user, "User");

        return await GenerateAuthResponseAsync(user, "User", deviceInfo, ipAddress, cancellationToken);
    }

    public async Task<Result<AuthResponseDto>> LoginAsync(
        string email,
        string password,
        string? deviceInfo,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _userManager.FindByEmailAsync(normalizedEmail);

        if (user == null || user.IsDeleted || !user.IsActive)
        {
            return Result<AuthResponseDto>.Failure("Invalid email or password.");
        }

        if (await _userManager.IsLockedOutAsync(user))
        {
            var lockoutEnd = await _userManager.GetLockoutEndDateAsync(user);
            return Result<AuthResponseDto>.Failure($"Account is temporarily locked. Please try again after {lockoutEnd?.UtcDateTime:u}.");
        }

        var passwordValid = await _userManager.CheckPasswordAsync(user, password);
        if (!passwordValid)
        {
            await _userManager.AccessFailedAsync(user);
            return Result<AuthResponseDto>.Failure("Invalid email or password.");
        }

        await _userManager.ResetAccessFailedCountAsync(user);

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "User";

        return await GenerateAuthResponseAsync(user, role, deviceInfo, ipAddress, cancellationToken);
    }

    public async Task<Result<AuthResponseDto>> RefreshTokenAsync(
        string rawRefreshToken,
        string? deviceInfo,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        var tokenHash = _jwtTokenGenerator.HashToken(rawRefreshToken);

        var existingToken = await _dbContext.RefreshTokens
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, cancellationToken);

        if (existingToken == null || !existingToken.IsActive)
        {
            return Result<AuthResponseDto>.Failure("Invalid or expired refresh token.");
        }

        var user = await _userManager.FindByIdAsync(existingToken.UserId.ToString());
        if (user == null || user.IsDeleted || !user.IsActive)
        {
            return Result<AuthResponseDto>.Failure("User account is inactive or not found.");
        }

        // Rotate token: revoke old token and record replacement
        var (newRawToken, newTokenHash, newExpiresAtUtc) = _jwtTokenGenerator.GenerateRefreshToken();

        existingToken.RevokedAtUtc = _dateTimeService.UtcNow;
        existingToken.ReplacedByTokenHash = newTokenHash;

        var newRefreshToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = newTokenHash,
            ExpiresAtUtc = newExpiresAtUtc,
            DeviceInfo = deviceInfo ?? existingToken.DeviceInfo,
            IpAddress = ipAddress ?? existingToken.IpAddress,
            CreatedAtUtc = _dateTimeService.UtcNow
        };

        _dbContext.RefreshTokens.Add(newRefreshToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "User";
        var accessToken = _jwtTokenGenerator.GenerateAccessToken(user.Id, user.Email!, user.FullName, role);

        var userDto = new UserDto(
            user.Id,
            user.Email!,
            user.FullName,
            user.AvatarUrl,
            role,
            user.Timezone,
            user.Locale
        );

        var response = new AuthResponseDto(
            accessToken,
            newRawToken,
            15 * 60, // 15 minutes
            userDto
        );

        return Result<AuthResponseDto>.Success(response);
    }

    public async Task<Result> LogoutAsync(string rawRefreshToken, CancellationToken cancellationToken = default)
    {
        var tokenHash = _jwtTokenGenerator.HashToken(rawRefreshToken);

        var token = await _dbContext.RefreshTokens
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, cancellationToken);

        if (token != null && !token.IsRevoked)
        {
            token.RevokedAtUtc = _dateTimeService.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return Result.Success();
    }

    public async Task<Result> RevokeAllSessionsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var activeTokens = await _dbContext.RefreshTokens
            .IgnoreQueryFilters()
            .Where(rt => rt.UserId == userId && rt.RevokedAtUtc == null && rt.ExpiresAtUtc > _dateTimeService.UtcNow)
            .ToListAsync(cancellationToken);

        foreach (var token in activeTokens)
        {
            token.RevokedAtUtc = _dateTimeService.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result<UserProfileDto>> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
        {
            return Result<UserProfileDto>.Failure("User not found.");
        }

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "User";

        var dto = new UserProfileDto(
            user.Id,
            user.Email!,
            user.FullName,
            user.AvatarUrl,
            role,
            user.Timezone,
            user.Locale,
            user.CreatedAtUtc
        );

        return Result<UserProfileDto>.Success(dto);
    }

    public async Task<Result<UserProfileDto>> UpdateProfileAsync(
        Guid userId,
        string fullName,
        string? avatarUrl,
        string timezone,
        string locale,
        CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
        {
            return Result<UserProfileDto>.Failure("User not found.");
        }

        user.FullName = fullName.Trim();
        user.AvatarUrl = avatarUrl;
        user.Timezone = string.IsNullOrWhiteSpace(timezone) ? "Asia/Kolkata" : timezone.Trim();
        user.Locale = string.IsNullOrWhiteSpace(locale) ? "en-IN" : locale.Trim();
        user.UpdatedAtUtc = _dateTimeService.UtcNow;

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return Result<UserProfileDto>.Failure(updateResult.Errors.Select(e => e.Description));
        }

        return await GetProfileAsync(userId, cancellationToken);
    }

    public async Task<Result> ChangePasswordAsync(
        Guid userId,
        string currentPassword,
        string newPassword,
        CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
        {
            return Result.Failure("User not found.");
        }

        var changeResult = await _userManager.ChangePasswordAsync(user, currentPassword, newPassword);
        if (!changeResult.Succeeded)
        {
            return Result.Failure(changeResult.Errors.Select(e => e.Description));
        }

        // Revoke all existing sessions for security on password change
        await RevokeAllSessionsAsync(userId, cancellationToken);

        return Result.Success();
    }

    private async Task<Result<AuthResponseDto>> GenerateAuthResponseAsync(
        ApplicationUser user,
        string role,
        string? deviceInfo,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        var accessToken = _jwtTokenGenerator.GenerateAccessToken(user.Id, user.Email!, user.FullName, role);
        var (rawRefreshToken, tokenHash, expiresAtUtc) = _jwtTokenGenerator.GenerateRefreshToken();

        var refreshTokenEntity = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAtUtc = expiresAtUtc,
            DeviceInfo = deviceInfo,
            IpAddress = ipAddress,
            CreatedAtUtc = _dateTimeService.UtcNow
        };

        _dbContext.RefreshTokens.Add(refreshTokenEntity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var userDto = new UserDto(
            user.Id,
            user.Email!,
            user.FullName,
            user.AvatarUrl,
            role,
            user.Timezone,
            user.Locale
        );

        var authResponse = new AuthResponseDto(
            accessToken,
            rawRefreshToken,
            15 * 60, // 15 minutes
            userDto
        );

        return Result<AuthResponseDto>.Success(authResponse);
    }

    public async Task<Result> DeleteAccountAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
        {
            return Result.Failure("User account not found.");
        }

        user.IsDeleted = true;
        user.DeletedAtUtc = _dateTimeService.UtcNow;
        user.IsActive = false;

        var tokens = await _dbContext.RefreshTokens
            .Where(r => r.UserId == userId && r.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        foreach (var t in tokens)
        {
            t.RevokedAtUtc = _dateTimeService.UtcNow;
        }

        await _userManager.UpdateAsync(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

