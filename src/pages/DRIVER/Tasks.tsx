import { useEffect } from 'react';
import Header from '../../components/layout/Header';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/ui/StatusBadge';
import { Plus, ClipboardList, MapPin, Package, Truck, CheckCircle2, XCircle, ShoppingBag } from 'lucide-react';
import type { DeliveryOrder } from '../../types';
import './Tasks.css';

interface ColumnProps {
  title: string;
  orders: DeliveryOrder[];
  onNavigate: (id: string) => void;
  colorClass: string;
  icon: React.ElementType;
}

const Column = ({ title, orders, onNavigate, colorClass, icon: Icon }: ColumnProps) => (
  <div className={`task-column ${colorClass}`}>
    <div className="task-column-header">
      <div className="task-column-title">
        <div className="task-column-icon">
          <Icon size={16} />
        </div>
        <h4>{title}</h4>
      </div>
      <span className="task-column-count">{orders.length}</span>
    </div>

    <div className="task-column-body">
      {orders.length === 0 ? (
        <div className="task-column-empty">
          <ClipboardList size={28} />
          <p>No tasks here</p>
        </div>
      ) : (
        orders.map(o => (
          <div key={o.id} className="task-card" onClick={() => onNavigate(`/delivery-orders/${o.id}`)}>
            <div className="task-card-waybill">{o.waybillNo}</div>

            <div className="task-card-address">
              <MapPin size={13} />
              <span>{(o.recipientAddress || 'No address').substring(0, 45)}{(o.recipientAddress || '').length > 45 ? '…' : ''}</span>
            </div>

            <div className="task-card-footer">
              <div className="task-card-driver">
                {o.driverInitials ? (
                  <div
                    className="task-card-avatar"
                    style={{ background: o.driverColor || 'var(--primary)' }}
                  >
                    {o.driverInitials}
                  </div>
                ) : null}
                <span className="task-card-driver-name">
                  {o.driverName ? o.driverName.split(',')[0] : 'Unassigned'}
                </span>
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
  const { deliveryOrders, refreshOrders } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    refreshOrders();
  }, []);
  
  const isDriver = user?.role === 'DRIVER';
  const isOpTeam = user?.role === 'OP. TEAM';

  const visibleOrders = isDriver 
    ? deliveryOrders.filter(o => (o.driverName === user?.name || !o.driverName) && o.taskType !== 'Pickup')
    : isOpTeam
    ? deliveryOrders.filter(o => o.encodedBy === user?.name || o.updatedBy === user?.name)
    : deliveryOrders;
  
  const pending   = visibleOrders.filter(o => o.status === 'Pending' && o.taskType !== 'Pickup');
  const inTransit = visibleOrders.filter(o => o.status === 'In Transit' && o.taskType !== 'Pickup');
  const failed    = visibleOrders.filter(o => (o.status === 'Failed' || o.status === 'Returned') && o.taskType !== 'Pickup');
  const completed = visibleOrders.filter(o => (o.status === 'Delivered' || o.status === 'Completed') && o.taskType !== 'Pickup');
  const pickups   = visibleOrders.filter(o => o.taskType === 'Pickup');

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
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
          {isDriver ? "Manage and monitor your assigned delivery tasks." : "Manage and monitor delivery tasks across different stages."}
        </p>
        <div className="tasks-board-container">
          {!isDriver && (
            <Column title="Pickups" orders={pickups} onNavigate={navigate} colorClass="col-pickup" icon={ShoppingBag} />
          )}
          <Column title="Pending Dispatch" orders={pending}   onNavigate={navigate} colorClass="col-pending"   icon={Package} />
          <Column title="In Transit"        orders={inTransit} onNavigate={navigate} colorClass="col-transit"   icon={Truck} />
          <Column title="Failed / Returned" orders={failed}    onNavigate={navigate} colorClass="col-failed"    icon={XCircle} />
          <Column title="Delivered"         orders={completed} onNavigate={navigate} colorClass="col-completed" icon={CheckCircle2} />
        </div>
      </div>
    </>
  );
}
