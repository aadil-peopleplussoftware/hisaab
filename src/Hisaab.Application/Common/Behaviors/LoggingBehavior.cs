using System.Diagnostics;
using Hisaab.Application.Common.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Hisaab.Application.Common.Behaviors;

public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;
    private readonly ICurrentUserService _currentUserService;

    public LoggingBehavior(
        ILogger<LoggingBehavior<TRequest, TResponse>> logger,
        ICurrentUserService currentUserService)
    {
        _logger = logger;
        _currentUserService = currentUserService;
    }

    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        var userId = _currentUserService.UserId?.ToString() ?? "Anonymous";

        _logger.LogInformation("Processing Command/Query {RequestName} for User {UserId}", requestName, userId);

        var stopwatch = Stopwatch.StartNew();
        var response = await next();
        stopwatch.Stop();

        if (stopwatch.ElapsedMilliseconds > 500)
        {
            _logger.LogWarning("Long Running Request: {RequestName} took {ElapsedMilliseconds}ms for User {UserId}",
                requestName, stopwatch.ElapsedMilliseconds, userId);
        }

        return response;
    }
}
