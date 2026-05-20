export interface PublicTrackingEvent {
  status: string;
  timestamp: string;
  location?: string;
  description: string;
}

export interface PublicTrackingResponse {
  waybillNo: string;
  currentStatus: string;
  currentStatusHeadline: string;
  events: PublicTrackingEvent[];
  lastLocation: { lat: number; lng: number };
  potImage?: string;
}

// Simulated mocked backend function
export async function mockFetchTracking(waybill: string): Promise<PublicTrackingResponse> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const cleanWaybill = waybill.trim().toUpperCase();

      // Rate limit simulation
      if (cleanWaybill === 'RATE-LIMIT') {
        reject({ status: 429, message: 'Too Many Requests' });
        return;
      }

      const savedOrders = localStorage.getItem('speedex_orders');
      if (savedOrders) {
        const orders = JSON.parse(savedOrders);
        const order = orders.find((o: any) => o.waybillNo.toUpperCase() === cleanWaybill);
        if (order) {
          const events: PublicTrackingEvent[] = [
            {
              status: 'Pending',
              timestamp: order.dateEncoded || '2026-05-17 08:30 AM',
              description: 'Order created and pending pickup.',
            }
          ];
          
          if (order.status !== 'Pending') {
             events.push({
               status: 'For Pickup',
               timestamp: '2026-05-17 11:00 AM',
               description: 'Package has been prepared for courier pickup.'
             });
             events.push({
               status: 'In Transit',
               timestamp: order.lastUpdated || '2026-05-18 09:15 AM',
               location: order.area || 'Metro Manila Hub',
               description: 'Package is on its way to the delivery address.'
             });
          }

          if (order.status === 'Delivered' || order.status === 'Completed') {
             events.push({
               status: 'Delivered',
               timestamp: order.dateCompleted || new Date().toLocaleString(),
               location: order.recipientAddress || 'Delivery Address',
               description: 'Package has been successfully delivered.'
             });
          }

          resolve({
            waybillNo: order.waybillNo,
            currentStatus: order.status,
            currentStatusHeadline: `Your package is ${order.status}`,
            events: events,
            lastLocation: order.gpsCoordinates || { lat: 14.5995, lng: 120.9842 },
            potImage: order.potImage || (order.potStatus === 'Submitted' ? 'https://via.placeholder.com/400x300.png?text=Proof+of+Transaction' : undefined)
          });
          return;
        }
      }

      // Mock delivered with POT
      if (cleanWaybill === 'SPX-DELIVERED') {
        resolve({
          waybillNo: cleanWaybill,
          currentStatus: 'Delivered',
          currentStatusHeadline: 'Your package has been Delivered',
          events: [
            {
              status: 'Pending',
              timestamp: '2026-05-17 08:30 AM',
              description: 'Order created and pending pickup.',
            },
            {
              status: 'In Transit',
              timestamp: '2026-05-18 09:15 AM',
              location: 'Metro Manila Hub',
              description: 'Package is on its way to the delivery address.',
            },
            {
              status: 'Delivered',
              timestamp: '2026-05-18 02:30 PM',
              location: 'Delivery Address',
              description: 'Package has been successfully delivered.',
            }
          ],
          lastLocation: { lat: 14.5995, lng: 120.9842 },
          potImage: 'https://via.placeholder.com/400x300.png?text=Proof+of+Transaction'
        });
        return;
      }

      // Found mock fallback
      if (cleanWaybill.startsWith('SPX-')) {
        resolve({
          waybillNo: cleanWaybill,
          currentStatus: 'Delivered',
          currentStatusHeadline: 'Your package has been Delivered',
          events: [
            {
              status: 'Pending',
              timestamp: '2026-05-17 08:30 AM',
              description: 'Order created and pending pickup.',
            },
            {
              status: 'For Pickup',
              timestamp: '2026-05-17 11:00 AM',
              description: 'Package has been prepared for courier pickup.',
            },
            {
              status: 'In Transit',
              timestamp: '2026-05-18 09:15 AM',
              location: 'Metro Manila Hub',
              description: 'Package is on its way to the delivery address.',
            },
            {
              status: 'Delivered',
              timestamp: '2026-05-18 02:30 PM',
              location: 'Delivery Address',
              description: 'Package has been successfully delivered.',
            }
          ],
          lastLocation: { lat: 14.5995, lng: 120.9842 },
          potImage: 'https://via.placeholder.com/400x300.png?text=Proof+of+Transaction'
        });
        return;
      }

      // Not found mock
      reject({ status: 404, message: 'Waybill not found' });
    }, 1200); // Simulate network delay
  });
}
