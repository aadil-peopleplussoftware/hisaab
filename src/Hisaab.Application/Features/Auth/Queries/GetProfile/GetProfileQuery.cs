using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Common.Models;
using Hisaab.Application.Features.Auth.DTOs;
using MediatR;

namespace Hisaab.Application.Features.Auth.Queries.GetProfile;

public record GetProfileQuery : IRequest<Result<UserProfileDto>>;

public class GetProfileQueryHandler : IRequestHandler<GetProfileQuery, Result<UserProfileDto>>
{
    private readonly IIdentityService _identityService;
    private readonly ICurrentUserService _currentUserService;

    public GetProfileQueryHandler(
        IIdentityService identityService,
        ICurrentUserService currentUserService)
    {
        _identityService = identityService;
        _currentUserService = currentUserService;
    }

    public async Task<Result<UserProfileDto>> Handle(GetProfileQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            throw new ForbiddenAccessException("User is not authenticated.");
        }

        return await _identityService.GetProfileAsync(userId.Value, cancellationToken);
    }
}

