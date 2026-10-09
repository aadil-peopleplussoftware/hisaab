using FluentValidation;
using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Epfo.Commands;

public record CreateEpfEntryCommand(
    DateTime Month,
    decimal EmployeeShare,
    decimal EmployerShare,
    decimal PensionShare,
    decimal Interest = 0m,
    decimal Withdrawal = 0m,
    string? Note = null
) : IRequest<Guid>;

public class CreateEpfEntryCommandValidator : AbstractValidator<CreateEpfEntryCommand>
{
    public CreateEpfEntryCommandValidator()
    {
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

public class CreateEpfEntryCommandHandler : IRequestHandler<CreateEpfEntryCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateEpfEntryCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Guid> Handle(CreateEpfEntryCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId ?? Guid.Empty;

        // Normalize month to the 1st of the month at 00:00:00 UTC
        var normalizedMonth = new DateTime(request.Month.Year, request.Month.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        // Check for existing entry for this user and month
        var exists = await _context.EpfEntries
            .AnyAsync(e => e.UserId == currentUserId && e.Month == normalizedMonth, cancellationToken);

        if (exists)
        {
            throw new Common.Exceptions.ValidationException(new[]
            {
                new FluentValidation.Results.ValidationFailure(
                    nameof(request.Month),
                    $"An EPF entry already exists for {normalizedMonth:MMMM yyyy}. Edit the existing entry instead.")
            });
        }

        var entry = new EpfEntry
        {
            Id = Guid.NewGuid(),
            UserId = currentUserId,
            Month = normalizedMonth,
            EmployeeShare = Math.Round(request.EmployeeShare, 2),
            EmployerShare = Math.Round(request.EmployerShare, 2),
            PensionShare = Math.Round(request.PensionShare, 2),
            Interest = Math.Round(request.Interest, 2),
            Withdrawal = Math.Round(request.Withdrawal, 2),
            Note = request.Note?.Trim()
        };

        _context.EpfEntries.Add(entry);
        await _context.SaveChangesAsync(cancellationToken);

        return entry.Id;
    }
}
