using System.Net;
using System.Text.Json;
using Hisaab.Application.Common.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace Hisaab.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var traceId = context.TraceIdentifier;

        var (statusCode, problemDetails) = exception switch
        {
            ValidationException valEx => (
                HttpStatusCode.BadRequest,
                new ValidationProblemDetails(valEx.Errors)
                {
                    Title = "Validation Failed",
                    Status = (int)HttpStatusCode.BadRequest,
                    Detail = "One or more validation errors occurred.",
                    Instance = context.Request.Path
                } as ProblemDetails
            ),

            NotFoundException notFoundEx => (
                HttpStatusCode.NotFound,
                new ProblemDetails
                {
                    Title = "Not Found",
                    Status = (int)HttpStatusCode.NotFound,
                    Detail = notFoundEx.Message,
                    Instance = context.Request.Path
                }
            ),

            KeyNotFoundException keyNotFoundEx => (
                HttpStatusCode.NotFound,
                new ProblemDetails
                {
                    Title = "Not Found",
                    Status = (int)HttpStatusCode.NotFound,
                    Detail = keyNotFoundEx.Message,
                    Instance = context.Request.Path
                }
            ),

            ForbiddenAccessException forbiddenEx => (
                // Return 404 to avoid data enumeration as required by OWASP & Section 5
                HttpStatusCode.NotFound,
                new ProblemDetails
                {
                    Title = "Not Found",
                    Status = (int)HttpStatusCode.NotFound,
                    Detail = "The requested resource was not found.",
                    Instance = context.Request.Path
                }
            ),

            DomainException domainEx => (
                HttpStatusCode.BadRequest,
                new ProblemDetails
                {
                    Title = "Domain Rule Violation",
                    Status = (int)HttpStatusCode.BadRequest,
                    Detail = domainEx.Message,
                    Instance = context.Request.Path
                }
            ),

            _ => (
                HttpStatusCode.InternalServerError,
                new ProblemDetails
                {
                    Title = "Internal Server Error",
                    Status = (int)HttpStatusCode.InternalServerError,
                    Detail = _environment.IsDevelopment()
                        ? exception.Message
                        : "An unexpected error occurred. Please try again later.",
                    Instance = context.Request.Path
                }
            )
        };

        if (statusCode == HttpStatusCode.InternalServerError)
        {
            _logger.LogError(exception, "Unhandled exception occurred. TraceId: {TraceId}", traceId);
        }
        else
        {
            _logger.LogWarning("Handled application exception: {Message}. TraceId: {TraceId}", exception.Message, traceId);
        }

        problemDetails.Extensions["traceId"] = traceId;

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = (int)statusCode;

        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(problemDetails, problemDetails.GetType(), jsonOptions));
    }
}

