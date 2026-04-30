using Apptivity.Domain.Common;

namespace Apptivity.Domain.Entities;

public sealed class User : BaseEntity
{
    public Account Account { get; set; } = null!;

    public required string Name { get; set; }
    public required string Surname { get; set; }
    public DateOnly? Birthdate { get; set; }
    public string? Gender { get; set; }
    public string? Bio { get; set; }
    public bool IsVerified { get; set; }

    public ICollection<Participation> Participations { get; set; } = new List<Participation>();
}
