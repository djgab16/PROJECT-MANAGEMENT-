import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail, ArrowLeft } from 'lucide-react';
import './AccountLocked.css';

export default function AccountLocked() {
  const [lockedUser] = useState(() => {
    const saved = localStorage.getItem('dts_locked_user');
    return saved ? JSON.parse(saved) : { name: 'David Jr. M. Gabriel', id: 'EMP-002', email: 'd.gabriel@speedex.com.ph' };
  });

  const initials = lockedUser.name
    ? lockedUser.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'US';

  return (
    <div className="locked-page">
      <div className="locked-card animate-scale-in">
        <div className="locked-icon-wrapper">
          <Lock size={32} />
        </div>

        <span className="locked-label label" style={{ color: 'var(--status-failed)' }}>ACCOUNT LOCKED</span>
        <h2 className="locked-title">Access Restricted</h2>
        <p className="locked-text">
          Your account has been deactivated due to multiple failed login attempts. Please contact your administrator.
        </p>

        <div className="locked-info-box">
          <div className="locked-info-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--status-failed)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
          </div>
          <div>
            <strong>Why was my account locked?</strong>
            <p>The system automatically deactivates accounts after 3 consecutive failed login attempts to prevent unauthorized access.</p>
          </div>
        </div>

        <div className="locked-user-card">
          <div className="locked-user-avatar">{initials}</div>
          <div className="locked-user-info">
            <strong>{lockedUser.name}</strong>
            <span>{lockedUser.email}</span>
          </div>
          <span className="locked-user-badge">
            <Lock size={12} /> Locked
          </span>
        </div>

        <div className="locked-steps">
          <strong>HOW TO UNLOCK YOUR ACCOUNT</strong>
          <div className="locked-step">
            <span className="locked-step-num">1</span>
            <p>Contact your <strong>Administrator</strong> to request account reactivation.</p>
          </div>
          <div className="locked-step">
            <span className="locked-step-num">2</span>
            <p>The Administrator will verify your identity and <strong>reactivate your account</strong> in the system.</p>
          </div>
          <div className="locked-step">
            <span className="locked-step-num">3</span>
            <p>You will receive a <strong>new system-generated password</strong> upon reactivation.</p>
          </div>
        </div>

        <button className="btn btn-dark btn-lg locked-contact-btn" id="contact-admin-btn">
          <Mail size={18} />
          CONTACT ADMINISTRATOR
        </button>

        <Link to="/login" className="locked-back-link" id="back-to-login">
          <ArrowLeft size={16} />
          Back to Login
        </Link>

        <p className="locked-footer">© 2026 <a href="#">Speedex Courier & Forwarder, Inc.</a> · All rights reserved.</p>
      </div>
    </div>
  );
}
