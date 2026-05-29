using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Apptivity.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDailyRecommendationFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "user_daily_recommendation_plan",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    day_key = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    generated_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    llm_generated = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_daily_recommendation_plan", x => x.Id);
                    table.ForeignKey(
                        name: "FK_user_daily_recommendation_plan_accounts_user_id",
                        column: x => x.user_id,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_daily_recommendation_cursor",
                columns: table => new
                {
                    plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    current_tag_order = table.Column<int>(type: "integer", nullable: false),
                    is_depleted = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_daily_recommendation_cursor", x => x.plan_id);
                    table.ForeignKey(
                        name: "FK_user_daily_recommendation_cursor_user_daily_recommendation_~",
                        column: x => x.plan_id,
                        principalTable: "user_daily_recommendation_plan",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_daily_recommendation_plan_tags",
                columns: table => new
                {
                    plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tag_order = table.Column<int>(type: "integer", nullable: false),
                    tag_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_daily_recommendation_plan_tags", x => new { x.plan_id, x.tag_order });
                    table.ForeignKey(
                        name: "FK_user_daily_recommendation_plan_tags_tags_tag_id",
                        column: x => x.tag_id,
                        principalTable: "tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_user_daily_recommendation_plan_tags_user_daily_recommendati~",
                        column: x => x.plan_id,
                        principalTable: "user_daily_recommendation_plan",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_daily_recommendation_served_events",
                columns: table => new
                {
                    plan_id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tag_order = table.Column<int>(type: "integer", nullable: false),
                    served_at_utc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_daily_recommendation_served_events", x => new { x.plan_id, x.event_id });
                    table.ForeignKey(
                        name: "FK_user_daily_recommendation_served_events_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_user_daily_recommendation_served_events_user_daily_recommen~",
                        column: x => x.plan_id,
                        principalTable: "user_daily_recommendation_plan",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_user_daily_recommendation_plan_user_id_day_key",
                table: "user_daily_recommendation_plan",
                columns: new[] { "user_id", "day_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_daily_recommendation_plan_tags_plan_id_tag_id",
                table: "user_daily_recommendation_plan_tags",
                columns: new[] { "plan_id", "tag_id" });

            migrationBuilder.CreateIndex(
                name: "IX_user_daily_recommendation_plan_tags_tag_id",
                table: "user_daily_recommendation_plan_tags",
                column: "tag_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_daily_recommendation_served_events_event_id",
                table: "user_daily_recommendation_served_events",
                column: "event_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_daily_recommendation_served_events_plan_id_served_at_u~",
                table: "user_daily_recommendation_served_events",
                columns: new[] { "plan_id", "served_at_utc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_daily_recommendation_cursor");

            migrationBuilder.DropTable(
                name: "user_daily_recommendation_plan_tags");

            migrationBuilder.DropTable(
                name: "user_daily_recommendation_served_events");

            migrationBuilder.DropTable(
                name: "user_daily_recommendation_plan");
        }
    }
}
