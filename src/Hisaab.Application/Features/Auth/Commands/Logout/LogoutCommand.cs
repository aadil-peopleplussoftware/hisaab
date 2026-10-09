using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Common.Models;
using MediatR;

namespace Hisaab.Application.Features.Auth.Commands.Logout;

public record LogoutCommand(string RefreshToken) : IRequest<Result>;

public class LogoutCommandHandler : IRequestHandler<LogoutCommand, Result>
{
    private readonly IIdentityService _identityService;

    public LogoutCommandHandler(IIdentityService identityService)
    {
        _identityService = identityService;
    }

    public async Task<Result> Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        return await _identityService.LogoutAsync(request.RefreshToken, cancellationToken);
    }
}
