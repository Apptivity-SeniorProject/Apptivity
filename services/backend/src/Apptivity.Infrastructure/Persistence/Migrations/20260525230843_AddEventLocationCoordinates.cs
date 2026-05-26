using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Apptivity.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEventLocationCoordinates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "LocationLat",
                table: "events",
                type: "numeric(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "LocationLng",
                table: "events",
                type: "numeric(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.Sql(
                """
                WITH parsed AS (
                    SELECT
                        "Id",
                        (regexp_match("LocationData", '"lat"\s*:\s*"?(-?\d+(?:\.\d+)?)"?'))[1] AS lat_text,
                        (regexp_match("LocationData", '"lng"\s*:\s*"?(-?\d+(?:\.\d+)?)"?'))[1] AS lng_text
                    FROM events
                    WHERE "LocationData" IS NOT NULL
                )
                UPDATE events e
                SET
                    "LocationLat" = CASE
                        WHEN p.lat_text IS NOT NULL
                            AND p.lat_text::numeric BETWEEN -90 AND 90
                        THEN ROUND(p.lat_text::numeric, 6)
                        ELSE e."LocationLat"
                    END,
                    "LocationLng" = CASE
                        WHEN p.lng_text IS NOT NULL
                            AND p.lng_text::numeric BETWEEN -180 AND 180
                        THEN ROUND(p.lng_text::numeric, 6)
                        ELSE e."LocationLng"
                    END
                FROM parsed p
                WHERE e."Id" = p."Id"
                    AND (e."LocationLat" IS NULL OR e."LocationLng" IS NULL);
                """);

            migrationBuilder.CreateIndex(
                name: "IX_events_LocationLat_LocationLng",
                table: "events",
                columns: new[] { "LocationLat", "LocationLng" },
                filter: "\"LocationLat\" IS NOT NULL AND \"LocationLng\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_events_LocationLat_LocationLng",
                table: "events");

            migrationBuilder.DropColumn(
                name: "LocationLat",
                table: "events");

            migrationBuilder.DropColumn(
                name: "LocationLng",
                table: "events");
        }
    }
}
