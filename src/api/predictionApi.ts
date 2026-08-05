import apiClient from './apiClient';

export interface RouteSlaPerformance {
  route: string;
  totalOrders: number;
  breachedCount: number;
  onTimePercentage: number;
  averageDelayHours: number;
}

export interface PrioritySlaPerformance {
  priority: string;
  totalOrders: number;
  breachedCount: number;
  onTimePercentage: number;
}

export interface SlaSummaryResponse {
  activeDeliveriesCount: number;
  overallOnTimePercentage: number;
  slaBreachesCount: number;
  atRiskCount: number;
  averageDelayHours: number;
  averageDeliveryDurationHours: number;
  routeBreakdown: RouteSlaPerformance[];
  priorityBreakdown: PrioritySlaPerformance[];
}

export interface DriverSlaPerformance {
  driverName: string;
  onTimePercentage: number;
  deliveriesCount: number;
  breachedCount: number;
  averageDelayHours: number;
}

export interface AtRiskOrder {
  id: number;
  deliveryOrderId: number;
  waybillNo: string;
  clientName: string;
  clientType: string;
  area: string;
  route: string;
  priority: string;
  status: string;
  driverName: string;
  slaRemainingHours: number;
  slaRemainingPercentage: number;
  timeUntilBreach: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  riskScore: number;
  confidenceScore: number;
  riskReason: string;
  recommendedAction: string;
  predictedArrival: string;
  predictedAt: string;
}

export interface RunPredictionsResponse {
  message: string;
  ordersProcessed: number;
  durationMs: number;
}

/**
 * Mirrors PredictionAccuracyDto.
 *
 * Measured from PredictionOutcomes, where each row pairs a real delivery result with the
 * prediction that existed before that result was known.
 *
 * `totalEvaluated === 0` means the model has not been validated yet. It does NOT mean the
 * model scores zero, so the four metrics must not be rendered as measurements in that state.
 */
export interface PredictionAccuracy {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  totalEvaluated: number;
  evaluationPeriodStart: string | null;
  evaluationPeriodEnd: string | null;
}

export const predictionApi = {
  runPredictions: async () => {
    const response = await apiClient.post<RunPredictionsResponse>('/predictions/run');
    return response.data;
  },
  /**
   * Predictions for active (non-archived, non-terminal) delivery orders.
   *
   * Defaults to the full active set, not just flagged orders, because the SLA Monitoring
   * dashboard derives its risk-distribution pie chart and all nine client-side filters from
   * this payload — narrowing the default would under-report Low-risk orders.
   *
   * @param atRiskOnly when true, asks the server to apply the `IsAtRisk` filter. Omitted from
   *   the query string entirely when false, so the request stays byte-for-byte what it was
   *   before this argument existed.
   */
  getAtRiskOrders: async (atRiskOnly = false) => {
    const response = await apiClient.get<AtRiskOrder[]>('/predictions/at-risk', {
      params: atRiskOnly ? { atRiskOnly: true } : undefined,
    });
    return response.data;
  },
  getCompletedOrders: async () => {
    const response = await apiClient.get<AtRiskOrder[]>('/predictions/completed');
    return response.data;
  },
  getSlaSummary: async () => {
    const response = await apiClient.get<SlaSummaryResponse>('/predictions/sla-summary');
    return response.data;
  },
  getDriverPerformance: async () => {
    const response = await apiClient.get<DriverSlaPerformance[]>('/predictions/driver-performance');
    return response.data;
  },
  /**
   * @param from optional inclusive lower bound on OutcomeRecordedAt (ISO-8601 UTC)
   * @param to   optional inclusive upper bound on OutcomeRecordedAt (ISO-8601 UTC)
   */
  getAccuracy: async (from?: string, to?: string) => {
    const response = await apiClient.get<PredictionAccuracy>('/predictions/accuracy', {
      params: { from, to },
    });
    return response.data;
  },
};
