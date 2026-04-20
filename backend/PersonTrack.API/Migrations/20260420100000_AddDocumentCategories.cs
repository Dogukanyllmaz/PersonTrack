using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PersonTrack.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DocumentCategories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedById = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DocumentCategories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DocumentCategories_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.AddColumn<int>(
                name: "CategoryId",
                table: "PersonDocuments",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentCategories_Name",
                table: "DocumentCategories",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DocumentCategories_CreatedById",
                table: "DocumentCategories",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_PersonDocuments_CategoryId",
                table: "PersonDocuments",
                column: "CategoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_PersonDocuments_DocumentCategories_CategoryId",
                table: "PersonDocuments",
                column: "CategoryId",
                principalTable: "DocumentCategories",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PersonDocuments_DocumentCategories_CategoryId",
                table: "PersonDocuments");

            migrationBuilder.DropTable(
                name: "DocumentCategories");

            migrationBuilder.DropIndex(
                name: "IX_PersonDocuments_CategoryId",
                table: "PersonDocuments");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "PersonDocuments");
        }
    }
}
