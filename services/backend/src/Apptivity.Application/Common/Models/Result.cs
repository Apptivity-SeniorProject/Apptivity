namespace Apptivity.Application.Common.Models;

public class Result
{
    public bool IsSuccess { get; protected set; }
    public List<ErrorDetail> Errors { get; protected set; } = new();

    public static Result Success() => new() { IsSuccess = true };

    public static Result Failure(string code, string message)
    {
        return new Result
        {
            IsSuccess = false,
            Errors = new List<ErrorDetail> { new(code, message) }
        };
    }

    public static Result Failure(IEnumerable<ErrorDetail> errors)
    {
        return new Result
        {
            IsSuccess = false,
            Errors = errors.ToList()
        };
    }
}

public sealed class Result<T> : Result
{
    public T? Data { get; private set; }

    public static Result<T> Success(T data)
    {
        return new Result<T>
        {
            IsSuccess = true,
            Data = data
        };
    }

    public static new Result<T> Failure(string code, string message)
    {
        return new Result<T>
        {
            IsSuccess = false,
            Errors = new List<ErrorDetail> { new(code, message) }
        };
    }
}
