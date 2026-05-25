import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/Login/Login';
import AccountLocked from './pages/AccountLocked/AccountLocked';
import Dashboard from './pages/Dashboard/Dashboard';
import DeliveryOrders from './pages/DeliveryOrders/DeliveryOrders';
import DeliveryOrderDetail from './pages/DeliveryOrders/DeliveryOrderDetail';
import EditDeliveryOrder from './pages/EditDelivery/EditDeliveryOrder';
import TrackDelivery from './pages/TrackDelivery/TrackDelivery';
import Notifications from './pages/Notification/Notifications';
import Reports from './pages/Report/Reports';
import Archive from './pages/Archive/Archive';
import ActivityLogs from './pages/ActivityLogs/ActivityLogs';
import FailedPickups from './pages/FailedPickups/FailedPickups';
import Employees from './pages/Employees/Employees';
import Settings from './pages/Settings/Settings';
import DeliverySummary from './pages/DeliverySummary/DeliverySummary';
import AnalyticsView from './pages/Analytics/AnalyticsView';
import Tasks from './pages/Tasks/Tasks';
import DeliveryHistoryLog from './pages/DeliveryOrders/DeliveryHistoryLog';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Pages (no sidebar) */}
        <Route path="/login" element={<Login />} />
        <Route path="/account-locked" element={<AccountLocked />} />

        {/* Protected Dashboard Pages (with sidebar) */}
        <Route element={<DashboardLayout />}>
          {/* General Access Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/delivery-orders" element={<DeliveryOrders />} />
            <Route path="/delivery-orders/:id" element={<DeliveryOrderDetail />} />
            <Route path="/delivery-orders/:id/history" element={<DeliveryHistoryLog />} />
            <Route path="/delivery-orders/:id/edit" element={<EditDeliveryOrder />} />
            <Route path="/track" element={<TrackDelivery />} />
            <Route path="/search-waybill" element={<TrackDelivery />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/failed-pickups" element={<FailedPickups />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/pod-records" element={<DeliveryOrders />} />
            <Route path="/activity-logs" element={<ActivityLogs />} />
          </Route>

          {/* Admin & Super Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER ADMIN']} />}>
            <Route path="/employees" element={<Employees />} />
            <Route path="/delivery-summary" element={<DeliverySummary />} />
            <Route path="/analytics" element={<AnalyticsView />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
