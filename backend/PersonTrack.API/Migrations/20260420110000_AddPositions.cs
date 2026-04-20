using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PersonTrack.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPositions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Positions",
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
                    table.PrimaryKey("PK_Positions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Positions_Users_CreatedById",
                        column: x => x.CreatedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.AddColumn<int>(
                name: "PositionId",
                table: "Persons",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Positions_Name",
                table: "Positions",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Positions_CreatedById",
                table: "Positions",
                column: "CreatedById");

            migrationBuilder.CreateIndex(
                name: "IX_Persons_PositionId",
                table: "Persons",
                column: "PositionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Persons_Positions_PositionId",
                table: "Persons",
                column: "PositionId",
                principalTable: "Positions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.DropColumn(
                name: "CurrentPosition",
                table: "Persons");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CurrentPosition",
                table: "Persons",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.DropForeignKey(
                name: "FK_Persons_Positions_PositionId",
                table: "Persons");

            migrationBuilder.DropTable(
                name: "Positions");

            migrationBuilder.DropIndex(
                name: "IX_Persons_PositionId",
                table: "Persons");

            migrationBuilder.DropColumn(
                name: "PositionId",
                table: "Persons");
        }
    }
}
