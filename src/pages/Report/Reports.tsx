import { useState, useMemo } from 'react';
import { Download, FileBarChart, TrendingUp, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Header from '../../components/layout/Header';
import StatCard from '../../components/ui/StatCard';
import { useData } from '../../context/DataContext';
import './Reports.css';

export default function Reports() {
  const { deliveryOrders } = useData();
  const [driverFilter, setDriverFilter] = useState('All Drivers');
  const [reportType, setReportType] = useState('daily');

  const filteredOrders = useMemo(() => {
    let today = new Date();
    if (deliveryOrders.length > 0) {
      const dates = deliveryOrders
        .map(o => new Date(o.dateCompleted || o.lastUpdated || o.orderDate))
        .filter(d => !isNaN(d.getTime()));
      if (dates.length > 0) {
        today = new Date(Math.max(...dates.map(d => d.getTime())));
      }
    }

    return deliveryOrders.filter(o => {
       if (driverFilter !== 'All Drivers' && o.driverName !== driverFilter) return false;
       
       const dateStr = o.dateCompleted || o.lastUpdated || o.orderDate;
       if (!dateStr) return false;
       const oDate = new Date(dateStr);
       if (isNaN(oDate.getTime())) return false;

       if (reportType === 'daily') {
         return oDate.getDate() === today.getDate() && 
                oDate.getMonth() === today.getMonth() && 
                oDate.getFullYear() === today.getFullYear();
       } else if (reportType === 'monthly') {
         return oDate.getMonth() === today.getMonth() && 
                oDate.getFullYear() === today.getFullYear();
       }
       return true;
    });
  }, [deliveryOrders, driverFilter, reportType]);

  const { driverPerformance, pieData, dynamicDailyDeliveries, stats } = useMemo(() => {
    let totalDeliveries = filteredOrders.length;
    let completed = 0;
    let failed = 0;
    let potSubmitted = 0;

    const dMap: Record<string, any> = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dData = days.map(day => ({ day, weekday: 0, weekend: 0, peak: 0 }));

    filteredOrders.forEach(o => {
      const isCompleted = o.status === 'Completed' || o.status === 'Delivered';
      const isFailed = o.status === 'Failed';
      
      if (isCompleted) completed++;
      if (isFailed) failed++;
      if (o.potStatus === 'Submitted') potSubmitted++;

      if (o.status !== 'Pending') {
        const dateStr = o.dateCompleted || o.lastUpdated || o.orderDate;
        if (dateStr) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            const dayIdx = date.getDay();
            const isWeekend = dayIdx === 0 || dayIdx === 6;
            const hasTime = dateStr.includes(':') || dateStr.toLowerCase().includes('am') || dateStr.toLowerCase().includes('pm');
            const isPeak = hasTime && (date.getHours() >= 16 || date.getHours() <= 8);
            if (isWeekend) dData[dayIdx].weekend++;
            else dData[dayIdx].weekday++;
            if (isPeak) dData[dayIdx].peak++;
          }
        }
      }

      const dName = o.driverName || 'Unassigned';
      if (!dMap[dName]) {
        dMap[dName] = { 
          name: dName, 
          totalOrders: 0, 
          delivered: 0, 
          failed: 0, 
          potCount: 0, 
          initials: dName === 'Unassigned' ? '?' : dName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(), 
          color: dName === 'Unassigned' ? 'var(--text-tertiary)' : 'var(--primary)' 
        };
      }
      dMap[dName].totalOrders++;
      if (isCompleted) dMap[dName].delivered++;
      if (isFailed) dMap[dName].failed++;
      if (o.potStatus === 'Submitted') dMap[dName].potCount++;
    });

    const driverPerf = Object.values(dMap).map(d => {
       const successRate = d.totalOrders ? ((d.delivered / d.totalOrders) * 100).toFixed(1) + '%' : '0%';
       const potRate = d.delivered ? ((d.potCount / d.delivered) * 100).toFixed(1) + '%' : '0%';
       let rating = 4.5;
       if (d.delivered > 0) rating = 4.0 + (d.delivered / (d.totalOrders || 1));
       if (rating > 5) rating = 5.0;
       return { ...d, successRate, potRate, avgTime: '4.2h', rating: rating.toFixed(1) };
    });

    const sunday = dData.shift();
    if (sunday) dData.push(sunday);

    return {
      stats: {
        total: totalDeliveries,
        successRate: totalDeliveries ? ((completed / totalDeliveries) * 100).toFixed(1) + '%' : '0%',
        potSubmitted,
        failed
      },
      driverPerformance: driverPerf,
      pieData: [
        { name: 'Completed', value: completed, color: '#01B574' },
        { name: 'Failed', value: failed, color: '#E31A1A' }
      ],
      dynamicDailyDeliveries: dData
    };
  }, [filteredOrders]);

  const handleExport = () => {
    const headers = ['Driver', 'Total Orders', 'Delivered', 'Failed', 'POT Rate', 'Success Rate', 'Avg Time', 'Rating'];
    const rows = driverPerformance.map((d: any) => [d.name, d.totalOrders, d.delivered, d.failed, d.potRate, d.successRate, d.avgTime, d.rating].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "delivery_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueDrivers = Array.from(new Set(deliveryOrders.map(o => o.driverName).filter(Boolean)));

  return (
    <>
      <Header
        title="Reports"
        actions={
          <button className="btn btn-primary btn-sm" id="export-report-btn" onClick={handleExport}>
            <Download size={14} /> EXPORT REPORT
          </button>
        }
      />
      <div className="page-content">
        <div className="reports-layout">
          {/* Left Panel - Config */}
          <div className="reports-config card">
            <h4>Report Configuration</h4>
            <p className="card-subtitle">Select options to generate your report</p>
            <div className="config-section">
              <span className="label">REPORT TYPE</span>
              <label className={`radio-option ${reportType === 'daily' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="type" 
                  checked={reportType === 'daily'} 
                  onChange={() => setReportType('daily')} 
                /> Daily Report<br />
                <span className="radio-desc">Today's delivery breakdown</span>
              </label>
              <label className={`radio-option ${reportType === 'monthly' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="type" 
                  checked={reportType === 'monthly'} 
                  onChange={() => setReportType('monthly')} 
                /> Monthly Report<br />
                <span className="radio-desc">Full month at a glance</span>
              </label>
            </div>
            
            <div className="config-section">
              <span className="label">DRIVER FILTER</span>
              <select className="filter-select" style={{ width: '100%' }} value={driverFilter} onChange={e => setDriverFilter(e.target.value)}>
                <option value="All Drivers">All Drivers</option>
                {uniqueDrivers.map(d => (
                  <option key={d as string} value={d as string}>{d}</option>
                ))}
              </select>
            </div>
            
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} id="generate-report-btn" onClick={handleExport}>
              <FileBarChart size={16} /> GENERATE CSV
            </button>
          </div>

          {/* Right Panel - Report */}
          <div className="reports-main">
            <div className="card">
              <div className="report-header">
                <div>
                  <span className="label" style={{ color: 'var(--primary)' }}>DYNAMIC REPORT</span>
                  <h2>Delivery Performance Report</h2>
                  <p className="text-sm text-muted">Generated {new Date().toLocaleString()} · Filter: {driverFilter}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="stats-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              <StatCard icon={<FileBarChart size={18} />} iconColor="var(--primary)" iconBg="var(--status-transit-bg)" label="TOTAL DELIVERIES" value={stats.total} />
              <StatCard icon={<TrendingUp size={18} />} iconColor="var(--status-active)" iconBg="var(--status-active-bg)" label="SUCCESS RATE" value={stats.successRate} />
              <StatCard icon={<CheckCircle2 size={18} />} iconColor="var(--status-active)" iconBg="var(--status-active-bg)" label="POT SUBMITTED" value={stats.potSubmitted} />
              <StatCard icon={<AlertTriangle size={18} />} iconColor="var(--status-failed)" iconBg="var(--status-failed-bg)" label="FAILED / RETURNED" value={stats.failed} />
              <StatCard icon={<Clock size={18} />} iconColor="var(--primary)" iconBg="var(--status-transit-bg)" label="AVG. DELIVERY TIME" value="4.2h" />
            </div>

            {/* Charts Row */}
            <div className="charts-row">
              <div className="card chart-card" style={{ flex: 2 }}>
                <div className="card-header">
                  <h4>Daily Deliveries Activity</h4>
                  <div className="chart-legend">
                    <span className="legend-item"><span className="legend-dot" style={{ background: '#00A99D' }} /> Weekday</span>
                    <span className="legend-item"><span className="legend-dot" style={{ background: '#A3AED0' }} /> Weekend</span>
                    <span className="legend-item"><span className="legend-dot" style={{ background: '#FFB547' }} /> Peak</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dynamicDailyDeliveries} barCategoryGap="20%" barGap={0}>
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

              <div className="card chart-card" style={{ flex: 1 }}>
                <h4>Status Breakdown</h4>
                <div className="pie-chart-wrapper">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-center-text">
                    <strong>{stats.total}</strong>
                    <span>total</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Driver Performance Table */}
            <div className="card">
              <div className="card-header">
                <h4>Per Driver Performance</h4>
              </div>
              <table className="data-table driver-perf-table">
                <thead>
                  <tr>
                    <th>DRIVER</th>
                    <th>TOTAL ORDERS</th>
                    <th>DELIVERED</th>
                    <th>FAILED</th>
                    <th>POT RATE</th>
                    <th>SUCCESS RATE</th>
                    <th>AVG. TIME</th>
                    <th>RATING</th>
                  </tr>
                </thead>
                <tbody>
                  {driverPerformance.map((d: any) => (
                    <tr key={d.name} style={{ opacity: d.name === 'Unassigned' ? 0.7 : 1 }}>
                      <td>
                        <div className="driver-cell">
                          <div className="driver-avatar" style={{ background: d.color, color: '#fff' }}>{d.initials}</div>
                          <div><strong style={{ color: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'inherit' }}>{d.name}</strong></div>
                        </div>
                      </td>
                      <td style={{ color: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'inherit' }}>{d.totalOrders}</td>
                      <td style={{ color: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'var(--status-active)' }}>{d.delivered}</td>
                      <td style={{ color: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'var(--status-failed)' }}>{d.failed}</td>
                      <td style={{ color: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'inherit' }}>
                        <div className="rate-bar-wrapper">
                          <div className="rate-bar"><div className="rate-bar-fill" style={{ width: d.potRate, background: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'var(--status-active)' }} /></div>
                          {d.potRate}
                        </div>
                      </td>
                      <td style={{ color: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'inherit' }}>{d.successRate}</td>
                      <td style={{ color: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'inherit' }}>{d.avgTime}</td>
                      <td><span className="rating-badge" style={{ color: d.name === 'Unassigned' ? 'var(--text-secondary)' : 'var(--status-active)' }}>● {d.rating}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
