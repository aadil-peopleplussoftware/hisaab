using FluentValidation;
using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Common.Models;
using Hisaab.Application.Features.Transactions.DTOs;
using Hisaab.Domain.Enums;
using Hisaab.Domain.ValueObjects;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Transactions.Commands.UpdateTransaction;

public record UpdateTransactionCommand(
    Guid Id,
    TransactionType Type,
    decimal Amount,
    Guid CategoryId,
    DateTime TransactionDate,
    string? Note = null,
    Guid? AttachmentId = null
) : IRequest<Result<TransactionDto>>;

public class UpdateTransactionCommandValidator : AbstractValidator<UpdateTransactionCommand>
{
    public UpdateTransactionCommandValidator()
    {
        RuleFor(v => v.Id)
            .NotEmpty().WithMessage("Transaction Id is required.");

        RuleFor(v => v.Amount)
            .GreaterThan(0).WithMessage("Transaction amount must be strictly greater than 0.");

        RuleFor(v => v.CategoryId)
            .NotEmpty().WithMessage("A valid category must be selected.");

        RuleFor(v => v.Type)
            .IsInEnum().WithMessage("A valid transaction type is required.");

        RuleFor(v => v.TransactionDate)
            .NotEmpty().WithMessage("Transaction date is required.");

        RuleFor(v => v.Note)
            .MaximumLength(500).WithMessage("Note must not exceed 500 characters.");
    }
}

public class UpdateTransactionCommandHandler : IRequestHandler<UpdateTransactionCommand, Result<TransactionDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public UpdateTransactionCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<TransactionDto>> Handle(UpdateTransactionCommand request, CancellationToken cancellationToken)
    {
        var transaction = await _context.Transactions
            .Include(t => t.Category)
            .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

        if (transaction == null)
        {
            throw new NotFoundException("Transaction", request.Id);
        }

        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.Id == request.CategoryId, cancellationToken);

        if (category == null)
        {
            return Result<TransactionDto>.Failure("Specified category does not exist or is inaccessible.");
        }

        var money = new Money(request.Amount, "INR");

        transaction.Type = request.Type;
        transaction.Amount = money.Amount;
        transaction.CategoryId = category.Id;
        transaction.TransactionDate = DateTime.SpecifyKind(request.TransactionDate, DateTimeKind.Utc);
        transaction.Note = request.Note?.Trim();
        transaction.AttachmentId = request.AttachmentId;

        await _context.SaveChangesAsync(cancellationToken);

        var dto = new TransactionDto(
            transaction.Id,
            transaction.Type,
            transaction.Amount,
            money.ToIndianFormat(),
            category.Id,
            category.Name,
            category.Icon,
            category.Color,
            transaction.TransactionDate,
            transaction.Note,
            transaction.AttachmentId
        );

        return Result<TransactionDto>.Success(dto);
    }
}

