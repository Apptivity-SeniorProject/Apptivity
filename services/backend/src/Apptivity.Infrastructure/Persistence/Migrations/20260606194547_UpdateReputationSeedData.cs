using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Apptivity.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateReputationSeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "reputations",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "ReputationPoint",
                value: 45.0);

            migrationBuilder.UpdateData(
                table: "reputations",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "ReputationPoint",
                value: -35.0);

            migrationBuilder.UpdateData(
                table: "reputations",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "ReputationPoint",
                value: 75.0);

            migrationBuilder.UpdateData(
                table: "reputations",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "ReputationPoint",
                value: -5.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "reputations",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "ReputationPoint",
                value: 0.0);

            migrationBuilder.UpdateData(
                table: "reputations",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "ReputationPoint",
                value: 0.0);

            migrationBuilder.UpdateData(
                table: "reputations",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "ReputationPoint",
                value: 0.0);

            migrationBuilder.UpdateData(
                table: "reputations",
                keyColumn: "Id",
                keyValue: new Guid("44444444-4444-4444-4444-444444444444"),
                column: "ReputationPoint",
                value: 0.0);
        }
    }
}
