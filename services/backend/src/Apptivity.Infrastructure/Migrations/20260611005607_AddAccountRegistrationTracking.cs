using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Apptivity.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountRegistrationTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RegistrationDeviceId",
                table: "accounts",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RegistrationIpAddress",
                table: "accounts",
                type: "character varying(45)",
                maxLength: 45,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RegistrationUserAgent",
                table: "accounts",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RegistrationDeviceId",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "RegistrationIpAddress",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "RegistrationUserAgent",
                table: "accounts");
        }
    }
}
