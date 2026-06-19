import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import './DashboardLayout.css';

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={`dashboard-layout ${isSidebarCollapsed ? 'sidebar-collapsed-layout' : ''}`}>
      {/* Mobile Top Navigation */}
      <div className="mobile-top-nav">
        <button className="icon-btn" onClick={() => setIsSidebarOpen(true)} aria-label="Open Menu">
          <Menu size={24} />
        </button>
        <span className="mobile-nav-title">SPEEDEX Admin</span>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
