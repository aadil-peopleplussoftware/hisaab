namespace Hisaab.Application.Common.Exceptions;

public class NotFoundException : Exception
{
    public NotFoundException()
        : base("The requested resource was not found.")
    {
    }

    public NotFoundException(string message)
        : base(message)
    {
    }

    public NotFoundException(string name, object key)
        : base($"Entity \"{name}\" ({key}) was not found.")
    {
    }
}

public class ForbiddenAccessException : Exception
{
    public ForbiddenAccessException()
        : base("Access to this resource is forbidden.")
    {
    }

    public ForbiddenAccessException(string message)
        : base(message)
    {
    }
}

public class DomainException : Exception
{
    public DomainException(string message)
        : base(message)
    {
    }
}
