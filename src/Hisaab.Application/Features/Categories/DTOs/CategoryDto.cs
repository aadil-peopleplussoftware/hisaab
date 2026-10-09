using Hisaab.Domain.Enums;

namespace Hisaab.Application.Features.Categories.DTOs;

public record CategoryDto(
    Guid Id,
    TransactionType Type,
    string Name,
    string Icon,
    string Color,
    bool IsSystem
);

