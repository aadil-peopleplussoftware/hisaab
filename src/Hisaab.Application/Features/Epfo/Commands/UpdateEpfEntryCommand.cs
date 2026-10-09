using FluentValidation;
using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Epfo.Commands;

public record UpdateEpfEntryCommand(
    Guid Id,
    DateTime Month,
    decimal EmployeeShare,
    decimal EmployerShare,
    decimal PensionShare,
    decimal Interest = 0m,
    decimal Withdrawal = 0m,
    string? Note = null
) : IRequest;

public class UpdateEpfEntryCommandValidator : AbstractValidator<UpdateEpfEntryCommand>
{
    public UpdateEpfEntryCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Month).NotEmpty().WithMessage("Month is required.");

        RuleFor(x => x.EmployeeShare)
            .GreaterThanOrEqualTo(0).WithMessage("Employee share cannot be negative.");

        RuleFor(x => x.EmployerShare)
            .GreaterThanOrEqualTo(0).WithMessage("Employer share cannot be negative.");

        RuleFor(x => x.PensionShare)
            .GreaterThanOrEqualTo(0).WithMessage("Pension share cannot be negative.");

        RuleFor(x => x.Interest)
            .GreaterThanOrEqualTo(0).WithMessage("Interest cannot be negative.");

        RuleFor(x => x.Withdrawal)
            .GreaterThanOrEqualTo(0).WithMessage("Withdrawal cannot be negative.");

        RuleFor(x => x)
            .Must(x => (x.EmployeeShare + x.EmployerShare + x.PensionShare + x.Interest + x.Withdrawal) > 0)
            .WithMessage("At least one non-zero amount (contribution, interest, or withdrawal) is required.");

        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Note must not exceed 500 characters.");
    }
}

public class UpdateEpfEntryCommandHandler : IRequestHandler<UpdateEpfEntryCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateEpfEntryCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(UpdateEpfEntryCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;

        var entry = await _context.EpfEntries
            .FirstOrDefaultAsync(e => e.Id == request.Id && e.UserId == currentUserId, cancellationToken);

        if (entry == null)
        {
            throw new NotFoundException(nameof(EpfEntry), request.Id);
        }

        var normalizedMonth = new DateTime(request.Month.Year, request.Month.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // Check if updating to a month already used by another entry
        var collision = await _context.EpfEntries
            .AnyAsync(e => e.Id != request.Id && e.UserId == currentUserId && e.Month == normalizedMonth, cancellationToken);

        if (collision)
        {
            throw new Common.Exceptions.ValidationException(new[]
            {
                new FluentValidation.Results.ValidationFailure(
                    nameof(request.Month),
                    $"Another EPF entry already exists for {normalizedMonth:MMMM yyyy}.")
            });
        }

        entry.Month = normalizedMonth;
        entry.EmployeeShare = Math.Round(request.EmployeeShare, 2);
        entry.EmployerShare = Math.Round(request.EmployerShare, 2);
        entry.PensionShare = Math.Round(request.PensionShare, 2);
        entry.Interest = Math.Round(request.Interest, 2);
        entry.Withdrawal = Math.Round(request.Withdrawal, 2);
        entry.Note = request.Note?.Trim();

        await _context.SaveChangesAsync(cancellationToken);
    }
}
