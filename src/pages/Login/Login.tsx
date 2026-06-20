import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import logo from '../../assets/logo.png';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addActivityLog } = useData();

  const [showPassword, setShowPassword] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(employeeId, password);
      
      // Log successful login
      await addActivityLog({
        action: 'Login',
        description: `User logged in: ${user.name} (${user.employeeId})`
      });

      if (user.role === 'DRIVER') {
        navigate('/driver/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err === 'Account locked due to multiple failed attempts.') {
        // Mock user details for the locked page
        localStorage.setItem('dts_locked_user', JSON.stringify({
          name: employeeId,
          id: employeeId,
          email: `${employeeId.toLowerCase()}@speedex.com.ph`
        }));
        navigate('/account-locked');
      } else {
        setError(typeof err === 'string' ? err : 'Invalid Employee ID or password. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-logo" style={{ background: 'transparent', padding: '0' }}>
            <img src={logo} alt="Speedex Logo" style={{ height: '48px', objectFit: 'contain' }} />
          </div>
          <p className="login-tagline">SPEEDEX DELIVERY TRACKING SYSTEM</p>
          <div className="login-steps">
            <div className="login-step">
              <div className="login-step-number">1</div>
              <div>
                <strong>Enter Credentials</strong>
                <p>Use your assigned Employee ID and password to access DTS.</p>
              </div>
            </div>
            <div className="login-step">
              <div className="login-step-number">2</div>
              <div>
                <strong>Track Deliveries</strong>
                <p>Monitor courier shipments, waybills, and delivery statuses in real-time.</p>
              </div>
            </div>
            <div className="login-step">
              <div className="login-step-number">3</div>
              <div>
                <strong>Manage POD Records</strong>
                <p>Upload and verify Proof of Delivery (POD) records and driver updates.</p>
              </div>
            </div>
          </div>
          <div className="login-decorative-circles">
            <div className="circle circle-1" />
            <div className="circle circle-2" />
          </div>
        </div>
      </div>

      <div className="login-right">
        <form className="login-form" onSubmit={handleSubmit}>
          <span className="login-form-label label" style={{ color: 'var(--primary)' }}>SECURE ACCESS</span>
          <h2 className="login-form-title">Login to Delivery Tracking System (DTS)</h2>
          <p className="login-form-subtitle">Enter your credentials below to continue.</p>

          <hr className="login-divider" />

          {error && (
            <div
              className="login-alert error"
              style={{
                background: '#FFF1F1',
                border: '1px solid #FFCDCD',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                color: '#E31A1A',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangleIcon />
              <p>{error}</p>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Employee ID</label>
            <div className="form-input-icon">
              <User size={16} className="icon-left" />
              <input
                type="text"
                className="form-input"
                placeholder="EMP-001"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
                style={{ paddingLeft: '42px' }}
              />
            </div>
            <small style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
              Try: EMP-001 (Admin), EMP-002 (Ops), or EMP-003 (Driver)
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="form-input-icon">
              <Lock size={16} className="icon-left" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '42px' }}
              />
              <button type="button" className="icon-right" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
              <input type="checkbox" /> Remember me
            </label>
            <a href="#" style={{ color: 'var(--primary)', fontSize: '14px', textDecoration: 'none', fontWeight: '500' }}>
              Forgot password?
            </a>
          </div>

          <button type="submit" className="btn btn-dark btn-lg login-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'LOGGING IN...' : 'LOG IN'}
          </button>
        </form>

        <p className="login-footer">
          © 2026 <a href="#">Speedex Courier & Forwarder, Inc.</a> · All rights reserved.
        </p>
      </div>
    </div>
  );
}

function AlertTriangleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E31A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
