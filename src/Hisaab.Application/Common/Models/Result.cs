namespace Hisaab.Application.Common.Models;

public class Result
{
    public bool Succeeded { get; }
    public string[] Errors { get; }

    protected Result(bool succeeded, IEnumerable<string>? errors = null)
    {
        Succeeded = succeeded;
        Errors = errors?.ToArray() ?? Array.Empty<string>();
    }

    public static Result Success() => new(true);

    public static Result Failure(IEnumerable<string> errors) => new(false, errors);

    public static Result Failure(string error) => new(false, new[] { error });
}

public class Result<T> : Result
{
    public T? Data { get; }

    private Result(bool succeeded, T? data, IEnumerable<string>? errors = null)
        : base(succeeded, errors)
    {
        Data = data;
    }

    public static Result<T> Success(T data) => new(true, data);

    public static new Result<T> Failure(IEnumerable<string> errors) => new(false, default, errors);

    public static new Result<T> Failure(string error) => new(false, default, new[] { error });
}
