using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;

namespace Hisaab.Application.Features.TradeDesk.Commands;

public record CreateIpoApplicationCommand(
    string CompanyName,
    string Symbol,
    IpoIssueType IssueType,
    DateTime ApplicationDate,
    DateTime? AllotmentDate,
    DateTime? ListingDate,
    int LotSize,
    int LotsApplied,
    decimal BidPrice,
    string? ApplicationNumber,
    string? UpiId,
    string? Notes
) : IRequest<Guid>;

public class CreateIpoApplicationCommandHandler : IRequestHandler<CreateIpoApplicationCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateIpoApplicationCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Guid> Handle(CreateIpoApplicationCommand request, CancellationToken cancellationToken)
    {
        var totalShares = Math.Max(1, request.LotSize * request.LotsApplied);
        var totalAmount = Math.Round(totalShares * request.BidPrice, 2);

        var ipo = new IpoApplication
        {
            Id = Guid.NewGuid(),
            UserId = _currentUserService.UserId ?? Guid.Empty,
            CompanyName = request.CompanyName.Trim(),
            Symbol = string.IsNullOrWhiteSpace(request.Symbol) ? request.CompanyName.Trim().ToUpperInvariant() : request.Symbol.Trim().ToUpperInvariant(),
            IssueType = request.IssueType,
            Status = IpoApplicationStatus.Applied,
            ApplicationDate = request.ApplicationDate.ToUniversalTime(),
            AllotmentDate = request.AllotmentDate?.ToUniversalTime(),
            ListingDate = request.ListingDate?.ToUniversalTime(),
            LotSize = request.LotSize,
            LotsApplied = request.LotsApplied,
            TotalShares = totalShares,
            BidPrice = request.BidPrice,
            TotalAmountBlocked = totalAmount,
            ApplicationNumber = request.ApplicationNumber?.Trim(),
            UpiId = request.UpiId?.Trim(),
            Notes = request.Notes?.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        _context.IpoApplications.Add(ipo);
        await _context.SaveChangesAsync(cancellationToken);

        return ipo.Id;
    }
}

