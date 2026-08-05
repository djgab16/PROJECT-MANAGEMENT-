using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SPXDeliveryAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddStructuredAddressFields : Migration
    {
        // Legacy columns this migration was originally generated to drop. They were
        // created by an earlier revision of 20260610180217_InitialCreate that has since
        // been regenerated, so none of them exist when the chain is replayed against a
        // clean database. The original unconditional DropColumn calls therefore failed
        // with "ALTER TABLE DROP COLUMN failed because column 'DamagePhoto' does not
        // exist in table 'DeliveryOrders'", which made every clean database
        // un-migratable. The drops below are guarded so they become no-ops when the
        // column was never created. Databases that already applied this migration are
        // unaffected - EF Core never re-runs an applied migration.
        private static readonly string[] LegacyDroppedColumns =
        {
            "DamagePhoto",
            "DelayReason",
            "IncidentDetails",
            "IsDelayed",
            "IsIncidentReported",
            "VerificationPin",
            "VerifiedIdNumber",
            "VerifiedIdType"
        };

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var column in LegacyDroppedColumns)
            {
                // Drop the column's default constraint first (IsDelayed and
                // IsIncidentReported were created NOT NULL with a default), then the
                // column itself. Both steps are conditional on the column existing.
                migrationBuilder.Sql($@"
IF COL_LENGTH('DeliveryOrders', '{column}') IS NOT NULL
BEGIN
    DECLARE @defaultConstraint sysname;
    SELECT @defaultConstraint = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c
        ON c.default_object_id = dc.object_id
       AND c.object_id = dc.parent_object_id
    WHERE dc.parent_object_id = OBJECT_ID('DeliveryOrders')
      AND c.name = '{column}';

    IF @defaultConstraint IS NOT NULL
        EXEC('ALTER TABLE [DeliveryOrders] DROP CONSTRAINT [' + @defaultConstraint + ']');

    ALTER TABLE [DeliveryOrders] DROP COLUMN [{column}];
END");
            }

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
