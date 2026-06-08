import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

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
      <div className="login-content-wrapper">
        <div className="login-left">
          <div className="login-logo-wrapper">
            <img src={logo} alt="Speedex Logo" className="login-logo-img" />
          </div>
          
          <div className="login-hero-text">
            <h1>Three Decades of<br />Trust & Reliability.</h1>
            <p>Every freight, parcel, and mail we handle reflects our commitment to speed, safety, and security. We guarantee exceptional value while maintaining the highest level of service.</p>
          </div>
        </div>

        <div className="login-right">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form-header">
              <h2 className="login-form-title">Welcome Back</h2>
              <p className="login-form-subtitle">Sign in to your Speedex account</p>
            </div>

            {error && (
              <div className="login-alert error">
                <AlertTriangleIcon />
                <p>{error}</p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label login-label">Employee ID</label>
              <div className="form-input-icon">
                <User size={18} className="icon-left" style={{ color: '#A3AED0' }} />
                <input
                  type="text"
                  className="form-input login-input"
                  placeholder="EMP-001"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label login-label">Password</label>
              <div className="form-input-icon">
                <Lock size={18} className="icon-left" style={{ color: '#A3AED0' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input login-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="icon-right" onClick={() => setShowPassword(!showPassword)} style={{ color: '#A3AED0' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#A3AED0' }}>
                <input type="checkbox" className="login-checkbox" /> Remember me
              </label>
              <a href="#" style={{ color: 'var(--primary)', fontSize: '13px', textDecoration: 'none', fontWeight: '600' }}>Forgot password?</a>
            </div>

            <button type="submit" className="btn btn-primary login-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'AUTHENTICATING...' : 'SIGN IN'}
            </button>
            
            <div className="login-demo-hints">
              <span>Demo Accounts:</span> EMP-001 (Admin) • EMP-002 (Ops) • EMP-003 (Driver)
            </div>
          </form>

          <p className="login-footer">© 2026 Speedex Courier & Forwarder, Inc.</p>
        </div>
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
