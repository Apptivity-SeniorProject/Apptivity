namespace Apptivity.Application.Interfaces;

public interface ITagPredictionCacheService
{
    Task<TagPredictionResult?> GetAsync(Guid accountId, CancellationToken cancellationToken);
    Task SetAsync(Guid accountId, TagPredictionResult prediction, CancellationToken cancellationToken);
}
