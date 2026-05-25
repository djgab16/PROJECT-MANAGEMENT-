import Header from '../../components/layout/Header';
import { useData } from '../../context/DataContext';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/ui/StatusBadge';
import { Plus } from 'lucide-react';
import type { DeliveryOrder } from '../../types';

interface ColumnProps {
  title: string;
  orders: DeliveryOrder[];
  onNavigate: (id: string) => void;
}

const Column = ({ title, orders, onNavigate }: ColumnProps) => (
  <div className="task-column" style={{ flex: 1, background: 'var(--bg-main)', borderRadius: '8px', padding: '16px', minHeight: '400px' }}>
    <h4 style={{ marginBottom: '16px', borderBottom: '1px solid #E9EDF7', paddingBottom: '8px' }}>{title} <span style={{ color: 'var(--text-muted)' }}>({orders.length})</span></h4>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {orders.map(o => (
        <div key={o.id} style={{ background: 'white', padding: '12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #E9EDF7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }} onClick={() => onNavigate(`/delivery-orders/${o.id}`)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>{o.waybillNo}</strong>
          </div>
          <div style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-main)' }}>{o.recipientAddress.substring(0, 35)}...</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {o.driverInitials && <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: o.driverColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>{o.driverInitials}</div>}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{o.driverName ? o.driverName.split(',')[0] : 'Unassigned'}</span>
            </div>
            <StatusBadge status={o.status} size="sm" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function Tasks() {
  const { deliveryOrders } = useData();
  const navigate = useNavigate();
  
  const pending = deliveryOrders.filter(o => o.status === 'Pending');
  const inTransit = deliveryOrders.filter(o => o.status === 'In Transit');
  const completed = deliveryOrders.filter(o => o.status === 'Delivered' || o.status === 'Completed');

  return (
    <>
      <Header 
        title="Tasks Board" 
        subtitle="Operations" 
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/delivery-orders/new/edit')}>
            <Plus size={16} /> Add Task
          </button>
        }
      />
      <div className="page-content">
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Manage and monitor your delivery tasks across different stages.</p>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <Column title="Pending Dispatch" orders={pending} onNavigate={navigate} />
          <Column title="In Transit" orders={inTransit} onNavigate={navigate} />
          <Column title="Delivered / Completed" orders={completed} onNavigate={navigate} />
        </div>
      </div>
    </>
  );
}
