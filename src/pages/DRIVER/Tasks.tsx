import Header from '../../components/layout/Header';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/ui/StatusBadge';
import { Plus, ClipboardList } from 'lucide-react';
import EmptyState from '../../components/ui/EmptyState';
import type { DeliveryOrder } from '../../types';
import './Tasks.css';

interface ColumnProps {
  title: string;
  orders: DeliveryOrder[];
  onNavigate: (id: string) => void;
}

const Column = ({ title, orders, onNavigate }: ColumnProps) => (
  <div className="task-column" style={{ flex: 1, background: 'var(--bg-card)', borderRadius: '12px', padding: '16px', minHeight: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
    <h4 style={{ marginBottom: '16px', borderBottom: '1px solid #E9EDF7', paddingBottom: '8px' }}>{title} <span style={{ color: 'var(--text-muted)' }}>({orders.length})</span></h4>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks"
          description={`There are no tasks in ${title}.`}
        />
      ) : (
        orders.map(o => (
          <div key={o.id} className="task-card" onClick={() => onNavigate(`/delivery-orders/${o.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>{o.waybillNo}</strong>
            </div>
            <div style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-main)' }}>{(o.recipientAddress || '').substring(0, 35)}...</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {o.driverInitials && <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: o.driverColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>{o.driverInitials}</div>}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{o.driverName ? o.driverName.split(',')[0] : 'Unassigned'}</span>
              </div>
              <StatusBadge status={o.status} size="sm" />
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

export default function Tasks() {
  const { deliveryOrders } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const isDriver = user?.role === 'DRIVER';

  const isOpTeam = user?.role === 'OP. TEAM';

  const visibleOrders = isDriver 
    ? deliveryOrders.filter(o => (o.driverName === user?.name || !o.driverName) && o.taskType !== 'Pickup')
    : isOpTeam
    ? deliveryOrders.filter(o => o.encodedBy === user?.name || o.updatedBy === user?.name)
    : deliveryOrders;
  
  const pending = visibleOrders.filter(o => o.status === 'Pending' && o.taskType !== 'Pickup');
  const inTransit = visibleOrders.filter(o => o.status === 'In Transit' && o.taskType !== 'Pickup');
  const failed = visibleOrders.filter(o => (o.status === 'Failed' || o.status === 'Returned') && o.taskType !== 'Pickup');
  const completed = visibleOrders.filter(o => (o.status === 'Delivered' || o.status === 'Completed') && o.taskType !== 'Pickup');
  const pickups = visibleOrders.filter(o => o.taskType === 'Pickup');

  return (
    <>
      <Header 
        title="Tasks Board" 
        subtitle={isDriver ? "My Tasks" : "Operations"}
        actions={
          !isDriver && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/delivery-orders/new/edit')}>
              <Plus size={16} /> Add Task
            </button>
          )
        }
      />
      <div className="page-content">
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
          {isDriver ? "Manage and monitor your assigned delivery tasks." : "Manage and monitor delivery tasks across different stages."}
        </p>
        <div className="tasks-board-container" style={{ overflowX: 'auto', paddingBottom: '16px' }}>
          {!isDriver && <Column title="Pickups" orders={pickups} onNavigate={navigate} />}
          <Column title="Pending Dispatch" orders={pending} onNavigate={navigate} />
          <Column title="In Transit" orders={inTransit} onNavigate={navigate} />
          <Column title="Failed / Returned" orders={failed} onNavigate={navigate} />
          <Column title="Delivered / Completed" orders={completed} onNavigate={navigate} />
        </div>
      </div>
    </>
  );
}
