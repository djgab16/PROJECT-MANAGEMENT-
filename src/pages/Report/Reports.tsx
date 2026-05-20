import { Printer, Download, FileBarChart, TrendingUp, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Header from '../../components/layout/Header';
import StatCard from '../../components/ui/StatCard';
import { driverPerformance, dailyDeliveries } from '../../data/mockData';
import './Reports.css';

const pieData = [
  { name: 'Completed', value: 817, color: '#01B574' },
  { name: 'Failed', value: 45, color: '#E31A1A' },
];

export default function Reports() {
  return (
    <>
      <Header
        title="Reports"
        actions={
          <button className="btn btn-primary btn-sm" id="export-report-btn">
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
              <label className="radio-option"><input type="radio" name="type" defaultChecked /> Daily Report<br /><span className="radio-desc">Today's delivery breakdown</span></label>
              <label className="radio-option"><input type="radio" name="type" /> Weekly Report<br /><span className="radio-desc">7-day performance summary</span></label>
              <label className="radio-option active"><input type="radio" name="type" /> Monthly Report<br /><span className="radio-desc">Full month at a glance</span></label>
              <label className="radio-option"><input type="radio" name="type" /> By Region / Area<br /><span className="radio-desc">Filtered by delivery zone</span></label>
              <label className="radio-option"><input type="radio" name="type" /> By Driver<br /><span className="radio-desc">Individual driver performance</span></label>
            </div>
            <div className="config-section">
              <span className="label">DATE RANGE</span>
              <div className="form-row two-col">
                <div className="form-group"><label className="form-label">FROM</label><input className="form-input" type="date" defaultValue="2026-03-01" /></div>
                <div className="form-group"><label className="form-label">TO</label><input className="form-input" type="date" defaultValue="2026-03-29" /></div>
              </div>
              <div className="config-quick-dates">
                <button className="quick-date-btn">This Week</button>
                <button className="quick-date-btn active">This Month</button>
                <button className="quick-date-btn">Custom</button>
              </div>
            </div>
            <div className="config-section">
              <span className="label">FILTERS</span>
              <button className="btn btn-outline btn-sm" style={{ width: '100%' }}>📍 Area</button>
              <button className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: '8px' }}>📅 Date</button>
            </div>
            <div className="config-section">
              <span className="label">DRIVER</span>
              <select className="filter-select" style={{ width: '100%' }}>
                <option>All Drivers</option>
                <option>Conag, Reca M.</option>
                <option>Panaligan, Sofia Q.</option>
                <option>Dumlao, Jhoyce A.</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }} id="generate-report-btn">
              <FileBarChart size={16} /> GENERATE REPORT
            </button>
            <button className="btn btn-outline" style={{ width: '100%', marginTop: '8px' }}>Export as PDF</button>
          </div>

          {/* Right Panel - Report */}
          <div className="reports-main">
            <div className="card">
              <div className="report-header">
                <div>
                  <span className="label" style={{ color: 'var(--primary)' }}>MONTHLY REPORT · MARCH 2026</span>
                  <h2>Delivery Performance Report</h2>
                  <p className="text-sm text-muted">Generated March 29, 2026 · 3:00 PM · Grouped by Driver · 3 drivers included</p>
                </div>
                <div className="flex gap-sm">
                  <button className="btn btn-outline btn-sm"><Printer size={14} /> Print</button>
                  <button className="btn btn-primary btn-sm"><Download size={14} /> Export PDF</button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="stats-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              <StatCard icon={<FileBarChart size={18} />} iconColor="var(--primary)" iconBg="var(--status-transit-bg)" label="TOTAL DELIVERIES" value="862" subtitle="+12.5% vs last month" subtitleColor="var(--status-active)" />
              <StatCard icon={<TrendingUp size={18} />} iconColor="var(--status-active)" iconBg="var(--status-active-bg)" label="SUCCESS RATE" value="94.8%" subtitle="+2.3% vs last month" subtitleColor="var(--status-active)" />
              <StatCard icon={<CheckCircle2 size={18} />} iconColor="var(--status-active)" iconBg="var(--status-active-bg)" label="POT SUBMITTED" value="817" subtitle="94.8% completion rate" />
              <StatCard icon={<AlertTriangle size={18} />} iconColor="var(--status-failed)" iconBg="var(--status-failed-bg)" label="FAILED / RETURNED" value="45" subtitle="5.2% failure rate" subtitleColor="var(--status-failed)" />
              <StatCard icon={<Clock size={18} />} iconColor="var(--primary)" iconBg="var(--status-transit-bg)" label="AVG. DELIVERY TIME" value="4.2h" subtitle="-0.3h vs last month" subtitleColor="var(--status-active)" />
            </div>

            {/* Charts Row */}
            <div className="charts-row">
              <div className="card chart-card" style={{ flex: 2 }}>
                <div className="card-header">
                  <h4>Daily Deliveries — March 2026</h4>
                  <div className="chart-legend">
                    <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--primary)' }} /> Weekday</span>
                    <span className="legend-item"><span className="legend-dot" style={{ background: '#A3AED0' }} /> Weekend</span>
                    <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--status-pending)' }} /> Peak</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyDeliveries} barCategoryGap="20%" barGap={0}>
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
                    <strong>862</strong>
                    <span>total</span>
                  </div>
                </div>
                <div className="pie-legend">
                  <span><span className="legend-dot" style={{ background: '#01B574' }} /> Completed <strong>817</strong></span>
                  <span><span className="legend-dot" style={{ background: '#E31A1A' }} /> Failed <strong>45</strong></span>
                </div>
              </div>
            </div>

            {/* Driver Performance Table */}
            <div className="card">
              <div className="card-header">
                <h4>Per Driver Performance — March 2026</h4>
                <a href="#" className="view-all-link">Full report →</a>
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
                  {driverPerformance.map(d => (
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
                      <td>
                        <div className="rate-bar-wrapper">
                          <div className="rate-bar"><div className="rate-bar-fill" style={{ width: d.potRate }} /></div>
                          {d.potRate}
                        </div>
                      </td>
                      <td>{d.successRate}</td>
                      <td>{d.avgTime}</td>
                      <td><span className="rating-badge">● {d.rating}</span></td>
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
