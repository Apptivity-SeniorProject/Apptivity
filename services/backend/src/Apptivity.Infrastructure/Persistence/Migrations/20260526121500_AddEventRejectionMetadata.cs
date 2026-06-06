using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Apptivity.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [Microsoft.EntityFrameworkCore.Infrastructure.DbContext(typeof(AppDbContext))]
    [Migration("20260526121500_AddEventRejectionMetadata")]
    public partial class AddEventRejectionMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RejectedAdditionalExplanation",
                table: "events",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectedViolationReason",
                table: "events",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RejectedAdditionalExplanation",
                table: "events");

            migrationBuilder.DropColumn(
                name: "RejectedViolationReason",
                table: "events");
        }
    }
}
