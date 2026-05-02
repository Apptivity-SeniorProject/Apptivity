using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Apptivity.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddManualTestSeedAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "accounts",
                columns: new[] { "Id", "CreatedAt", "DeletedAt", "Email", "IsActive", "IsDeleted", "Password", "Phone", "ProfilePhoto", "SocialLinks", "Type", "UpdatedAt", "Username" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-1111-1111-111111111111"), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, "individual.alice@apptivity.local", true, false, "$2a$11$br7/VIZPU/vv/nKgPLb7Je2kLT9MLf.ioNpLg67CiK6ax34QKXpi.", "+905010000001", null, null, 1, new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), "individual.alice" },
                    { new Guid("22222222-2222-2222-2222-222222222222"), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, "individual.berk@apptivity.local", true, false, "$2a$11$br7/VIZPU/vv/nKgPLb7Je2kLT9MLf.ioNpLg67CiK6ax34QKXpi.", "+905010000002", null, null, 1, new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), "individual.berk" },
                    { new Guid("33333333-3333-3333-3333-333333333333"), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, "individual.cem@apptivity.local", true, false, "$2a$11$br7/VIZPU/vv/nKgPLb7Je2kLT9MLf.ioNpLg67CiK6ax34QKXpi.", "+905010000003", null, null, 1, new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), "individual.cem" },
                    { new Guid("44444444-4444-4444-4444-444444444444"), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, "individual.derya@apptivity.local", true, false, "$2a$11$br7/VIZPU/vv/nKgPLb7Je2kLT9MLf.ioNpLg67CiK6ax34QKXpi.", "+905010000004", null, null, 1, new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), "individual.derya" },
                    { new Guid("55555555-5555-5555-5555-555555555555"), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, "organization.one@apptivity.local", true, false, "$2a$11$pUDpaVzxrVhzVIkdPKL65.d5AkfFirUGbj25GjhxcSclbgCiyXvae", "+905010000005", null, null, 2, new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), "organization.apptivity.club" },
                    { new Guid("66666666-6666-6666-6666-666666666666"), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, "organization.two@apptivity.local", true, false, "$2a$11$pUDpaVzxrVhzVIkdPKL65.d5AkfFirUGbj25GjhxcSclbgCiyXvae", "+905010000006", null, null, 2, new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), "organization.city.events" },
                    { new Guid("77777777-7777-7777-7777-777777777777"), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, "admin.one@apptivity.local", true, false, "$2a$11$.wLBQtqlp3Wl78hAPeVdA.NRTqL9AKeMLRyBjPtpEGypH2cFfjkuu", "+905010000007", null, null, 3, new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), "admin.supervisor" },
                    { new Guid("88888888-8888-8888-8888-888888888888"), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, "admin.two@apptivity.local", true, false, "$2a$11$.wLBQtqlp3Wl78hAPeVdA.NRTqL9AKeMLRyBjPtpEGypH2cFfjkuu", "+905010000008", null, null, 3, new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), "admin.operator" }
                });

            migrationBuilder.InsertData(
                table: "clubs",
                columns: new[] { "Id", "CreatedAt", "DeletedAt", "Description", "IsDeleted", "IsVerified", "Latitude", "LocationCity", "Longitude", "Name", "UpdatedAt" },
                values: new object[] { new Guid("55555555-5555-5555-5555-555555555555"), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, "Organizer for technology and social events.", false, true, 41.0082m, "Istanbul", 28.9784m, "Apptivity Club", new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.InsertData(
                table: "clubs",
                columns: new[] { "Id", "CreatedAt", "DeletedAt", "Description", "IsDeleted", "Latitude", "LocationCity", "Longitude", "Name", "UpdatedAt" },
                values: new object[] { new Guid("66666666-6666-6666-6666-666666666666"), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, "Organizer for city-wide workshops and meetups.", false, 39.9334m, "Ankara", 32.8597m, "City Events Hub", new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.InsertData(
                table: "users",
                columns: new[] { "Id", "Bio", "Birthdate", "CreatedAt", "DeletedAt", "Gender", "IsDeleted", "IsVerified", "Name", "Surname", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-1111-1111-111111111111"), "Runner and weekend traveler.", new DateOnly(1998, 3, 14), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, "Female", false, true, "Alice", "Yilmaz", new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("22222222-2222-2222-2222-222222222222"), "Music fan and cyclist.", new DateOnly(1996, 11, 20), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, "Male", false, true, "Berk", "Demir", new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("33333333-3333-3333-3333-333333333333"), "Tech meetups and hackathons.", new DateOnly(2000, 1, 9), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, "Male", false, false, "Cem", "Arslan", new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("44444444-4444-4444-4444-444444444444"), "Community volunteer and reader.", new DateOnly(1999, 7, 2), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, "Female", false, false, "Derya", "Kara", new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "club_ratings",
                columns: new[] { "Id", "CreatedAt", "DeletedAt", "IsDeleted", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("55555555-5555-5555-5555-555555555555"), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, false, new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("66666666-6666-6666-6666-666666666666"), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, false, new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.InsertData(
                table: "reputations",
                columns: new[] { "Id", "CreatedAt", "DeletedAt", "IsDeleted", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-1111-1111-111111111111"), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, false, new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("22222222-2222-2222-2222-222222222222"), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, false, new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("33333333-3333-3333-3333-333333333333"), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, false, new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("44444444-4444-4444-4444-444444444444"), new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc), null, false, new DateTime(2026, 5, 2, 0, 0, 0, 0, DateTimeKind.Utc) }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "accounts",
                keyColumn: "Id",
                keyValue: new Guid("77777777-7777-7777-7777-777777777777"));

            migrationBuilder.DeleteData(
                table: "accounts",
                keyColumn: "Id",
                keyValue: new Guid("88888888-8888-8888-8888-888888888888"));

            migrationBuilder.DeleteData(
                table: "club_ratings",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"));

            migrationBuilder.DeleteData(
                table: "club_ratings",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"));

            migrationBuilder.DeleteData(
                table: "reputations",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.DeleteData(
                table: "reputations",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"));

            migrationBuilder.DeleteData(
                table: "reputations",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"));

            migrationBuilder.DeleteData(
                table: "reputations",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"));

            migrationBuilder.DeleteData(
                table: "clubs",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"));

            migrationBuilder.DeleteData(
                table: "clubs",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"));

            migrationBuilder.DeleteData(
                table: "users",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.DeleteData(
                table: "users",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"));

            migrationBuilder.DeleteData(
                table: "users",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"));

            migrationBuilder.DeleteData(
                table: "users",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"));

            migrationBuilder.DeleteData(
                table: "accounts",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.DeleteData(
                table: "accounts",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"));

            migrationBuilder.DeleteData(
                table: "accounts",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"));

            migrationBuilder.DeleteData(
                table: "accounts",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"));

            migrationBuilder.DeleteData(
                table: "accounts",
                keyColumn: "Id",
                keyValue: new Guid("55555555-5555-5555-5555-555555555555"));

            migrationBuilder.DeleteData(
                table: "accounts",
                keyColumn: "Id",
                keyValue: new Guid("66666666-6666-6666-6666-666666666666"));
        }
    }
}
