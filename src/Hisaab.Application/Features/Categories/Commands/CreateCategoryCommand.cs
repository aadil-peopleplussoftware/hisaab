using FluentValidation;
using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Common.Models;
using Hisaab.Application.Features.Categories.DTOs;
using Hisaab.Domain.Entities;
using Hisaab.Domain.Enums;
using MediatR;

namespace Hisaab.Application.Features.Categories.Commands;

public record CreateCategoryCommand(
    TransactionType Type,
    string Name,
    string Icon = "tag",
    string Color = "#4f46e5"
) : IRequest<Result<CategoryDto>>;

public class CreateCategoryCommandValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryCommandValidator()
    {
        RuleFor(v => v.Name)
            .NotEmpty().WithMessage("Category name is required.")
            .MaximumLength(100).WithMessage("Category name must not exceed 100 characters.");

        RuleFor(v => v.Type)
            .IsInEnum().WithMessage("Valid transaction type is required.");
    }
}

public class CreateCategoryCommandHandler : IRequestHandler<CreateCategoryCommand, Result<CategoryDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateCategoryCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Result<CategoryDto>> Handle(CreateCategoryCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            throw new ForbiddenAccessException("User is not authenticated.");
        }

        var category = new Category
        {
            UserId = userId.Value,
            Type = request.Type,
            Name = request.Name.Trim(),
            Icon = string.IsNullOrWhiteSpace(request.Icon) ? "tag" : request.Icon.Trim(),
            Color = string.IsNullOrWhiteSpace(request.Color) ? "#4f46e5" : request.Color.Trim(),
            IsSystem = false
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = new CategoryDto(
            category.Id,
            category.Type,
            category.Name,
            category.Icon,
            category.Color,
            category.IsSystem);

        return Result<CategoryDto>.Success(dto);
    }
}
