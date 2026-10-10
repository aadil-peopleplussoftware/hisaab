using FluentValidation;
using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Business.Commands;

public record UpdateBusinessCommand(
    Guid Id,
    string Name,
    string? LegalName,
    BusinessType Type,
    string Currency,
    string? TaxId,
    string? Description,
    bool IsActive,
    string? Color
) : IRequest;

public class UpdateBusinessCommandValidator : AbstractValidator<UpdateBusinessCommand>
{
    public UpdateBusinessCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Currency).NotEmpty().MaximumLength(10);
        RuleFor(x => x.Type).IsInEnum();
    }
}

public class UpdateBusinessCommandHandler : IRequestHandler<UpdateBusinessCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateBusinessCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(UpdateBusinessCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Businesses
            .FirstOrDefaultAsync(b => b.Id == request.Id, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(BusinessEntity), request.Id);
        }

        entity.Name = request.Name.Trim();
        entity.LegalName = request.LegalName?.Trim();
        entity.Type = request.Type;
        entity.Currency = request.Currency.Trim().ToUpperInvariant();
        entity.TaxId = request.TaxId?.Trim();
        entity.Description = request.Description?.Trim();
        entity.IsActive = request.IsActive;
        entity.Color = string.IsNullOrWhiteSpace(request.Color) ? entity.Color : request.Color.Trim();

        await _context.SaveChangesAsync(cancellationToken);
    }
}

