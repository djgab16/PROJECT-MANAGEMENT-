/** Caller-owned editability. The adapter never derives domain permissions. */
export type ControlledFieldMode = 'editable' | 'read-only' | 'disabled';

export type ControlledOwnerChange<TState, TChange> = (
  ownerState: TState,
  change: TChange,
) => TState;

export interface ControlledChangeTransition<TState, TChange> {
  readonly kind: 'change';
  readonly mode: ControlledFieldMode;
  readonly previousOwnerState: TState;
  readonly ownerState: TState;
  readonly change: TChange;
  readonly ownerChange: ControlledOwnerChange<TState, TChange>;
  readonly callbackOrder: readonly [] | readonly ['change'];
}

/**
 * Forwards one user-originated change synchronously to the supplied owner.
 * Read-only and disabled modes preserve the exact owner-state reference.
 */
export function forwardControlledChange<TState, TChange>(
  ownerState: TState,
  change: TChange,
  ownerChange: ControlledOwnerChange<TState, TChange>,
  mode: ControlledFieldMode = 'editable',
): ControlledChangeTransition<TState, TChange> {
  if (mode !== 'editable') {
    return {
      kind: 'change', mode, previousOwnerState: ownerState, ownerState,
      change, ownerChange, callbackOrder: [],
    };
  }

  return {
    kind: 'change', mode, previousOwnerState: ownerState,
    ownerState: ownerChange(ownerState, change), change, ownerChange,
    callbackOrder: ['change'],
  };
}

export type ControlledValidator<TState, TValidation> = (
  ownerState: Readonly<TState>,
) => TValidation;

export interface ControlledValidationTransition<TState, TValidation> {
  readonly kind: 'validation';
  readonly ownerState: TState;
  readonly validator: ControlledValidator<TState, TValidation>;
  readonly validation: TValidation;
  readonly callbackOrder: readonly ['validate'];
}

/** Runs validation only when the caller requests it; no submit is inferred. */
export function runControlledValidation<TState, TValidation>(
  ownerState: TState,
  validator: ControlledValidator<TState, TValidation>,
): ControlledValidationTransition<TState, TValidation> {
  return {
    kind: 'validation', ownerState, validator,
    validation: validator(ownerState), callbackOrder: ['validate'],
  };
}

export type ControlledPayloadBuilder<TState, TPayload> = (
  ownerState: Readonly<TState>,
) => TPayload;

export interface ControlledPayloadTransition<TState, TPayload> {
  readonly kind: 'payload';
  readonly ownerState: TState;
  readonly payloadBuilder: ControlledPayloadBuilder<TState, TPayload>;
  readonly payload: TPayload;
  readonly callbackOrder: readonly ['build-payload'];
}

/** Uses the caller's exact builder and returns its exact payload output. */
export function buildControlledPayload<TState, TPayload>(
  ownerState: TState,
  payloadBuilder: ControlledPayloadBuilder<TState, TPayload>,
): ControlledPayloadTransition<TState, TPayload> {
  return {
    kind: 'payload', ownerState, payloadBuilder,
    payload: payloadBuilder(ownerState), callbackOrder: ['build-payload'],
  };
}

export interface ControlledCallbackStep<TResult = unknown> {
  readonly id: string;
  readonly callback: () => TResult;
}

export interface ControlledCallbackInvocation<TResult = unknown> {
  readonly kind: 'callback';
  readonly index: number;
  readonly id: string;
  readonly callback: () => TResult;
  readonly result: TResult;
}

/** Invokes caller-supplied callbacks once, synchronously, and in array order. */
export function invokeControlledCallbacks<TResult>(
  steps: readonly ControlledCallbackStep<TResult>[],
): readonly ControlledCallbackInvocation<TResult>[] {
  return steps.map(({ id, callback }, index) => ({
    kind: 'callback', index, id, callback, result: callback(),
  }));
}

export type ControlledRejectionRecovery<TState, TReason> = (
  ownerState: TState,
  reason: TReason,
) => TState;

export interface ControlledRejectionTransition<TState, TReason> {
  readonly kind: 'rejected';
  readonly previousOwnerState: TState;
  readonly ownerState: TState;
  readonly reason: TReason;
  readonly recovery?: ControlledRejectionRecovery<TState, TReason>;
  readonly recoveryRule: 'preserve' | 'explicit-owner-recovery';
  readonly callbackOrder: readonly [] | readonly ['reject-recovery'];
}

/**
 * Preserves the exact state reference after rejection unless the baseline owner
 * explicitly supplies its existing reset or rollback rule.
 */
export function resolveControlledRejection<TState, TReason>(
  ownerState: TState,
  reason: TReason,
  recovery?: ControlledRejectionRecovery<TState, TReason>,
): ControlledRejectionTransition<TState, TReason> {
  if (!recovery) {
    return {
      kind: 'rejected', previousOwnerState: ownerState, ownerState, reason,
      recoveryRule: 'preserve', callbackOrder: [],
    };
  }

  return {
    kind: 'rejected', previousOwnerState: ownerState,
    ownerState: recovery(ownerState, reason), reason, recovery,
    recoveryRule: 'explicit-owner-recovery', callbackOrder: ['reject-recovery'],
  };
}

export type ControlledFormContractTransition<
  TState,
  TChange,
  TValidation,
  TPayload,
  TReason,
> =
  | ControlledChangeTransition<TState, TChange>
  | ControlledValidationTransition<TState, TValidation>
  | ControlledPayloadTransition<TState, TPayload>
  | ControlledRejectionTransition<TState, TReason>;
