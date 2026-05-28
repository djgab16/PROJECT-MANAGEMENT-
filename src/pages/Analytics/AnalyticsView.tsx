import Header from '../../components/layout/Header';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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

  const generateStatusDistribution = () => {
    const counts = { Pending: 0, 'In Transit': 0, Delivered: 0, Completed: 0, Failed: 0, Returned: 0 };
    deliveryOrders.forEach(o => {
      if (counts[o.status] !== undefined) counts[o.status]++;
    });
    return [
      { name: 'Pending', value: counts.Pending, color: '#A3AED0' },
      { name: 'In Transit', value: counts['In Transit'], color: '#4318FF' },
      { name: 'Delivered', value: counts.Delivered + counts.Completed, color: '#00A99D' },
      { name: 'Failed/Returned', value: counts.Failed + counts.Returned, color: '#E31A1A' }
    ].filter(d => d.value > 0);
  };
  const computedStatusDist = generateStatusDistribution();

  const generateAreaPerformance = () => {
    const areaMap: Record<string, { total: number; delivered: number }> = {};
    deliveryOrders.forEach(o => {
      const area = o.area || 'Unknown';
      if (!areaMap[area]) areaMap[area] = { total: 0, delivered: 0 };
      areaMap[area].total++;
      if (o.status === 'Delivered' || o.status === 'Completed') areaMap[area].delivered++;
    });
    return Object.entries(areaMap)
      .map(([area, stats]) => ({ area, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  };
  const computedAreaPerf = generateAreaPerformance();

  return (
    <>
      <Header title="Analytics View" subtitle="Performance Tracking" />
      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          
          <div className="card chart-card" style={{ gridColumn: '1 / -1' }}>
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
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="weekday" fill="#00A99D" radius={[3, 3, 0, 0]} />
                <Bar dataKey="weekend" fill="#A3AED0" radius={[3, 3, 0, 0]} />
                <Bar dataKey="peak" fill="#FFB547" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-card">
            <div className="card-header">
              <h4>Order Status Distribution</h4>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={computedStatusDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {computedStatusDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-card">
            <div className="card-header">
              <h4>Top Delivery Areas (Success vs Total)</h4>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={computedAreaPerf} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9EDF7" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#A3AED0' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="area" type="category" tick={{ fontSize: 11, fill: '#A3AED0' }} width={100} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="total" name="Total Assigned" fill="#A3AED0" radius={[0, 3, 3, 0]} barSize={12} />
                <Bar dataKey="delivered" name="Delivered" fill="#4318FF" radius={[0, 3, 3, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>
    </>
  );
}
