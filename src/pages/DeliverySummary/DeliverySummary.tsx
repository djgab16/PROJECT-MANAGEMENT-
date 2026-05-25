import Header from '../../components/layout/Header';
import { useData } from '../../context/DataContext';
import '../../pages/Report/Reports.css';

export default function DeliverySummary() {
  const { deliveryOrders } = useData();

  const computedDriverPerformance = Object.values(deliveryOrders.reduce((acc, order) => {
    if (!order.driverName) return acc;
    if (!acc[order.driverName]) {
      acc[order.driverName] = {
        name: order.driverName,
        initials: order.driverInitials,
        color: order.driverColor,
        totalOrders: 0,
        delivered: 0,
        failed: 0,
      };
    }
    
    acc[order.driverName].totalOrders++;
    if (order.status === 'Delivered' || order.status === 'Completed') acc[order.driverName].delivered++;
    if (order.status === 'Failed') acc[order.driverName].failed++;
    
    return acc;
  }, {} as Record<string, { name: string; initials: string; color: string; totalOrders: number; delivered: number; failed: number }>)).map(d => {
    const successRateRaw = d.totalOrders > 0 ? (d.delivered / d.totalOrders) : 0;
    const successRate = (successRateRaw * 100).toFixed(1) + '%';
    let rating = 'Average';
    if (successRateRaw >= 0.9) rating = 'Excellent';
    else if (successRateRaw >= 0.75) rating = 'Good';
    else if (successRateRaw < 0.5 && d.totalOrders > 0) rating = 'Poor';
    
    return { ...d, successRate, rating } as { name: string; initials: string; color: string; totalOrders: number; delivered: number; failed: number; successRate: string; rating: string };
  });

  return (
    <>
      <Header
        title="Delivery Summary"
        subtitle="Data & Reports"
        actions={
          <button className="btn btn-primary btn-sm">
            EXPORT CSV
          </button>
        }
      />
      <div className="page-content">
        <div className="card">
          <div className="card-header">
            <h4>Generated Summary</h4>
          </div>
          <table className="data-table driver-perf-table">
            <thead>
              <tr>
                <th>DRIVER</th>
                <th>TOTAL ORDERS</th>
                <th>DELIVERED</th>
                <th>FAILED</th>
                <th>SUCCESS RATE</th>
                <th>RATING</th>
              </tr>
            </thead>
            <tbody>
              {computedDriverPerformance.length > 0 ? computedDriverPerformance.map(d => (
                <tr key={d.name}>
                  <td>
                    <div className="driver-cell">
                      <div className="driver-avatar" style={{ background: d.color }}>{d.initials}</div>
                      <div><strong>{d.name}</strong></div>
                    </div>
                  </td>
                  <td>{d.totalOrders}</td>
                  <td style={{ color: 'var(--status-active)' }}>{d.delivered}</td>
                  <td style={{ color: 'var(--status-failed)' }}>{d.failed}</td>
                  <td>{d.successRate}</td>
                  <td><span className="rating-badge">● {d.rating}</span></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    No driver data found from current delivery orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
