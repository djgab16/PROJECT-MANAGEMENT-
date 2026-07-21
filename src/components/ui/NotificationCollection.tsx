import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { Notification } from '../../types';
import FeedbackState from './FeedbackState';
import './notificationPresentation.css';

export type NotificationPresentationVariant = 'compact' | 'list';
export type NotificationViewState = 'ready' | 'loading' | 'error';

export interface NotificationCollectionEmptyState {
  title: string;
  description?: string;
}

export interface NotificationCollectionProps {
  notifications: readonly Notification[];
  variant: NotificationPresentationVariant;
  onActivate: (notification: Notification) => void;
  empty: NotificationCollectionEmptyState;
  selectedId?: string;
  checkedIds?: readonly string[];
  selectionMode?: boolean;
  showCheckboxes?: boolean;
  onCheckedChange?: (notificationId: string, checked: boolean) => void;
  renderStatus?: (notification: Notification) => ReactNode;
  grouped?: boolean;
  limit?: number;
  viewState?: NotificationViewState;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
}

interface NotificationItemProps {
  notification: Notification;
  variant: NotificationPresentationVariant;
  selected: boolean;
  checked: boolean;
  selectionMode: boolean;
  showCheckbox: boolean;
  onActivate: (notification: Notification) => void;
  onCheckedChange?: (notificationId: string, checked: boolean) => void;
  status?: ReactNode;
}

function NotificationTypeIcon({ notification }: { notification: Notification }) {
  switch (notification.type) {
    case 'alert':
      return <AlertCircle aria-hidden="true" />;
    case 'success':
      return <CheckCircle2 aria-hidden="true" />;
    default:
      return <Info aria-hidden="true" />;
  }
}

function CompactNotificationItem({ notification, onActivate }: NotificationItemProps) {
  return (
    <button
      type="button"
      className={`ui-notification-item ui-notification-item--compact notification-dropdown-item ${notification.read ? '' : 'unread'}`.trim()}
      onClick={() => onActivate(notification)}
      aria-label={`${notification.title}${notification.read ? '' : ', unread'}`}
    >
      <span className="notification-dropdown-item-content">
        <span className={`notification-dropdown-icon-container ${notification.type || 'info'}`}>
          <NotificationTypeIcon notification={notification} />
        </span>
        <span className="notification-dropdown-text-container">
          <span className="notification-dropdown-item-header">
            <span className="notification-dropdown-item-title">{notification.title}</span>
            {!notification.read && <span className="notification-dropdown-unread-dot" aria-hidden="true" />}
          </span>
          <span className="notification-dropdown-item-desc">{notification.description}</span>
          <span className="notification-dropdown-item-time">{notification.timestamp}</span>
        </span>
      </span>
    </button>
  );
}

function ListNotificationItem({
  notification,
  selected,
  checked,
  selectionMode,
  showCheckbox,
  onActivate,
  onCheckedChange,
  status,
}: NotificationItemProps) {
  return (
    <div
      className={[
        'ui-notification-item',
        'ui-notification-item--list',
        'notif-item',
        selected && 'selected',
        !notification.read && 'unread',
        selectionMode && checked && 'checked',
      ].filter(Boolean).join(' ')}
      data-notification-id={notification.id}
    >
      {showCheckbox && (
        <input
          type="checkbox"
          className="notif-checkbox"
          aria-label={`Select notification: ${notification.title}`}
          checked={checked}
          onChange={(event) => onCheckedChange?.(notification.id, event.target.checked)}
        />
      )}
      <button
        type="button"
        className="ui-notification-item__activation"
        onClick={() => onActivate(notification)}
        aria-pressed={selected || undefined}
      >
        <span className="notif-item-content">
          <span className="notif-item-header">
            <strong>{notification.title}</strong>
            {notification.waybillNo && <span className="notif-waybill">{notification.waybillNo}</span>}
            {status}
          </span>
          <span className="notif-item-desc">{notification.description}</span>
          <span className="notif-item-meta">
            {notification.timestamp} · {notification.source}
            {!notification.read && <span className="ui-notification-item__unread-text"> · Unread</span>}
          </span>
        </span>
      </button>
    </div>
  );
}

function NotificationItem(props: NotificationItemProps) {
  return props.variant === 'compact'
    ? <CompactNotificationItem {...props} />
    : <ListNotificationItem {...props} />;
}

export default function NotificationCollection({
  notifications,
  variant,
  onActivate,
  empty,
  selectedId,
  checkedIds = [],
  selectionMode = false,
  showCheckboxes = false,
  onCheckedChange,
  renderStatus,
  grouped = false,
  limit,
  viewState = 'ready',
  errorMessage,
  onRetry,
  className = '',
}: NotificationCollectionProps) {
  if (viewState === 'loading') {
    return (
      <FeedbackState
        kind="loading"
        title="Loading notifications"
        description="Retrieving your latest confirmed notifications."
      />
    );
  }

  if (viewState === 'error') {
    return (
      <FeedbackState
        kind="error"
        title="Notifications are unavailable"
        description={errorMessage}
        action={onRetry ? (
          <button type="button" className="ui-button ui-button--outline" onClick={onRetry}>
            Try again
          </button>
        ) : undefined}
      />
    );
  }

  const visibleNotifications = limit === undefined
    ? notifications
    : notifications.slice(0, limit);

  if (visibleNotifications.length === 0) {
    return (
      <div className="ui-notification-collection__empty" role="status">
        <strong>{empty.title}</strong>
        {empty.description && <span>{empty.description}</span>}
      </div>
    );
  }

  const renderItem = (notification: Notification) => (
    <NotificationItem
      key={notification.id}
      notification={notification}
      variant={variant}
      selected={selectedId === notification.id}
      checked={checkedIds.includes(notification.id)}
      selectionMode={selectionMode}
      showCheckbox={showCheckboxes}
      onActivate={onActivate}
      onCheckedChange={onCheckedChange}
      status={renderStatus?.(notification)}
    />
  );

  if (!grouped) {
    return (
      <div className={`ui-notification-collection ui-notification-collection--${variant} ${className}`.trim()}>
        {visibleNotifications.map(renderItem)}
      </div>
    );
  }

  const groups = visibleNotifications.reduce<Record<string, Notification[]>>((result, notification) => {
    (result[notification.date] ??= []).push(notification);
    return result;
  }, {});

  return (
    <div className={`ui-notification-collection ui-notification-collection--grouped ${className}`.trim()}>
      {Object.entries(groups).map(([date, items]) => (
        <section key={date} className="ui-notification-group" aria-label={date}>
          <h2 className="notif-date-header">{date.toUpperCase()}</h2>
          {items.map(renderItem)}
        </section>
      ))}
    </div>
  );
}
