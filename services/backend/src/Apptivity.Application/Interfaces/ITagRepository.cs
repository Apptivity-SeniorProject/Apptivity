using Apptivity.Domain.Entities;

namespace Apptivity.Application.Interfaces;

public interface ITagRepository
{
    Task<IReadOnlyCollection<Tag>> GetActiveAsync(CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Tag>> GetActiveByIdsAsync(IReadOnlyCollection<Guid> tagIds, CancellationToken cancellationToken);
    Task<Tag?> GetByIdAsync(Guid tagId, CancellationToken cancellationToken);
    Task<bool> ExistsByNameAsync(string name, Guid? exceptId, CancellationToken cancellationToken);
    Task AddAsync(Tag tag, CancellationToken cancellationToken);
}
