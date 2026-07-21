import type { Notification } from '../../types';

export type NotificationMutation =
  | Readonly<{ kind: 'read'; notificationId: string }>
  | Readonly<{ kind: 'read-all' }>
  | Readonly<{ kind: 'delete'; notificationId: string }>
  | Readonly<{ kind: 'clear' }>;

export type NotificationMutationOperation = NotificationMutation['kind'];

export interface ConfirmedNotificationMutationResult {
  confirmed: true;
  operation: NotificationMutationOperation;
  notifications: readonly Notification[];
}

export interface RejectedNotificationMutationResult {
  confirmed: false;
  operation: NotificationMutationOperation;
  notifications: readonly Notification[];
  message: string;
}

export type NotificationMutationResult =
  | ConfirmedNotificationMutationResult
  | RejectedNotificationMutationResult;

export type NotificationMutationExecutor = () => Promise<boolean>;

const FAILURE_MESSAGES: Readonly<Record<NotificationMutationOperation, string>> = {
  read: 'The notification could not be marked as read.',
  'read-all': 'The notifications could not be marked as read.',
  delete: 'The notification could not be deleted.',
  clear: 'The notifications could not be cleared.',
};

/** Pure projection of a server-confirmed mutation; input records are never mutated. */
export function projectConfirmedNotificationMutation(
  notifications: readonly Notification[],
  mutation: NotificationMutation,
): readonly Notification[] {
  switch (mutation.kind) {
    case 'read':
      return notifications.map((notification) =>
        notification.id === mutation.notificationId && !notification.read
          ? { ...notification, read: true }
          : notification,
      );
    case 'read-all':
      return notifications.map((notification) =>
        notification.read ? notification : { ...notification, read: true },
      );
    case 'delete':
      return notifications.filter((notification) => notification.id !== mutation.notificationId);
    case 'clear':
      return [];
  }
}

/**
 * Awaits the existing context operation and reports an explicit result. The
 * context remains the state owner; this adapter only describes the confirmed
 * presentation projection and returns the original snapshot on rejection.
 */
export async function runConfirmedNotificationMutation(
  confirmedNotifications: readonly Notification[],
  mutation: NotificationMutation,
  execute: NotificationMutationExecutor,
): Promise<NotificationMutationResult> {
  try {
    const confirmed = await execute();
    if (!confirmed) {
      return {
        confirmed: false,
        operation: mutation.kind,
        notifications: confirmedNotifications,
        message: FAILURE_MESSAGES[mutation.kind],
      };
    }

    return {
      confirmed: true,
      operation: mutation.kind,
      notifications: projectConfirmedNotificationMutation(confirmedNotifications, mutation),
    };
  } catch {
    return {
      confirmed: false,
      operation: mutation.kind,
      notifications: confirmedNotifications,
      message: FAILURE_MESSAGES[mutation.kind],
    };
  }
}
