using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SPXDeliveryAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddRedeliveryProperties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastLiveUpdate",
                table: "DeliveryOrders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "LiveLatitude",
                table: "DeliveryOrders",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "LiveLongitude",
                table: "DeliveryOrders",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "RecipientLatitude",
                table: "DeliveryOrders",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "RecipientLongitude",
                table: "DeliveryOrders",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RedeliveryAttemptCount",
                table: "DeliveryOrders",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RedeliveryDriverId",
                table: "DeliveryOrders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RedeliveryRemarks",
                table: "DeliveryOrders",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RedeliveryScheduledDate",
                table: "DeliveryOrders",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_RedeliveryDriverId",
                table: "DeliveryOrders",
                column: "RedeliveryDriverId");

            migrationBuilder.AddForeignKey(
                name: "FK_DeliveryOrders_Employees_RedeliveryDriverId",
                table: "DeliveryOrders",
                column: "RedeliveryDriverId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DeliveryOrders_Employees_RedeliveryDriverId",
                table: "DeliveryOrders");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryOrders_RedeliveryDriverId",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "LastLiveUpdate",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "LiveLatitude",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "LiveLongitude",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "RecipientLatitude",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "RecipientLongitude",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "RedeliveryAttemptCount",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "RedeliveryDriverId",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "RedeliveryRemarks",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "RedeliveryScheduledDate",
                table: "DeliveryOrders");
        }
    }
}
