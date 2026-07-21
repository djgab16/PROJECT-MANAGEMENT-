// Evidence-only fixture for frontend-ui-ux-migration task 1.1.
// This module is intentionally not imported by runtime application code.

import type { UserRole } from '../types';

export const INVENTORY_REQUIREMENTS = [
  'R1.2',
  'R4.1',
  'R11.1',
  'R11.4',
  'R12.1',
  'R12.5',
  'R12.8',
] as const;

export const REQUIRED_VIEWPORTS = [320, 640, 768, 1024, 1280, 1536] as const;
export const REQUIRED_THEME_MODES = ['light', 'dark', 'system'] as const;
export const AUTHORIZATION_STATES = [
  'PUBLIC',
  'UNAUTHENTICATED',
  'ADMIN',
  'OP. TEAM',
  'CLIENT',
  'DRIVER',
] as const;

export type AuthorizationState = (typeof AUTHORIZATION_STATES)[number];
export type Viewport = (typeof REQUIRED_VIEWPORTS)[number];
export type ThemeMode = (typeof REQUIRED_THEME_MODES)[number];
export type RouteOutcome = 'render' | `redirect:${string}`;
export type AccessMatrix = Readonly<Record<AuthorizationState, RouteOutcome>>;
export type ShellOwner = 'standalone-auth' | 'standalone-public' | 'staff-shell' | 'driver-shell' | 'redirect-only';

const accessMatrix = (matrix: AccessMatrix) => matrix;

export const ACCESS_POLICIES = {
  public: accessMatrix({
    PUBLIC: 'render', UNAUTHENTICATED: 'render', ADMIN: 'render', 'OP. TEAM': 'render', CLIENT: 'render', DRIVER: 'render',
  }),
  staff: accessMatrix({
    PUBLIC: 'redirect:/login', UNAUTHENTICATED: 'redirect:/login', ADMIN: 'render', 'OP. TEAM': 'render', CLIENT: 'render', DRIVER: 'redirect:/driver/dashboard',
  }),
  admin: accessMatrix({
    PUBLIC: 'redirect:/login', UNAUTHENTICATED: 'redirect:/login', ADMIN: 'render', 'OP. TEAM': 'redirect:/dashboard', CLIENT: 'redirect:/dashboard', DRIVER: 'redirect:/driver/dashboard',
  }),
  driver: accessMatrix({
    PUBLIC: 'redirect:/login', UNAUTHENTICATED: 'redirect:/login', ADMIN: 'redirect:/dashboard', 'OP. TEAM': 'redirect:/dashboard', CLIENT: 'redirect:/dashboard', DRIVER: 'render',
  }),
  staffRoot: accessMatrix({
    PUBLIC: 'redirect:/login', UNAUTHENTICATED: 'redirect:/login', ADMIN: 'redirect:/dashboard', 'OP. TEAM': 'redirect:/dashboard', CLIENT: 'redirect:/dashboard', DRIVER: 'redirect:/driver/dashboard',
  }),
  potAlias: accessMatrix({
    PUBLIC: 'redirect:/login', UNAUTHENTICATED: 'redirect:/login', ADMIN: 'redirect:/archive', 'OP. TEAM': 'redirect:/archive', CLIENT: 'redirect:/archive', DRIVER: 'redirect:/driver/dashboard',
  }),
  fallback: accessMatrix({
    PUBLIC: 'redirect:/login', UNAUTHENTICATED: 'redirect:/login', ADMIN: 'redirect:/dashboard', 'OP. TEAM': 'redirect:/dashboard', CLIENT: 'redirect:/dashboard', DRIVER: 'redirect:/driver/dashboard',
  }),
} as const satisfies Record<string, AccessMatrix>;

export const API_WORKFLOW_OWNERS = [
  { id: 'auth-context', owner: 'src/context/AuthContext.tsx', responsibilities: ['session restore', 'login', 'profile fetch', 'logout revocation', 'authenticated user'] },
  { id: 'data-context', owner: 'src/context/DataContext.tsx', responsibilities: ['authenticated polling', 'orders', 'employees', 'notifications', 'activity logs', 'CRUD', 'assignment', 'status updates'] },
  { id: 'theme-context', owner: 'src/context/ThemeContext.tsx', responsibilities: ['light/dark/system selection', 'app-theme persistence', 'resolved html class', 'system preference listener'] },
  { id: 'route-guard', owner: 'src/components/layout/ProtectedRoute.tsx', responsibilities: ['session loading state', 'unauthenticated redirect', 'role-home redirect'] },
  { id: 'root-redirect', owner: 'src/App.tsx#RootRedirect', responsibilities: ['DRIVER home selection', 'staff home selection', 'replace navigation'] },
  { id: 'public-tracking-api', owner: 'src/api/publicTrackingApi.ts', responsibilities: ['public waybill lookup', 're-delivery request', 'delivery confirmation'] },
  { id: 'delivery-api-detail', owner: 'src/api/deliveryApi.ts', responsibilities: ['re-delivery scheduling', 'archive restore', 'waybill PDF download'] },
  { id: 'driver-gps', owner: 'src/hooks/useDriverGPS.ts', responsibilities: ['GPS permission/error state', 'watch lifecycle', 'throttle/heartbeat', 'coordinate updates'] },
  { id: 'realtime-location', owner: 'src/utils/realtimeSync.ts', responsibilities: ['five-second location polling', 'subscription cleanup', 'connection state'] },
  { id: 'header-composition', owner: 'src/components/layout/Header.tsx', responsibilities: ['global controlled search', 'notification dropdown', 'linked navigation'] },
  { id: 'page-local-state', owner: 'routed page component', responsibilities: ['controlled fields', 'filters', 'pagination', 'selection', 'modal visibility', 'submission state'] },
  { id: 'browser-storage', owner: 'existing page-local localStorage calls', responsibilities: ['account lock handoff', 'settings persistence', 'role-access persistence'] },
  { id: 'browser-export', owner: 'existing page-local browser download handlers', responsibilities: ['CSV export', 'PDF object URL download'] },
  { id: 'qr-scanner', owner: 'src/pages/DRIVER/QRScannerView.tsx', responsibilities: ['camera scanner result', 'permission error', 'order lookup navigation'] },
  { id: 'charts-and-maps', owner: 'existing Recharts/Leaflet callers', responsibilities: ['chart projection', 'map rendering', 'current series/coordinates'] },
] as const;

export type WorkflowOwnerId = (typeof API_WORKFLOW_OWNERS)[number]['id'];

type RouteInventorySeed = {
  id: string;
  declaration: number;
  path: string;
  element: string;
  kind: 'screen' | 'redirect';
  shell: ShellOwner;
  access: AccessMatrix;
  allowedRoles: readonly UserRole[] | readonly [];
  workflowOwners: readonly WorkflowOwnerId[];
  stateOwnerRefs: readonly string[];
  notes?: readonly string[];
};

export const ROUTE_INVENTORY = [
  { id: 'login', declaration: 1, path: '/login', element: 'Login', kind: 'screen', shell: 'standalone-auth', access: ACCESS_POLICIES.public, allowedRoles: [], workflowOwners: ['auth-context', 'data-context', 'page-local-state', 'browser-storage'], stateOwnerRefs: ['login-form'] },
  { id: 'account-locked', declaration: 2, path: '/account-locked', element: 'AccountLocked', kind: 'screen', shell: 'standalone-auth', access: ACCESS_POLICIES.public, allowedRoles: [], workflowOwners: ['browser-storage', 'page-local-state'], stateOwnerRefs: ['account-locked-profile'] },
  { id: 'public-tracking', declaration: 3, path: '/tracking', element: 'PublicTracking', kind: 'screen', shell: 'standalone-public', access: ACCESS_POLICIES.public, allowedRoles: [], workflowOwners: ['public-tracking-api', 'page-local-state', 'charts-and-maps'], stateOwnerRefs: ['public-tracking', 'tracking-search'] },

  { id: 'staff-root', declaration: 4, path: '/', element: 'RootRedirect', kind: 'redirect', shell: 'staff-shell', access: ACCESS_POLICIES.staffRoot, allowedRoles: ['ADMIN', 'OP. TEAM', 'CLIENT'], workflowOwners: ['route-guard', 'root-redirect'], stateOwnerRefs: ['staff-shell'], notes: ['First of two duplicate absolute / declarations in App.tsx.'] },
  { id: 'dashboard', declaration: 5, path: '/dashboard', element: 'Dashboard', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.staff, allowedRoles: ['ADMIN', 'OP. TEAM', 'CLIENT'], workflowOwners: ['route-guard', 'data-context', 'header-composition', 'charts-and-maps'], stateOwnerRefs: ['staff-shell', 'header'] },
  { id: 'delivery-orders', declaration: 6, path: '/delivery-orders', element: 'DeliveryOrders', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.staff, allowedRoles: ['ADMIN', 'OP. TEAM', 'CLIENT'], workflowOwners: ['route-guard', 'data-context', 'header-composition', 'page-local-state'], stateOwnerRefs: ['staff-shell', 'header', 'delivery-orders-list'] },
  { id: 'delivery-order-detail', declaration: 7, path: '/delivery-orders/:id', element: 'DeliveryOrderDetail', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.staff, allowedRoles: ['ADMIN', 'OP. TEAM', 'CLIENT'], workflowOwners: ['route-guard', 'data-context', 'delivery-api-detail', 'header-composition', 'page-local-state', 'browser-export', 'charts-and-maps'], stateOwnerRefs: ['staff-shell', 'header', 'delivery-order-detail'] },
  { id: 'delivery-order-history', declaration: 8, path: '/delivery-orders/:id/history', element: 'DeliveryHistoryLog', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.staff, allowedRoles: ['ADMIN', 'OP. TEAM', 'CLIENT'], workflowOwners: ['route-guard', 'data-context', 'header-composition'], stateOwnerRefs: ['staff-shell', 'header'] },
  { id: 'delivery-order-edit', declaration: 9, path: '/delivery-orders/:id/edit', element: 'EditDeliveryOrder', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.staff, allowedRoles: ['ADMIN', 'OP. TEAM', 'CLIENT'], workflowOwners: ['route-guard', 'data-context', 'header-composition', 'page-local-state'], stateOwnerRefs: ['staff-shell', 'header', 'delivery-order-form'] },
  { id: 'track', declaration: 10, path: '/track', element: 'TrackDelivery', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.staff, allowedRoles: ['ADMIN', 'OP. TEAM', 'CLIENT'], workflowOwners: ['route-guard', 'data-context', 'header-composition', 'page-local-state', 'charts-and-maps'], stateOwnerRefs: ['staff-shell', 'header', 'authenticated-tracking'] },
  { id: 'search-waybill', declaration: 11, path: '/search-waybill', element: 'TrackDelivery', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.staff, allowedRoles: ['ADMIN', 'OP. TEAM', 'CLIENT'], workflowOwners: ['route-guard', 'data-context', 'header-composition', 'page-local-state', 'charts-and-maps'], stateOwnerRefs: ['staff-shell', 'header', 'authenticated-tracking'], notes: ['Alias renders the same component and ownership boundary as /track.'] },
  { id: 'archive', declaration: 12, path: '/archive', element: 'Archive', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.staff, allowedRoles: ['ADMIN', 'OP. TEAM', 'CLIENT'], workflowOwners: ['route-guard', 'data-context', 'header-composition', 'page-local-state', 'browser-export'], stateOwnerRefs: ['staff-shell', 'header', 'archive-list', 'enterprise-filters'] },
  { id: 'failed-pickups', declaration: 13, path: '/failed-pickups', element: 'FailedPickups', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.staff, allowedRoles: ['ADMIN', 'OP. TEAM', 'CLIENT'], workflowOwners: ['route-guard', 'data-context', 'header-composition', 'page-local-state'], stateOwnerRefs: ['staff-shell', 'header', 'failed-pickup-filters', 'enterprise-filters'] },
  { id: 'staff-notifications', declaration: 14, path: '/notifications', element: 'Notifications', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.staff, allowedRoles: ['ADMIN', 'OP. TEAM', 'CLIENT'], workflowOwners: ['route-guard', 'data-context', 'header-composition', 'page-local-state'], stateOwnerRefs: ['staff-shell', 'header', 'notifications'] },
  { id: 'tasks', declaration: 15, path: '/tasks', element: 'Tasks', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.staff, allowedRoles: ['ADMIN', 'OP. TEAM', 'CLIENT'], workflowOwners: ['route-guard', 'data-context', 'header-composition', 'page-local-state'], stateOwnerRefs: ['staff-shell', 'header', 'tasks', 'enterprise-filters'] },
  { id: 'dispatch', declaration: 16, path: '/dispatch', element: 'Dispatch', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.staff, allowedRoles: ['ADMIN', 'OP. TEAM', 'CLIENT'], workflowOwners: ['route-guard', 'data-context', 'header-composition', 'page-local-state'], stateOwnerRefs: ['staff-shell', 'header', 'dispatch'] },
  { id: 'pot-records-alias', declaration: 17, path: '/POT-records', element: 'Navigate(/archive, replace)', kind: 'redirect', shell: 'staff-shell', access: ACCESS_POLICIES.potAlias, allowedRoles: ['ADMIN', 'OP. TEAM', 'CLIENT'], workflowOwners: ['route-guard'], stateOwnerRefs: ['staff-shell'] },
  { id: 'activity-logs', declaration: 18, path: '/activity-logs', element: 'ActivityLogs', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.staff, allowedRoles: ['ADMIN', 'OP. TEAM', 'CLIENT'], workflowOwners: ['route-guard', 'data-context', 'header-composition', 'page-local-state'], stateOwnerRefs: ['staff-shell', 'header', 'activity-log-filters'] },

  { id: 'reports', declaration: 19, path: '/reports', element: 'Reports', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.admin, allowedRoles: ['ADMIN'], workflowOwners: ['route-guard', 'data-context', 'header-composition', 'page-local-state', 'browser-export', 'charts-and-maps'], stateOwnerRefs: ['staff-shell', 'header', 'reports', 'enterprise-filters'] },
  { id: 'delivery-summary', declaration: 20, path: '/delivery-summary', element: 'DeliverySummary', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.admin, allowedRoles: ['ADMIN'], workflowOwners: ['route-guard', 'data-context', 'header-composition', 'browser-export'], stateOwnerRefs: ['staff-shell', 'header'] },
  { id: 'analytics', declaration: 21, path: '/analytics', element: 'AnalyticsView', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.admin, allowedRoles: ['ADMIN'], workflowOwners: ['route-guard', 'data-context', 'header-composition', 'page-local-state', 'browser-export', 'charts-and-maps'], stateOwnerRefs: ['staff-shell', 'header', 'analytics', 'enterprise-filters'] },
  { id: 'settings', declaration: 22, path: '/settings', element: 'Settings', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.admin, allowedRoles: ['ADMIN'], workflowOwners: ['route-guard', 'data-context', 'theme-context', 'header-composition', 'page-local-state', 'browser-storage'], stateOwnerRefs: ['staff-shell', 'header', 'settings'] },
  { id: 'employees', declaration: 23, path: '/employees', element: 'Employees', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.admin, allowedRoles: ['ADMIN'], workflowOwners: ['route-guard', 'data-context', 'header-composition', 'page-local-state'], stateOwnerRefs: ['staff-shell', 'header', 'employees'] },
  { id: 'role-access', declaration: 24, path: '/role-access', element: 'RoleAccess', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.admin, allowedRoles: ['ADMIN'], workflowOwners: ['route-guard', 'data-context', 'header-composition', 'page-local-state', 'browser-storage'], stateOwnerRefs: ['staff-shell', 'header', 'role-access'] },
  { id: 'design-system', declaration: 25, path: '/design-system', element: 'DesignSystem', kind: 'screen', shell: 'staff-shell', access: ACCESS_POLICIES.admin, allowedRoles: ['ADMIN'], workflowOwners: ['route-guard', 'header-composition', 'page-local-state'], stateOwnerRefs: ['staff-shell', 'header', 'design-system'] },

  { id: 'driver-root', declaration: 26, path: '/', element: 'RootRedirect', kind: 'redirect', shell: 'driver-shell', access: ACCESS_POLICIES.staffRoot, allowedRoles: ['DRIVER'], workflowOwners: ['route-guard', 'root-redirect'], stateOwnerRefs: ['driver-shell'], notes: ['Second duplicate absolute / declaration; preserve declaration order and effective destination.'] },
  { id: 'driver-dashboard', declaration: 27, path: '/driver/dashboard', element: 'DriverDashboard', kind: 'screen', shell: 'driver-shell', access: ACCESS_POLICIES.driver, allowedRoles: ['DRIVER'], workflowOwners: ['route-guard', 'data-context', 'page-local-state'], stateOwnerRefs: ['driver-shell', 'driver-dashboard'] },
  { id: 'driver-scan', declaration: 28, path: '/driver/scan', element: 'QRScannerView', kind: 'screen', shell: 'driver-shell', access: ACCESS_POLICIES.driver, allowedRoles: ['DRIVER'], workflowOwners: ['route-guard', 'data-context', 'qr-scanner', 'page-local-state'], stateOwnerRefs: ['driver-shell', 'driver-scan'] },
  { id: 'driver-delivery-detail', declaration: 29, path: '/driver/delivery/:id', element: 'DriverDeliveryDetail', kind: 'screen', shell: 'driver-shell', access: ACCESS_POLICIES.driver, allowedRoles: ['DRIVER'], workflowOwners: ['route-guard', 'data-context', 'driver-gps', 'realtime-location', 'page-local-state', 'charts-and-maps'], stateOwnerRefs: ['driver-shell', 'driver-delivery-detail', 'driver-proof-modal', 'driver-failure-modal', 'driver-gps-hook'] },
  { id: 'driver-settings', declaration: 30, path: '/driver/settings', element: 'DriverSettings', kind: 'screen', shell: 'driver-shell', access: ACCESS_POLICIES.driver, allowedRoles: ['DRIVER'], workflowOwners: ['route-guard', 'auth-context', 'theme-context'], stateOwnerRefs: ['driver-shell'] },
  { id: 'driver-notifications', declaration: 31, path: '/driver/notifications', element: 'Notifications', kind: 'screen', shell: 'driver-shell', access: ACCESS_POLICIES.driver, allowedRoles: ['DRIVER'], workflowOwners: ['route-guard', 'data-context', 'page-local-state'], stateOwnerRefs: ['driver-shell', 'notifications'], notes: ['Shares the Notifications component and DataContext owner with /notifications.'] },
  { id: 'fallback', declaration: 32, path: '*', element: 'RootRedirect', kind: 'redirect', shell: 'redirect-only', access: ACCESS_POLICIES.fallback, allowedRoles: [], workflowOwners: ['root-redirect', 'route-guard'], stateOwnerRefs: [], notes: ['Unauthenticated fallback first targets /dashboard, then ProtectedRoute replaces it with /login.'] },
] as const satisfies readonly RouteInventorySeed[];

export type RouteId = (typeof ROUTE_INVENTORY)[number]['id'];

export const PROVIDER_AND_SHELL_BASELINE = {
  providerOrder: [
    'ErrorBoundary',
    'AuthProvider',
    'DataProvider',
    'App.ThemeProvider',
    'BrowserRouter',
  ],
  runtimeFilesThatMustRemainUnchangedForTask11: [
    'src/main.tsx',
    'src/App.tsx',
    'src/components/layout/ProtectedRoute.tsx',
    'src/context/AuthContext.tsx',
    'src/context/DataContext.tsx',
    'src/context/ThemeContext.tsx',
  ],
  shells: {
    'standalone-auth': ['Login', 'AccountLocked'],
    'standalone-public': ['PublicTracking'],
    'staff-shell': ['ProtectedRoute(ADMIN|OP. TEAM|CLIENT)', 'DashboardLayout', 'Sidebar', 'Outlet'],
    'driver-shell': ['ProtectedRoute(DRIVER)', 'DriverLayout', 'Outlet', 'bottom navigation'],
    'redirect-only': ['RootRedirect'],
  },
} as const;

type PrimitiveCallerInventory = {
  primitive: string;
  contractOwner: `src/components/ui/${string}.tsx`;
  callers: readonly `src/${string}.tsx`[];
  stateContract: string;
};

export const PRIMITIVE_CALLER_INVENTORY = [
  {
    primitive: 'DataTable', contractOwner: 'src/components/ui/DataTable.tsx',
    callers: ['src/pages/DesignSystem/DesignSystem.tsx'],
    stateContract: 'Rows, columns, row activation, and empty copy are caller-owned; DataTable uses item.id for row identity.',
  },
  {
    primitive: 'EmptyState', contractOwner: 'src/components/ui/EmptyState.tsx',
    callers: ['src/pages/Notification/Notifications.tsx', 'src/pages/DesignSystem/DesignSystem.tsx', 'src/pages/DeliveryOrders/DeliveryOrders.tsx', 'src/pages/Archive/Archive.tsx'],
    stateContract: 'Caller selects empty condition, content, and action; primitive owns no domain state.',
  },
  {
    primitive: 'EnterpriseFilters', contractOwner: 'src/components/ui/EnterpriseFilters.tsx',
    callers: ['src/pages/Report/Reports.tsx', 'src/pages/FailedPickups/FailedPickups.tsx', 'src/pages/DRIVER/Tasks.tsx', 'src/pages/Archive/Archive.tsx', 'src/pages/Analytics/AnalyticsView.tsx'],
    stateContract: 'Caller owns filters/onChange/onReset; component owns expanded/collapsed state and date validation feedback; DataContext supplies option values.',
  },
  {
    primitive: 'Modal', contractOwner: 'src/components/ui/Modal.tsx',
    callers: ['src/pages/PublicTracking/PublicTracking.tsx', 'src/pages/Notification/Notifications.tsx', 'src/pages/EditDelivery/EditDeliveryOrder.tsx', 'src/pages/DRIVER/Tasks.tsx', 'src/pages/DRIVER/DriverDeliveryDetail.tsx', 'src/pages/DesignSystem/DesignSystem.tsx', 'src/pages/DeliveryOrders/DeliveryOrders.tsx', 'src/pages/DeliveryOrders/DeliveryOrderDetail.tsx'],
    stateContract: 'Caller owns isOpen/onClose and transaction state; Modal owns Escape, backdrop, and body-overflow presentation mechanics.',
  },
  {
    primitive: 'ProgressStepper', contractOwner: 'src/components/ui/ProgressStepper.tsx',
    callers: ['src/pages/DesignSystem/DesignSystem.tsx'],
    stateContract: 'Caller owns steps/currentStep; current implementation uses positional keys for this static demonstration.',
  },
  {
    primitive: 'RoleBadge', contractOwner: 'src/components/ui/RoleBadge.tsx',
    callers: ['src/pages/Employees/Employees.tsx', 'src/pages/DesignSystem/DesignSystem.tsx'],
    stateContract: 'Caller owns canonical role; primitive maps presentation only.',
  },
  {
    primitive: 'StatCard', contractOwner: 'src/components/ui/StatCard.tsx',
    callers: ['src/pages/Report/Reports.tsx', 'src/pages/FailedPickups/FailedPickups.tsx', 'src/pages/DesignSystem/DesignSystem.tsx', 'src/pages/Dashboard/Dashboard.tsx', 'src/pages/ActivityLogs/ActivityLogs.tsx'],
    stateContract: 'Caller owns all calculated values, labels, and links surrounding cards; primitive is presentation-only.',
  },
  {
    primitive: 'StatusBadge', contractOwner: 'src/components/ui/StatusBadge.tsx',
    callers: ['src/pages/TrackDelivery/TrackDelivery.tsx', 'src/pages/Notification/Notifications.tsx', 'src/pages/FailedPickups/FailedPickups.tsx', 'src/pages/Employees/Employees.tsx', 'src/pages/EditDelivery/EditDeliveryOrder.tsx', 'src/pages/DRIVER/Tasks.tsx', 'src/pages/DRIVER/DriverDeliveryDetail.tsx', 'src/pages/DRIVER/DriverDashboard.tsx', 'src/pages/DesignSystem/DesignSystem.tsx', 'src/pages/DeliveryOrders/DeliveryOrders.tsx', 'src/pages/DeliveryOrders/DeliveryOrderDetail.tsx', 'src/pages/Archive/Archive.tsx'],
    stateContract: 'Caller owns delivery/account/POT status or a legacy priority/notification/system label and all authorization; the compatibility primitive preserves raw unknown text and maps presentation only.',
  },
  {
    primitive: 'Button', contractOwner: 'src/components/ui/Button.tsx',
    callers: ['src/components/ui/PageHeader.tsx'],
    stateContract: 'PageHeader owns its back callback; Button forwards the callback and native button contract. Existing route `.btn` markup is not migrated by task 5.5.',
  },
  {
    primitive: 'Card', contractOwner: 'src/components/ui/Card.tsx',
    callers: [],
    stateContract: 'No runtime caller imports Card yet. Existing route `.card` markup remains the rollback path and is not migrated by task 5.5.',
  },
] as const satisfies readonly PrimitiveCallerInventory[];

/**
 * Task 5.5 evidence-only caller and rollback inventory.
 * Captured before compatibility exports were added; this module is not imported by runtime code.
 */
export const BASE_PRIMITIVE_COMPATIBILITY_INVENTORY = [
  {
    primitive: 'StatCard',
    acceptedProps: ['icon', 'iconColor?', 'iconBg?', 'label', 'value', 'subtitle?', 'subtitleColor?', 'accentColor?'],
    callers: ['src/pages/Report/Reports.tsx', 'src/pages/FailedPickups/FailedPickups.tsx', 'src/pages/DesignSystem/DesignSystem.tsx', 'src/pages/Dashboard/Dashboard.tsx', 'src/pages/ActivityLogs/ActivityLogs.tsx'],
    compatibility: 'Preserve the direct default export and exact legacy DOM/classes/inline visual props; expose additive named and LegacyStatCard barrel exports.',
    rollback: "Import the unchanged default from 'src/components/ui/StatCard'.",
  },
  {
    primitive: 'StatusBadge',
    acceptedProps: ['status (canonical or arbitrary string)', 'size? (sm | md)', 'domain? (delivery | account | pod | pot; additive)'],
    callers: ['src/pages/TrackDelivery/TrackDelivery.tsx (delivery)', 'src/pages/Notification/Notifications.tsx (arbitrary Notification.statusBadge string)', 'src/pages/FailedPickups/FailedPickups.tsx (delivery)', 'src/pages/Employees/Employees.tsx (account)', 'src/pages/EditDelivery/EditDeliveryOrder.tsx (delivery)', 'src/pages/DRIVER/Tasks.tsx (delivery)', 'src/pages/DRIVER/DriverDeliveryDetail.tsx (priority and delivery)', 'src/pages/DRIVER/DriverDashboard.tsx (priority and delivery)', 'src/pages/DesignSystem/DesignSystem.tsx (delivery, account/system, POT, priority)', 'src/pages/DeliveryOrders/DeliveryOrders.tsx (priority and delivery)', 'src/pages/DeliveryOrders/DeliveryOrderDetail.tsx (priority and delivery)', 'src/pages/Archive/Archive.tsx (POT)'],
    compatibility: 'No-domain calls retain the exact legacy label/class lookup. Explicit-domain calls may use the canonical resolver; unknown values still render their raw text with the legacy neutral class.',
    rollback: "Import the preserved default from 'src/components/ui/StatusBadge'; omit domain to retain the original path.",
  },
  {
    primitive: 'RoleBadge',
    acceptedProps: ['role'],
    callers: ['src/pages/Employees/Employees.tsx', 'src/pages/DesignSystem/DesignSystem.tsx'],
    compatibility: 'Preserve role labels, including OP. TEAM → ENCODER, and exact legacy DOM/classes; expose additive named and LegacyRoleBadge barrel exports.',
    rollback: "Import the unchanged default from 'src/components/ui/RoleBadge'.",
  },
  {
    primitive: 'EmptyState',
    acceptedProps: ['icon', 'title', 'description', 'action?'],
    callers: ['src/pages/Notification/Notifications.tsx', 'src/pages/DesignSystem/DesignSystem.tsx', 'src/pages/DeliveryOrders/DeliveryOrders.tsx', 'src/pages/Archive/Archive.tsx'],
    compatibility: 'Preserve caller-selected content/action and exact legacy DOM/classes; do not substitute FeedbackState because its structure, icon, live-region, and CSS contract differ.',
    rollback: "Import the unchanged default from 'src/components/ui/EmptyState'.",
  },
  {
    primitive: 'Button',
    acceptedProps: ['variant', 'size?', 'loading?', 'iconOnlyLabel?', 'native button attributes'],
    callers: ['src/components/ui/PageHeader.tsx'],
    compatibility: 'Keep the approved PageHeader caller on the direct primitive import; leave all route-owned `.btn` markup and callbacks untouched.',
    rollback: "PageHeader continues to import the default from './Button'.",
  },
  {
    primitive: 'Card',
    acceptedProps: ['as?', 'padding?', 'elevated?', 'native element attributes'],
    callers: [],
    compatibility: 'No approved component caller exists; leave route-owned `.card` markup untouched rather than mass-migrating cohorts.',
    rollback: 'Existing `.card` markup remains authoritative; the Card default and barrel export remain available.',
  },
] as const;

type StateOwnerBoundary = {
  id: string;
  owner: `src/${string}.tsx` | `src/${string}.ts`;
  routes: readonly RouteId[];
  boundary: 'context' | 'shell' | 'page' | 'shared-component' | 'hook';
  controlledOrStatefulValues: readonly string[];
  preservationRule: string;
};

export const STATE_OWNER_INVENTORY = [
  { id: 'auth-provider', owner: 'src/context/AuthContext.tsx', routes: [], boundary: 'context', controlledOrStatefulValues: ['user', 'isLoading'], preservationRule: 'Retain session restore, login/logout ownership and provider position.' },
  { id: 'data-provider', owner: 'src/context/DataContext.tsx', routes: [], boundary: 'context', controlledOrStatefulValues: ['employees', 'deliveryOrders', 'notifications', 'activityLogs', '10-second authenticated refresh'], preservationRule: 'Pages and templates consume current data/callbacks; presentation must not take ownership.' },
  { id: 'theme-provider', owner: 'src/context/ThemeContext.tsx', routes: [], boundary: 'context', controlledOrStatefulValues: ['theme', 'app-theme persistence', 'resolved system theme listener'], preservationRule: 'Keep light/dark/system ownership and html class resolution unchanged.' },
  { id: 'staff-shell', owner: 'src/components/layout/DashboardLayout.tsx', routes: ['staff-root', 'dashboard', 'delivery-orders', 'delivery-order-detail', 'delivery-order-history', 'delivery-order-edit', 'track', 'search-waybill', 'archive', 'failed-pickups', 'staff-notifications', 'tasks', 'dispatch', 'pot-records-alias', 'activity-logs', 'reports', 'delivery-summary', 'analytics', 'settings', 'employees', 'role-access', 'design-system'], boundary: 'shell', controlledOrStatefulValues: ['isSidebarOpen', 'isSidebarCollapsed'], preservationRule: 'Keep the same DashboardLayout identity and shell-owned callbacks around Outlet.' },
  { id: 'driver-shell', owner: 'src/components/layout/DriverLayout.tsx', routes: ['driver-root', 'driver-dashboard', 'driver-scan', 'driver-delivery-detail', 'driver-settings', 'driver-notifications'], boundary: 'shell', controlledOrStatefulValues: ['location-derived back control', 'bottom navigation active state'], preservationRule: 'Retain DriverLayout/Outlet identity and router-owned navigation state.' },
  { id: 'header', owner: 'src/components/layout/Header.tsx', routes: ['dashboard', 'delivery-orders', 'delivery-order-detail', 'delivery-order-history', 'delivery-order-edit', 'track', 'search-waybill', 'archive', 'failed-pickups', 'staff-notifications', 'tasks', 'dispatch', 'activity-logs', 'reports', 'delivery-summary', 'analytics', 'settings', 'employees', 'role-access', 'design-system'], boundary: 'shared-component', controlledOrStatefulValues: ['searchQuery', 'showResults', 'showNotifications', 'outside-click refs'], preservationRule: 'Header remains owner of global-search/dropdown presentation state and delegates data mutations to DataContext.' },
  { id: 'enterprise-filters', owner: 'src/components/ui/EnterpriseFilters.tsx', routes: ['archive', 'failed-pickups', 'tasks', 'reports', 'analytics'], boundary: 'shared-component', controlledOrStatefulValues: ['caller-controlled filters', 'isOpen', 'dateError'], preservationRule: 'Forward the same filter values/callbacks; retain local disclosure and validation timing.' },

  { id: 'modal-mechanics', owner: 'src/components/ui/Modal.tsx', routes: ['public-tracking', 'delivery-orders', 'delivery-order-detail', 'delivery-order-edit', 'staff-notifications', 'tasks', 'design-system', 'driver-delivery-detail'], boundary: 'shared-component', controlledOrStatefulValues: ['caller-controlled isOpen/onClose', 'Escape listener', 'body overflow'], preservationRule: 'Modal may own accessibility mechanics only; transaction/open state remains with each caller.' },
  { id: 'login-form', owner: 'src/pages/Login/Login.tsx', routes: ['login'], boundary: 'page', controlledOrStatefulValues: ['employeeId', 'password', 'showPassword', 'error', 'isSubmitting'], preservationRule: 'Keep controlled inputs, AuthContext.login, lockout handoff, activity logging, and role redirect order.' },
  { id: 'account-locked-profile', owner: 'src/pages/AccountLocked/AccountLocked.tsx', routes: ['account-locked'], boundary: 'page', controlledOrStatefulValues: ['lockedUser initialized from dts_locked_user'], preservationRule: 'Do not move lockout identity/persistence into presentation primitives.' },
  { id: 'public-tracking', owner: 'src/pages/PublicTracking/PublicTracking.tsx', routes: ['public-tracking'], boundary: 'page', controlledOrStatefulValues: ['loading', 'errorState', 'data', 'isModalOpen', 'requestedDate', 'clientRemarks', 'submitting', 'submitError'], preservationRule: 'Retain lookup/re-delivery/confirmation API ownership and recoverable form values.' },
  { id: 'tracking-search', owner: 'src/pages/PublicTracking/components/TrackingSearch.tsx', routes: ['public-tracking'], boundary: 'shared-component', controlledOrStatefulValues: ['query', 'error'], preservationRule: 'Keep search input local and preserve onSearch callback arguments/timing.' },
  { id: 'delivery-orders-list', owner: 'src/pages/DeliveryOrders/DeliveryOrders.tsx', routes: ['delivery-orders'], boundary: 'page', controlledOrStatefulValues: ['searchTerm', 'statusFilter', 'areaFilter', 'showFilters', 'deleteTarget', 'isDeleting'], preservationRule: 'Keep query, permissions, selected deletion target, and mutation callback in the route.' },
  { id: 'delivery-order-detail', owner: 'src/pages/DeliveryOrders/DeliveryOrderDetail.tsx', routes: ['delivery-order-detail'], boundary: 'page', controlledOrStatefulValues: ['re-delivery modal', 'delete/restore/reject confirms', 'rejectionReason', 'selectedDriverId', 'redeliveryDate', 'remarks', 'errorMsg', 'isSubmitting'], preservationRule: 'Retain API call order, status gates, controlled fields, date ref, and confirmation ownership.' },
  { id: 'delivery-order-form', owner: 'src/pages/EditDelivery/EditDeliveryOrder.tsx', routes: ['delivery-order-edit'], boundary: 'page', controlledOrStatefulValues: ['formData', 'customPackageName', 'errors', 'isSubmitting', 'save/delete confirms', 'sender/recipient address fields', 'area dropdown'], preservationRule: 'Retain controlled values, validation timing, payload construction, submission order, and failure retention.' },
  { id: 'authenticated-tracking', owner: 'src/pages/TrackDelivery/TrackDelivery.tsx', routes: ['track', 'search-waybill'], boundary: 'page', controlledOrStatefulValues: ['query', 'trackedOrder', 'error', 'recentSearches'], preservationRule: 'Both aliases must preserve one component contract and current DataContext lookup behavior.' },
  { id: 'archive-list', owner: 'src/pages/Archive/Archive.tsx', routes: ['archive'], boundary: 'page', controlledOrStatefulValues: ['filters', 'currentPage'], preservationRule: 'Retain current filtering, pagination, row navigation, and CSV export ownership.' },
  { id: 'failed-pickup-filters', owner: 'src/pages/FailedPickups/FailedPickups.tsx', routes: ['failed-pickups'], boundary: 'page', controlledOrStatefulValues: ['filters'], preservationRule: 'Retain pickup-derived filtering and route navigation in the page.' },
  { id: 'notifications', owner: 'src/pages/Notification/Notifications.tsx', routes: ['staff-notifications', 'driver-notifications'], boundary: 'page', controlledOrStatefulValues: ['activeTab', 'selectedId', 'checkedIds', 'isSelectionMode'], preservationRule: 'Both shells share this owner; records/mutations remain in DataContext and selection stays page-local.' },
  { id: 'tasks', owner: 'src/pages/DRIVER/Tasks.tsx', routes: ['tasks'], boundary: 'page', controlledOrStatefulValues: ['viewMode', 'filters', 'currentPage', 'pageSize', 'selectedOrderIds', 'bulkDriverId', 'isBulkAssigning', 'showBulkConfirm', 'targetDriver', 'activeAssignDropdown'], preservationRule: 'Retain assignment rules, selected IDs, pagination, dropdown target, and callbacks.' },
  { id: 'dispatch', owner: 'src/pages/Dispatch/Dispatch.tsx', routes: ['dispatch'], boundary: 'page', controlledOrStatefulValues: ['selectedOrderIds', 'searchQuery', 'selectedArea'], preservationRule: 'Retain current selection/search/area state and bulk assignment callback.' },
  { id: 'activity-log-filters', owner: 'src/pages/ActivityLogs/ActivityLogs.tsx', routes: ['activity-logs'], boundary: 'page', controlledOrStatefulValues: ['searchTerm', 'dateFrom', 'dateTo', 'selectedActions', 'selectedUsers'], preservationRule: 'Retain filtering owner, role-derived visibility, and row navigation.' },
  { id: 'reports', owner: 'src/pages/Report/Reports.tsx', routes: ['reports'], boundary: 'page', controlledOrStatefulValues: ['filters', 'drilldownTitle', 'drilldownOrders', 'isDrilldownOpen'], preservationRule: 'Retain current calculations, chart inputs, report controls, drill-down, and CSV export.' },
  { id: 'analytics', owner: 'src/pages/Analytics/AnalyticsView.tsx', routes: ['analytics'], boundary: 'page', controlledOrStatefulValues: ['activeTab', 'filters', 'drilldownTitle', 'drilldownOrders', 'isDrilldownOpen'], preservationRule: 'Retain current calculations, chart projections, drill-down, and export behavior.' },
  { id: 'settings', owner: 'src/pages/Settings/Settings.tsx', routes: ['settings'], boundary: 'page', controlledOrStatefulValues: ['isSaved', 'settings', 'ThemeContext theme'], preservationRule: 'Keep app-settings persistence in the page and theme ownership in ThemeContext.' },
  { id: 'employees', owner: 'src/pages/Employees/Employees.tsx', routes: ['employees'], boundary: 'page', controlledOrStatefulValues: ['isFormOpen', 'showDeleteConfirm', 'empToDelete', 'formData', 'editingId'], preservationRule: 'Retain controlled employee CRUD state and DataContext callbacks.' },
  { id: 'role-access', owner: 'src/pages/RoleAccess/RoleAccess.tsx', routes: ['role-access'], boundary: 'page', controlledOrStatefulValues: ['permissions', 'isSaved'], preservationRule: 'Keep permission toggles and app-permissions persistence page-owned.' },
  { id: 'design-system', owner: 'src/pages/DesignSystem/DesignSystem.tsx', routes: ['design-system'], boundary: 'page', controlledOrStatefulValues: ['modalOpen', 'modalSize', 'currentPage'], preservationRule: 'Keep demonstration state isolated from production domain state.' },
  { id: 'driver-dashboard', owner: 'src/pages/DRIVER/DriverDashboard.tsx', routes: ['driver-dashboard'], boundary: 'page', controlledOrStatefulValues: ['activeTab', 'isLoading'], preservationRule: 'Retain driver-scoped filtering and page loading state.' },
  { id: 'driver-scan', owner: 'src/pages/DRIVER/QRScannerView.tsx', routes: ['driver-scan'], boundary: 'page', controlledOrStatefulValues: ['error', 'scanner callback'], preservationRule: 'Retain scanner lifecycle, current order lookup, and navigation callback.' },
  { id: 'driver-delivery-detail', owner: 'src/pages/DRIVER/DriverDeliveryDetail.tsx', routes: ['driver-delivery-detail'], boundary: 'page', controlledOrStatefulValues: ['proof/failure/confirm modal visibility', 'confirmAction', 'isUpdating', 'simulatedCoords', 'debounce timer'], preservationRule: 'Retain legal transition callbacks, GPS capture, proof/failure submission, timers, and cleanup.' },
  { id: 'driver-proof-modal', owner: 'src/pages/DRIVER/components/PODModal.tsx', routes: ['driver-delivery-detail'], boundary: 'shared-component', controlledOrStatefulValues: ['podImage', 'recipientName', 'isSubmitting'], preservationRule: 'Retain file capture, recipient field, submit callback payload, and failure state.' },
  { id: 'driver-failure-modal', owner: 'src/pages/DRIVER/components/FailureModal.tsx', routes: ['driver-delivery-detail'], boundary: 'shared-component', controlledOrStatefulValues: ['reason', 'remarks', 'isSubmitting'], preservationRule: 'Retain failure reason/remarks and submit callback payload.' },
  { id: 'driver-gps-hook', owner: 'src/hooks/useDriverGPS.ts', routes: ['driver-delivery-detail'], boundary: 'hook', controlledOrStatefulValues: ['gpsError', 'isTracking', 'lastLocationRef', 'watchIdRef'], preservationRule: 'Retain permission handling, 5-second throttle, 15-second heartbeat, status-driven start/stop, and unmount cleanup.' },
] as const satisfies readonly StateOwnerBoundary[];

export const APP_ROUTE_DECLARATION_COUNT: 32 = ROUTE_INVENTORY.length;
export const REQUIRED_VIEWPORT_COUNT: 6 = REQUIRED_VIEWPORTS.length;
export const REQUIRED_THEME_MODE_COUNT: 3 = REQUIRED_THEME_MODES.length;
export const CURRENT_PRIMITIVE_COUNT: 10 = PRIMITIVE_CALLER_INVENTORY.length;

export const QA_COVERAGE_BASELINE = {
  routeSource: 'src/App.tsx',
  routeDeclarationCount: APP_ROUTE_DECLARATION_COUNT,
  authorizationStates: AUTHORIZATION_STATES,
  routeAuthorizationCells: 192,
  visualScreenRouteCount: 28,
  viewports: REQUIRED_VIEWPORTS,
  themes: REQUIRED_THEME_MODES,
  visualViewportThemeCells: 504,
  systemModeCheck: 'For each screen route, verify initial OS resolution and a live prefers-color-scheme change while ThemeProvider remains mounted.',
  redirectCheck: 'Verify all four redirect declarations separately, including both duplicate / declarations and replace semantics.',
} as const;

type VisualBaselineReference = {
  id: string;
  cohort: string;
  currentReferences: readonly string[];
  sourceReference: string;
  captureStatus: 'code-and-style-reference' | 'asset-reference';
  remainingEvidence: string;
};

export const REPRESENTATIVE_VISUAL_BASELINES = [
  {
    id: 'staff-shell', cohort: 'staff shell/navigation/header',
    currentReferences: ['src/components/layout/DashboardLayout.tsx', 'src/components/layout/DashboardLayout.css', 'src/components/layout/Sidebar.tsx', 'src/components/layout/Sidebar.css', 'src/components/layout/Header.tsx', 'src/components/layout/Header.css'],
    sourceReference: 'Hermione-Benitez/Capstone-Frontend-Integration@a4305544058333285bfe6517b258db10e246a1c8: DashboardLayout, Sidebar, GlobalHeader',
    captureStatus: 'code-and-style-reference', remainingEvidence: 'Capture six-width light/dark baselines plus live system switching during the shell slice.',
  },
  {
    id: 'auth-public', cohort: 'login, account lock, public tracking',
    currentReferences: ['src/pages/Login/Login.tsx', 'src/pages/Login/Login.css', 'src/pages/AccountLocked/AccountLocked.tsx', 'src/pages/AccountLocked/AccountLocked.css', 'src/pages/PublicTracking/PublicTracking.tsx', 'src/pages/PublicTracking/PublicTracking.css', 'src/assets/logo.png'],
    sourceReference: 'Hermione-Benitez/Capstone-Frontend-Integration@a4305544058333285bfe6517b258db10e246a1c8: landing sections and semantic form patterns',
    captureStatus: 'asset-reference', remainingEvidence: 'Capture auth states and public tracking loading/error/result/re-delivery states without private navigation.',
  },
  {
    id: 'staff-data-routes', cohort: 'dashboard, lists, details, forms',
    currentReferences: ['src/pages/Dashboard/Dashboard.tsx', 'src/pages/Dashboard/Dashboard.css', 'src/pages/DeliveryOrders/DeliveryOrders.tsx', 'src/pages/DeliveryOrders/DeliveryOrders.css', 'src/pages/DeliveryOrders/DeliveryOrderDetail.tsx', 'src/pages/EditDelivery/EditDeliveryOrder.tsx'],
    sourceReference: 'Hermione-Benitez/Capstone-Frontend-Integration@a4305544058333285bfe6517b258db10e246a1c8: StatusCard, DataTable, SearchBar, FormModals, ConfirmModal',
    captureStatus: 'code-and-style-reference', remainingEvidence: 'Capture representative loading, populated, filtered-empty, error, modal, and validation states per route cohort.',
  },
  {
    id: 'analytics-media', cohort: 'reports, analytics, maps',
    currentReferences: ['src/pages/Report/Reports.tsx', 'src/pages/Report/Reports.css', 'src/pages/Analytics/AnalyticsView.tsx', 'src/pages/Analytics/AnalyticsView.css', 'src/components/map/LiveTrackingMap.tsx', 'src/components/map/LiveTrackingMap.css'],
    sourceReference: 'Hermione-Benitez/Capstone-Frontend-Integration@a4305544058333285bfe6517b258db10e246a1c8: card/table control patterns only; current Recharts and Leaflet remain authoritative',
    captureStatus: 'code-and-style-reference', remainingEvidence: 'Capture chart/map controls, text alternatives, and bounded overflow across all widths/themes.',
  },
  {
    id: 'driver-shell-workflows', cohort: 'driver shell, QR, GPS, proof and failure flows',
    currentReferences: ['src/components/layout/DriverLayout.tsx', 'src/components/layout/DriverLayout.css', 'src/pages/DRIVER/DriverDashboard.tsx', 'src/pages/DRIVER/QRScannerView.tsx', 'src/pages/DRIVER/DriverDeliveryDetail.tsx', 'src/pages/DRIVER/components/Modals.css'],
    sourceReference: 'Hermione-Benitez/Capstone-Frontend-Integration@a4305544058333285bfe6517b258db10e246a1c8: tokens/buttons/badges/modal styling only',
    captureStatus: 'code-and-style-reference', remainingEvidence: 'Capture bottom-navigation safe area, scanner permission, GPS state, sequential actions, POD, and failure dialog states.',
  },
  {
    id: 'current-primitives', cohort: 'existing shared UI contracts',
    currentReferences: ['src/components/ui/DataTable.tsx', 'src/components/ui/EmptyState.tsx', 'src/components/ui/EnterpriseFilters.tsx', 'src/components/ui/Modal.tsx', 'src/components/ui/ProgressStepper.tsx', 'src/components/ui/RoleBadge.tsx', 'src/components/ui/StatCard.tsx', 'src/components/ui/StatusBadge.tsx', 'src/pages/DesignSystem/DesignSystem.tsx'],
    sourceReference: 'Hermione-Benitez/Capstone-Frontend-Integration@a4305544058333285bfe6517b258db10e246a1c8: corresponding verified components',
    captureStatus: 'code-and-style-reference', remainingEvidence: 'Capture compatibility examples before changing any shared contract; keep every listed caller operational.',
  },
] as const satisfies readonly VisualBaselineReference[];

type ExistingDiagnostic = {
  id: string;
  classification: 'clean-sample' | 'compatibility-risk' | 'tooling-gap' | 'evidence-gap';
  evidence: readonly string[];
  observation: string;
  task11Disposition: 'record-only';
};

export const EXISTING_DIAGNOSTICS = [
  {
    id: 'core-ide-diagnostics-clean', classification: 'clean-sample',
    evidence: ['src/App.tsx', 'src/main.tsx', 'src/components/layout/DashboardLayout.tsx', 'src/components/layout/ProtectedRoute.tsx', 'src/context/AuthContext.tsx', 'src/context/DataContext.tsx', 'src/context/ThemeContext.tsx', 'src/api/publicTrackingApi.ts', 'src/pages/EditDelivery/EditDeliveryOrder.tsx', 'src/hooks/useDriverGPS.ts'],
    observation: 'The IDE diagnostics provider reported no diagnostics for the inspected route/provider/guard/API/form/GPS baseline files before this fixture was added.', task11Disposition: 'record-only',
  },
  {
    id: 'no-test-runner-script', classification: 'tooling-gap',
    evidence: ['package.json'],
    observation: 'No test script or approved test runner is configured. Task 2 owns approval and dependency changes; task 1.1 adds compile-checked evidence only.', task11Disposition: 'record-only',
  },
  {
    id: 'no-persisted-visual-snapshots', classification: 'evidence-gap',
    evidence: ['src/assets', 'public'],
    observation: 'No screenshot/visual-regression baseline artifacts are present; representative code, CSS, asset, and source-revision references are recorded above for later capture.', task11Disposition: 'record-only',
  },
  {
    id: 'duplicate-root-declarations', classification: 'compatibility-risk',
    evidence: ['src/App.tsx'],
    observation: 'App.tsx declares absolute path / under both staff and driver guarded shells. Both declarations and their current declaration order are inventoried and must not be consolidated in this task.', task11Disposition: 'record-only',
  },
  {
    id: 'existing-hook-suppressions', classification: 'compatibility-risk',
    evidence: ['src/pages/EditDelivery/EditDeliveryOrder.tsx', 'src/hooks/useDriverGPS.ts'],
    observation: 'Both files contain existing react-hooks/exhaustive-deps suppression comments. State/lifecycle ownership is recorded; task 1.1 does not alter those effects.', task11Disposition: 'record-only',
  },
  {
    id: 'legacy-public-tracking-test-trigger', classification: 'compatibility-risk',
    evidence: ['src/api/publicTrackingApi.ts'],
    observation: 'The current authority retains mock-prefixed exported function names and a RATE-LIMIT trigger while otherwise calling production endpoints. This is existing behavior and is not changed by inventory work.', task11Disposition: 'record-only',
  },
  {
    id: 'account-lock-fallback-profile', classification: 'compatibility-risk',
    evidence: ['src/pages/AccountLocked/AccountLocked.tsx'],
    observation: 'The account-locked page currently supplies a hardcoded fallback profile when dts_locked_user is absent. It is recorded as current behavior, not approved as migrated production data.', task11Disposition: 'record-only',
  },
  {
    id: 'production-build-baseline', classification: 'compatibility-risk',
    evidence: ['npm run build'],
    observation: 'Task 1.1 validation passed TypeScript and the Vite production build. Vite emitted the existing advisory that the main minified chunk exceeds 500 kB; task 1.1 does not change bundling.', task11Disposition: 'record-only',
  },
  {
    id: 'repository-lint-baseline', classification: 'compatibility-risk',
    evidence: ['npm run lint', 'tests/parity/apiParityOperations.ts'],
    observation: 'Repository-wide lint reported 87 existing problems (82 errors, 5 warnings), including an out-of-scope parsing error in tests/parity/apiParityOperations.ts. No problem was reported for this inventory fixture.', task11Disposition: 'record-only',
  },
] as const satisfies readonly ExistingDiagnostic[];

export const REQUIREMENT_TRACEABILITY = {
  'R1.2': ['API_WORKFLOW_OWNERS', 'PROVIDER_AND_SHELL_BASELINE', 'ROUTE_INVENTORY'],
  'R4.1': ['STATE_OWNER_INVENTORY'],
  'R11.1': ['PROVIDER_AND_SHELL_BASELINE', 'REPRESENTATIVE_VISUAL_BASELINES'],
  'R11.4': ['PRIMITIVE_CALLER_INVENTORY'],
  'R12.1': ['AUTHORIZATION_STATES', 'ACCESS_POLICIES', 'ROUTE_INVENTORY', 'QA_COVERAGE_BASELINE'],
  'R12.5': ['REQUIRED_VIEWPORTS', 'REQUIRED_THEME_MODES', 'QA_COVERAGE_BASELINE'],
  'R12.8': ['API_WORKFLOW_OWNERS', 'EXISTING_DIAGNOSTICS', 'REPRESENTATIVE_VISUAL_BASELINES', 'REQUIREMENT_TRACEABILITY'],
} as const satisfies Record<(typeof INVENTORY_REQUIREMENTS)[number], readonly string[]>;

export const FRONTEND_UI_UX_MIGRATION_INVENTORY_FIXTURE = {
  requirements: INVENTORY_REQUIREMENTS,
  routes: ROUTE_INVENTORY,
  accessPolicies: ACCESS_POLICIES,
  providersAndShells: PROVIDER_AND_SHELL_BASELINE,
  primitiveCallers: PRIMITIVE_CALLER_INVENTORY,
  stateOwners: STATE_OWNER_INVENTORY,
  workflowOwners: API_WORKFLOW_OWNERS,
  qaCoverage: QA_COVERAGE_BASELINE,
  visualBaselines: REPRESENTATIVE_VISUAL_BASELINES,
  existingDiagnostics: EXISTING_DIAGNOSTICS,
  traceability: REQUIREMENT_TRACEABILITY,
} as const;
