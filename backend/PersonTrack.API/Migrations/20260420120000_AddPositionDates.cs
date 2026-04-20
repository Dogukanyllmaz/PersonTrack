using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PersonTrack.API.Migrations;

public partial class AddPositionDates : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>(
            name: "PositionStartDate",
            table: "Persons",
            type: "datetime2",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "PositionEndDate",
            table: "Persons",
            type: "datetime2",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "PositionStartDate", table: "Persons");
        migrationBuilder.DropColumn(name: "PositionEndDate", table: "Persons");
    }
}
