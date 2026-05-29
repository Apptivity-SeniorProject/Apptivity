namespace Apptivity.Application.Interfaces;

public interface IRecommendationTransactionManager
{
    Task<T> ExecuteInTransactionAsync<T>(
        Func<CancellationToken, Task<T>> action,
        CancellationToken cancellationToken);
}
