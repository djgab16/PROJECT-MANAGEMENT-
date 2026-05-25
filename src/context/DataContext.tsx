import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Employee, DeliveryOrder, Notification, ActivityLog } from '../types';

interface DataContextType {
  employees: Employee[];
  deliveryOrders: DeliveryOrder[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  addDeliveryOrder: (order: DeliveryOrder) => void;
  updateDeliveryOrder: (id: string, order: Partial<DeliveryOrder>) => void;
  deleteDeliveryOrder: (id: string) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  addActivityLog: (log: ActivityLog) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('dts_employees_v2');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'EMP-001',
        name: 'System Admin',
        role: 'ADMIN',
        systemAccess: 'All Systems',
        status: 'Active',
        initials: 'AD',
        color: '#FFB547'
      },
      {
        id: 'EMP-002',
        name: 'Operations Team',
        role: 'OP. TEAM',
        systemAccess: 'Operations',
        status: 'Active',
        initials: 'OT',
        color: '#01B574'
      },
      {
        id: 'EMP-003',
        name: 'Test Driver',
        role: 'DRIVER',
        systemAccess: 'Delivery Tracker',
        status: 'Active',
        initials: 'TD',
        color: '#00A99D'
      }
    ];
  });

  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>(() => {
    const saved = localStorage.getItem('dts_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('dts_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('dts_logs');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('dts_employees_v2', JSON.stringify(employees));
    } catch (e) {
      console.error('Failed to save employees to local storage', e);
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem('dts_orders', JSON.stringify(deliveryOrders));
    } catch (e) {
      console.error('Failed to save orders to local storage', e);
      alert("Storage limit reached! Your device's local storage is full. Please clear your browser data or use smaller images for Proof of Transaction.");
    }
  }, [deliveryOrders]);

  useEffect(() => {
    try {
      localStorage.setItem('dts_notifications', JSON.stringify(notifications));
    } catch (e) {
      console.error('Failed to save notifications to local storage', e);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('dts_logs', JSON.stringify(activityLogs));
    } catch (e) {
      console.error('Failed to save logs to local storage', e);
    }
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

  const addDeliveryOrder = (order: DeliveryOrder) => {
    setDeliveryOrders(prev => [...prev, order]);
  };

  const updateDeliveryOrder = (id: string, updated: Partial<DeliveryOrder>) => {
    setDeliveryOrders(prev => prev.map(order => order.id === id ? { ...order, ...updated } : order));
  };

  const deleteDeliveryOrder = (id: string) => {
    setDeliveryOrders(prev => prev.filter(order => order.id !== id));
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
      addActivityLog
    }}>
      {children}
    </DataContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
