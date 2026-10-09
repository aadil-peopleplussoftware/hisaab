using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Common.Models;
using Hisaab.Application.Features.Auth.DTOs;
using MediatR;

namespace Hisaab.Application.Features.Auth.Commands.Login;

public record LoginCommand(
    string Email,
    string Password,
    string? DeviceInfo = null,
    string? IpAddress = null
) : IRequest<Result<AuthResponseDto>>;

public class LoginCommandHandler : IRequestHandler<LoginCommand, Result<AuthResponseDto>>
{
    private readonly IIdentityService _identityService;

    public LoginCommandHandler(IIdentityService identityService)
    {
        _identityService = identityService;
    }

    public async Task<Result<AuthResponseDto>> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        return await _identityService.LoginAsync(
            request.Email,
            request.Password,
            request.DeviceInfo,
            request.IpAddress,
            cancellationToken);
    }
}
