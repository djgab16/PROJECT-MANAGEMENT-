import { useEffect, useState, useMemo } from 'react';
import { 
  ShieldAlert, ClipboardList, AlertTriangle, Clock, CheckCircle2, 
  RotateCw, Search, Download, RefreshCw, Filter, Play, Info
} from 'lucide-react';
import Header from '../../components/layout/Header';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, PieChart, Pie, Cell 
} from 'recharts';
import { predictionApi } from '../../api/predictionApi';
import type { AtRiskOrder, SlaSummaryResponse, DriverSlaPerformance } from '../../api/predictionApi';
import { toast } from 'sonner';
import './SlaMonitoring.css';

export default function SlaMonitoring() {
  const [summary, setSummary] = useState<SlaSummaryResponse | null>(null);
  const [atRiskOrders, setAtRiskOrders] = useState<AtRiskOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<AtRiskOrder[]>([]);
  const [driverPerf, setDriverPerf] = useState<DriverSlaPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active tab state: 'ongoing' or 'delivered'
  const [activeTab, setActiveTab] = useState<'ongoing' | 'delivered'>('ongoing');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('All');
  const [selectedRoute, setSelectedRoute] = useState('All');
  const [selectedArea, setSelectedArea] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedClientType, setSelectedClientType] = useState('All');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('All');
  const [dateRange, setDateRange] = useState('All'); // 'All', 'Today', 'Last 7 Days', 'Last 30 Days'

  // Fetch all necessary data
  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [summaryData, ordersData, completedData, driverData] = await Promise.all([
        predictionApi.getSlaSummary(),
        predictionApi.getAtRiskOrders(),
        predictionApi.getCompletedOrders(),
        predictionApi.getDriverPerformance()
      ]);
      setSummary(summaryData);
      setAtRiskOrders(ordersData);
      setCompletedOrders(completedData);
      setDriverPerf(driverData);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching SLA predictions data', err);
      setError('Failed to fetch prediction models. Please verify database connectivity.');
      toast.error('Failed to load SLA data');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Recompute predictions
  const handleRecompute = async () => {
    setIsRecomputing(true);
    toast.info('Recomputing predictions. Please wait...', { duration: 2000 });
    try {
      const result = await predictionApi.runPredictions();
      toast.success(result.message);
      await fetchData(true);
    } catch (err: any) {
      console.error('Error recomputing predictions', err);
      toast.error(err.response?.data?.message || 'Error executing prediction run');
    } finally {
      setIsRecomputing(false);
    }
  };

  // 30 seconds auto-refresh & initial fetch
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Extract unique filter choices dynamically from the data with standard fallbacks
  const uniqueDrivers = useMemo(() => {
    const drivers = atRiskOrders.map(o => o.driverName).filter(Boolean);
    const perfDrivers = driverPerf.map(d => d.driverName).filter(Boolean);
    const combined = Array.from(new Set([...drivers, ...perfDrivers]));
    return ['All', ...combined];
  }, [atRiskOrders, driverPerf]);

  const uniqueRoutes = useMemo(() => {
    const routes = atRiskOrders.map(o => o.route).filter(Boolean);
    const standardRoutes = ['Quezon City', 'Caloocan City', 'Makati City', 'Marikina City', 'Pasig City', 'Manila', 'Taguig City'];
    const combined = Array.from(new Set([...routes, ...standardRoutes]));
    return ['All', ...combined];
  }, [atRiskOrders]);

  const uniqueAreas = useMemo(() => {
    const areas = atRiskOrders.map(o => o.area).filter(Boolean);
    const standardAreas = ['Quezon City', 'Caloocan City', 'Makati City', 'Marikina City', 'Pasig City', 'Manila', 'Taguig City'];
    const combined = Array.from(new Set([...areas, ...standardAreas]));
    return ['All', ...combined];
  }, [atRiskOrders]);

  const uniquePriorities = useMemo(() => {
    const priorities = atRiskOrders.map(o => o.priority).filter(Boolean);
    const standardPriorities = ['High', 'Medium', 'Low'];
    const combined = Array.from(new Set([...priorities, ...standardPriorities]));
    return ['All', ...combined];
  }, [atRiskOrders]);

  // Combine all orders for comprehensive filter values
  const allOrdersCombined = useMemo(() => {
    return [...atRiskOrders, ...completedOrders];
  }, [atRiskOrders, completedOrders]);

  const uniqueStatuses = useMemo(() => {
    const statuses = allOrdersCombined.map(o => o.status).filter(Boolean);
    const standardStatuses = ['Pending', 'In Transit', 'Delivered', 'Failed', 'Returned'];
    const combined = Array.from(new Set([...statuses, ...standardStatuses]));
    return ['All', ...combined];
  }, [allOrdersCombined]);

  const uniqueClientTypes = useMemo(() => {
    const types = allOrdersCombined.map(o => o.clientType).filter(Boolean);
    const standardTypes = ['Corporate', 'VIP', 'Standard'];
    const combined = Array.from(new Set([...types, ...standardTypes]));
    return ['All', ...combined];
  }, [allOrdersCombined]);

  // Filters logic matching together
  const filteredOrders = useMemo(() => {
    const sourceOrders = activeTab === 'ongoing' ? atRiskOrders : completedOrders;
    return sourceOrders.filter(order => {
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          order.waybillNo.toLowerCase().includes(q) ||
          order.clientName.toLowerCase().includes(q) ||
          order.driverName.toLowerCase().includes(q) ||
          order.route.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Select Filters
      if (selectedDriver !== 'All' && order.driverName !== selectedDriver) return false;
      if (selectedRoute !== 'All' && order.route !== selectedRoute) return false;
      if (selectedArea !== 'All' && order.area !== selectedArea) return false;
      if (selectedPriority !== 'All' && order.priority !== selectedPriority) return false;
      if (selectedStatus !== 'All' && order.status !== selectedStatus) return false;
      if (selectedClientType !== 'All' && order.clientType !== selectedClientType) return false;
      if (selectedRiskLevel !== 'All' && order.riskLevel !== selectedRiskLevel) return false;

      // 3. Date Range filter (PredictedAt timestamp)
      if (dateRange !== 'All') {
        const orderDate = new Date(order.predictedAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - orderDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (dateRange === 'Today') {
          const today = new Date();
          if (orderDate.toDateString() !== today.toDateString()) return false;
        } else if (dateRange === 'Last 7 Days' && diffDays > 7) {
          return false;
        } else if (dateRange === 'Last 30 Days' && diffDays > 30) {
          return false;
        }
      }

      return true;
    });
  }, [
    activeTab, atRiskOrders, completedOrders, searchQuery, selectedDriver, selectedRoute, selectedArea,
    selectedPriority, selectedStatus, selectedClientType, selectedRiskLevel, dateRange
  ]);

  // Export handlers
  const handleExportCSV = () => {
    if (!filteredOrders.length) {
      toast.warning('No items to export.');
      return;
    }
    const headers = ['Waybill', 'Client', 'Route', 'Driver', 'Priority', 'Overdue', 'Risk Level', 'Risk Score', 'Confidence', 'Recommendation'];
    const rows = filteredOrders.map(order => [
      order.waybillNo,
      order.clientName,
      order.route,
      order.driverName || 'Unassigned',
      order.priority,
      order.slaRemainingHours <= 0 ? order.timeUntilBreach : '-',
      order.riskLevel,
      (order.riskScore * 100).toFixed(0) + '%',
      (order.confidenceScore * 100).toFixed(0) + '%',
      `"${order.recommendedAction.replace(/"/g, '""')}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sla_at_risk_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV report exported successfully');
  };

  const handleExportExcel = () => {
    if (!filteredOrders.length) {
      toast.warning('No items to export.');
      return;
    }
    const headers = ['Waybill', 'Client', 'Route', 'Driver', 'Priority', 'Overdue', 'Risk Level', 'Risk Score', 'Confidence', 'Recommendation'];
    const rows = filteredOrders.map(order => [
      order.waybillNo,
      order.clientName,
      order.route,
      order.driverName || 'Unassigned',
      order.priority,
      order.slaRemainingHours <= 0 ? order.timeUntilBreach : '-',
      order.riskLevel,
      (order.riskScore * 100).toFixed(0) + '%',
      (order.confidenceScore * 100).toFixed(0) + '%',
      order.recommendedAction
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sla_at_risk_report_${new Date().toISOString().slice(0,10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Excel spreadsheet exported successfully');
  };

  const handleExportPDF = () => {
    if (!filteredOrders.length) {
      toast.warning('No items to export.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocker is active. Allow popups to export PDF.');
      return;
    }
    
    const html = `
      <html>
        <head>
          <title>SLA At-Risk Orders Report</title>
          <style>
            body { font-family: sans-serif; padding: 25px; color: #1e293b; background: #ffffff; }
            h1 { color: #0b1437; margin: 0 0 5px 0; font-size: 24px; }
            .meta { font-size: 13px; color: #707eae; margin-bottom: 25px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; font-size: 11px; }
            th { background-color: #f7f9ff; font-weight: bold; color: #1b254b; }
            tr:nth-child(even) { background-color: #f8faff; }
            .badge { padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 9px; text-transform: uppercase; display: inline-block; }
            .badge-low { background-color: #ecfdf5; color: #065f46; }
            .badge-medium { background-color: #fffbeb; color: #92400e; }
            .badge-high { background-color: #fff7ed; color: #9a3412; }
            .badge-critical { background-color: #fef2f2; color: #991b1b; }
          </style>
        </head>
        <body>
          <h1>SLA Proactive At-Risk Orders Report</h1>
          <div class="meta">Generated: ${new Date().toLocaleString()} | Filtered Orders: ${filteredOrders.length}</div>
          <table>
            <thead>
              <tr>
                <th>Waybill</th>
                <th>Client</th>
                <th>Route</th>
                <th>Driver</th>
                <th>Priority</th>
                <th>Overdue</th>
                <th>Risk Level</th>
                <th>Score</th>
                <th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              ${filteredOrders.map(order => `
                <tr>
                  <td><strong>${order.waybillNo}</strong></td>
                  <td>${order.clientName}</td>
                  <td>${order.route}</td>
                  <td>${order.driverName || 'Unassigned'}</td>
                  <td>${order.priority}</td>
                  <td>${order.slaRemainingHours <= 0 ? order.timeUntilBreach : '-'}</td>
                  <td>
                    <span class="badge badge-${order.riskLevel.toLowerCase()}">
                      ${order.riskLevel}
                    </span>
                  </td>
                  <td>${(order.riskScore * 100).toFixed(0)}%</td>
                  <td>${order.recommendedAction}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    toast.success('PDF print window opened successfully');
  };

  // Pie chart risk distribution data
  const pieChartData = useMemo(() => {
    const riskCounts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
    filteredOrders.forEach(o => {
      riskCounts[o.riskLevel] = (riskCounts[o.riskLevel] || 0) + 1;
    });

    return [
      { name: 'Low Risk', value: riskCounts.Low, color: '#10B981' },      // Emerald Green
      { name: 'Medium Risk', value: riskCounts.Medium, color: '#F59E0B' },  // Amber Yellow
      { name: 'High Risk', value: riskCounts.High, color: '#F97316' },      // Bright Orange
      { name: 'Critical Risk', value: riskCounts.Critical, color: '#EF4444' } // Vibrant Red
    ].filter(d => d.value > 0);
  }, [filteredOrders]);

  // Route breakdown charting
  const routeChartData = useMemo(() => {
    if (!summary?.routeBreakdown) return [];
    return summary.routeBreakdown.slice(0, 8).map(r => ({
      name: r.route,
      'On-Time %': Math.round(r.onTimePercentage),
      'Breached Count': r.breachedCount
    }));
  }, [summary]);

  // Top delayed drivers
  const driverChartData = useMemo(() => {
    return driverPerf.slice(0, 12).map(d => ({
      name: d.driverName,
      'On-Time %': Math.round(d.onTimePercentage),
      'Deliveries': d.deliveriesCount
    }));
  }, [driverPerf]);

  if (isLoading) {
    return (
      <div className="sla-loading-container">
        <RotateCw size={48} className="sla-loader" />
        <p>Analyzing logistics metadata and calculating SLA risk profiles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sla-error-container">
        <AlertTriangle size={48} className="text-danger" />
        <h2>SLA Prediction Error</h2>
        <p>{error}</p>
        <button onClick={() => fetchData()} className="btn btn-primary mt-4">
          Retry Connecting
        </button>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="SLA Proactive Monitoring" 
        subtitle="AI-Weighted At-Risk Prediction and SLA Performance Center"
        date={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      />

      <div className="sla-content">
        {/* KPI Scorecard Row */}
        <div className="sla-kpi-row">
          <div className="sla-kpi-card text-brand">
            <div className="kpi-icon-container bg-brand-subtle">
              <ClipboardList size={22} className="text-teal" />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">ACTIVE DELIVERIES</span>
              <span className="kpi-value">{summary?.activeDeliveriesCount ?? 0}</span>
              <span className="kpi-trend">Currently in logistics pipeline</span>
            </div>
          </div>

          <div className="sla-kpi-card text-warning">
            <div className="kpi-icon-container bg-warning-subtle">
              <ShieldAlert size={22} className="text-orange" />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">AT-RISK DELIVERIES</span>
              <span className="kpi-value">{summary?.atRiskCount ?? 0}</span>
              <span className="kpi-trend danger">High / Critical risk level</span>
            </div>
          </div>

          <div className="sla-kpi-card text-danger">
            <div className="kpi-icon-container bg-danger-subtle">
              <AlertTriangle size={22} className="text-danger" />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">SLA BREACHES</span>
              <span className="kpi-value">{summary?.slaBreachesCount ?? 0}</span>
              <span className="kpi-trend danger">Total failed/overdue orders</span>
            </div>
          </div>

          <div className="sla-kpi-card text-success">
            <div className="kpi-icon-container bg-success-subtle">
              <CheckCircle2 size={22} className="text-green" />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">OVERALL ON-TIME %</span>
              <span className="kpi-value">{summary?.overallOnTimePercentage ?? 0}%</span>
              <span className="kpi-trend success">Completed within SLA bounds</span>
            </div>
          </div>

          <div className="sla-kpi-card text-purple">
            <div className="kpi-icon-container bg-purple-subtle">
              <Clock size={22} style={{ color: '#868CFF' }} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">AVERAGE DELAY</span>
              <span className="kpi-value">{summary?.averageDelayHours ?? 0}h</span>
              <span className="kpi-trend">Avg delay of breached orders</span>
            </div>
          </div>

          <div className="sla-kpi-card text-info">
            <div className="kpi-icon-container bg-info-subtle">
              <Clock size={22} className="text-info" />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">AVG DELIVERY DURATION</span>
              <span className="kpi-value">{summary?.averageDeliveryDurationHours ?? 0}h</span>
              <span className="kpi-trend">Avg elapsed time to success</span>
            </div>
          </div>
        </div>

        {/* Proactive Controls Panel */}
        <div className="sla-control-card card">
          <div className="control-header">
            <div className="title-section">
              <h3>Weighted Heuristic Modeling</h3>
              <p>Predictive factors evaluate SLA remaining hours, redeliveries, route delays, driver historical records, and client metadata.</p>
            </div>
            <button 
              onClick={handleRecompute} 
              disabled={isRecomputing}
              className="btn btn-primary btn-run-prediction"
            >
              {isRecomputing ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
              <span>{isRecomputing ? 'Recomputing...' : 'Recompute SLA Risk'}</span>
            </button>
          </div>
        </div>

        {/* Analytical Visualizations Grid */}
        <div className="sla-charts-grid">
          {/* Route Performance */}
          <div className="card sla-chart-card">
            <div className="card-header">
              <h3>Route SLA Performance</h3>
              <span className="subtitle">On-time delivery performance by routing hub</span>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={routeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" domain={[0, 100]} fontSize={10} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(0, 169, 157, 0.04)' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="On-Time %" fill="#00A99D" radius={[4, 4, 0, 0]}>
                    {routeChartData.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={idx < 3 ? '#EE5D50' : '#00A99D'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Driver Performance Ranking */}
          <div className="card sla-chart-card">
            <div className="card-header">
              <h3>Driver SLA Scores</h3>
              <span className="subtitle">Historical on-time metrics for completed routes</span>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={driverChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" domain={[0, 100]} fontSize={10} tickLine={false} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="On-Time %" fill="#868CFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Distribution Pie Chart */}
          <div className="card sla-chart-card pie-card">
            <div className="card-header">
              <h3>Risk Distribution</h3>
              <span className="subtitle">Filtered distribution of active deliveries by SLA risk</span>
            </div>
            <div className="chart-wrapper pie-chart-wrapper">
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="45%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} orders`, 'Count']} />
                    <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-pie-state">
                  <CheckCircle2 size={36} className="text-green" />
                  <p>No active orders categorized at SLA risk.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Query Filters Card */}
        <div className="card sla-filters-card">
          <div className="filters-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} className="text-teal" />
              <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Active Filter Pipeline</h3>
            </div>
            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedDriver('All');
                setSelectedRoute('All');
                setSelectedArea('All');
                setSelectedPriority('All');
                setSelectedStatus('All');
                setSelectedClientType('All');
                setSelectedRiskLevel('All');
                setDateRange('All');
              }}
              className="clear-filters-btn"
            >
              Reset Filters
            </button>
          </div>

          <div className="filters-grid">
            <div className="filter-group">
              <label>Smart Search</label>
              <div className="search-input-wrapper">
                <Search size={14} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Waybill, Client, Driver, Route..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-group">
              <label>SLA Risk Level</label>
              <select value={selectedRiskLevel} onChange={(e) => setSelectedRiskLevel(e.target.value)}>
                <option value="All">All Risks</option>
                <option value="Low">Low Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="High">High Risk</option>
                <option value="Critical">Critical Risk</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Driver</label>
              <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}>
                {uniqueDrivers.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Route</label>
              <select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
                {uniqueRoutes.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Area</label>
              <select value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}>
                {uniqueAreas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Priority</label>
              <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)}>
                {uniquePriorities.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Status</label>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Client Type</label>
              <select value={selectedClientType} onChange={(e) => setSelectedClientType(e.target.value)}>
                {uniqueClientTypes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Date Evaluated</label>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                <option value="All">All Dates</option>
                <option value="Today">Today Only</option>
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="Last 30 Days">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Scorecard Table */}
        <div className="card sla-table-card">
          <div className="table-header">
            <div className="table-meta">
              <h3>Risk Profiling Pipeline</h3>
              <p>Proactive dispatch actions targeting {filteredOrders.length} matching order runs.</p>
            </div>
            
            <div className="export-actions">
              <button onClick={handleExportCSV} className="export-btn csv-btn">
                <Download size={14} />
                <span>CSV</span>
              </button>
              <button onClick={handleExportExcel} className="export-btn xls-btn">
                <Download size={14} />
                <span>Excel</span>
              </button>
              <button onClick={handleExportPDF} className="export-btn pdf-btn">
                <Download size={14} />
                <span>Print PDF</span>
              </button>
            </div>
          </div>

          <div className="table-header-tabs">
            <button 
              className={`table-tab-btn ${activeTab === 'ongoing' ? 'active' : ''}`}
              onClick={() => setActiveTab('ongoing')}
            >
              Ongoing Deliveries ({atRiskOrders.length})
            </button>
            <button 
              className={`table-tab-btn ${activeTab === 'delivered' ? 'active' : ''}`}
              onClick={() => setActiveTab('delivered')}
            >
              Delivered History ({completedOrders.length})
            </button>
          </div>

          <div className="table-container">
            {filteredOrders.length > 0 ? (
              <table className="sla-data-table">
                <thead>
                  <tr>
                    <th>Waybill</th>
                    <th>Client</th>
                    <th>Route</th>
                    <th>Driver</th>
                    <th>Priority</th>
                    <th>{activeTab === 'ongoing' ? 'Overdue' : 'SLA Breach'}</th>
                    <th>{activeTab === 'ongoing' ? 'Risk Level' : 'Outcome Risk'}</th>
                    <th>{activeTab === 'ongoing' ? 'Predicted Arrival' : 'Actual Arrival'}</th>
                    <th>{activeTab === 'ongoing' ? 'Confidence' : 'Status'}</th>
                    <th>{activeTab === 'ongoing' ? 'Recommended Action' : 'Outcome Detail'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const remainingHours = order.slaRemainingHours;
                    const isBreached = remainingHours <= 0;
                    
                    return (
                      <tr key={order.id} className={`risk-row-${order.riskLevel.toLowerCase()}`}>
                        <td className="cell-waybill">
                          <strong>{order.waybillNo}</strong>
                        </td>
                        <td>
                          <div className="cell-client-wrapper">
                            <span className="client-name">{order.clientName}</span>
                            <span className="client-badge">{order.clientType}</span>
                          </div>
                        </td>
                        <td>{order.route}</td>
                        <td className="cell-driver">{order.driverName || <span className="unassigned">Unassigned</span>}</td>
                        <td>
                          <span className={`priority-tag ${order.priority.toLowerCase()}`}>
                            {order.priority}
                          </span>
                        </td>
                        <td>
                          <div className="cell-remaining-wrapper">
                            {activeTab === 'ongoing' ? (
                              isBreached ? (
                                <div className="cell-remaining-wrapper breached">
                                  <Clock size={12} />
                                  <span>{order.timeUntilBreach}</span>
                                </div>
                              ) : (
                                <span className="text-secondary">-</span>
                              )
                            ) : (
                              remainingHours > 0 ? (
                                <span className="text-danger font-semibold">Late by {remainingHours.toFixed(1)} hrs</span>
                              ) : (
                                <span className="text-success font-semibold">On Time</span>
                              )
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`risk-badge risk-${order.riskLevel.toLowerCase()}`}>
                            {order.riskLevel}
                          </span>
                        </td>
                        <td>
                          <div className="font-semibold text-primary">
                            {order.predictedArrival || '-'}
                          </div>
                        </td>
                        <td>
                          {activeTab === 'ongoing' ? (
                            <span>{(order.confidenceScore * 100).toFixed(0)}%</span>
                          ) : (
                            <span className={`risk-badge risk-${order.status.toLowerCase() === 'delivered' || order.status.toLowerCase() === 'completed' ? 'low' : 'critical'}`}>
                              {order.status}
                            </span>
                          )}
                        </td>
                        <td className="cell-recommendation">
                          {activeTab === 'ongoing' ? (
                            <div className="recommendation-content">
                              <span className="action-text">{order.recommendedAction}</span>
                              <div className="tooltip-trigger">
                                <Info size={13} className="text-secondary" />
                                <div className="risk-tooltip">
                                  <strong>Risk Reason Metrics:</strong>
                                  <pre>{order.riskReason}</pre>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-secondary">{order.recommendedAction}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="sla-empty-state">
                <CheckCircle2 size={48} className="text-green" />
                <h3>No Orders Found</h3>
                <p>No deliveries matching your filter parameters are currently available in this section.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
