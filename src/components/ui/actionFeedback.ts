import { toast } from 'sonner';
import type { ExternalToast } from 'sonner';

export const ACTION_FEEDBACK_RETENTION_LIMIT = 256;

export type ActionFeedbackPhase = 'pending' | 'retry' | 'success' | 'failure';
export type ActionToastType = 'success' | 'error' | 'info' | 'warning';

export interface ActionToastContent {
  type: ActionToastType;
  message: string;
  options?: Omit<ExternalToast, 'id'>;
}

export type ActionFeedbackEvent =
  | Readonly<{
      actionId: string;
      phase: Extract<ActionFeedbackPhase, 'pending' | 'retry'>;
    }>
  | Readonly<{
      actionId: string;
      phase: Extract<ActionFeedbackPhase, 'success' | 'failure'>;
      /** Omit when equivalent contextual/live feedback already announces completion. */
      toast?: Readonly<ActionToastContent>;
    }>;

export interface ActionFeedbackRetention {
  readonly completedActionIds: readonly string[];
}

export interface ActionFeedbackDecision {
  readonly retention: ActionFeedbackRetention;
  readonly toast?: Readonly<ActionToastContent>;
}

export const EMPTY_ACTION_FEEDBACK_RETENTION: ActionFeedbackRetention = {
  completedActionIds: [],
};

function assertActionId(actionId: string): void {
  if (actionId.trim().length === 0) {
    throw new TypeError('Action feedback requires a non-empty actionId.');
  }
}

function assertRetentionLimit(limit: number): void {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError('Action feedback retention limit must be a positive safe integer.');
  }
}
export function reduceActionFeedback(
  retention: ActionFeedbackRetention,
  event: ActionFeedbackEvent,
  limit = ACTION_FEEDBACK_RETENTION_LIMIT,
): ActionFeedbackDecision {
  assertActionId(event.actionId);
  assertRetentionLimit(limit);

  if (event.phase === 'pending' || event.phase === 'retry') {
    return { retention };
  }

  if (retention.completedActionIds.includes(event.actionId)) {
    return { retention };
  }

  const completedActionIds = [...retention.completedActionIds, event.actionId];
  const nextRetention: ActionFeedbackRetention = {
    completedActionIds: completedActionIds.slice(-limit),
  };

  return 'toast' in event && event.toast
    ? { retention: nextRetention, toast: event.toast }
    : { retention: nextRetention };
}

export function resetActionFeedbackRetention(
  retention: ActionFeedbackRetention,
  actionId?: string,
): ActionFeedbackRetention {
  if (actionId === undefined) {
    return EMPTY_ACTION_FEEDBACK_RETENTION;
  }

  assertActionId(actionId);
  if (!retention.completedActionIds.includes(actionId)) {
    return retention;
  }

  return {
    completedActionIds: retention.completedActionIds.filter(
      (completedActionId) => completedActionId !== actionId,
    ),
  };
}

let sonnerRetention = EMPTY_ACTION_FEEDBACK_RETENTION;

/**
 * Presents final action feedback through Sonner at most once while keeping all
 * operation state, outcome decisions, and contextual feedback in the caller.
 */
export function notifyActionFeedback(event: ActionFeedbackEvent): boolean {
  const decision = reduceActionFeedback(sonnerRetention, event);
  sonnerRetention = decision.retention;

  if (!decision.toast) {
    return false;
  }

  const { type, message, options } = decision.toast;
  toast[type](message, {
    ...options,
    id: `action-feedback:${event.actionId}`,
  });
  return true;
}

/** Explicitly permits reuse of one action ID, or clears all retained IDs. */
export function resetActionFeedback(actionId?: string): void {
  sonnerRetention = resetActionFeedbackRetention(sonnerRetention, actionId);
}
