using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Apptivity.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDynamicTagSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Description",
                table: "tags");

            migrationBuilder.AddColumn<string>(
                name: "ColorCode",
                table: "tags",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IconName",
                table: "tags",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "tags",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateTable(
                name: "event_tags",
                columns: table => new
                {
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tag_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_event_tags", x => new { x.event_id, x.tag_id });
                    table.ForeignKey(
                        name: "FK_event_tags_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_event_tags_tags_tag_id",
                        column: x => x.tag_id,
                        principalTable: "tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "tags",
                keyColumn: "Id",
                keyValue: new Guid("40fd6d4c-0f95-49d5-bb6a-7a6419d15231"),
                columns: new[] { "ColorCode", "IconName", "IsActive", "Name" },
                values: new object[] { "#3B82F6", "cpu", true, "Technology" });

            migrationBuilder.UpdateData(
                table: "tags",
                keyColumn: "Id",
                keyValue: new Guid("8ba4efa4-9f4a-4a56-8646-644a8e3f079d"),
                columns: new[] { "ColorCode", "IconName", "IsActive", "Name" },
                values: new object[] { "#EC4899", "music-note", true, "Music" });

            migrationBuilder.UpdateData(
                table: "tags",
                keyColumn: "Id",
                keyValue: new Guid("96a9f6b2-40d7-4e15-9f8e-cb7596ed59f1"),
                columns: new[] { "ColorCode", "IconName", "IsActive", "Name" },
                values: new object[] { "#10B981", "football", true, "Sports" });

            migrationBuilder.CreateIndex(
                name: "IX_event_tags_tag_id",
                table: "event_tags",
                column: "tag_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "event_tags");

            migrationBuilder.DropColumn(
                name: "ColorCode",
                table: "tags");

            migrationBuilder.DropColumn(
                name: "IconName",
                table: "tags");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "tags");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "tags",
                type: "character varying(400)",
                maxLength: 400,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "tags",
                keyColumn: "Id",
                keyValue: new Guid("40fd6d4c-0f95-49d5-bb6a-7a6419d15231"),
                columns: new[] { "Description", "Name" },
                values: new object[] { null, "Teknoloji" });

            migrationBuilder.UpdateData(
                table: "tags",
                keyColumn: "Id",
                keyValue: new Guid("8ba4efa4-9f4a-4a56-8646-644a8e3f079d"),
                columns: new[] { "Description", "Name" },
                values: new object[] { null, "Muzik" });

            migrationBuilder.UpdateData(
                table: "tags",
                keyColumn: "Id",
                keyValue: new Guid("96a9f6b2-40d7-4e15-9f8e-cb7596ed59f1"),
                columns: new[] { "Description", "Name" },
                values: new object[] { null, "Spor" });
        }
    }
}
