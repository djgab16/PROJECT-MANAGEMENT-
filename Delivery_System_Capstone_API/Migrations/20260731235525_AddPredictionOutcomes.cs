using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SPXDeliveryAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddPredictionOutcomes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PredictionOutcomes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DeliveryOrderId = table.Column<int>(type: "int", nullable: false),
                    WaybillNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PredictedAtRisk = table.Column<bool>(type: "bit", nullable: false),
                    PredictedRiskScore = table.Column<double>(type: "float", nullable: false),
                    PredictedRiskLevel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PredictedConfidence = table.Column<double>(type: "float", nullable: false),
                    ActuallyBreached = table.Column<bool>(type: "bit", nullable: false),
                    PredictionMadeAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    OutcomeRecordedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PredictionOutcomes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PredictionOutcomes_DeliveryOrders_DeliveryOrderId",
                        column: x => x.DeliveryOrderId,
                        principalTable: "DeliveryOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PredictionOutcomes_DeliveryOrderId",
                table: "PredictionOutcomes",
                column: "DeliveryOrderId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PredictionOutcomes_OutcomeRecordedAt",
                table: "PredictionOutcomes",
                column: "OutcomeRecordedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PredictionOutcomes");
        }
    }
}
