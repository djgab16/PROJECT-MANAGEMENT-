import Header from '../../components/layout/Header';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useData } from '../../context/DataContext';
import '../../pages/Report/Reports.css';

export default function AnalyticsView() {
  const { deliveryOrders } = useData();

  const generateDailyDeliveries = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = days.map(day => ({ day, weekday: 0, weekend: 0, peak: 0 }));

    deliveryOrders.forEach(order => {
      if (order.status !== 'Pending') {
        const dateStr = order.dateCompleted || order.lastUpdated || order.orderDate;
        if (!dateStr) return;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return;
        
        const dayIdx = date.getDay();
        const isWeekend = dayIdx === 0 || dayIdx === 6;
        const isPeak = date.getHours() >= 16 || date.getHours() <= 8;
        
        if (isWeekend) data[dayIdx].weekend += 1;
        else data[dayIdx].weekday += 1;
        if (isPeak) data[dayIdx].peak += 1;
      }
    });

    const sunday = data.shift();
    if (sunday) data.push(sunday);
    
    return data;
  };

  const computedDailyDeliveries = generateDailyDeliveries();

  return (
    <>
      <Header title="Analytics View" subtitle="Performance Tracking" />
      <div className="page-content">
        <div className="card chart-card">
          <div className="card-header">
            <h4>Daily Deliveries Trend</h4>
            <div className="chart-legend">
              <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--primary)' }} /> Weekday</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: '#A3AED0' }} /> Weekend</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--status-pending)' }} /> Peak</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={computedDailyDeliveries} barCategoryGap="20%" barGap={0}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E9EDF7" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#A3AED0' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#A3AED0' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="weekday" fill="#00A99D" radius={[3, 3, 0, 0]} />
              <Bar dataKey="weekend" fill="#A3AED0" radius={[3, 3, 0, 0]} />
              <Bar dataKey="peak" fill="#FFB547" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
