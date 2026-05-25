import { useMemo } from 'react';
import Header from '../../components/layout/Header';
import { useData } from '../../context/DataContext';
import '../../pages/Report/Reports.css';

export default function DeliverySummary() {
  const { deliveryOrders } = useData();

  const computedDriverPerformance = useMemo(() => {
    const dMap: Record<string, any> = {};

    deliveryOrders.forEach(o => {
      const isCompleted = o.status === 'Completed' || o.status === 'Delivered';
      const isFailed = o.status === 'Failed';
      
      const dName = o.driverName || 'Unassigned';
      if (!dMap[dName]) {
        dMap[dName] = { 
          name: dName, 
          totalOrders: 0, 
          delivered: 0, 
          failed: 0, 
          initials: dName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(), 
          color: 'var(--primary)' 
        };
      }
      dMap[dName].totalOrders++;
      if (isCompleted) dMap[dName].delivered++;
      if (isFailed) dMap[dName].failed++;
    });

    return Object.values(dMap).map((d: any) => {
       const successRate = d.totalOrders ? ((d.delivered / d.totalOrders) * 100).toFixed(1) + '%' : '0%';
       let rating = 4.5;
       if (d.delivered > 0) rating = 4.0 + (d.delivered / (d.totalOrders || 1));
       if (rating > 5) rating = 5.0;
       return { ...d, successRate, rating: rating.toFixed(1) };
    });
  }, [deliveryOrders]);

  const handleExport = () => {
    const headers = ['Driver', 'Total Orders', 'Delivered', 'Failed', 'Success Rate', 'Rating'];
    const rows = computedDriverPerformance.map((d: any) => [d.name, d.totalOrders, d.delivered, d.failed, d.successRate, d.rating].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "delivery_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Header
        title="Delivery Summary"
        subtitle="Data & Reports"
        actions={
          <button className="btn btn-primary btn-sm" onClick={handleExport}>
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
              {computedDriverPerformance.length > 0 ? computedDriverPerformance.map((d: any) => (
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
