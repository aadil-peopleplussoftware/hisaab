using FluentValidation;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;

namespace Hisaab.Application.Features.Business.Commands;

public record CreateBusinessCommand(
    string Name,
    string? LegalName,
    BusinessType Type,
    string Currency,
    string? TaxId,
    string? Description,
    string? Color
) : IRequest<Guid>;

public class CreateBusinessCommandValidator : AbstractValidator<CreateBusinessCommand>
{
    public CreateBusinessCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Business name is required.")
            .MaximumLength(200).WithMessage("Business name must not exceed 200 characters.");

        RuleFor(x => x.Currency)
            .NotEmpty().WithMessage("Currency is required.")
            .MaximumLength(10).WithMessage("Currency code must not exceed 10 characters.");

        RuleFor(x => x.Type)
            .IsInEnum().WithMessage("Valid business type is required.");
    }
}

public class CreateBusinessCommandHandler : IRequestHandler<CreateBusinessCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateBusinessCommandHandler(IApplicationDbContext _context, ICurrentUserService currentUserService)
    {
        this._context = _context;
        _currentUserService = currentUserService;
    }

    public async Task<Guid> Handle(CreateBusinessCommand request, CancellationToken cancellationToken)
    {
        var business = new BusinessEntity
        {
            UserId = _currentUserService.UserId ?? Guid.Empty,
            Name = request.Name.Trim(),
            LegalName = request.LegalName?.Trim(),
            Type = request.Type,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "INR" : request.Currency.Trim().ToUpperInvariant(),
            TaxId = request.TaxId?.Trim(),
            Description = request.Description?.Trim(),
            Color = string.IsNullOrWhiteSpace(request.Color) ? "#2563eb" : request.Color.Trim(),
            IsActive = true
        };

        _context.Businesses.Add(business);
        await _context.SaveChangesAsync(cancellationToken);

        return business.Id;
    }
}

