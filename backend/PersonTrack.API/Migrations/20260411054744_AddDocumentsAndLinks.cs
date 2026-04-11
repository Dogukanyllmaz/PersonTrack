using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PersonTrack.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentsAndLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CurrentPosition",
                table: "Persons",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Organization",
                table: "Persons",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "PersonRelationships",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MeetingDocuments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MeetingId = table.Column<int>(type: "int", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StoredFileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UploadedById = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingDocuments_Meetings_MeetingId",
                        column: x => x.MeetingId,
                        principalTable: "Meetings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MeetingDocuments_Users_UploadedById",
                        column: x => x.UploadedById,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "MeetingLinks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MeetingId = table.Column<int>(type: "int", nullable: false),
                    LinkedMeetingId = table.Column<int>(type: "int", nullable: false),
                    LinkType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MeetingLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MeetingLinks_Meetings_LinkedMeetingId",
                        column: x => x.LinkedMeetingId,
                        principalTable: "Meetings",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MeetingLinks_Meetings_MeetingId",
                        column: x => x.MeetingId,
                        principalTable: "Meetings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PersonDocuments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PersonId = table.Column<int>(type: "int", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    StoredFileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UploadedById = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PersonDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PersonDocuments_Persons_PersonId",
                        column: x => x.PersonId,
                        principalTable: "Persons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PersonDocuments_Users_UploadedById",
                        column: x => x.UploadedById,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_MeetingDocuments_MeetingId",
                table: "MeetingDocuments",
                column: "MeetingId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingDocuments_UploadedById",
                table: "MeetingDocuments",
                column: "UploadedById");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingLinks_LinkedMeetingId",
                table: "MeetingLinks",
                column: "LinkedMeetingId");

            migrationBuilder.CreateIndex(
                name: "IX_MeetingLinks_MeetingId",
                table: "MeetingLinks",
                column: "MeetingId");

            migrationBuilder.CreateIndex(
                name: "IX_PersonDocuments_PersonId",
                table: "PersonDocuments",
                column: "PersonId");

            migrationBuilder.CreateIndex(
                name: "IX_PersonDocuments_UploadedById",
                table: "PersonDocuments",
                column: "UploadedById");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MeetingDocuments");

            migrationBuilder.DropTable(
                name: "MeetingLinks");

            migrationBuilder.DropTable(
                name: "PersonDocuments");

            migrationBuilder.DropColumn(
                name: "CurrentPosition",
                table: "Persons");

            migrationBuilder.DropColumn(
                name: "Organization",
                table: "Persons");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "PersonRelationships");
        }
    }
}
