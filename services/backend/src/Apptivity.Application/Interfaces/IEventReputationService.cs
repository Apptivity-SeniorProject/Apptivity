namespace Apptivity.Application.Interfaces;

public interface IEventReputationService
{
    /// <summary>
    /// Processes all reviews for a completed event in a single batch.
    /// Calculates the reputation point changes and club star ratings,
    /// applies them to the target accounts, and commits the transaction.
    /// </summary>
    Task CalculateEventReputationsAsync(Guid eventId, CancellationToken cancellationToken);
}
