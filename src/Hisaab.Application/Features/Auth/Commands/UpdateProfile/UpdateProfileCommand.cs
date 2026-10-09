using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Common.Models;
using Hisaab.Application.Features.Auth.DTOs;
using MediatR;

namespace Hisaab.Application.Features.Auth.Commands.UpdateProfile;

public record UpdateProfileCommand(
    string FullName,
    string? AvatarUrl,
    string Timezone,
    string Locale
) : IRequest<Result<UserProfileDto>>;

public class UpdateProfileCommandHandler : IRequestHandler<UpdateProfileCommand, Result<UserProfileDto>>
{
    private readonly IIdentityService _identityService;
    private readonly ICurrentUserService _currentUserService;

    public UpdateProfileCommandHandler(
        IIdentityService identityService,
        ICurrentUserService currentUserService)
    {
        _identityService = identityService;
        _currentUserService = currentUserService;
    }

    public async Task<Result<UserProfileDto>> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            throw new ForbiddenAccessException("User is not authenticated.");
        }

        return await _identityService.UpdateProfileAsync(
            userId.Value,
            request.FullName,
            request.AvatarUrl,
            request.Timezone,
            request.Locale,
            cancellationToken);
    }
}

