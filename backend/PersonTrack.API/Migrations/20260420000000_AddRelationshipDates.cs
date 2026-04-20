using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PersonTrack.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRelationshipDates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EndDate",
                table: "PersonRelationships",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartDate",
                table: "PersonRelationships",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(2026, 4, 20, 0, 0, 0, 0, DateTimeKind.Utc));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EndDate",
                table: "PersonRelationships");

            migrationBuilder.DropColumn(
                name: "StartDate",
                table: "PersonRelationships");
        }
    }
}
