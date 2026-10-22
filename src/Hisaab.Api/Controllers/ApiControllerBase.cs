using Hisaab.Application.Common.Interfaces;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Hisaab.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public abstract class ApiControllerBase : ControllerBase
{
    private ISender? _mediator;
    private ICurrentUserService? _currentUserService;
    private IDeletionPermissionService? _deletionPermissionService;

    protected ISender Mediator => _mediator ??= HttpContext.RequestServices.GetRequiredService<ISender>();
    protected ICurrentUserService CurrentUserService => _currentUserService ??= HttpContext.RequestServices.GetRequiredService<ICurrentUserService>();
    protected IDeletionPermissionService DeletionPermissionService => _deletionPermissionService ??= HttpContext.RequestServices.GetRequiredService<IDeletionPermissionService>();

    protected async Task<bool> CheckDeletePermissionAsync(string module, CancellationToken cancellationToken = default)
    {
        if (!CurrentUserService.UserId.HasValue) return false;
        return await DeletionPermissionService.CanDeleteAsync(CurrentUserService.UserId.Value, module, cancellationToken);
    }
}
