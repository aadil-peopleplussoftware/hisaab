using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Common.Models;
using Hisaab.Application.Features.Transactions.DTOs;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using Hisaab.Domain.ValueObjects;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Transactions.Commands.CreateTransaction;

public record CreateTransactionCommand(
    TransactionType Type,
    decimal Amount,
    Guid CategoryId,
    DateTime TransactionDate,
    string? Note = null,
    Guid? AttachmentId = null
) : IRequest<Result<TransactionDto>>;

public class CreateTransactionCommandHandler : IRequestHandler<CreateTransactionCommand, Result<TransactionDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateTransactionCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<TransactionDto>> Handle(CreateTransactionCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            throw new ForbiddenAccessException("User is not authenticated.");
        }

        // Validate Category exists and is accessible
        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.Id == request.CategoryId, cancellationToken);

        if (category == null)
        {
            return Result<TransactionDto>.Failure("Specified category does not exist or is inaccessible.");
        }

        var money = new Money(request.Amount, "INR");

        var transaction = new Transaction
        {
            UserId = userId.Value,
            Type = request.Type,
            Amount = money.Amount,
            CategoryId = category.Id,
            TransactionDate = DateTime.SpecifyKind(request.TransactionDate, DateTimeKind.Utc),
            Note = request.Note?.Trim(),
            AttachmentId = request.AttachmentId
        };

        _context.Transactions.Add(transaction);
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
