using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Apptivity.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMoreSeedTagsForDailyRecommendation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "tags",
                columns: new[] { "Id", "ColorCode", "CreatedAt", "DeletedAt", "IconName", "IsActive", "IsDeleted", "Name", "UpdatedAt" },
                values: new object[,]
                {
                    { new Guid("29b5f84d-6e7f-4d71-88c8-e0c91e84ae7b"), "#EF4444", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "heart-pulse", true, false, "Health", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("2f1769f1-0c31-4915-b9cc-d0cf79d5a5f3"), "#F59E0B", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "palette", true, false, "Art", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("65558f2c-8d3e-4e47-88b5-c2a87d5a0a7f"), "#8B5CF6", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "gamepad-2", true, false, "Gaming", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("91b95171-08eb-4c09-a511-61ef9e6a2d5d"), "#14B8A6", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "briefcase", true, false, "Business", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("d4e42a0d-6a4d-4d35-84d1-86e4b7e7e122"), "#0EA5E9", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, "book-open", true, false, "Education", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "tags",
                keyColumn: "Id",
                keyValue: new Guid("29b5f84d-6e7f-4d71-88c8-e0c91e84ae7b"));

            migrationBuilder.DeleteData(
                table: "tags",
                keyColumn: "Id",
                keyValue: new Guid("2f1769f1-0c31-4915-b9cc-d0cf79d5a5f3"));

            migrationBuilder.DeleteData(
                table: "tags",
                keyColumn: "Id",
                keyValue: new Guid("65558f2c-8d3e-4e47-88b5-c2a87d5a0a7f"));

            migrationBuilder.DeleteData(
                table: "tags",
                keyColumn: "Id",
                keyValue: new Guid("91b95171-08eb-4c09-a511-61ef9e6a2d5d"));

            migrationBuilder.DeleteData(
                table: "tags",
                keyColumn: "Id",
                keyValue: new Guid("d4e42a0d-6a4d-4d35-84d1-86e4b7e7e122"));
        }
    }
}
