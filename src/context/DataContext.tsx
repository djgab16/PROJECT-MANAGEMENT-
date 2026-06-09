import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Employee, DeliveryOrder, Notification, ActivityLog } from '../types';
import { apiClient } from '../api/axios';
import { useAuth } from './AuthContext';

interface DataContextType {
  employees: Employee[];
  deliveryOrders: DeliveryOrder[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  addDeliveryOrder: (order: Omit<DeliveryOrder, 'id'>) => Promise<void>;
  updateDeliveryOrder: (id: string, order: Partial<DeliveryOrder>) => Promise<void>;
  deleteDeliveryOrder: (id: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  addActivityLog: (log: ActivityLog) => void;
  refreshOrders: () => Promise<void>;
}



const DataContext = createContext<DataContextType | undefined>(undefined);

async function geocodeAddress(address: string, city: string = ''): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = encodeURIComponent(`${address}${city ? ', ' + city : ''}, Philippines`);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
      headers: {
        'User-Agent': 'SpeedexCourierCapstoneApp/1.0'
      }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      console.log(`Geocoded address "${address}, ${city}" to: ${lat}, ${lng}`);
      return { lat, lng };
    }
  } catch (e) {
    console.warn("Nominatim geocoding failed, falling back to mock city center:", e);
  }
  return null;
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Fetch Delivery Orders from backend when authenticated
  const refreshOrders = async () => {
    if (!isAuthenticated) return;

    try {
      // 1. Fetch Orders
      const response = await apiClient.get('/api/deliveryorder');
      const mappedOrders = response.data.map((order: any) => {
        const dName = order.driver?.name || '';
        const dInitials = order.driver?.initials || (dName ? dName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '');
        const dColor = order.driver?.color || '#6B7280';
        return {
          ...order,
          id: String(order.id),
          driverName: dName,
          driverInitials: dInitials,
          driverColor: dColor
        };
      });
      setDeliveryOrders(mappedOrders);

      // 2. Fetch Employees
      const empRes = await apiClient.get('/api/employees');
      setEmployees(empRes.data.map((e: any) => ({ ...e, id: String(e.id) })));

      // 3. Fetch Notifications
      const notifRes = await apiClient.get('/api/notifications');
      setNotifications(notifRes.data.map((n: any) => ({ ...n, id: String(n.id) })));

      // 4. Fetch Activity Logs
      const logsRes = await apiClient.get('/api/activity-logs');
      setActivityLogs(logsRes.data.map((l: any) => ({ ...l, id: String(l.id) })));
    } catch (error) {
      console.error('Failed to fetch data from API:', error);
    }
  };

  useEffect(() => {
    refreshOrders();
  }, [isAuthenticated]);

  const addEmployee = (employee: Employee) => {
    setEmployees(prev => [...prev, employee]);
  };

  const updateEmployee = (id: string, updated: Partial<Employee>) => {
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, ...updated } : emp));
  };

  const deleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
  };

  const addDeliveryOrder = async (order: Omit<DeliveryOrder, 'id'>) => {
    try {
      let geocoded = await geocodeAddress(order.recipientAddress, order.area);
      let lat = geocoded ? geocoded.lat : 14.6360;
      let lng = geocoded ? geocoded.lng : 121.0336;

      if (!geocoded) {
        const area = (order.area || '').toLowerCase();
        if (area.includes('manila')) {
          lat = 14.5995; lng = 120.9842;
        } else if (area.includes('makati')) {
          lat = 14.5547; lng = 121.0244;
        } else if (area.includes('marikina')) {
          lat = 14.6299; lng = 121.1001;
        } else if (area.includes('caloocan')) {
          lat = 14.6288; lng = 121.0028;
        }
      }

      const payload = {
        ...order,
        recipientCoordinates: { lat, lng }
      };

      await apiClient.post('/api/deliveryorder', payload);
      await refreshOrders();
    } catch (error: any) {
      console.error("API error creating delivery order:", error);
      alert(error.response?.data?.message || "Failed to create order. Please check workflow logic.");
      throw error;
    }
  };

  const updateDeliveryOrder = async (id: string, updated: Partial<DeliveryOrder>) => {
    try {
      const userProfile = localStorage.getItem('dts_user_profile');
      const userName = userProfile ? JSON.parse(userProfile).name : 'System';

      let newCoords = updated.recipientCoordinates;
      if (updated.recipientAddress) {
        const coords = await geocodeAddress(updated.recipientAddress, updated.area || '');
        if (coords) {
          newCoords = coords;
        }
      }

      const payload = {
        ...updated,
        recipientCoordinates: newCoords,
        updatedBy: userName
      };

      await apiClient.put(`/api/deliveryorder/${id}`, payload);
      await refreshOrders();
    } catch (error: any) {
      console.error(`API error updating delivery order ${id}:`, error);
      alert(error.response?.data?.message || "Failed to update order. Make sure you follow sequential workflow transitions.");
      throw error;
    }
  };

  const deleteDeliveryOrder = async (id: string) => {
    try {
      await apiClient.delete(`/api/deliveryorder/${id}`);
      await refreshOrders();
    } catch (error: any) {
      console.error(`API error deleting delivery order ${id}:`, error);
      alert(error.response?.data?.message || "Failed to delete/cancel order.");
      throw error;
    }
  };

  const addNotification = async (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const markNotificationRead = async (id: string) => {
    try {
      await apiClient.patch(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await apiClient.patch('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error("Failed to mark all notifications as read", e);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await apiClient.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error("Failed to delete notification", e);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await apiClient.delete('/api/notifications');
      setNotifications([]);
    } catch (e) {
      console.error("Failed to clear notifications", e);
    }
  };

  const addActivityLog = async (log: ActivityLog) => {
    try {
      await apiClient.post('/api/activity-logs', log);
      const logsRes = await apiClient.get('/api/activity-logs');
      setActivityLogs(logsRes.data.map((l: any) => ({ ...l, id: String(l.id) })));
    } catch (e) {
      console.error("Failed to post activity log", e);
    }
  };

  return (
    <DataContext.Provider value={{
      employees,
      deliveryOrders,
      notifications,
      activityLogs,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      addDeliveryOrder,
      updateDeliveryOrder,
      deleteDeliveryOrder,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      clearAllNotifications,
      addActivityLog,
      refreshOrders
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
