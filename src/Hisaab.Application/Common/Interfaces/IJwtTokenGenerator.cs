namespace Hisaab.Application.Common.Interfaces;

public interface IJwtTokenGenerator
{
    string GenerateAccessToken(Guid userId, string email, string fullName, string role);
    (string RawToken, string TokenHash, DateTime ExpiresAtUtc) GenerateRefreshToken();
    string HashToken(string token);
}

