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

export const predictionApi = {
  runPredictions: async () => {
    const response = await apiClient.post<RunPredictionsResponse>('/predictions/run');
    return response.data;
  },
  getAtRiskOrders: async () => {
    const response = await apiClient.get<AtRiskOrder[]>('/predictions/at-risk');
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
};
