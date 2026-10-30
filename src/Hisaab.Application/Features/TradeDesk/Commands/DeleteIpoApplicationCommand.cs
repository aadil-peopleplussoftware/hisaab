using Hisaab.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.TradeDesk.Commands;

public record DeleteIpoApplicationCommand(Guid IpoId) : IRequest<bool>;

public class DeleteIpoApplicationCommandHandler : IRequestHandler<DeleteIpoApplicationCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteIpoApplicationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteIpoApplicationCommand request, CancellationToken cancellationToken)
    {
        var ipo = await _context.IpoApplications
            .FirstOrDefaultAsync(x => x.Id == request.IpoId, cancellationToken);

        if (ipo == null) return false;

        _context.IpoApplications.Remove(ipo);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

