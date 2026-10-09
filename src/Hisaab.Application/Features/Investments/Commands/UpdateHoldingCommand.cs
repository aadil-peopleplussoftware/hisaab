using FluentValidation;
using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Investments.Commands;

public record UpdateHoldingCommand(
    Guid Id,
    string Name,
    InvestmentType Type,
    decimal CurrentValue,
    string? Note = null
) : IRequest;

public class UpdateHoldingCommandValidator : AbstractValidator<UpdateHoldingCommand>
{
    public UpdateHoldingCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Holding name is required.")
            .MaximumLength(150).WithMessage("Holding name must not exceed 150 characters.");

        RuleFor(x => x.Type)
            .IsInEnum().WithMessage("Valid investment asset type is required.");

        RuleFor(x => x.CurrentValue)
            .GreaterThanOrEqualTo(0).WithMessage("Current value cannot be negative.");

        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Note must not exceed 500 characters.");
    }
}

public class UpdateHoldingCommandHandler : IRequestHandler<UpdateHoldingCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeService _dateTimeService;

    public UpdateHoldingCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IDateTimeService dateTimeService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _dateTimeService = dateTimeService;
    }

    public async Task Handle(UpdateHoldingCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;

        var holding = await _context.Holdings
            .FirstOrDefaultAsync(h => h.Id == request.Id && h.UserId == currentUserId, cancellationToken);

        if (holding == null)
        {
            throw new NotFoundException(nameof(Holding), request.Id);
        }

        holding.Name = request.Name.Trim();
        holding.Type = request.Type;
        holding.CurrentValue = Math.Round(request.CurrentValue, 2);
        holding.ValueUpdatedAtUtc = _dateTimeService.UtcNow;
        holding.Note = request.Note?.Trim();

        await _context.SaveChangesAsync(cancellationToken);
    }
}

