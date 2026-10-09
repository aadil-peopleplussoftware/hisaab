using FluentValidation;

namespace Hisaab.Application.Features.Auth.Commands.UpdateProfile;

public class UpdateProfileCommandValidator : AbstractValidator<UpdateProfileCommand>
{
    public UpdateProfileCommandValidator()
    {
        RuleFor(v => v.FullName)
            .NotEmpty().WithMessage("Full Name is required.")
            .MaximumLength(150).WithMessage("Full Name must not exceed 150 characters.");

        RuleFor(v => v.Timezone)
            .NotEmpty().WithMessage("Timezone is required.");

        RuleFor(v => v.Locale)
            .NotEmpty().WithMessage("Locale is required.");
    }
}

