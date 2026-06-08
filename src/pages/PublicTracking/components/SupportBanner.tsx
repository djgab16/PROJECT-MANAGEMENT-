import { Phone, Mail, HelpCircle, MapPin } from 'lucide-react';
import './SupportBanner.css';

export default function SupportBanner() {
  return (
    <footer className="support-banner">
      <div className="support-content">
        <div className="support-icon-wrapper">
          <HelpCircle size={24} />
        </div>
        <div className="support-text">
          <h3>Need Help With Your Delivery?</h3>
          <p>Our customer support team is here to assist you with tracking or delivery concerns.</p>
          <div className="support-address">
            <MapPin size={13} />
            <span>ECF Building, Malate, Manila</span>
          </div>
        </div>
        
        <div className="support-contacts">
          <a href="tel:+63284004629" className="contact-btn">
            <Phone size={16} />
            <span>(02) 8400 4629</span>
          </a>
          <a href="mailto:admin@myspeedex.net" className="contact-btn secondary">
            <Mail size={16} />
            <span>admin@myspeedex.net</span>
          </a>
        </div>
      </div>

      <div className="support-footer-note">
        © 2026 Speedex Courier &amp; Forwarder, Inc. All rights reserved.
      </div>
    </footer>
  );
}
