using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SPXDeliveryAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddPerformanceAndIntegrityIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Date",
                table: "Notifications",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "LastUpdated",
                table: "DeliveryOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "DateEncoded",
                table: "DeliveryOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "ArchivedAt",
                table: "DeliveryOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Timestamp",
                table: "ActivityLogs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_Date",
                table: "Notifications",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_ArchivedAt",
                table: "DeliveryOrders",
                column: "ArchivedAt");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryOrders_LastUpdated",
                table: "DeliveryOrders",
                column: "LastUpdated");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityLogs_Timestamp",
                table: "ActivityLogs",
                column: "Timestamp");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notifications_Date",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryOrders_ArchivedAt",
                table: "DeliveryOrders");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryOrders_LastUpdated",
                table: "DeliveryOrders");

            migrationBuilder.DropIndex(
                name: "IX_ActivityLogs_Timestamp",
                table: "ActivityLogs");

            migrationBuilder.AlterColumn<string>(
                name: "Date",
                table: "Notifications",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "LastUpdated",
                table: "DeliveryOrders",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "DateEncoded",
                table: "DeliveryOrders",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "ArchivedAt",
                table: "DeliveryOrders",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Timestamp",
                table: "ActivityLogs",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);
        }
    }
}
