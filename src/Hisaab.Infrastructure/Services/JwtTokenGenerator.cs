using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Hisaab.Application.Common.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Hisaab.Infrastructure.Services;

public class JwtTokenGenerator : IJwtTokenGenerator
{
    private readonly IConfiguration _configuration;
    private readonly IDateTimeService _dateTimeService;

    public JwtTokenGenerator(IConfiguration configuration, IDateTimeService dateTimeService)
    {
        _configuration = configuration;
        _dateTimeService = dateTimeService;
    }

    public string GenerateAccessToken(Guid userId, string email, string fullName, string role)
    {
        var secret = _configuration["Jwt:Secret"] ?? "SuperSecretKeyForHisaabEnterpriseFinancePlatform2026!#$";
        var issuer = _configuration["Jwt:Issuer"] ?? "Hisaab.Api";
        var audience = _configuration["Jwt:Audience"] ?? "Hisaab.Web";
        var expirationMinutes = _configuration.GetValue<int?>("Jwt:AccessTokenExpirationMinutes") ?? 15;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(JwtRegisteredClaimNames.Name, fullName),
            new Claim(ClaimTypes.Role, role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: _dateTimeService.UtcNow,
            expires: _dateTimeService.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public (string RawToken, string TokenHash, DateTime ExpiresAtUtc) GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        var rawToken = Convert.ToBase64String(randomBytes);

        var tokenHash = HashToken(rawToken);
        var expirationDays = _configuration.GetValue<int?>("Jwt:RefreshTokenExpirationDays") ?? 7;
        var expiresAtUtc = _dateTimeService.UtcNow.AddDays(expirationDays);

        return (rawToken, tokenHash, expiresAtUtc);
    }

    public string HashToken(string token)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hashedBytes);
    }
}
