using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SPXDeliveryAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddDbIntegrityAndConcurrency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "RedeliveryStatus",
                table: "DeliveryOrders",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "DateEncoded",
                table: "DeliveryOrders",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "ArchivedAt",
                table: "DeliveryOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ArchivedBy",
                table: "DeliveryOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "DeliveryOrders",
                type: "rowversion",
                rowVersion: true,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_DateEncoded",
                table: "DeliveryOrders",
                column: "DateEncoded");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_IsArchived",
                table: "DeliveryOrders",
                column: "IsArchived");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_RedeliveryDriverId",
                table: "DeliveryOrders",
                column: "RedeliveryDriverId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_RedeliveryStatus",
                table: "DeliveryOrders",
                column: "RedeliveryStatus");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_Status",
                table: "DeliveryOrders",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_TaskType",
                table: "DeliveryOrders",
                column: "TaskType");

            migrationBuilder.AddForeignKey(
                name: "FK_DeliveryOrders_Employees_RedeliveryDriverId",
                table: "DeliveryOrders",
                column: "RedeliveryDriverId",
                principalTable: "Employees",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DeliveryOrders_Employees_RedeliveryDriverId",
                table: "DeliveryOrders");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryOrders_DateEncoded",
                table: "DeliveryOrders");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryOrders_IsArchived",
                table: "DeliveryOrders");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryOrders_RedeliveryDriverId",
                table: "DeliveryOrders");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryOrders_RedeliveryStatus",
                table: "DeliveryOrders");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryOrders_Status",
                table: "DeliveryOrders");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryOrders_TaskType",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "ArchivedAt",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "ArchivedBy",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "DeliveryOrders");

            migrationBuilder.AlterColumn<string>(
                name: "RedeliveryStatus",
                table: "DeliveryOrders",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "DateEncoded",
                table: "DeliveryOrders",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");
        }
    }
}
