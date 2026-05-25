import type { Employee, DeliveryOrder, Notification, ActivityLog, DriverPerformance } from '../types';

export const employees: Employee[] = [
  { id: 'EMP-001', name: 'Taromaru Rex Gabriel', role: 'SUPER ADMIN', systemAccess: 'All Systems', status: 'Active' },
  { id: 'EMP-002', name: 'Kenneth D. Yulip', role: 'ADMIN', systemAccess: 'Operations', status: 'Active' },
  { id: 'EMP-003', name: 'John Angelo M. Reveche', role: 'OP. TEAM', systemAccess: 'Delivery Tracker', status: 'Active' },
  { id: 'EMP-004', name: 'Hermione B. Benitez', role: 'OP. TEAM', systemAccess: 'Operations', status: 'Active' },
  { id: 'EMP-005', name: 'David Jr. M. Gabriel', role: 'ADMIN', systemAccess: 'Delivery Tracker', status: 'Active' },
];

export const deliveryOrders: DeliveryOrder[] = [
  {
    id: '1', waybillNo: 'SPX-2026-0841', clientName: 'Lazada Philippines', clientType: 'Corporate',
    contactNumber: '0917-123-4567', senderAddress: 'Rockwell Dr., Brgy. Poblacion, Makati City, Metro Manila',
    recipientName: 'Dela Cruz, Maria', recipientContact: '0932-987-6543', recipientAddress: '142 Roces Ave., Brgy. Paligsahan, Quezon City',
    area: 'Quezon City', landmark: 'Near Sct. Alcaraz St.', driverName: 'Conag, Reca M.', driverInitials: 'RC', driverColor: '#00A99D',
    status: 'In Transit', podStatus: 'Not Submitted', packageType: 'Parcel', packageDescription: 'Electronics — Shopee order #LZD-88201',
    itemCount: 2, weight: '1.2 kg', declaredValue: '₱ 2,500.00', specialInstructions: 'Fragile, handle with care',
    orderDate: 'March 29, 2026', expectedDelivery: 'March 31, 2026', encodedBy: 'Gabriel, David Jr.',
    dateEncoded: 'Mar 29, 8:05 AM', lastUpdated: 'Mar 29, 9:41 AM', updatedBy: 'Conag, Reca M.', route: 'Quezon City'
  },
  {
    id: '2', waybillNo: 'SPX-2026-0845', clientName: 'Lazada Philippines', clientType: 'Corporate',
    contactNumber: '0917-123-4567', senderAddress: 'Rockwell Dr., Brgy. Poblacion, Makati City',
    recipientName: 'Ocampo, Cecilia', recipientContact: '0918-555-1234', recipientAddress: 'Brgy. Sta. Mesa Heights, QC',
    area: 'Caloocan City', driverName: 'Conag, Reca M.', driverInitials: 'RC', driverColor: '#00A99D',
    status: 'Delivered', podStatus: 'Submitted', packageType: 'Parcel', packageDescription: 'Fashion accessories',
    itemCount: 1, weight: '0.5 kg', declaredValue: '₱ 890.00',
    orderDate: 'March 29, 2026', expectedDelivery: 'March 30, 2026', dateCompleted: 'Mar 29, 2026 · 9:52 AM',
    encodedBy: 'Gabriel, David Jr.', dateEncoded: 'Mar 29, 8:10 AM', lastUpdated: 'Mar 29, 9:52 AM', updatedBy: 'Conag, Reca M.', route: 'Caloocan City'
  },
  {
    id: '3', waybillNo: 'SPX-2026-0812', clientName: 'Shopee Express', clientType: 'Corporate',
    contactNumber: '0917-555-9876', senderAddress: 'Ayala Ave., Makati City',
    recipientName: 'Santos, Jose', recipientContact: '0920-111-2222', recipientAddress: 'Ayala Ave., Makati',
    area: 'Makati City', driverName: 'Panaligan, S.', driverInitials: 'SP', driverColor: '#FF7B42',
    status: 'Completed', podStatus: 'Submitted', packageType: 'Parcel', packageDescription: 'Home appliance',
    itemCount: 1, weight: '3.2 kg', declaredValue: '₱ 4,500.00',
    orderDate: 'March 28, 2026', expectedDelivery: 'March 29, 2026', dateCompleted: 'Mar 28, 2026 · 2:14 PM',
    encodedBy: 'Gabriel, David Jr.', dateEncoded: 'Mar 28, 7:00 AM', lastUpdated: 'Mar 28, 2:14 PM', updatedBy: 'Panaligan, S.', route: 'Makati City'
  },
  {
    id: '4', waybillNo: 'SPX-2026-0798', clientName: 'TikTok Shop', clientType: 'Corporate',
    contactNumber: '0917-333-4444', senderAddress: 'BGC High St., Taguig',
    recipientName: 'Lim, Robert', recipientContact: '0921-333-4567', recipientAddress: 'BGC High St., Taguig',
    area: 'Taguig City', driverName: 'Dumlao, J.', driverInitials: 'JD', driverColor: '#4318FF',
    status: 'Completed', podStatus: 'No POD', packageType: 'Document', packageDescription: 'Legal documents',
    itemCount: 1, weight: '0.3 kg', declaredValue: '₱ 200.00',
    orderDate: 'March 28, 2026', expectedDelivery: 'March 29, 2026', dateCompleted: 'Mar 28, 2026 · 11:05 AM',
    encodedBy: 'Gabriel, David Jr.', dateEncoded: 'Mar 28, 8:00 AM', lastUpdated: 'Mar 28, 11:05 AM', updatedBy: 'Dumlao, J.', route: 'Taguig City'
  },
  {
    id: '5', waybillNo: 'SPX-2026-0755', clientName: 'Shopee Express', clientType: 'Corporate',
    contactNumber: '0917-555-9876', senderAddress: 'Kanlaon St., Mandaluyong',
    recipientName: 'Garcia, Ella', recipientContact: '0922-777-8888', recipientAddress: 'Kanlaon St., Mandaluyong',
    area: 'Mandaluyong', driverName: 'Panaligan, S.', driverInitials: 'SP', driverColor: '#FF7B42',
    status: 'Completed', podStatus: 'Submitted', packageType: 'Parcel', packageDescription: 'Clothing',
    itemCount: 3, weight: '1.5 kg', declaredValue: '₱ 1,800.00',
    orderDate: 'March 27, 2026', expectedDelivery: 'March 28, 2026', dateCompleted: 'Mar 27, 2026 · 4:30 PM',
    encodedBy: 'Gabriel, David Jr.', dateEncoded: 'Mar 27, 9:00 AM', lastUpdated: 'Mar 27, 4:30 PM', updatedBy: 'Panaligan, S.', route: 'Mandaluyong'
  },
  {
    id: '6', waybillNo: 'SPX-2026-0692', clientName: 'Lazada Philippines', clientType: 'Corporate',
    contactNumber: '0917-123-4567', senderAddress: 'Batangas St., Pasig',
    recipientName: 'Cruz, Benjamin', recipientContact: '0923-444-5555', recipientAddress: 'Batangas St., Pasig',
    area: 'Pasig City', driverName: 'Dumlao, J.', driverInitials: 'JD', driverColor: '#4318FF',
    status: 'Completed', podStatus: 'Submitted', packageType: 'Parcel', packageDescription: 'Kitchen supplies',
    itemCount: 2, weight: '2.1 kg', declaredValue: '₱ 3,200.00',
    orderDate: 'March 26, 2026', expectedDelivery: 'March 27, 2026', dateCompleted: 'Mar 26, 2026 · 1:48 PM',
    encodedBy: 'Gabriel, David Jr.', dateEncoded: 'Mar 26, 8:30 AM', lastUpdated: 'Mar 26, 1:48 PM', updatedBy: 'Dumlao, J.', route: 'Pasig City'
  },
  {
    id: '7', waybillNo: 'SPX-2026-0801', clientName: 'Shopee Express', clientType: 'Corporate',
    contactNumber: '0917-555-9876', senderAddress: 'Marikina City',
    recipientName: 'Torres, Miguel', recipientContact: '0924-666-7777', recipientAddress: 'Marikina City',
    area: 'Marikina City', driverName: '', driverInitials: '', driverColor: '',
    status: 'Pending', podStatus: 'Not Submitted', packageType: 'Parcel', packageDescription: 'Mixed items',
    itemCount: 4, weight: '2.5 kg', declaredValue: '₱ 1,500.00',
    orderDate: 'March 26, 2026', expectedDelivery: 'March 28, 2026',
    encodedBy: 'Gabriel, David Jr.', dateEncoded: 'Mar 26, 10:00 AM', lastUpdated: 'Mar 26, 10:00 AM', updatedBy: 'System', route: 'Marikina City'
  },
  {
    id: '8', waybillNo: 'SPX-2026-0829', clientName: 'Shopee Express', clientType: 'Corporate',
    contactNumber: '0917-555-9876', senderAddress: 'Caloocan City',
    recipientName: 'Reyes, Anna', recipientContact: '0925-888-9999', recipientAddress: 'Caloocan City',
    area: 'Caloocan City', driverName: 'Conag, Reca M.', driverInitials: 'RC', driverColor: '#00A99D',
    status: 'Pending', podStatus: 'Not Submitted', packageType: 'Parcel', packageDescription: 'Beauty products',
    itemCount: 2, weight: '0.8 kg', declaredValue: '₱ 950.00',
    orderDate: 'March 27, 2026', expectedDelivery: 'March 29, 2026',
    encodedBy: 'Gabriel, David Jr.', dateEncoded: 'Mar 27, 9:00 AM', lastUpdated: 'Mar 27, 9:00 AM', updatedBy: 'System', route: 'Caloocan City'
  },
];

export const notifications: Notification[] = [
  { id: '1', type: 'alert', title: 'Failed Pickup Alert', waybillNo: 'SPX-2026-0801', description: 'Package not picked up for 3 days. Marikina City. Immediate action required.', timestamp: '10:15 AM', date: 'March 29, 2026', source: 'Automated Alert', read: false, statusBadge: 'Urgent' },
  { id: '2', type: 'success', title: 'POD Submitted', waybillNo: 'SPX-2026-0845', description: 'Conag, Reca M. submitted proof of delivery. Delivery auto-marked as Completed.', timestamp: '10:12 AM', date: 'March 29, 2026', source: 'Conag, Reca M.', read: false, statusBadge: 'Success' },
  { id: '3', type: 'info', title: 'Status Updated', waybillNo: 'SPX-2026-0841', description: 'Delivery status changed from Pending → In Transit by Conag, Reca M.', timestamp: '10:11 AM', date: 'March 29, 2026', source: 'Conag, Reca M.', read: false, statusBadge: 'In Transit' },
  { id: '4', type: 'alert', title: 'Failed Pickup Alert', waybillNo: 'SPX-2026-0829', description: 'Package not picked up for 2 days. Caloocan City. Please coordinate with assigned driver.', timestamp: '10:00 AM', date: 'March 29, 2026', source: 'Automated Alert', read: false, statusBadge: 'Urgent' },
  { id: '5', type: 'info', title: 'New Delivery Order', waybillNo: 'SPX-2026-0849', description: 'New order created for TikTok Shop. Recipient: Villanueva, Carlos. Taguig City. Needs driver assignment.', timestamp: '10:00 AM', date: 'March 29, 2026', source: 'System', read: false, statusBadge: 'New' },
  { id: '6', type: 'alert', title: 'Delivery Failed', waybillNo: 'SPX-2026-0847', description: 'Delivery attempt failed. Recipient not found at address. Mandaluyong City. Marked as Failed by Panaligan, S.', timestamp: '2:12 PM', date: 'March 28, 2026', source: 'Panaligan, Sofia Q.', read: false, statusBadge: 'Alert' },
  { id: '7', type: 'system', title: 'System Notice', description: 'Daily delivery summary generated. 61 deliveries completed. 3 failed pickups. View Reports for full breakdown.', timestamp: '6:59 PM', date: 'March 28, 2026', source: 'System', read: false, statusBadge: 'System' },
];

export const activityLogs: ActivityLog[] = [
  { id: '1', timestamp: 'Mar 29, 10:22 AM', userName: 'Gabriel, D.', userRole: 'Dispatcher', userInitials: 'DG', userColor: '#00A99D', action: 'Update', description: 'Updated delivery status of SPX-2026-99205 to In Transit', reference: 'SPX-2026-99205' },
  { id: '2', timestamp: 'Mar 29, 10:18 AM', userName: 'Conag, R.', userRole: 'Driver / Staff', userInitials: 'RC', userColor: '#FF7B42', action: 'POD Upload', description: 'Uploaded proof of delivery for SPX-2026-99201 — Recipient: J. Santos', reference: 'SPX-2026-99201' },
  { id: '3', timestamp: 'Mar 29, 10:05 AM', userName: 'Gabriel, D.', userRole: 'Dispatcher', userInitials: 'DG', userColor: '#00A99D', action: 'Assign', description: 'Assigned driver Panaligan, S. to order SPX-2026-99205', reference: 'SPX-2026-99205' },
  { id: '4', timestamp: 'Mar 29, 9:55 AM', userName: 'Gabriel, D.', userRole: 'Dispatcher', userInitials: 'DG', userColor: '#00A99D', action: 'Create', description: 'Created new delivery order SPX-2026-99210 for client SM Supermalls', reference: 'SPX-2026-99210' },
  { id: '5', timestamp: 'Mar 29, 9:42 AM', userName: 'Conag, R.', userRole: 'Driver / Staff', userInitials: 'RC', userColor: '#FF7B42', action: 'POD Upload', description: 'Uploaded proof of delivery for SPX-2026-99289 — Recipient: L. Tan', reference: 'SPX-2026-99289' },
  { id: '6', timestamp: 'Mar 29, 9:30 AM', userName: 'Panaligan, S.', userRole: 'Driver / Staff', userInitials: 'SP', userColor: '#E31A1A', action: 'Update', description: 'Updated delivery status of SPX-2026-99187 to Failed Pickup', reference: 'SPX-2026-99187' },
  { id: '7', timestamp: 'Mar 29, 9:14 AM', userName: 'Gabriel, D.', userRole: 'Dispatcher', userInitials: 'DG', userColor: '#00A99D', action: 'Archive', description: 'Auto-archived completed delivery SPX-2026-99145 — Lazada Philippines', reference: 'SPX-2026-99145' },
  { id: '8', timestamp: 'Mar 29, 8:50 AM', userName: 'Dumlao, J.', userRole: 'Driver / Staff', userInitials: 'JD', userColor: '#4318FF', action: 'Login', description: 'User Dumlao, J. logged in to the Delivery Tracker System' },
];

export const driverPerformance: DriverPerformance[] = [
  { name: 'Conag, Reca M.', initials: 'RC', color: '#00A99D', totalOrders: 312, delivered: 298, failed: 14, podRate: '95.5%', successRate: '95.5%', avgTime: '3.8h', rating: 'Excellent' },
  { name: 'Panaligan, Sofia Q.', initials: 'SP', color: '#FF7B42', totalOrders: 289, delivered: 271, failed: 18, podRate: '93.8%', successRate: '93.8%', avgTime: '4.1h', rating: 'Excellent' },
  { name: 'Dumlao, Jhoyce A.', initials: 'JD', color: '#4318FF', totalOrders: 261, delivered: 248, failed: 13, podRate: '95.0%', successRate: '95.0%', avgTime: '4.6h', rating: 'Excellent' },
];

export const activityFeed = [
  { text: 'Gabriel, T. created account for Dumiao, J.', time: '2 mins ago', color: '#00A99D' },
  { text: 'Gabriel, D. failed login — account locked', time: '14 mins ago', color: '#E31A1A' },
  { text: 'Yulip, K. assigned task to Benitez, H.', time: '32 mins ago', color: '#00A99D' },
  { text: 'Reveche, J. marked Task #018 as complete', time: '1 hr ago', color: '#01B574' },
  { text: 'Gabriel, T. updated role for Ogaya, J. → Admin', time: '2 hrs ago', color: '#E31A1A' },
];

export const dailyDeliveries = [
  { day: '1', weekday: 32, weekend: 0, peak: 0 },
  { day: '2', weekday: 28, weekend: 0, peak: 0 },
  { day: '3', weekday: 35, weekend: 0, peak: 0 },
  { day: '4', weekday: 30, weekend: 0, peak: 0 },
  { day: '5', weekday: 38, weekend: 0, peak: 0 },
  { day: '6', weekday: 0, weekend: 22, peak: 0 },
  { day: '7', weekday: 0, weekend: 18, peak: 0 },
  { day: '8', weekday: 34, weekend: 0, peak: 0 },
  { day: '9', weekday: 29, weekend: 0, peak: 0 },
  { day: '10', weekday: 0, weekend: 0, peak: 42 },
  { day: '11', weekday: 31, weekend: 0, peak: 0 },
  { day: '12', weekday: 36, weekend: 0, peak: 0 },
  { day: '13', weekday: 0, weekend: 20, peak: 0 },
  { day: '14', weekday: 0, weekend: 16, peak: 0 },
  { day: '15', weekday: 33, weekend: 0, peak: 0 },
  { day: '16', weekday: 27, weekend: 0, peak: 0 },
  { day: '17', weekday: 37, weekend: 0, peak: 0 },
  { day: '18', weekday: 25, weekend: 0, peak: 0 },
  { day: '19', weekday: 0, weekend: 0, peak: 40 },
  { day: '20', weekday: 0, weekend: 19, peak: 0 },
  { day: '21', weekday: 0, weekend: 15, peak: 0 },
  { day: '22', weekday: 30, weekend: 0, peak: 0 },
  { day: '23', weekday: 34, weekend: 0, peak: 0 },
  { day: '24', weekday: 26, weekend: 0, peak: 0 },
  { day: '25', weekday: 38, weekend: 0, peak: 0 },
  { day: '26', weekday: 32, weekend: 0, peak: 0 },
  { day: '27', weekday: 0, weekend: 21, peak: 0 },
  { day: '28', weekday: 0, weekend: 17, peak: 0 },
  { day: '29', weekday: 35, weekend: 0, peak: 0 },
];
