import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import './TrackingSearch.css';

interface TrackingSearchProps {
  onSearch: (waybill: string) => void;
  loading: boolean;
}

export default function TrackingSearch({ onSearch, loading }: TrackingSearchProps) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setError(true);
      return;
    }
    setError(false);
    onSearch(cleanQuery);
  };

  return (
    <div className="tracking-search-hero">
      <h1 className="hero-title">Track Your Package</h1>
      <p className="hero-subtitle">Enter your waybill number below to get real-time updates.</p>
      
      <form className={`search-form-container ${error ? 'has-error' : ''}`} onSubmit={handleSubmit}>
        <div className="search-input-wrapper">
          <input
            type="text"
            className="search-input"
            placeholder="e.g. SPX-2026-0841"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (error) setError(false);
            }}
            disabled={loading}
          />
        </div>
        <button type="submit" className="search-submit-btn" disabled={loading}>
          {loading ? <Loader2 className="spinner" size={20} /> : 'Track Package'}
        </button>
      </form>
      <div className="validation-msg-wrapper">
        <span className={`validation-msg ${error ? 'visible' : ''}`}>
          Please enter a valid waybill number.
        </span>
      </div>
    </div>
  );
}
