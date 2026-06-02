export type DeliveryStatus = 'Pending' | 'In Transit' | 'Delivered' | 'Completed' | 'Failed' | 'Returned';
export type POTStatus = 'Submitted' | 'No POT' | 'Not Submitted';
export type PODStatus = 'Submitted' | 'No POD' | 'Not Submitted';
export type UserRole = 'ADMIN' | 'OP. TEAM' | 'DRIVER';
export type AccountStatus = 'Active' | 'Pending' | 'Locked';
export type NotificationType = 'alert' | 'success' | 'system' | 'info';
export type ActionType = 'Create' | 'Update' | 'Assign' | 'POT Upload' | 'Login' | 'Archive' | 'Delete';

export interface Employee {
  id: string;
  name: string;
  role: UserRole;
  systemAccess: string;
  status: AccountStatus;
  failedAttempts?: number;
}

export interface DeliveryOrder {
  id: string;
  waybillNo: string;
  clientName: string;
  clientType: string;
  contactNumber: string;
  senderAddress: string;
  recipientName: string;
  recipientContact: string;
  recipientAddress: string;
  area: string;
  landmark?: string;
  driverName: string;
  driverInitials: string;
  driverColor: string;
  status: DeliveryStatus;
  taskType?: 'Delivery' | 'Pickup';
  potStatus: POTStatus;
  packageType: string;
  packageDescription: string;
  itemCount: number;
  weight: string;
  declaredValue: string;
  redeliveryScheduledDate?: string;
  redeliveryDriverId?: string;
  redeliveryRemarks?: string;
  redeliveryAttemptCount?: number;
  potImage?: string;
  podStatus: PODStatus;
  podImage?: string;
  gpsCoordinates?: { lat: number; lng: number };
  liveCoordinates?: { lat: number; lng: number; lastUpdated: string };
  recipientCoordinates?: { lat: number; lng: number };
  failureReason?: string;
  failureRemarks?: string;
  priority?: 'Low' | 'Medium' | 'High';
  specialInstructions?: string;
  orderDate: string;
  expectedDelivery: string;
  dateCompleted?: string;
  encodedBy: string;
  dateEncoded: string;
  lastUpdated: string;
  updatedBy: string;
  route: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  waybillNo?: string;
  description: string;
  timestamp: string;
  date: string;
  source: string;
  read: boolean;
  statusBadge?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  userInitials: string;
  userColor: string;
  action: ActionType;
  description: string;
  reference?: string;
}

export interface DriverPerformance {
  name: string;
  initials: string;
  color: string;
  totalOrders: number;
  delivered: number;
  failed: number;
  potRate: string;
  successRate: string;
  avgTime: string;
  rating: string;
}
