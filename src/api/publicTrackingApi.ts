import { trackDeliveryByWaybill } from './deliveryApi';

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
}

/**
 * Fetch live package tracking details from the C# backend using Waybill number.
 */
export async function mockFetchTracking(waybill: string): Promise<PublicTrackingResponse> {
  const cleanWaybill = waybill.trim().toUpperCase();

  // Rate limit simulation (kept for frontend test case triggers)
  if (cleanWaybill === 'RATE-LIMIT') {
    throw { status: 429, message: 'Too Many Requests' };
  }

  try {
    const order = await trackDeliveryByWaybill(cleanWaybill);

    const events: PublicTrackingEvent[] = [
      {
        status: 'Pending',
        timestamp: new Date(order.dateEncoded).toLocaleString(),
        description: 'Order created and pending pickup.',
      }
    ];
    
    if (order.status !== 'Pending') {
      events.push({
        status: 'For Pickup',
        timestamp: new Date(order.dateEncoded).toLocaleString(),
        description: 'Package has been prepared for courier pickup.'
      });
      events.push({
        status: 'In Transit',
        timestamp: new Date(order.lastUpdated).toLocaleString(),
        location: order.area || 'Metro Manila Hub',
        description: 'Package is on its way to the delivery address.'
      });
    }

    if (order.status === 'Delivered' || order.status === 'Completed') {
      events.push({
        status: 'Delivered',
        timestamp: order.dateCompleted ? new Date(order.dateCompleted).toLocaleString() : new Date().toLocaleString(),
        location: order.recipientAddress || 'Delivery Address',
        description: 'Package has been successfully delivered.'
      });
    }

    return {
      id: order.id.toString(),
      waybillNo: order.waybillNo,
      currentStatus: order.status,
      currentStatusHeadline: `Your package is ${order.status}`,
      events: events,
      lastLocation: { lat: order.liveLatitude || 14.5995, lng: order.liveLongitude || 120.9842 },
      potImage: order.podImagePath || undefined,
      liveCoordinates: order.liveLatitude && order.liveLongitude ? { 
        lat: order.liveLatitude, 
        lng: order.liveLongitude, 
        lastUpdated: order.lastLiveUpdate ? new Date(order.lastLiveUpdate).toLocaleString() : new Date().toLocaleString() 
      } : undefined,
      recipientCoordinates: order.recipientLatitude && order.recipientLongitude ? { 
        lat: order.recipientLatitude, 
        lng: order.recipientLongitude 
      } : undefined,
      recipientAddress: order.recipientAddress,
      driverName: order.driver?.name,
      driverInitials: order.driver?.name 
        ? order.driver.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() 
        : undefined,
      driverColor: '#00A99D' // Default operational theme color
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw { status: 404, message: 'Waybill not found' };
    }
    throw error;
  }
}
