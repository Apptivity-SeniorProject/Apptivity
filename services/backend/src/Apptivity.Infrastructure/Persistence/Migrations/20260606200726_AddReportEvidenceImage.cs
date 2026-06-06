using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Apptivity.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReportEvidenceImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "EvidenceImageUrl",
                table: "reports",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EvidenceImageUrl",
                table: "reports");
        }
    }
}
