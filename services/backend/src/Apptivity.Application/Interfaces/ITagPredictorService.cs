namespace Apptivity.Application.Interfaces;

public sealed record TagPredictionAllowedTag(Guid Id, string Name);

public sealed record TagPredictionInput(
    IReadOnlyCollection<TagPredictionAllowedTag> AllowedTags,
    IReadOnlyCollection<string> InterestTags,
    IReadOnlyCollection<string> ApprovedHistoryTags);

public sealed record TagPredictionResult(IReadOnlyCollection<Guid> TagIds);

public interface ITagPredictorService
{
    Task<TagPredictionResult?> PredictAsync(TagPredictionInput input, CancellationToken cancellationToken);
}
