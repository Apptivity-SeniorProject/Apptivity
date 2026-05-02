using Apptivity.Domain.Enums;

namespace Apptivity.Infrastructure.Persistence.Seed;

public static class ManualTestSeed
{
    public static readonly DateTime SeedCreatedAt = new(2026, 5, 2, 0, 0, 0, DateTimeKind.Utc);

    public static readonly Guid Individual1Id = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid Individual2Id = Guid.Parse("22222222-2222-2222-2222-222222222222");
    public static readonly Guid Individual3Id = Guid.Parse("33333333-3333-3333-3333-333333333333");
    public static readonly Guid Individual4Id = Guid.Parse("44444444-4444-4444-4444-444444444444");
    public static readonly Guid Organization1Id = Guid.Parse("55555555-5555-5555-5555-555555555555");
    public static readonly Guid Organization2Id = Guid.Parse("66666666-6666-6666-6666-666666666666");
    public static readonly Guid Admin1Id = Guid.Parse("77777777-7777-7777-7777-777777777777");
    public static readonly Guid Admin2Id = Guid.Parse("88888888-8888-8888-8888-888888888888");

    public const string IndividualPasswordHash = "$2a$11$br7/VIZPU/vv/nKgPLb7Je2kLT9MLf.ioNpLg67CiK6ax34QKXpi.";
    public const string OrganizationPasswordHash = "$2a$11$pUDpaVzxrVhzVIkdPKL65.d5AkfFirUGbj25GjhxcSclbgCiyXvae";
    public const string AdminPasswordHash = "$2a$11$.wLBQtqlp3Wl78hAPeVdA.NRTqL9AKeMLRyBjPtpEGypH2cFfjkuu";

    public static object[] Accounts =>
    [
        new
        {
            Id = Individual1Id,
            Type = AccountType.Individual,
            Username = "individual.alice",
            Phone = "+905010000001",
            Email = "individual.alice@apptivity.local",
            Password = IndividualPasswordHash,
            ProfilePhoto = (string?)null,
            SocialLinks = (string?)null,
            IsActive = true,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        },
        new
        {
            Id = Individual2Id,
            Type = AccountType.Individual,
            Username = "individual.berk",
            Phone = "+905010000002",
            Email = "individual.berk@apptivity.local",
            Password = IndividualPasswordHash,
            ProfilePhoto = (string?)null,
            SocialLinks = (string?)null,
            IsActive = true,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        },
        new
        {
            Id = Individual3Id,
            Type = AccountType.Individual,
            Username = "individual.cem",
            Phone = "+905010000003",
            Email = "individual.cem@apptivity.local",
            Password = IndividualPasswordHash,
            ProfilePhoto = (string?)null,
            SocialLinks = (string?)null,
            IsActive = true,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        },
        new
        {
            Id = Individual4Id,
            Type = AccountType.Individual,
            Username = "individual.derya",
            Phone = "+905010000004",
            Email = "individual.derya@apptivity.local",
            Password = IndividualPasswordHash,
            ProfilePhoto = (string?)null,
            SocialLinks = (string?)null,
            IsActive = true,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        },
        new
        {
            Id = Organization1Id,
            Type = AccountType.Organization,
            Username = "organization.apptivity.club",
            Phone = "+905010000005",
            Email = "organization.one@apptivity.local",
            Password = OrganizationPasswordHash,
            ProfilePhoto = (string?)null,
            SocialLinks = (string?)null,
            IsActive = true,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        },
        new
        {
            Id = Organization2Id,
            Type = AccountType.Organization,
            Username = "organization.city.events",
            Phone = "+905010000006",
            Email = "organization.two@apptivity.local",
            Password = OrganizationPasswordHash,
            ProfilePhoto = (string?)null,
            SocialLinks = (string?)null,
            IsActive = true,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        },
        new
        {
            Id = Admin1Id,
            Type = AccountType.Admin,
            Username = "admin.supervisor",
            Phone = "+905010000007",
            Email = "admin.one@apptivity.local",
            Password = AdminPasswordHash,
            ProfilePhoto = (string?)null,
            SocialLinks = (string?)null,
            IsActive = true,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        },
        new
        {
            Id = Admin2Id,
            Type = AccountType.Admin,
            Username = "admin.operator",
            Phone = "+905010000008",
            Email = "admin.two@apptivity.local",
            Password = AdminPasswordHash,
            ProfilePhoto = (string?)null,
            SocialLinks = (string?)null,
            IsActive = true,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        }
    ];

    public static object[] Users =>
    [
        new
        {
            Id = Individual1Id,
            Name = "Alice",
            Surname = "Yilmaz",
            Birthdate = new DateOnly(1998, 3, 14),
            Gender = "Female",
            Bio = "Runner and weekend traveler.",
            IsVerified = true,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        },
        new
        {
            Id = Individual2Id,
            Name = "Berk",
            Surname = "Demir",
            Birthdate = new DateOnly(1996, 11, 20),
            Gender = "Male",
            Bio = "Music fan and cyclist.",
            IsVerified = true,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        },
        new
        {
            Id = Individual3Id,
            Name = "Cem",
            Surname = "Arslan",
            Birthdate = new DateOnly(2000, 1, 9),
            Gender = "Male",
            Bio = "Tech meetups and hackathons.",
            IsVerified = false,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        },
        new
        {
            Id = Individual4Id,
            Name = "Derya",
            Surname = "Kara",
            Birthdate = new DateOnly(1999, 7, 2),
            Gender = "Female",
            Bio = "Community volunteer and reader.",
            IsVerified = false,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        }
    ];

    public static object[] Clubs =>
    [
        new
        {
            Id = Organization1Id,
            Name = "Apptivity Club",
            LocationCity = "Istanbul",
            Description = "Organizer for technology and social events.",
            Latitude = (decimal?)41.0082m,
            Longitude = (decimal?)28.9784m,
            IsVerified = true,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        },
        new
        {
            Id = Organization2Id,
            Name = "City Events Hub",
            LocationCity = "Ankara",
            Description = "Organizer for city-wide workshops and meetups.",
            Latitude = (decimal?)39.9334m,
            Longitude = (decimal?)32.8597m,
            IsVerified = false,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        }
    ];

    public static object[] Reputations =>
    [
        new
        {
            Id = Individual1Id,
            ReputationPoint = 0.0,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        },
        new
        {
            Id = Individual2Id,
            ReputationPoint = 0.0,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        },
        new
        {
            Id = Individual3Id,
            ReputationPoint = 0.0,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        },
        new
        {
            Id = Individual4Id,
            ReputationPoint = 0.0,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        }
    ];

    public static object[] ClubRatings =>
    [
        new
        {
            Id = Organization1Id,
            Rating = 0.0,
            RatedCount = 0,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        },
        new
        {
            Id = Organization2Id,
            Rating = 0.0,
            RatedCount = 0,
            CreatedAt = SeedCreatedAt,
            UpdatedAt = SeedCreatedAt,
            IsDeleted = false,
            DeletedAt = (DateTime?)null
        }
    ];
}
