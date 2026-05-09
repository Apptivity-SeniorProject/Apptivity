using Apptivity.Application.Common.Constants;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Tags;
using Apptivity.Application.Interfaces;
using Apptivity.Domain.Entities;

namespace Apptivity.Application.Services;

public sealed class TagService : ITagService
{
    private readonly ITagRepository _tagRepository;
    private readonly IUnitOfWork _unitOfWork;

    public TagService(ITagRepository tagRepository, IUnitOfWork unitOfWork)
    {
        _tagRepository = tagRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<IReadOnlyCollection<TagListItemDto>>> GetActiveTagsAsync(CancellationToken cancellationToken)
    {
        var tags = await _tagRepository.GetActiveAsync(cancellationToken);
        var items = tags
            .OrderBy(x => x.Name)
            .Select(Map)
            .ToArray();

        return Result<IReadOnlyCollection<TagListItemDto>>.Success(items);
    }

    public async Task<Result<TagListItemDto>> CreateAsync(CreateTagRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return Result<TagListItemDto>.Failure(ErrorCodes.Validation, "Tag name is required.");
        }
        var normalizedName = request.Name.Trim();

        if (await _tagRepository.ExistsByNameAsync(normalizedName, null, cancellationToken))
        {
            return Result<TagListItemDto>.Failure(ErrorCodes.TagAlreadyExists, "Tag name already exists.");
        }

        var entity = new Tag
        {
            Id = Guid.NewGuid(),
            Name = normalizedName,
            IconName = request.IconName?.Trim(),
            ColorCode = request.ColorCode?.Trim(),
            IsActive = true
        };

        await _tagRepository.AddAsync(entity, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<TagListItemDto>.Success(Map(entity));
    }

    public async Task<Result<TagListItemDto>> UpdateAsync(Guid tagId, UpdateTagRequest request, CancellationToken cancellationToken)
    {
        var tag = await _tagRepository.GetByIdAsync(tagId, cancellationToken);
        if (tag is null)
        {
            return Result<TagListItemDto>.Failure(ErrorCodes.TagNotFound, "Tag not found.");
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return Result<TagListItemDto>.Failure(ErrorCodes.Validation, "Tag name is required.");
        }
        var normalizedName = request.Name.Trim();

        if (await _tagRepository.ExistsByNameAsync(normalizedName, tagId, cancellationToken))
        {
            return Result<TagListItemDto>.Failure(ErrorCodes.TagAlreadyExists, "Tag name already exists.");
        }

        tag.Name = normalizedName;
        tag.IconName = request.IconName?.Trim();
        tag.ColorCode = request.ColorCode?.Trim();
        if (request.IsActive.HasValue)
        {
            tag.IsActive = request.IsActive.Value;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<TagListItemDto>.Success(Map(tag));
    }

    public async Task<Result> SoftDeleteAsync(Guid tagId, CancellationToken cancellationToken)
    {
        var tag = await _tagRepository.GetByIdWithRelationsAsync(tagId, cancellationToken);
        if (tag is null)
        {
            return Result.Failure(ErrorCodes.TagNotFound, "Tag not found.");
        }

        foreach (var primaryTaggedEvent in tag.PrimaryTaggedEvents)
        {
            primaryTaggedEvent.PrimaryTagId = null;
        }

        tag.Events.Clear();
        tag.Accounts.Clear();
        tag.IsActive = false;
        tag.IsDeleted = true;
        tag.DeletedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private static TagListItemDto Map(Tag tag)
    {
        return new TagListItemDto(
            tag.Id,
            tag.Name,
            tag.IconName,
            tag.ColorCode,
            tag.IsActive);
    }
}
