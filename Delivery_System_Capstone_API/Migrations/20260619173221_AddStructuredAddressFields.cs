using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SPXDeliveryAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddStructuredAddressFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DamagePhoto",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "DelayReason",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "IncidentDetails",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "IsDelayed",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "IsIncidentReported",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "VerificationPin",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "VerifiedIdNumber",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "VerifiedIdType",
                table: "DeliveryOrders");

            migrationBuilder.AddColumn<string>(
                name: "RecipientBarangay",
                table: "DeliveryOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecipientCity",
                table: "DeliveryOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecipientStreet",
                table: "DeliveryOrders",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecipientUnit",
                table: "DeliveryOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SenderBarangay",
                table: "DeliveryOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SenderCity",
                table: "DeliveryOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SenderStreet",
                table: "DeliveryOrders",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SenderUnit",
                table: "DeliveryOrders",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RecipientBarangay",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "RecipientCity",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "RecipientStreet",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "RecipientUnit",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "SenderBarangay",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "SenderCity",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "SenderStreet",
                table: "DeliveryOrders");

            migrationBuilder.DropColumn(
                name: "SenderUnit",
                table: "DeliveryOrders");

            migrationBuilder.AddColumn<string>(
                name: "DamagePhoto",
                table: "DeliveryOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DelayReason",
                table: "DeliveryOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IncidentDetails",
                table: "DeliveryOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDelayed",
                table: "DeliveryOrders",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsIncidentReported",
                table: "DeliveryOrders",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "VerificationPin",
                table: "DeliveryOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerifiedIdNumber",
                table: "DeliveryOrders",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VerifiedIdType",
                table: "DeliveryOrders",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
