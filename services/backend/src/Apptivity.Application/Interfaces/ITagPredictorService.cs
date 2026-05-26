namespace Apptivity.Application.Interfaces;

public sealed record TagPredictionInput(
    IReadOnlyCollection<string> AllowedTags,
    IReadOnlyCollection<string> InterestTags,
    IReadOnlyCollection<string> ApprovedHistoryTags);

public sealed record TagPredictionResult(string PrimaryTag, string FallbackTag);

public interface ITagPredictorService
{
    Task<TagPredictionResult?> PredictAsync(TagPredictionInput input, CancellationToken cancellationToken);
}
