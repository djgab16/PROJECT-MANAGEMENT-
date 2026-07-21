import { Check, Clock, Truck, PackageCheck, Circle } from 'lucide-react';
import './TrackingTimeline.css';
import type { PublicTrackingEvent } from '../../../api/publicTrackingApi';

interface TrackingTimelineProps {
  events: PublicTrackingEvent[];
  currentStatus: string;
}

const MILESTONES = ['Pending', 'For Pickup', 'In Transit', 'Delivered'];

export default function TrackingTimeline({ events, currentStatus }: TrackingTimelineProps) {
  
  const getMilestoneIndex = (status: string) => {
    // Basic mapping
    if (status === 'Failed') return 2; // Treat failed as stuck in transit for visual simplicity
    const idx = MILESTONES.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  const currentIndex = getMilestoneIndex(currentStatus);

  const getIcon = (index: number, isCompleted: boolean, isCurrent: boolean) => {
    if (isCompleted && !isCurrent) return <Check size={16} />;
    switch (index) {
      case 0: return <Clock size={16} />;
      case 1: return <Circle size={16} />;
      case 2: return <Truck size={16} />;
      case 3: return <PackageCheck size={16} />;
      default: return <Circle size={16} />;
    }
  };

  return (
    <div className="tracking-timeline-wrapper">
      <h3 className="timeline-title">Tracking History</h3>
      
      {/* Visual Stepper */}
      <div className="stepper-container">
        {MILESTONES.map((milestone, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={milestone} className={`step-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
              <div className="step-icon-wrapper">
                {getIcon(index, isCompleted, isCurrent)}
              </div>
              <span className="step-label">{milestone}</span>
              {index < MILESTONES.length - 1 && <div className="step-connector"></div>}
            </div>
          );
        })}
      </div>

      {/* Detailed History Log */}
      <div className="history-log">
        {events.map((event, idx) => (
          <div
            key={`${event.timestamp}:${event.status}:${event.location ?? ''}:${event.description}`}
            className="history-event fade-in"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="history-time">
              <span>{event.timestamp.split(' ')[0]}</span>
              <span className="time">{event.timestamp.split(' ')[1]} {event.timestamp.split(' ')[2]}</span>
            </div>
            <div className="history-node">
              <div className="node-circle"></div>
              {idx !== events.length - 1 && <div className="node-line"></div>}
            </div>
            <div className="history-content">
              <h4>{event.status}</h4>
              <p>{event.description}</p>
              {event.location && <span className="event-location">📍 {event.location}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
