import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Employee, DeliveryOrder, Notification, ActivityLog } from '../types';
import { apiClient } from '../api/axios';
import { useAuth } from './AuthContext';

interface DataContextType {
  employees: Employee[];
  deliveryOrders: DeliveryOrder[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  addEmployee: (employee: Employee) => Promise<void>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  addDeliveryOrder: (order: Omit<DeliveryOrder, 'id'>) => Promise<void>;
  updateDeliveryOrder: (id: string, order: Partial<DeliveryOrder>) => Promise<void>;
  bulkAssignDriver: (orderIds: string[], driverId: number) => Promise<void>;
  deleteDeliveryOrder: (id: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => Promise<boolean>;
  markAllNotificationsRead: () => Promise<boolean>;
  deleteNotification: (id: string) => Promise<boolean>;
  clearAllNotifications: () => Promise<boolean>;
  addActivityLog: (log: Pick<ActivityLog, 'action' | 'description' | 'reference'>) => Promise<void>;
  refreshOrders: () => Promise<void>;
}



const DataContext = createContext<DataContextType | undefined>(undefined);

async function geocodeAddress(address: string, city: string = ''): Promise<{ lat: number; lng: number } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const query = encodeURIComponent(`${address}${city ? ', ' + city : ''}, Philippines`);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SpeedexCourierCapstoneApp/1.0'
      }
    });
    const data = await response.json();
    clearTimeout(timeoutId);
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      console.log(`Geocoded address "${address}, ${city}" to: ${lat}, ${lng}`);
      return { lat, lng };
    }
  } catch (e: any) {
    clearTimeout(timeoutId);
    console.warn("Nominatim geocoding failed/timed out, falling back to mock city center:", e.message || e);
  }
  return null;
}

const parseDate = (dateStr: string | null | undefined): number => {
  if (!dateStr) return 0;
  const t = Date.parse(dateStr);
  return isNaN(t) ? 0 : t;
};

const sortOrdersDescending = (orders: DeliveryOrder[]): DeliveryOrder[] => {
  return [...orders].sort((a, b) => {
    const diff = parseDate(b.dateEncoded) - parseDate(a.dateEncoded);
    if (diff !== 0) return diff;
    return Number(b.id) - Number(a.id);
  });
};

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
      // Run all 4 fetches in parallel to minimize UI loading delays
      const [ordersResult, empResult, notifResult, logsResult] = await Promise.allSettled([
        apiClient.get('/api/deliveryorder'),
        apiClient.get('/api/employees'),
        apiClient.get('/api/notifications'),
        apiClient.get('/api/activity-logs')
      ]);

      if (ordersResult.status === 'fulfilled') {
        const response = ordersResult.value;
        const mappedOrders = response.data.map((order: any) => {
          const dName = order.driver?.name || '';
          const dInitials = order.driver?.initials || (dName ? dName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '');
          const dColor = order.driver?.color || '#6B7280';
          
          const recipientCoordinates = order.recipientLatitude && order.recipientLongitude ? {
            lat: order.recipientLatitude,
            lng: order.recipientLongitude
          } : undefined;
          
          const liveCoordinates = order.liveLatitude && order.liveLongitude ? {
            lat: order.liveLatitude,
            lng: order.liveLongitude,
            lastUpdated: order.lastLiveUpdate || order.lastUpdated
          } : undefined;

          return {
            ...order,
            id: String(order.id),
            driverName: dName,
            driverInitials: dInitials,
            driverColor: dColor,
            recipientCoordinates,
            liveCoordinates
          };
        });
        setDeliveryOrders(sortOrdersDescending(mappedOrders));
      } else {
        console.error('Failed to fetch delivery orders:', ordersResult.reason);
      }

      if (empResult.status === 'fulfilled') {
        setEmployees(empResult.value.data.map((e: any) => ({ ...e, id: String(e.id) })));
      } else {
        console.error('Failed to fetch employees:', empResult.reason);
      }

      if (notifResult.status === 'fulfilled') {
        setNotifications(notifResult.value.data.map((n: any) => ({ ...n, id: String(n.id) })));
      } else {
        console.error('Failed to fetch notifications:', notifResult.reason);
      }

      if (logsResult.status === 'fulfilled') {
        setActivityLogs(logsResult.value.data.map((l: any) => ({ ...l, id: String(l.id) })));
      } else {
        console.error('Failed to fetch activity logs:', logsResult.reason);
      }
    } catch (error) {
      console.error('Unexpected error during data refresh:', error);
    }
  };

  useEffect(() => {
    refreshOrders();
    if (isAuthenticated) {
      const interval = setInterval(() => {
        refreshOrders().catch(err => console.warn('Background auto-refresh failed:', err));
      }, 10000); // Poll every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const addEmployee = async (employee: Employee) => {
    try {
      await apiClient.post('/api/employees', employee);
      await addActivityLog({
        action: 'Create',
        description: `Created new employee: ${employee.name} (${employee.employeeId})`
      });
      await refreshOrders();
    } catch (error: any) {
      console.error("API error adding employee:", error);
      alert(error.response?.data?.message || "Failed to add employee.");
      throw error;
    }
  };

  const updateEmployee = async (id: string, updated: Partial<Employee>) => {
    try {
      await apiClient.put(`/api/employees/${id}`, updated);
      const emp = employees.find(e => e.id === id);
      await addActivityLog({
        action: 'Update',
        description: `Updated employee: ${emp?.name || id}`
      });
      await refreshOrders();
    } catch (error: any) {
      console.error("API error updating employee:", error);
      alert(error.response?.data?.message || "Failed to update employee.");
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      const emp = employees.find(e => e.id === id);
      await apiClient.delete(`/api/employees/${id}`);
      await addActivityLog({
        action: 'Delete',
        description: `Deleted employee: ${emp?.name || id}`
      });
      await refreshOrders();
    } catch (error: any) {
      console.error("API error deleting employee:", error);
      alert(error.response?.data?.message || "Failed to delete employee.");
      throw error;
    }
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

      // Use the created order returned by the API to update state immediately —
      // avoids depending on a potentially slow GET /api/deliveryorder refresh.
      const response = await apiClient.post('/api/deliveryorder', payload);
      const created = response.data;
      if (created) {
        const dName = created.driver?.name || '';
        const dInitials = created.driver?.initials || (dName ? dName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '');
        const dColor = created.driver?.color || '#6B7280';
        const mappedOrder: DeliveryOrder = {
          ...created,
          id: String(created.id),
          driverName: dName,
          driverInitials: dInitials,
          driverColor: dColor,
          recipientCoordinates: created.recipientLatitude && created.recipientLongitude
            ? { lat: created.recipientLatitude, lng: created.recipientLongitude }
            : undefined,
        };
        setDeliveryOrders(prev => sortOrdersDescending([...prev, mappedOrder]));
        
        await addActivityLog({
          action: 'Create',
          description: `Created new delivery order: ${mappedOrder.waybillNo}`,
          reference: mappedOrder.waybillNo
        });
      }

      // Background refresh to sync any other changes (non-blocking)
      refreshOrders().catch(e => console.warn('Background refresh failed after create:', e));
    } catch (error: any) {
      console.error("API error creating delivery order:", error);
      let errorMessage = "Failed to create order. Please check all required fields.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data) {
        const data = error.response.data;
        const errorsObj = data.errors || (typeof data === 'object' ? data : null);
        if (errorsObj && typeof errorsObj === 'object') {
          const valuesToInspect = data.errors 
            ? Object.values(errorsObj) 
            : Object.entries(errorsObj)
                .filter(([key]) => !['type', 'title', 'status', 'traceId'].includes(key))
                .map(([_, val]) => val);

          const firstErrors = valuesToInspect
            .flat()
            .filter((v): v is string => typeof v === 'string');
          if (firstErrors.length > 0) {
            errorMessage = firstErrors[0];
          }
        }
      }
      alert(errorMessage);
      throw error;
    }
  };

  const updateDeliveryOrder = async (id: string, updated: Partial<DeliveryOrder>) => {
    try {
      const userProfile = localStorage.getItem('dts_user_profile');
      const profile = userProfile ? JSON.parse(userProfile) : null;
      const userName = profile ? profile.name : 'System';
      const userRole = profile ? profile.role : '';

      let responseData: any = null;

      if (userRole === 'DRIVER') {
        const patchPayload: any = {};
        if (updated.status) patchPayload.status = updated.status;
        if (updated.failureRemarks || updated.redeliveryRemarks) {
          patchPayload.notes = updated.failureRemarks || updated.redeliveryRemarks;
        }
        if (updated.recipientName) patchPayload.recipientName = updated.recipientName;
        if (updated.podImage) patchPayload.podImage = updated.podImage;

        if (updated.liveCoordinates) {
          patchPayload.latitude = updated.liveCoordinates.lat;
          patchPayload.longitude = updated.liveCoordinates.lng;
        } else if (updated.gpsCoordinates) {
          patchPayload.latitude = updated.gpsCoordinates.lat;
          patchPayload.longitude = updated.gpsCoordinates.lng;
        }

        const res = await apiClient.patch(`/api/deliveryorder/${id}/status`, patchPayload);
        responseData = res.data;
      } else {
        const existingOrder = deliveryOrders.find(o => o.id === id);

        let newCoords = updated.recipientCoordinates;
        const area = updated.area || existingOrder?.area;
        if (updated.recipientAddress) {
          const coords = await geocodeAddress(updated.recipientAddress, area || '');
          if (coords) newCoords = coords;
        }

        const payload = {
          ...existingOrder,
          ...updated,
          id: Number(id),
          recipientCoordinates: newCoords || existingOrder?.recipientCoordinates,
          updatedBy: userName
        };

        // Clean up virtual frontend-only fields
        delete (payload as any).driverName;
        delete (payload as any).driverInitials;
        delete (payload as any).driverColor;
        delete (payload as any).liveCoordinates;

        const res = await apiClient.put(`/api/deliveryorder/${id}`, payload);
        responseData = res.data;
      }

      // Update local state immediately from the API response
      if (responseData) {
        const dName = responseData.driver?.name || '';
        const dInitials = responseData.driver?.initials || (dName ? dName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : '');
        const dColor = responseData.driver?.color || '#6B7280';
        const mappedOrder: DeliveryOrder = {
          ...responseData,
          id: String(responseData.id),
          driverName: dName,
          driverInitials: dInitials,
          driverColor: dColor,
          recipientCoordinates: responseData.recipientLatitude && responseData.recipientLongitude
            ? { lat: responseData.recipientLatitude, lng: responseData.recipientLongitude }
            : undefined,
          liveCoordinates: responseData.liveLatitude && responseData.liveLongitude
            ? { lat: responseData.liveLatitude, lng: responseData.liveLongitude, lastUpdated: responseData.lastLiveUpdate || responseData.lastUpdated }
            : undefined,
        };
        setDeliveryOrders(prev => sortOrdersDescending(prev.map(o => o.id === id ? mappedOrder : o)));
        
        await addActivityLog({
          action: (updated.podImage || updated.potImage) ? 'POD Upload' : 'Update',
          description: `Updated delivery order: ${mappedOrder.waybillNo} (Status: ${mappedOrder.status})`,
          reference: mappedOrder.waybillNo
        });
      }

      // Background refresh (non-blocking)
      refreshOrders().catch(e => console.warn('Background refresh failed after update:', e));
    } catch (error: any) {
      console.error(`API error updating delivery order ${id}:`, error);
      let errorMessage = "Failed to update order. Make sure you follow sequential workflow transitions.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data) {
        const data = error.response.data;
        const errorsObj = data.errors || (typeof data === 'object' ? data : null);
        if (errorsObj && typeof errorsObj === 'object') {
          const valuesToInspect = data.errors 
            ? Object.values(errorsObj) 
            : Object.entries(errorsObj)
                .filter(([key]) => !['type', 'title', 'status', 'traceId'].includes(key))
                .map(([_, val]) => val);

          const firstErrors = valuesToInspect
            .flat()
            .filter((v): v is string => typeof v === 'string');
          if (firstErrors.length > 0) {
            errorMessage = firstErrors[0];
          }
        }
      }
      alert(errorMessage);
      throw error;
    }
  };

  const bulkAssignDriver = async (orderIds: string[], driverId: number) => {
    try {
      await apiClient.patch('/api/deliveryorder/bulk-assign-driver', {
        orderIds: orderIds.map(Number),
        driverId
      });
      
      const drv = employees.find(e => e.id === String(driverId));
      await addActivityLog({
        action: 'Assign',
        description: `Bulk assigned ${orderIds.length} orders to driver: ${drv?.name || driverId}`
      });

      // Background refresh (non-blocking)
      refreshOrders().catch(e => console.warn('Background refresh failed after bulk assign:', e));
    } catch (error: any) {
      console.error("API error bulk assigning driver:", error);
      alert(error.response?.data?.message || "Failed to bulk assign driver.");
      throw error;
    }
  };

  const deleteDeliveryOrder = async (id: string) => {
    try {
      const order = deliveryOrders.find(o => o.id === id);
      await apiClient.delete(`/api/deliveryorder/${id}`);
      
      await addActivityLog({
        action: 'Delete',
        description: `Deleted/Cancelled delivery order: ${order?.waybillNo || id}`,
        reference: order?.waybillNo
      });

      // Remove from local state immediately
      setDeliveryOrders(prev => prev.filter(o => o.id !== id));
      // Background refresh (non-blocking)
      refreshOrders().catch(e => console.warn('Background refresh failed after delete:', e));
    } catch (error: any) {
      console.error(`API error deleting delivery order ${id}:`, error);
      alert(error.response?.data?.message || "Failed to delete/cancel order.");
      throw error;
    }
  };

  const addNotification = async (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const markNotificationRead = async (id: string): Promise<boolean> => {
    try {
      await apiClient.patch(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      return true;
    } catch (e) {
      console.error("Failed to mark notification as read", e);
      return false;
    }
  };

  const markAllNotificationsRead = async (): Promise<boolean> => {
    try {
      await apiClient.patch('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      return true;
    } catch (e) {
      console.error("Failed to mark all notifications as read", e);
      return false;
    }
  };

  const deleteNotification = async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      return true;
    } catch (e) {
      console.error("Failed to delete notification", e);
      return false;
    }
  };

  const clearAllNotifications = async (): Promise<boolean> => {
    try {
      await apiClient.delete('/api/notifications');
      setNotifications([]);
      return true;
    } catch (e) {
      console.error("Failed to clear notifications", e);
      return false;
    }
  };

  const addActivityLog = async (log: Pick<ActivityLog, 'action' | 'description' | 'reference'>) => {
    try {
      await apiClient.post('/api/activity-logs', log);
      // Optional: Update local state without full refresh if performance is an issue
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
      bulkAssignDriver,
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
