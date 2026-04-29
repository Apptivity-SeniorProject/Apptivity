using Apptivity.Api.Common;
using Apptivity.Application.Common.Models;

namespace Apptivity.Api.Middlewares;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception occurred.");
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";

            var payload = ApiEnvelope<object?>.Failure(new[]
            {
                new ErrorDetail("SYS_500", "An unexpected error occurred.")
            });

            await context.Response.WriteAsJsonAsync(payload);
        }
    }
}
