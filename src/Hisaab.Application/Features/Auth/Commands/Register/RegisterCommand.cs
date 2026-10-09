using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Common.Models;
using Hisaab.Application.Features.Auth.DTOs;
using MediatR;

namespace Hisaab.Application.Features.Auth.Commands.Register;

public record RegisterCommand(
    string Email,
    string Password,
    string FullName,
    string? DeviceInfo = null,
    string? IpAddress = null
) : IRequest<Result<AuthResponseDto>>;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, Result<AuthResponseDto>>
{
    private readonly IIdentityService _identityService;

    public RegisterCommandHandler(IIdentityService _identityService)
    {
        this._identityService = _identityService;
    }

    public async Task<Result<AuthResponseDto>> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        return await _identityService.RegisterAsync(
            request.Email,
            request.Password,
            request.FullName,
            request.DeviceInfo,
            request.IpAddress,
            cancellationToken);
    }
}

