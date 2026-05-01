using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

public sealed class Club : BaseEntity
{
    public Account Account { get; set; } = null!;

    public required string Name { get; set; }
    public required string LocationCity { get; set; }
    public string? Description { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public bool IsVerified { get; set; }

    public ClubRating? ClubRating { get; set; }
}
