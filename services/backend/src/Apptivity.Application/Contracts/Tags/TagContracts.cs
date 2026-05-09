using Apptivity.Application.Common.Models;

namespace Apptivity.Application.Contracts.Tags;

public sealed record TagListItemDto(
    Guid Id,
    string Name,
    string? IconName,
    string? ColorCode,
    bool IsActive);

public sealed record CreateTagRequest(
    string Name,
    string? IconName,
    string? ColorCode);

public sealed record UpdateTagRequest(
    string Name,
    string? IconName,
    string? ColorCode,
    bool? IsActive);

public interface ITagService
{
    Task<Result<IReadOnlyCollection<TagListItemDto>>> GetActiveTagsAsync(CancellationToken cancellationToken);
    Task<Result<TagListItemDto>> CreateAsync(CreateTagRequest request, CancellationToken cancellationToken);
    Task<Result<TagListItemDto>> UpdateAsync(Guid tagId, UpdateTagRequest request, CancellationToken cancellationToken);
    Task<Result> SoftDeleteAsync(Guid tagId, CancellationToken cancellationToken);
}
