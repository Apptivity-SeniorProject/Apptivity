using Apptivity.Application.Common.Models;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Common;

public sealed class ApiEnvelope<T>
{
    public bool IsSuccess { get; init; }
    public T? Data { get; init; }
    public IReadOnlyCollection<ErrorDetail> Errors { get; init; } = Array.Empty<ErrorDetail>();
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;

    public static ApiEnvelope<T> Success(T data) => new() { IsSuccess = true, Data = data };
    public static ApiEnvelope<T> Failure(IEnumerable<ErrorDetail> errors) => new() { IsSuccess = false, Errors = errors.ToArray() };
}

public abstract class ApiControllerBase : ControllerBase
{
    protected IActionResult FromResult(Result result)
    {
        if (result.IsSuccess)
        {
            return Ok(ApiEnvelope<object?>.Success(null));
        }

        return StatusCode(GetStatusCode(result.Errors), ApiEnvelope<object?>.Failure(result.Errors));
    }

    protected IActionResult FromResult<T>(Result<T> result)
    {
        if (result.IsSuccess)
        {
            return Ok(ApiEnvelope<T?>.Success(result.Data));
        }

        return StatusCode(GetStatusCode(result.Errors), ApiEnvelope<T?>.Failure(result.Errors));
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
