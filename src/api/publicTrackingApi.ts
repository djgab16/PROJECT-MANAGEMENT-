import apiClient from './apiClient';

export interface PublicTrackingEvent {
  status: string;
  timestamp: string;
  location?: string;
  description: string;
}

export interface PublicTrackingResponse {
  id?: string;
  waybillNo: string;
  currentStatus: string;
  currentStatusHeadline: string;
  events: PublicTrackingEvent[];
  lastLocation: { lat: number; lng: number };
  potImage?: string;
  liveCoordinates?: { lat: number; lng: number; lastUpdated: string };
  recipientCoordinates?: { lat: number; lng: number };
  recipientAddress?: string;
  driverName?: string;
  driverInitials?: string;
  driverColor?: string;
  redeliveryStatus?: 'Pending Approval' | 'Approved' | 'Rejected' | 'None';
  redeliveryRequestedDate?: string;
  redeliveryRemarks?: string;
  taskType?: 'Delivery' | 'Pickup';
  redeliveryAttemptCount?: number;
}

/**
 * Fetch live package tracking details from the backend.
 */
export async function mockFetchTracking(waybill: string): Promise<PublicTrackingResponse> {
  const cleanWaybill = waybill.trim().toUpperCase();

  // Rate limit simulation (kept for frontend test case triggers)
  if (cleanWaybill === 'RATE-LIMIT') {
    throw { status: 429, message: 'Too Many Requests' };
  }

  try {
    const response = await apiClient.get<PublicTrackingResponse>('/delivery-orders/track', {
      params: { waybill: cleanWaybill },
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw { status: 404, message: 'Waybill not found' };
    }
    throw {
      status: error.response?.status || 500,
      message: error.response?.data?.message || 'An unexpected error occurred.',
    };
  }
}

/**
 * Submit rescheduling request to the backend.
 */
export async function mockSubmitRescheduleRequest(
  waybill: string,
  requestedDate: string,
  remarks?: string
): Promise<void> {
  const cleanWaybill = waybill.trim().toUpperCase();
  try {
    await apiClient.post('/delivery-orders/track/reschedule', {
      waybillNo: cleanWaybill,
      requestedDate,
      remarks: remarks || '',
    });
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: error.response?.data?.message || 'Failed to submit request.',
    };
  }
}

/**
 * Submit client confirmation of delivery to the backend.
 */
export async function submitConfirmDelivery(waybill: string, recipientPhoneLast4: string): Promise<void> {
  const cleanWaybill = waybill.trim().toUpperCase();
  try {
    await apiClient.post('/delivery-orders/track/confirm', {
      waybillNo: cleanWaybill,
      recipientPhoneLast4,
    });
  } catch (error: any) {
    throw {
      status: error.response?.status || 500,
      message: error.response?.data?.message || 'Failed to confirm delivery.',
    };
  }
}
