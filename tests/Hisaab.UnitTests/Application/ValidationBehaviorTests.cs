using FluentAssertions;
using FluentValidation;
using FluentValidation.Results;
using Hisaab.Application.Common.Behaviors;
using MediatR;
using NSubstitute;
using Xunit;
using ValidationException = Hisaab.Application.Common.Exceptions.ValidationException;

namespace Hisaab.UnitTests.Application;

public class ValidationBehaviorTests
{
    public record TestCommand(string Name) : IRequest<string>;

    [Fact]
    public async Task Handle_WithValidRequest_ShouldCallNextDelegate()
    {
        // Arrange
        var validator = Substitute.For<IValidator<TestCommand>>();
        validator.ValidateAsync(Arg.Any<ValidationContext<TestCommand>>(), Arg.Any<CancellationToken>())
            .Returns(new ValidationResult());

        var behavior = new ValidationBehavior<TestCommand, string>(new[] { validator });
        var nextDelegate = Substitute.For<RequestHandlerDelegate<string>>();
        nextDelegate.Invoke().Returns("Success");

        // Act
        var result = await behavior.Handle(new TestCommand("Valid"), nextDelegate, CancellationToken.None);

        // Assert
        result.Should().Be("Success");
        await nextDelegate.Received(1).Invoke();
    }

    [Fact]
    public async Task Handle_WithValidationFailures_ShouldThrowValidationException()
    {
        // Arrange
        var validator = Substitute.For<IValidator<TestCommand>>();
        var failures = new List<ValidationFailure>
        {
            new("Name", "Name is required.")
        };
        validator.ValidateAsync(Arg.Any<ValidationContext<TestCommand>>(), Arg.Any<CancellationToken>())
            .Returns(new ValidationResult(failures));

        var behavior = new ValidationBehavior<TestCommand, string>(new[] { validator });
        var nextDelegate = Substitute.For<RequestHandlerDelegate<string>>();

        // Act
        var act = async () => await behavior.Handle(new TestCommand(""), nextDelegate, CancellationToken.None);

        // Assert
        var ex = await act.Should().ThrowAsync<ValidationException>();
        ex.Which.Errors.Should().ContainKey("Name");
        await nextDelegate.DidNotReceive().Invoke();
    }
}

