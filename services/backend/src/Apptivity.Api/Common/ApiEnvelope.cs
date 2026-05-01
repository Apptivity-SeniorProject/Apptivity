using Apptivity.Application.Common.Models;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;

namespace Apptivity.Api.Common;

public sealed class ApiEnvelope<T>
{
    public bool IsSuccess { get; init; }
    public T? Data { get; init; }
    public IReadOnlyCollection<ErrorDetail> Errors { get; init; } = Array.Empty<ErrorDetail>();
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
    public string TraceId { get; init; } = CurrentTraceId();

    public static ApiEnvelope<T> Success(T data, string? traceId = null) => new() { IsSuccess = true, Data = data, TraceId = traceId ?? CurrentTraceId() };
    public static ApiEnvelope<T> Failure(IEnumerable<ErrorDetail> errors, string? traceId = null) => new() { IsSuccess = false, Errors = errors.ToArray(), TraceId = traceId ?? CurrentTraceId() };

    private static string CurrentTraceId()
    {
        return Activity.Current?.TraceId.ToString() ?? Guid.NewGuid().ToString("N");
    }
}

public abstract class ApiControllerBase : ControllerBase
{
    protected IActionResult FromResult(Result result)
    {
        var traceId = HttpContext.TraceIdentifier;
        if (result.IsSuccess)
        {
            return Ok(ApiEnvelope<object?>.Success(null, traceId));
        }

        return StatusCode(GetStatusCode(result.Errors), ApiEnvelope<object?>.Failure(result.Errors, traceId));
    }

    protected IActionResult FromResult<T>(Result<T> result)
    {
        var traceId = HttpContext.TraceIdentifier;
        if (result.IsSuccess)
        {
            return Ok(ApiEnvelope<T?>.Success(result.Data, traceId));
        }

        return StatusCode(GetStatusCode(result.Errors), ApiEnvelope<T?>.Failure(result.Errors, traceId));
    }

    private static int GetStatusCode(IEnumerable<ErrorDetail> errors)
    {
        var code = errors.FirstOrDefault()?.Code ?? string.Empty;

        if (code.EndsWith("_404", StringComparison.Ordinal))
        {
            return StatusCodes.Status404NotFound;
        }

        if (code.EndsWith("_401", StringComparison.Ordinal))
        {
            return StatusCodes.Status403Forbidden;
        }

        if (code.StartsWith("AUTH_", StringComparison.Ordinal))
        {
            return StatusCodes.Status401Unauthorized;
        }

        return StatusCodes.Status400BadRequest;
    }
}
