using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Apptivity.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddChatReportEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "chat_reports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReporterId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReasonCategory = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_reports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_chat_reports_accounts_ReporterId",
                        column: x => x.ReporterId,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_chat_reports_events_EventId",
                        column: x => x.EventId,
                        principalTable: "events",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "chat_report_messages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChatReportId = table.Column<Guid>(type: "uuid", nullable: false),
                    SenderAccountId = table.Column<Guid>(type: "uuid", nullable: false),
                    SenderDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Content = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    OriginalSentAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chat_report_messages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_chat_report_messages_chat_reports_ChatReportId",
                        column: x => x.ChatReportId,
                        principalTable: "chat_reports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_chat_report_messages_ChatReportId",
                table: "chat_report_messages",
                column: "ChatReportId");

            migrationBuilder.CreateIndex(
                name: "IX_chat_reports_EventId",
                table: "chat_reports",
                column: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_chat_reports_ReporterId",
                table: "chat_reports",
                column: "ReporterId");

            migrationBuilder.CreateIndex(
                name: "IX_chat_reports_Status",
                table: "chat_reports",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "chat_report_messages");

            migrationBuilder.DropTable(
                name: "chat_reports");
        }
    }
}
