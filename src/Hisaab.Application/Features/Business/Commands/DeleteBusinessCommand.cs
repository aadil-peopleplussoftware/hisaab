using Hisaab.Application.Common.Exceptions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Hisaab.Application.Features.Business.Commands;

public record DeleteBusinessCommand(Guid Id) : IRequest;

public class DeleteBusinessCommandHandler : IRequestHandler<DeleteBusinessCommand>
{
    private readonly IApplicationDbContext _context;

    public DeleteBusinessCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeleteBusinessCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.Businesses
            .FirstOrDefaultAsync(b => b.Id == request.Id, cancellationToken);

        if (entity == null)
        {
            throw new NotFoundException(nameof(BusinessEntity), request.Id);
        }

        _context.Businesses.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
