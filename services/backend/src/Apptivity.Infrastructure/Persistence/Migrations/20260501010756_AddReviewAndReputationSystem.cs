using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Apptivity.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewAndReputationSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_reviews_ReviewerId",
                table: "reviews");

            migrationBuilder.CreateTable(
                name: "club_ratings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Rating = table.Column<double>(type: "double precision", precision: 4, scale: 2, nullable: false, defaultValue: 0.0),
                    RatedCount = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_club_ratings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_club_ratings_clubs_Id",
                        column: x => x.Id,
                        principalTable: "clubs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "reputations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReputationPoint = table.Column<double>(type: "double precision", precision: 8, scale: 4, nullable: false, defaultValue: 0.0),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reputations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_reputations_users_Id",
                        column: x => x.Id,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_reviews_reviewer_reviewed_event_unique",
                table: "reviews",
                columns: new[] { "ReviewerId", "ReviewedId", "EventId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "club_ratings");

            migrationBuilder.DropTable(
                name: "reputations");

            migrationBuilder.DropIndex(
                name: "ix_reviews_reviewer_reviewed_event_unique",
                table: "reviews");

            migrationBuilder.CreateIndex(
                name: "IX_reviews_ReviewerId",
                table: "reviews",
                column: "ReviewerId");
        }
    }
}
