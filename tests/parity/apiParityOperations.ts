import {
  normalizeParityObservation,
  type NormalizedParityObservation,
  type RawParityObservation,
} from './apiParityNormalization.ts';

export type OperationCategory =
  | 'auth'
  | 'crud'
  | 'assignment'
  | 'status'
  | 'notifications'
  | 'exports'
  | 'archive-restore'
  | 'qr'
  | 'gps-maps'
  | 'pod-pot'
  | 'redelivery'
  | 'pickup'
  | 'settings'
  | 'role-access';

export interface ApiParityFixture extends NormalizedParityObservation {
  readonly operation: string;
  readonly category: OperationCategory;
  readonly scenario: string;
  readonly transport: 'http' | 'browser-local';
  readonly sourceRefs: readonly string[];
}

interface FixtureDefinition {
  operation: string;
  category: OperationCategory;
  scenario: string;
  transport?: 'http' | 'browser-local';
  sourceRefs: readonly string[];
  observation: RawParityObservation;
}

const JSON_HEADER = { 'Content-Type': 'application/json' } as const;
const AUTH_HEADER = { ...JSON_HEADER, Authorization: 'Bearer fixture-access-token' } as const;

function fixture(definition: FixtureDefinition): ApiParityFixture {
  return Object.freeze({
    operation: definition.operation,
    category: definition.category,
    scenario: definition.scenario,
    transport: definition.transport ?? 'http',
    sourceRefs: Object.freeze([...definition.sourceRefs]),
    ...normalizeParityObservation(definition.observation),
  });
}

export const apiParityFixtures = [
  fixture({
    operation: 'auth.login.success', category: 'auth', scenario: 'Valid credentials create the session and load the role profile.',
    sourceRefs: ['src/context/AuthContext.tsx', 'src/api/axios.ts'],
    observation: { method: 'post', url: '/api/auth/login', headers: JSON_HEADER, payload: { employeeId: 'EMP-001', password: 'fixture-password' }, responseStatus: 200, visibleOutcome: 'Authenticated user is stored and redirected to the role home.' },
  }),
  fixture({
    operation: 'auth.login.locked', category: 'auth', scenario: 'A locked account remains unauthenticated.',
    sourceRefs: ['src/context/AuthContext.tsx', 'src/pages/Login/Login.tsx'],
    observation: { method: 'POST', url: '/api/auth/login', headers: JSON_HEADER, payload: { employeeId: 'EMP-LOCKED', password: 'fixture-password' }, responseStatus: 423, visibleOutcome: 'Account locked feedback is shown and no session is created.' },
  }),
  fixture({
    operation: 'auth.session.restore', category: 'auth', scenario: 'A stored access token restores the current profile.',
    sourceRefs: ['src/context/AuthContext.tsx'],
    observation: { method: 'GET', url: '/api/auth/profile', headers: AUTH_HEADER, responseStatus: 200, visibleOutcome: 'The authenticated profile and role-protected application are restored.' },
  }),
  fixture({
    operation: 'auth.refresh.valid', category: 'auth', scenario: 'One 401 triggers token rotation and one original-request retry.',
    sourceRefs: ['src/api/axios.ts', 'src/api/apiClient.ts'],
    observation: { method: 'POST', url: '/api/auth/refresh', headers: JSON_HEADER, payload: { refreshToken: 'fixture-refresh-token' }, responseStatus: 200, visibleOutcome: 'Tokens are replaced and the original request is retried once.' },
  }),
  fixture({
    operation: 'auth.refresh.failed', category: 'auth', scenario: 'An invalid refresh token cannot restore the session.',
    sourceRefs: ['src/api/axios.ts', 'src/api/apiClient.ts'],
    observation: { method: 'POST', url: '/api/auth/refresh', headers: JSON_HEADER, payload: { refreshToken: 'expired-fixture-token' }, responseStatus: 401, visibleOutcome: 'Stored authentication is cleared and the user is redirected to /login.' },
  }),
  fixture({
    operation: 'auth.logout.revoke', category: 'auth', scenario: 'Logout revokes the refresh token before local cleanup.',
    sourceRefs: ['src/context/AuthContext.tsx'],
    observation: { method: 'POST', url: '/api/auth/logout', headers: AUTH_HEADER, payload: { refreshToken: 'fixture-refresh-token' }, responseStatus: 200, visibleOutcome: 'The session is cleared and the login page becomes visible.' },
  }),

  fixture({
    operation: 'orders.list.refresh', category: 'crud', scenario: 'Authenticated refresh loads orders independently of other collections.',
    sourceRefs: ['src/context/DataContext.tsx'],
    observation: { method: 'GET', url: '/api/deliveryorder', headers: AUTH_HEADER, responseStatus: 200, visibleOutcome: 'Confirmed orders are mapped, sorted newest first, and displayed.' },
  }),
  fixture({
    operation: 'orders.create', category: 'crud', scenario: 'A validated order is created with its current payload contract.',
    sourceRefs: ['src/context/DataContext.tsx', 'src/pages/EditDelivery/EditDeliveryOrder.tsx'],
    observation: { method: 'POST', url: '/api/deliveryorder', headers: AUTH_HEADER, payload: { waybillNo: 'WB-2026-001', taskType: 'Delivery', clientName: 'Client', recipientName: 'Recipient', recipientAddress: 'Address', expectedDelivery: '2026-08-02', recipientCoordinates: { lat: 14.6, lng: 121.0 } }, responseStatus: 201, visibleOutcome: 'The created order is added to the confirmed list and the tasks route is shown.' },
  }),
  fixture({
    operation: 'orders.update', category: 'crud', scenario: 'Staff edits retain the full current order update contract.',
    sourceRefs: ['src/context/DataContext.tsx', 'src/pages/EditDelivery/EditDeliveryOrder.tsx'],
    observation: { method: 'PUT', url: '/api/deliveryorder/42', headers: AUTH_HEADER, payload: { id: 42, recipientName: 'Recipient', route: 'Manila', updatedBy: 'Operator', lastUpdated: '2026-08-01T12:00:00Z' }, responseStatus: 200, visibleOutcome: 'The confirmed order row/detail reflects the server response.' },
  }),
  fixture({
    operation: 'orders.delete', category: 'crud', scenario: 'Authorized cancellation/deletion removes the confirmed order.',
    sourceRefs: ['src/context/DataContext.tsx', 'src/pages/DeliveryOrders/DeliveryOrderDetail.tsx'],
    observation: { method: 'DELETE', url: '/api/deliveryorder/42', headers: AUTH_HEADER, responseStatus: 204, visibleOutcome: 'The order is removed and the authorized list route is shown.' },
  }),
  fixture({
    operation: 'employees.list', category: 'crud', scenario: 'Authenticated refresh loads the employee directory.',
    sourceRefs: ['src/context/DataContext.tsx'],
    observation: { method: 'GET', url: '/api/employees', headers: AUTH_HEADER, responseStatus: 200, visibleOutcome: 'Confirmed employees and eligible drivers are displayed.' },
  }),
  fixture({
    operation: 'employees.create', category: 'crud', scenario: 'An authorized administrator creates an employee.',
    sourceRefs: ['src/context/DataContext.tsx', 'src/pages/Employees/Employees.tsx'],
    observation: { method: 'POST', url: '/api/employees', headers: AUTH_HEADER, payload: { employeeId: 'EMP-010', name: 'Employee', role: 'DRIVER', status: 'Active', password: 'fixture-password' }, responseStatus: 201, visibleOutcome: 'The refreshed employee directory contains the new employee.' },
  }),
  fixture({
    operation: 'employees.update', category: 'crud', scenario: 'An authorized administrator updates an employee.',
    sourceRefs: ['src/context/DataContext.tsx', 'src/pages/Employees/Employees.tsx'],
    observation: { method: 'PUT', url: '/api/employees/10', headers: AUTH_HEADER, payload: { name: 'Employee', role: 'DRIVER', status: 'Active' }, responseStatus: 200, visibleOutcome: 'The refreshed employee row displays the saved values.' },
  }),
  fixture({
    operation: 'employees.delete', category: 'crud', scenario: 'An authorized administrator removes a non-protected employee.',
    sourceRefs: ['src/context/DataContext.tsx', 'src/pages/Employees/Employees.tsx'],
    observation: { method: 'DELETE', url: '/api/employees/10', headers: AUTH_HEADER, responseStatus: 200, visibleOutcome: 'The refreshed directory no longer displays the employee.' },
  }),

  fixture({
    operation: 'activity-log.create', category: 'crud', scenario: 'Mutating workflows append an audit record.',
    sourceRefs: ['src/context/DataContext.tsx'],
    observation: { method: 'POST', url: '/api/activity-logs', headers: AUTH_HEADER, payload: { action: 'Update', description: 'Updated delivery order', reference: 'WB-2026-001' }, responseStatus: 200, visibleOutcome: 'The activity log refresh displays the confirmed audit record.' },
  }),
  fixture({
    operation: 'assignment.bulk', category: 'assignment', scenario: 'Operations assigns one driver to selected non-pickup orders.',
    sourceRefs: ['src/context/DataContext.tsx', 'src/pages/Dispatch/Dispatch.tsx', 'src/pages/DRIVER/Tasks.tsx'],
    observation: { method: 'PATCH', url: '/api/deliveryorder/bulk-assign-driver', headers: AUTH_HEADER, payload: { orderIds: [41, 42], driverId: 7 }, responseStatus: 200, visibleOutcome: 'Confirmed orders display the assigned driver and selection is cleared.' },
  }),
  fixture({
    operation: 'assignment.single.service-contract', category: 'assignment', scenario: 'The retained service contract assigns one driver.',
    sourceRefs: ['src/api/deliveryApi.ts'],
    observation: { method: 'PATCH', url: '/api/delivery-orders/42/assign-driver', headers: AUTH_HEADER, payload: { driverId: 7 }, responseStatus: 200, visibleOutcome: 'The returned order contains the confirmed driver assignment.' },
  }),
  fixture({
    operation: 'status.driver.legal', category: 'status', scenario: 'A legal driver transition persists status and optional location.',
    sourceRefs: ['src/context/DataContext.tsx', 'src/pages/DRIVER/DriverDeliveryDetail.tsx'],
    observation: { method: 'PATCH', url: '/api/deliveryorder/42/status', headers: AUTH_HEADER, payload: { status: 'In Transit', latitude: 14.6, longitude: 121.0 }, responseStatus: 200, visibleOutcome: 'The detail and task views display In Transit and live tracking can start.' },
  }),
  fixture({
    operation: 'status.driver.illegal', category: 'status', scenario: 'An illegal transition is rejected without a false visible state.',
    sourceRefs: ['src/context/DataContext.tsx', 'src/pages/DRIVER/DriverDeliveryDetail.tsx'],
    observation: { method: 'PATCH', url: '/api/deliveryorder/42/status', headers: AUTH_HEADER, payload: { status: 'Completed' }, responseStatus: 400, visibleOutcome: 'Failure feedback is shown and the last confirmed status remains visible.' },
  }),
  fixture({
    operation: 'status.staff.transition', category: 'status', scenario: 'Staff status progression uses the full-order update owner.',
    sourceRefs: ['src/context/DataContext.tsx', 'src/pages/DeliveryOrders/DeliveryOrderDetail.tsx'],
    observation: { method: 'PUT', url: '/api/deliveryorder/42', headers: AUTH_HEADER, payload: { id: 42, status: 'Processing', updatedBy: 'Operator', lastUpdated: '2026-08-01T12:00:00Z' }, responseStatus: 200, visibleOutcome: 'The server-confirmed canonical status replaces the prior status.' },
  }),

  fixture({
    operation: 'notifications.list', category: 'notifications', scenario: 'Authenticated refresh loads role-scoped notifications.',
    sourceRefs: ['src/context/DataContext.tsx', 'src/components/layout/Header.tsx', 'src/pages/Notification/Notifications.tsx'],
    observation: { method: 'GET', url: '/api/notifications', headers: AUTH_HEADER, responseStatus: 200, visibleOutcome: 'Notification records and the unread count reflect confirmed data.' },
  }),
  fixture({
    operation: 'notifications.read', category: 'notifications', scenario: 'One confirmed notification is marked read.',
    sourceRefs: ['src/context/DataContext.tsx', 'src/components/layout/Header.tsx', 'src/pages/Notification/Notifications.tsx'],
    observation: { method: 'PATCH', url: '/api/notifications/9/read', headers: AUTH_HEADER, responseStatus: 200, visibleOutcome: 'Only the selected notification becomes read and the unread count decreases.' },
  }),
  fixture({
    operation: 'notifications.read-all', category: 'notifications', scenario: 'All confirmed notifications are marked read.',
    sourceRefs: ['src/context/DataContext.tsx', 'src/pages/Notification/Notifications.tsx'],
    observation: { method: 'PATCH', url: '/api/notifications/read-all', headers: AUTH_HEADER, responseStatus: 204, visibleOutcome: 'All visible notifications become read and the unread count is zero.' },
  }),
  fixture({
    operation: 'notifications.delete', category: 'notifications', scenario: 'An authorized delete removes one confirmed notification.',
    sourceRefs: ['src/context/DataContext.tsx', 'src/pages/Notification/Notifications.tsx'],
    observation: { method: 'DELETE', url: '/api/notifications/9', headers: AUTH_HEADER, responseStatus: 204, visibleOutcome: 'Only the selected notification is removed.' },
  }),
  fixture({
    operation: 'notifications.clear', category: 'notifications', scenario: 'An authorized clear removes all confirmed notifications.',
    sourceRefs: ['src/context/DataContext.tsx', 'src/pages/Notification/Notifications.tsx'],
    observation: { method: 'DELETE', url: '/api/notifications', headers: AUTH_HEADER, responseStatus: 204, visibleOutcome: 'The notification list is empty and the unread count is zero.' },
  }),

  fixture({
    operation: 'exports.report.csv', category: 'exports', scenario: 'The current filtered report is exported in-browser.', transport: 'browser-local',
    sourceRefs: ['src/pages/Report/Reports.tsx'],
    observation: { method: 'LOCAL', url: 'browser://csv-download', payload: { rows: [{ driver: 'Driver', delivered: 3, failed: 1 }] }, responseStatus: null, visibleOutcome: 'A filtered delivery report CSV download is initiated.' },
  }),
  fixture({
    operation: 'exports.archive.csv', category: 'exports', scenario: 'The current filtered archive is exported in-browser.', transport: 'browser-local',
    sourceRefs: ['src/pages/Archive/Archive.tsx'],
    observation: { method: 'LOCAL', url: 'browser://csv-download', payload: { rows: [{ waybillNo: 'WB-2026-001', status: 'Completed', potStatus: 'Submitted' }] }, responseStatus: null, visibleOutcome: 'An archive_export_filtered.csv download is initiated.' },
  }),
  fixture({
    operation: 'exports.waybill.pdf', category: 'exports', scenario: 'A server-generated waybill PDF is downloaded.',
    sourceRefs: ['src/api/deliveryApi.ts', 'src/pages/DeliveryOrders/DeliveryOrderDetail.tsx'],
    observation: { method: 'GET', url: '/api/delivery-orders/42/waybill-pdf', headers: { ...AUTH_HEADER, Accept: 'application/pdf' }, responseStatus: 200, visibleOutcome: 'A waybill PDF blob download is initiated for the selected order.' },
  }),
  fixture({
    operation: 'exports.analytics.read', category: 'exports', scenario: 'Server-side analytics can be requested with the current filter contract.',
    sourceRefs: ['src/api/deliveryApi.ts'],
    observation: { method: 'GET', url: '/api/reports/analytics?driverName=Driver', headers: AUTH_HEADER, responseStatus: 200, visibleOutcome: 'Confirmed analytics totals and chart series are available to the report view.' },
  }),
  fixture({
    operation: 'orders.import.excel', category: 'crud', scenario: 'Bulk order import posts the selected spreadsheet.',
    sourceRefs: ['src/api/deliveryApi.ts'],
    observation: { method: 'POST', url: '/api/delivery-orders/import', headers: { ...AUTH_HEADER, 'Content-Type': 'multipart/form-data' }, payload: { file: new Blob(['fixture']) }, responseStatus: 200, visibleOutcome: 'Imported count and row errors reflect the server result.' },
  }),
  fixture({
    operation: 'archive.public-confirm', category: 'archive-restore', scenario: 'Recipient confirmation completes and archives a delivered order.',
    sourceRefs: ['src/api/publicTrackingApi.ts', 'src/pages/PublicTracking/PublicTracking.tsx'],
    observation: { method: 'POST', url: '/api/delivery-orders/track/confirm', headers: JSON_HEADER, payload: { waybillNo: 'WB-2026-001', recipientPhoneLast4: '1234' }, responseStatus: 200, visibleOutcome: 'The delivery becomes Completed, is archived, and confirmation feedback is shown.' },
  }),
  fixture({
    operation: 'archive.restore', category: 'archive-restore', scenario: 'Authorized restore returns an archived order to Pending.',
    sourceRefs: ['src/api/deliveryApi.ts', 'src/pages/DeliveryOrders/DeliveryOrderDetail.tsx'],
    observation: { method: 'PATCH', url: '/api/delivery-orders/42/restore', headers: AUTH_HEADER, responseStatus: 200, visibleOutcome: 'The refreshed order is active with Pending status and the restore dialog closes.' },
  }),

  fixture({
    operation: 'qr.lookup.success', category: 'qr', scenario: 'A scanned waybill resolves against confirmed context data.', transport: 'browser-local',
    sourceRefs: ['src/pages/DRIVER/QRScannerView.tsx'],
    observation: { method: 'LOCAL', url: 'browser://qr-scanner', payload: { rawValue: 'WB-2026-001' }, responseStatus: null, visibleOutcome: 'The matching driver delivery detail route is opened.' },
  }),
  fixture({
    operation: 'qr.lookup.missing', category: 'qr', scenario: 'An unknown QR value does not navigate.', transport: 'browser-local',
    sourceRefs: ['src/pages/DRIVER/QRScannerView.tsx'],
    observation: { method: 'LOCAL', url: 'browser://qr-scanner', payload: { rawValue: 'WB-2026-404' }, responseStatus: null, visibleOutcome: 'Order not found feedback is shown and the current route remains visible.' },
  }),
  fixture({
    operation: 'gps.geocode-address', category: 'gps-maps', scenario: 'Order creation attempts address geocoding before its current fallback.',
    sourceRefs: ['src/context/DataContext.tsx'],
    observation: { method: 'GET', url: 'https://nominatim.openstreetmap.org/search?limit=1&q=Address%2C%20Manila%2C%20Philippines&format=json', headers: { Accept: 'application/json' }, responseStatus: 200, visibleOutcome: 'Recipient coordinates use the geocode result or the existing city fallback.' },
  }),
  fixture({
    operation: 'gps.live-location.patch', category: 'gps-maps', scenario: 'Driver GPS capture persists current coordinates through the status endpoint.',
    sourceRefs: ['src/hooks/useDriverGPS.ts', 'src/context/DataContext.tsx'],
    observation: { method: 'PATCH', url: '/api/deliveryorder/42/status', headers: AUTH_HEADER, payload: { latitude: 14.6, longitude: 121.0 }, responseStatus: 200, visibleOutcome: 'Live tracking remains active and the last confirmed coordinates become visible.' },
  }),
  fixture({
    operation: 'gps.live-location.poll', category: 'gps-maps', scenario: 'The map polls the selected order every five seconds while subscribed.',
    sourceRefs: ['src/utils/realtimeSync.ts', 'src/components/map/LiveTrackingMap.tsx'],
    observation: { method: 'GET', url: 'http://localhost:5000/api/deliveryorder/42', headers: { Authorization: 'Bearer fixture-access-token' }, responseStatus: 200, visibleOutcome: 'The map marker, connection state, and textual last update reflect confirmed coordinates.' },
  }),
  fixture({
    operation: 'maps.route.lookup', category: 'gps-maps', scenario: 'The current map requests a driving route for known endpoints.',
    sourceRefs: ['src/components/map/LiveTrackingMap.tsx'],
    observation: { method: 'GET', url: 'https://router.project-osrm.org/route/v1/driving/121.018,14.62;121.0336,14.636?overview=full&geometries=geojson', responseStatus: 200, visibleOutcome: 'The route polyline is displayed without changing delivery state.' },
  }),

  fixture({
    operation: 'pod.driver-submit', category: 'pod-pot', scenario: 'Current driver completion submits proof fields through the status owner.',
    sourceRefs: ['src/pages/DRIVER/DriverDeliveryDetail.tsx', 'src/context/DataContext.tsx'],
    observation: { method: 'PATCH', url: '/api/deliveryorder/42/status', headers: AUTH_HEADER, payload: { status: 'Delivered', recipientName: 'Recipient', podImage: 'data:image/png;base64,fixture', latitude: 14.6, longitude: 121.0 }, responseStatus: 200, visibleOutcome: 'Delivery completion feedback is shown and the driver dashboard opens.' },
  }),
  fixture({
    operation: 'pod.multipart.service-contract', category: 'pod-pot', scenario: 'The retained dedicated POD contract uploads JPEG or PNG up to five MB.',
    sourceRefs: ['src/api/deliveryApi.ts'],
    observation: { method: 'POST', url: '/api/delivery-orders/42/pod', headers: { ...AUTH_HEADER, 'Content-Type': 'multipart/form-data' }, payload: { file: new Blob(['fixture'], { type: 'image/png' }) }, responseStatus: 200, visibleOutcome: 'The returned order is Delivered and exposes the confirmed proof.' },
  }),
  fixture({
    operation: 'pot.order-save', category: 'pod-pot', scenario: 'POT remains part of the current create/edit order payload.',
    sourceRefs: ['src/pages/EditDelivery/EditDeliveryOrder.tsx', 'src/context/DataContext.tsx'],
    observation: { method: 'PUT', url: '/api/deliveryorder/42', headers: AUTH_HEADER, payload: { id: 42, potStatus: 'Submitted', potImage: 'data:image/jpeg;base64,fixture', updatedBy: 'Operator', lastUpdated: '2026-08-01T12:00:00Z' }, responseStatus: 200, visibleOutcome: 'The confirmed order displays Submitted POT status and its proof preview.' },
  }),
  fixture({
    operation: 'redelivery.public-request', category: 'redelivery', scenario: 'A public failed/cancelled delivery requests a future re-delivery date.',
    sourceRefs: ['src/api/publicTrackingApi.ts', 'src/pages/PublicTracking/PublicTracking.tsx'],
    observation: { method: 'POST', url: '/api/delivery-orders/track/reschedule', headers: JSON_HEADER, payload: { waybillNo: 'WB-2026-001', requestedDate: '2026-08-04', remarks: 'Please retry' }, responseStatus: 200, visibleOutcome: 'Pending Approval is visible and request confirmation replaces the form.' },
  }),
  fixture({
    operation: 'redelivery.schedule', category: 'redelivery', scenario: 'Operations approves/schedules an eligible attempt below the limit.',
    sourceRefs: ['src/api/deliveryApi.ts', 'src/pages/DeliveryOrders/DeliveryOrderDetail.tsx'],
    observation: { method: 'PATCH', url: '/api/delivery-orders/42/schedule-redelivery', headers: AUTH_HEADER, payload: { redeliveryDate: 'August 4, 2026', driverId: 7, remarks: 'Approved' }, responseStatus: 200, visibleOutcome: 'The refreshed detail shows the scheduled attempt and assigned driver.' },
  }),
  fixture({
    operation: 'redelivery.reject', category: 'redelivery', scenario: 'Operations rejects a pending request through the current order update owner.',
    sourceRefs: ['src/pages/DeliveryOrders/DeliveryOrderDetail.tsx', 'src/context/DataContext.tsx'],
    observation: { method: 'PUT', url: '/api/deliveryorder/42', headers: AUTH_HEADER, payload: { id: 42, redeliveryStatus: 'Rejected', redeliveryRemarks: 'Reason', updatedBy: 'Operator', lastUpdated: '2026-08-01T12:00:00Z' }, responseStatus: 200, visibleOutcome: 'Rejected status and remarks replace the pending request state.' },
  }),

  fixture({
    operation: 'pickup.create', category: 'pickup', scenario: 'A pickup task preserves its task type and Manila route rules.',
    sourceRefs: ['src/pages/EditDelivery/EditDeliveryOrder.tsx', 'src/context/DataContext.tsx'],
    observation: { method: 'POST', url: '/api/deliveryorder', headers: AUTH_HEADER, payload: { waybillNo: 'WB-2026-002', taskType: 'Pickup', area: 'Manila', route: 'Manila', status: 'Pending', recipientName: 'Pickup contact' }, responseStatus: 201, visibleOutcome: 'The pickup appears in the pickup workflow and is excluded from driver assignment.' },
  }),
  fixture({
    operation: 'pickup.office-sequence', category: 'pickup', scenario: 'Office pickup follows Processing, Preparing, Ready for Pickup, and Picked Up.',
    sourceRefs: ['src/pages/DeliveryOrders/DeliveryOrderDetail.tsx', 'src/context/DataContext.tsx'],
    observation: { method: 'PUT', url: '/api/deliveryorder/42', headers: AUTH_HEADER, payload: { id: 42, taskType: 'Pickup', status: 'Ready for Pickup', updatedBy: 'Operator', lastUpdated: '2026-08-01T12:00:00Z' }, responseStatus: 200, visibleOutcome: 'The confirmed pickup status advances while assignment controls remain unavailable.' },
  }),
  fixture({
    operation: 'settings.save', category: 'settings', scenario: 'System preferences retain their browser-owned persistence contract.', transport: 'browser-local',
    sourceRefs: ['src/pages/Settings/Settings.tsx', 'src/context/ThemeContext.tsx'],
    observation: { method: 'LOCAL', url: 'browser://local-storage', payload: { key: 'app-settings', value: { emailNotifs: true, smsNotifs: false, timezone: 'Asia/Manila' } }, responseStatus: null, visibleOutcome: 'Saved feedback is shown and the selected settings persist across reloads.' },
  }),
  fixture({
    operation: 'role-access.save', category: 'role-access', scenario: 'The role matrix retains its browser-owned persistence contract.', transport: 'browser-local',
    sourceRefs: ['src/pages/RoleAccess/RoleAccess.tsx'],
    observation: { method: 'LOCAL', url: 'browser://local-storage', payload: { key: 'app-permissions', value: [{ module: 'Manage Delivery Orders', op: true, admin: true }] }, responseStatus: null, visibleOutcome: 'Saved feedback is shown and the permission matrix persists across reloads.' },
  }),
] as const satisfies readonly ApiParityFixture[];

export const requiredOperationCategories = Object.freeze([
  'auth', 'crud', 'assignment', 'status', 'notifications', 'exports', 'archive-restore',
  'qr', 'gps-maps', 'pod-pot', 'redelivery', 'pickup', 'settings', 'role-access',
] as const satisfies readonly OperationCategory[]);