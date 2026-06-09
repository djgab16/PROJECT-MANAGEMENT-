import apiClient from './apiClient';
import type { DeliveryStatus, PODStatus } from '../types';

export interface DriverSummary {
  id: number;
  employeeId: string;
  name: string;
}

export interface DeliveryOrderResponse {
  id: number;
  waybillNo: string;
  taskType: 'Delivery' | 'Pickup';
  clientName: string;
  clientType: string;
  contactNumber: string;
  senderAddress: string;
  recipientName: string;
  recipientContact: string;
  recipientAddress: string;
  area: string;
  landmark?: string;
  route: string;
  driver?: DriverSummary;
  status: DeliveryStatus;
  podStatus: PODStatus;
  packageType: string;
  packageDescription: string;
  itemCount: number;
  weight: string;
  declaredValue: string;
  specialInstructions?: string;
  podImagePath?: string;
  orderDate: string;
  expectedDelivery: string;
  dateCompleted?: string;
  encodedBy: string;
  dateEncoded: string;
  lastUpdated: string;
  updatedBy: string;
  isArchived: boolean;
  redeliveryScheduledDate?: string;
  redeliveryDriver?: DriverSummary;
  redeliveryRemarks?: string;
  redeliveryAttemptCount: number;
  redeliveryStatus?: 'Pending Approval' | 'Approved' | 'Rejected' | 'None';
  redeliveryRequestedDate?: string;
  failureReason?: string;
  liveLatitude?: number;
  liveLongitude?: number;
  recipientLatitude?: number;
  recipientLongitude?: number;
  lastLiveUpdate?: string;
}

export interface DeliveryOrderListResponse {
  items: DeliveryOrderResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DeliveryHistoryResponse {
  id: number;
  fromStatus: string;
  toStatus: string;
  notes?: string;
  changedBy: string;
  changedAt: string;
}

export interface DeliveryOrderFilterParams {
  status?: string;
  podStatus?: string;
  area?: string;
  clientName?: string;
  search?: string;
  isArchived?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateDeliveryOrderPayload {
  taskType: 'Delivery' | 'Pickup';
  clientName: string;
  clientType?: string;
  contactNumber?: string;
  senderAddress: string;
  recipientName: string;
  recipientContact?: string;
  recipientAddress: string;
  area?: string;
  landmark?: string;
  route: string;
  driverId?: number;
  packageType?: string;
  packageDescription?: string;
  itemCount?: number;
  weight?: string;
  declaredValue?: string;
  specialInstructions?: string;
  orderDate?: string;
  expectedDelivery: string;
}

export interface UpdateDeliveryOrderPayload {
  taskType?: 'Delivery' | 'Pickup';
  clientName?: string;
  clientType?: string;
  contactNumber?: string;
  senderAddress?: string;
  recipientName?: string;
  recipientContact?: string;
  recipientAddress?: string;
  area?: string;
  landmark?: string;
  route?: string;
  packageType?: string;
  packageDescription?: string;
  itemCount?: number;
  weight?: string;
  declaredValue?: string;
  specialInstructions?: string;
  expectedDelivery?: string;
}

export interface ExcelImportResponse {
  importedCount: number;
  errors: string[];
}

export interface AnalyticsReportResponse {
  totalCount: number;
  successRate: string;
  failedCount: number;
  potSubmittedCount: number;
  averageDeliveryTimeHours: number;
  dailyActivity: Array<{
    day: string;
    weekdayCount: number;
    weekendCount: number;
    peakCount: number;
  }>;
}

/**
 * Fetch all delivery orders with filters and pagination.
 */
export async function getDeliveryOrders(params?: DeliveryOrderFilterParams): Promise<DeliveryOrderListResponse> {
  const response = await apiClient.get<DeliveryOrderResponse[]>('/delivery-orders', {
    params: {
      isArchived: params?.isArchived,
      status: params?.status,
      search: params?.search
    }
  });
  let items = response.data;
  
  // Additional frontend filters (area, clientName, podStatus)
  if (params?.area && params.area !== 'All Areas') {
    items = items.filter(o => o.area?.toLowerCase() === params.area?.toLowerCase());
  }
  if (params?.clientName) {
    items = items.filter(o => o.clientName?.toLowerCase() === params.clientName?.toLowerCase());
  }
  if (params?.podStatus) {
    items = items.filter(o => o.podStatus?.toLowerCase() === params.podStatus?.toLowerCase());
  }

  const page = params?.page || 1;
  const pageSize = params?.pageSize || 10;
  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedItems = items.slice(startIndex, startIndex + pageSize);

  return {
    items: paginatedItems,
    totalCount,
    page,
    pageSize,
    totalPages
  };
}

/**
 * Fetch a single delivery order by database integer ID.
 */
export async function getDeliveryOrderById(id: number): Promise<DeliveryOrderResponse> {
  const response = await apiClient.get<DeliveryOrderResponse>(`/delivery-orders/${id}`);
  return response.data;
}

/**
 * Track a delivery by its waybill number (Public endpoint).
 */
export async function trackDeliveryByWaybill(waybill: string): Promise<DeliveryOrderResponse> {
  const response = await apiClient.get<DeliveryOrderResponse>('/delivery-orders/track', {
    params: { waybill },
  });
  return response.data;
}

/**
 * Get status logs/history for a delivery order.
 */
export async function getDeliveryOrderHistory(id: number): Promise<DeliveryHistoryResponse[]> {
  const response = await apiClient.get<DeliveryHistoryResponse[]>(`/delivery-orders/${id}/history`);
  return response.data;
}

/**
 * Create a new delivery order.
 */
export async function createDeliveryOrder(payload: CreateDeliveryOrderPayload): Promise<DeliveryOrderResponse> {
  const response = await apiClient.post<DeliveryOrderResponse>('/delivery-orders', payload);
  return response.data;
}

/**
 * Update an existing delivery order's package or recipient details.
 */
export async function updateDeliveryOrder(id: number, payload: UpdateDeliveryOrderPayload): Promise<DeliveryOrderResponse> {
  const response = await apiClient.put<DeliveryOrderResponse>(`/delivery-orders/${id}`, payload);
  return response.data;
}

/**
 * Update only the status of a delivery order.
 */
export async function updateDeliveryOrderStatus(id: number, status: DeliveryStatus, notes?: string): Promise<DeliveryOrderResponse> {
  const response = await apiClient.patch<DeliveryOrderResponse>(`/delivery-orders/${id}/status`, {
    status,
    notes,
  });
  return response.data;
}

/**
 * Assign a driver to a delivery order.
 */
export async function assignDriver(id: number, driverId: number): Promise<DeliveryOrderResponse> {
  const response = await apiClient.patch<DeliveryOrderResponse>(`/delivery-orders/${id}/assign-driver`, {
    driverId,
  });
  return response.data;
}

/**
 * Schedule a re-delivery attempt.
 */
export async function scheduleRedelivery(
  id: number,
  redeliveryDate: string,
  driverId: number,
  remarks?: string
): Promise<DeliveryOrderResponse> {
  const response = await apiClient.patch<DeliveryOrderResponse>(`/delivery-orders/${id}/schedule-redelivery`, {
    redeliveryDate,
    driverId,
    remarks,
  });
  return response.data;
}

/**
 * Upload a Proof of Delivery (POD) image file.
 */
export async function uploadPodImage(id: number, file: File): Promise<DeliveryOrderResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<DeliveryOrderResponse>(`/delivery-orders/${id}/pod`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Archive a completed delivery order.
 */
export async function archiveDeliveryOrder(id: number): Promise<void> {
  await apiClient.patch(`/delivery-orders/${id}/archive`);
}

/**
 * Restore an archived delivery order back to active status.
 */
export async function restoreDeliveryOrder(id: number): Promise<void> {
  await apiClient.patch(`/delivery-orders/${id}/restore`);
}

/**
 * Permanently delete a delivery order (Super Admin only).
 */
export async function deleteDeliveryOrder(id: number): Promise<void> {
  await apiClient.delete(`/delivery-orders/${id}`);
}

// ─── ENTERPRISE ANALYTICS & BULK INGRESS APIS ───────────────────────────────────

/**
 * Bulk Import Delivery Orders from an Excel Spreadsheet.
 */
export async function importDeliveryOrdersExcel(file: File): Promise<ExcelImportResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<ExcelImportResponse>('/delivery-orders/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

/**
 * Generates and downloads the physical waybill sheet for an order as a PDF blob.
 */
export async function downloadWaybillPdfBlob(id: number): Promise<Blob> {
  const response = await apiClient.get(`/delivery-orders/${id}/waybill-pdf`, {
    responseType: 'blob',
  });
  return new Blob([response.data], { type: 'application/pdf' });
}

/**
 * Pulls server-side aggregated metrics, charts, and driver performance datasets.
 */
export async function getAnalyticsReports(params?: { driverName?: string }): Promise<AnalyticsReportResponse> {
  const response = await apiClient.get<AnalyticsReportResponse>('/reports/analytics', { params });
  return response.data;
}
