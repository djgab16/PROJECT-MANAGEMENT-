using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SPXDeliveryAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddLearnedRiskModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "FeatureClientType",
                table: "PredictionOutcomes",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FeatureConditions",
                table: "PredictionOutcomes",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FeatureDriverHistory",
                table: "PredictionOutcomes",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FeaturePackage",
                table: "PredictionOutcomes",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FeaturePriority",
                table: "PredictionOutcomes",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FeatureRedeliveryAttempts",
                table: "PredictionOutcomes",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FeatureRouteHistory",
                table: "PredictionOutcomes",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FeatureSlaRemainingTime",
                table: "PredictionOutcomes",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<bool>(
                name: "FeaturesCaptured",
                table: "PredictionOutcomes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "MlModelId",
                table: "PredictionOutcomes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "MlPredictedAtRisk",
                table: "PredictionOutcomes",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "MlPredictedRiskScore",
                table: "PredictionOutcomes",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "FeatureClientType",
                table: "DeliveryPredictions",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FeatureConditions",
                table: "DeliveryPredictions",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FeatureDriverHistory",
                table: "DeliveryPredictions",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FeaturePackage",
                table: "DeliveryPredictions",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FeaturePriority",
                table: "DeliveryPredictions",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FeatureRedeliveryAttempts",
                table: "DeliveryPredictions",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FeatureRouteHistory",
                table: "DeliveryPredictions",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "FeatureSlaRemainingTime",
                table: "DeliveryPredictions",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<bool>(
                name: "FeaturesCaptured",
                table: "DeliveryPredictions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "MlIsAtRisk",
                table: "DeliveryPredictions",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MlModelId",
                table: "DeliveryPredictions",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "MlRiskScore",
                table: "DeliveryPredictions",
                type: "float",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PredictionModels",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Intercept = table.Column<double>(type: "float", nullable: false),
                    CoefSlaRemainingTime = table.Column<double>(type: "float", nullable: false),
                    CoefPriority = table.Column<double>(type: "float", nullable: false),
                    CoefRedeliveryAttempts = table.Column<double>(type: "float", nullable: false),
                    CoefDriverHistory = table.Column<double>(type: "float", nullable: false),
                    CoefRouteHistory = table.Column<double>(type: "float", nullable: false),
                    CoefPackage = table.Column<double>(type: "float", nullable: false),
                    CoefClientType = table.Column<double>(type: "float", nullable: false),
                    CoefConditions = table.Column<double>(type: "float", nullable: false),
                    SampleCount = table.Column<int>(type: "int", nullable: false),
                    PositiveCount = table.Column<int>(type: "int", nullable: false),
                    TrainingLogLoss = table.Column<double>(type: "float", nullable: false),
                    DecisionThreshold = table.Column<double>(type: "float", nullable: false),
                    Epochs = table.Column<int>(type: "int", nullable: false),
                    LearningRate = table.Column<double>(type: "float", nullable: false),
                    L2 = table.Column<double>(type: "float", nullable: false),
                    TrainingSource = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TrainedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PredictionModels", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PredictionOutcomes_FeaturesCaptured",
                table: "PredictionOutcomes",
                column: "FeaturesCaptured");

            migrationBuilder.CreateIndex(
                name: "IX_PredictionModels_IsActive",
                table: "PredictionModels",
                column: "IsActive",
                unique: true,
                filter: "[IsActive] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_PredictionModels_TrainedAt",
                table: "PredictionModels",
                column: "TrainedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PredictionModels");

            migrationBuilder.DropIndex(
                name: "IX_PredictionOutcomes_FeaturesCaptured",
                table: "PredictionOutcomes");

            migrationBuilder.DropColumn(
                name: "FeatureClientType",
                table: "PredictionOutcomes");

            migrationBuilder.DropColumn(
                name: "FeatureConditions",
                table: "PredictionOutcomes");

            migrationBuilder.DropColumn(
                name: "FeatureDriverHistory",
                table: "PredictionOutcomes");

            migrationBuilder.DropColumn(
                name: "FeaturePackage",
                table: "PredictionOutcomes");

            migrationBuilder.DropColumn(
                name: "FeaturePriority",
                table: "PredictionOutcomes");

            migrationBuilder.DropColumn(
                name: "FeatureRedeliveryAttempts",
                table: "PredictionOutcomes");

            migrationBuilder.DropColumn(
                name: "FeatureRouteHistory",
                table: "PredictionOutcomes");

            migrationBuilder.DropColumn(
                name: "FeatureSlaRemainingTime",
                table: "PredictionOutcomes");

            migrationBuilder.DropColumn(
                name: "FeaturesCaptured",
                table: "PredictionOutcomes");

            migrationBuilder.DropColumn(
                name: "MlModelId",
                table: "PredictionOutcomes");

            migrationBuilder.DropColumn(
                name: "MlPredictedAtRisk",
                table: "PredictionOutcomes");

            migrationBuilder.DropColumn(
                name: "MlPredictedRiskScore",
                table: "PredictionOutcomes");

            migrationBuilder.DropColumn(
                name: "FeatureClientType",
                table: "DeliveryPredictions");

            migrationBuilder.DropColumn(
                name: "FeatureConditions",
                table: "DeliveryPredictions");

            migrationBuilder.DropColumn(
                name: "FeatureDriverHistory",
                table: "DeliveryPredictions");

            migrationBuilder.DropColumn(
                name: "FeaturePackage",
                table: "DeliveryPredictions");

            migrationBuilder.DropColumn(
                name: "FeaturePriority",
                table: "DeliveryPredictions");

            migrationBuilder.DropColumn(
                name: "FeatureRedeliveryAttempts",
                table: "DeliveryPredictions");

            migrationBuilder.DropColumn(
                name: "FeatureRouteHistory",
                table: "DeliveryPredictions");

            migrationBuilder.DropColumn(
                name: "FeatureSlaRemainingTime",
                table: "DeliveryPredictions");

            migrationBuilder.DropColumn(
                name: "FeaturesCaptured",
                table: "DeliveryPredictions");

            migrationBuilder.DropColumn(
                name: "MlIsAtRisk",
                table: "DeliveryPredictions");

            migrationBuilder.DropColumn(
                name: "MlModelId",
                table: "DeliveryPredictions");

            migrationBuilder.DropColumn(
                name: "MlRiskScore",
                table: "DeliveryPredictions");
        }
    }
}
