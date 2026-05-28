import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import DriverLayout from './components/layout/DriverLayout';
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
import Settings from './pages/Settings/Settings';
import DeliverySummary from './pages/DeliverySummary/DeliverySummary';
import AnalyticsView from './pages/Analytics/AnalyticsView';
import Tasks from './pages/DRIVER/Tasks';
import DeliveryHistoryLog from './pages/DeliveryOrders/DeliveryHistoryLog';
import DriverDashboard from './pages/DRIVER/DriverDashboard';
import QRScannerView from './pages/DRIVER/QRScannerView';
import DriverDeliveryDetail from './pages/DRIVER/DriverDeliveryDetail';
import DriverSettings from './pages/DRIVER/DriverSettings';
import PublicTracking from './pages/PublicTracking/PublicTracking';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

const RootRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'DRIVER') return <Navigate to="/driver/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
        {/* Auth Pages (no sidebar) */}
        <Route path="/login" element={<Login />} />
        <Route path="/account-locked" element={<AccountLocked />} />
        
        {/* Public Tracking Portal */}
        <Route path="/tracking" element={<PublicTracking />} />

        {/* Protected Dashboard Pages (with sidebar) */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'OP. TEAM']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<RootRedirect />} />
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
            <Route path="/POT-records" element={<DeliveryOrders />} />
            <Route path="/activity-logs" element={<ActivityLogs />} />
            
            {/* Admin Only Routes */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/reports" element={<Reports />} />
              <Route path="/delivery-summary" element={<DeliverySummary />} />
              <Route path="/analytics" element={<AnalyticsView />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Route>

        {/* Driver Routes (Mobile Optimized, no sidebar) */}
        <Route element={<ProtectedRoute allowedRoles={['DRIVER']} />}>
          <Route element={<DriverLayout />}>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/driver/dashboard" element={<DriverDashboard />} />
            <Route path="/driver/scan" element={<QRScannerView />} />
            <Route path="/driver/delivery/:id" element={<DriverDeliveryDetail />} />
            <Route path="/driver/settings" element={<DriverSettings />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}
