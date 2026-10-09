using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Epfo.Commands;

public record DeleteEpfEntryCommand(Guid Id) : IRequest;

public class DeleteEpfEntryCommandHandler : IRequestHandler<DeleteEpfEntryCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeleteEpfEntryCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task Handle(DeleteEpfEntryCommand request, CancellationToken cancellationToken)
    {
        var currentUserId = _currentUserService.UserId;

        var entry = await _context.EpfEntries
            .FirstOrDefaultAsync(e => e.Id == request.Id && e.UserId == currentUserId, cancellationToken);

        if (entry == null)
        {
            throw new NotFoundException(nameof(EpfEntry), request.Id);
        }

        _context.EpfEntries.Remove(entry);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

