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

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('dts_employees_v2');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('dts_notifications');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('dts_logs');
    if (saved) return JSON.parse(saved);
    return [];
  });

  // Fetch Delivery Orders from backend when authenticated
  const refreshOrders = async () => {
    if (!isAuthenticated) return;
    try {
      const response = await apiClient.get('/api/deliveryorder');
      const mappedOrders = response.data.map((order: any) => ({
        ...order,
        id: String(order.id)
      }));
      setDeliveryOrders(mappedOrders);
    } catch (error) {
      console.error('Failed to fetch delivery orders:', error);
    }
  };

  useEffect(() => {
    refreshOrders();
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('dts_employees_v2', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('dts_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('dts_logs', JSON.stringify(activityLogs));
  }, [activityLogs]);

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
      await apiClient.post('/api/deliveryorder', order);
      await refreshOrders();
    } catch (error) {
      console.error("Error creating delivery order:", error);
      throw error;
    }
  };

  const updateDeliveryOrder = async (id: string, updated: Partial<DeliveryOrder>) => {
    try {
      await apiClient.put(`/api/deliveryorder/${id}`, updated);
      await refreshOrders();
    } catch (error) {
      console.error(`Error updating delivery order ${id}:`, error);
      throw error;
    }
  };

  const deleteDeliveryOrder = async (id: string) => {
    try {
      await apiClient.delete(`/api/deliveryorder/${id}`);
      await refreshOrders();
    } catch (error) {
      console.error(`Error deleting delivery order ${id}:`, error);
      throw error;
    }
  };

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const addActivityLog = (log: ActivityLog) => {
    setActivityLogs(prev => [log, ...prev]);
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
