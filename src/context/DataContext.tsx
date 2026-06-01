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
    let ordersList = saved ? JSON.parse(saved) : [];
    
    // Seed initial orders matching DbSeeder.cs structure
    // Seed initial orders matching DbSeeder.cs structure
    const seedOrders: DeliveryOrder[] = [
      {
        id: '1',
        waybillNo: 'SPX-2026-0841',
        clientName: 'Lazada Philippines',
        clientType: 'Corporate',
        contactNumber: '0917-123-4567',
        senderAddress: 'Rockwell Dr., Brgy. Poblacion, Makati City, Metro Manila',
        recipientName: 'Dela Cruz, Maria',
        recipientContact: '0932-987-6543',
        recipientAddress: '142 Roces Ave., Brgy. Paligsahan, Quezon City',
        area: 'Quezon City',
        landmark: 'Near Sct. Alcaraz St.',
        driverName: 'Test Driver',
        driverInitials: 'TD',
        driverColor: '#00A99D',
        status: 'In Transit',
        taskType: 'Delivery',
        potStatus: 'Not Submitted',
        podStatus: 'Not Submitted',
        packageType: 'Parcel',
        packageDescription: 'Electronics — Shopee order #LZD-88201',
        itemCount: 2,
        weight: '1.2 kg',
        declaredValue: '₱ 2,500.00',
        specialInstructions: 'Fragile, handle with care',
        route: 'Quezon City',
        orderDate: '3/29/2026',
        expectedDelivery: '3/31/2026',
        encodedBy: 'Kenneth D. Yulip',
        dateEncoded: '3/29/2026, 8:05:00 AM',
        lastUpdated: '3/29/2026, 9:41:00 AM',
        updatedBy: 'Test Driver',
        recipientCoordinates: { lat: 14.6360, lng: 121.0336 },
        liveCoordinates: { lat: 14.6200, lng: 121.0180, lastUpdated: new Date().toLocaleString() }
      },
      {
        id: '2',
        waybillNo: 'SPX-2026-0845',
        clientName: 'Lazada Philippines',
        clientType: 'Corporate',
        contactNumber: '0917-123-4567',
        senderAddress: 'Rockwell Dr., Brgy. Poblacion, Makati City',
        recipientName: 'Ocampo, Cecilia',
        recipientContact: '0918-555-1234',
        recipientAddress: 'Brgy. Sta. Mesa Heights, QC',
        area: 'Caloocan City',
        driverName: 'Test Driver',
        driverInitials: 'TD',
        driverColor: '#00A99D',
        status: 'Pending',
        taskType: 'Delivery',
        potStatus: 'Not Submitted',
        podStatus: 'Not Submitted',
        packageType: 'Parcel',
        packageDescription: 'Fashion accessories',
        itemCount: 1,
        weight: '0.5 kg',
        declaredValue: '₱ 890.00',
        route: 'Caloocan City',
        orderDate: '3/29/2026',
        expectedDelivery: '3/30/2026',
        encodedBy: 'Kenneth D. Yulip',
        dateEncoded: '3/29/2026, 8:10:00 AM',
        lastUpdated: '3/29/2026, 8:10:00 AM',
        updatedBy: 'Kenneth D. Yulip',
        recipientCoordinates: { lat: 14.6288, lng: 121.0028 }
      },
      {
        id: '3',
        waybillNo: 'SPX-2026-0812',
        clientName: 'Shopee Express',
        clientType: 'Corporate',
        contactNumber: '0917-555-9876',
        senderAddress: 'Ayala Ave., Makati City',
        recipientName: 'Santos, Jose',
        recipientContact: '0920-111-2222',
        recipientAddress: 'Ayala Ave., Makati',
        area: 'Makati City',
        driverName: 'Test Driver',
        driverInitials: 'TD',
        driverColor: '#00A99D',
        status: 'Delivered',
        taskType: 'Delivery',
        potStatus: 'Submitted',
        podStatus: 'Submitted',
        packageType: 'Parcel',
        packageDescription: 'Home appliance',
        itemCount: 1,
        weight: '3.2 kg',
        declaredValue: '₱ 4,500.00',
        route: 'Makati City',
        orderDate: '3/28/2026',
        expectedDelivery: '3/29/2026',
        dateCompleted: '3/28/2026, 2:14:00 PM',
        encodedBy: 'Kenneth D. Yulip',
        dateEncoded: '3/28/2026, 7:00:00 AM',
        lastUpdated: '3/28/2026, 2:14:00 PM',
        updatedBy: 'Test Driver',
        recipientCoordinates: { lat: 14.5547, lng: 121.0244 },
        liveCoordinates: { lat: 14.5547, lng: 121.0244, lastUpdated: '3/28/2026, 2:14:00 PM' },
        podImage: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=400'
      },
      {
        id: '4',
        waybillNo: 'SPX-2026-0801',
        clientName: 'Shopee Express',
        clientType: 'Corporate',
        contactNumber: '0917-555-9876',
        senderAddress: 'Marikina City',
        recipientName: 'Torres, Miguel',
        recipientContact: '0924-666-7777',
        recipientAddress: 'Marikina City',
        area: 'Marikina City',
        driverName: 'Test Driver',
        driverInitials: 'TD',
        driverColor: '#00A99D',
        status: 'Pending',
        taskType: 'Pickup',
        potStatus: 'Not Submitted',
        podStatus: 'Not Submitted',
        packageType: 'Parcel',
        packageDescription: 'Mixed items',
        itemCount: 4,
        weight: '2.5 kg',
        declaredValue: '₱ 1,500.00',
        route: 'Marikina City',
        orderDate: '3/26/2026',
        expectedDelivery: '3/28/2026',
        encodedBy: 'Kenneth D. Yulip',
        dateEncoded: '3/26/2026, 10:00:00 AM',
        lastUpdated: '3/26/2026, 10:00:00 AM',
        updatedBy: 'Kenneth D. Yulip',
        recipientCoordinates: { lat: 14.6299, lng: 121.1001 }
      }
    ];

    // Force seed if waybill SPX-2026-0841 is not present
    const hasSeed = ordersList.some((o: any) => o.waybillNo === 'SPX-2026-0841');
    if (!hasSeed) {
      ordersList = [...seedOrders];
      localStorage.setItem('dts_orders', JSON.stringify(ordersList));
    }
    return ordersList;
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('dts_notifications');
    if (saved) return JSON.parse(saved);

    const seedNotifications: Notification[] = [
      {
        id: 'n-1',
        type: 'alert',
        title: 'Failed Pickup Alert',
        waybillNo: 'SPX-2026-0801',
        description: 'Package not picked up for 3 days. Marikina City. Immediate action required.',
        timestamp: '10:15 AM',
        date: '3/29/2026',
        source: 'Automated Alert',
        read: false,
        statusBadge: 'Urgent'
      },
      {
        id: 'n-2',
        type: 'success',
        title: 'POD Submitted',
        waybillNo: 'SPX-2026-0845',
        description: 'Test Driver submitted proof of delivery. Delivery auto-marked as Completed.',
        timestamp: '10:12 AM',
        date: '3/29/2026',
        source: 'Test Driver',
        read: false,
        statusBadge: 'Success'
      },
      {
        id: 'n-3',
        type: 'info',
        title: 'Status Updated',
        waybillNo: 'SPX-2026-0841',
        description: 'Delivery status changed from Pending → In Transit by Test Driver.',
        timestamp: '10:11 AM',
        date: '3/29/2026',
        source: 'Test Driver',
        read: false,
        statusBadge: 'In Transit'
      }
    ];

    localStorage.setItem('dts_notifications', JSON.stringify(seedNotifications));
    return seedNotifications;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('dts_logs');
    if (saved) return JSON.parse(saved);

    const seedLogs: ActivityLog[] = [
      {
        id: 'log-1',
        timestamp: '3/29/2026, 10:22:00 AM',
        userName: 'Test Driver',
        userRole: 'DRIVER',
        userInitials: 'TD',
        userColor: '#00A99D',
        action: 'Update',
        description: 'started transit for SPX-2026-0841',
        reference: 'SPX-2026-0841'
      }
    ];

    localStorage.setItem('dts_logs', JSON.stringify(seedLogs));
    return seedLogs;
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

  // Synchronization hook for multi-tab operations
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'dts_orders' && event.newValue) {
        setDeliveryOrders(JSON.parse(event.newValue));
      }
      if (event.key === 'dts_employees_v2' && event.newValue) {
        setEmployees(JSON.parse(event.newValue));
      }
      if (event.key === 'dts_notifications' && event.newValue) {
        setNotifications(JSON.parse(event.newValue));
      }
      if (event.key === 'dts_logs' && event.newValue) {
        setActivityLogs(JSON.parse(event.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
