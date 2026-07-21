export type PresentationControlKind = 'modal' | 'drawer' | 'filter' | 'pager' | 'dropdown';

export type PresentationOwnerReducer<TState, TArguments extends readonly unknown[]> = (
  ownerState: TState,
  ...args: TArguments
) => TState;

export interface PresentationControlCallbackInvocation<
  TState,
  TName extends string,
  TArguments extends readonly unknown[],
> {
  readonly index: number;
  readonly name: TName;
  readonly arguments: TArguments;
  readonly callback: PresentationOwnerReducer<TState, TArguments>;
  readonly previousOwnerState: TState;
  readonly ownerState: TState;
}

export type PresentationControlSafetyException =
  | 'submitting-modal-dismissal'
  | 'baseline-disabled-pager-action'
  | 'current-pager-action';

export type PresentationControlSuppressionReason =
  | PresentationControlSafetyException
  | 'interaction-not-applicable'
  | 'control-disabled'
  | 'dismissal-disabled';

export interface PresentationControlTransition<
  TState,
  TControl extends PresentationControlKind,
  TEvent,
  TInvocation,
> {
  readonly control: TControl;
  readonly event: TEvent;
  readonly previousOwnerState: TState;
  readonly ownerState: TState;
  readonly callbacks: readonly TInvocation[];
  readonly callbackOrder: readonly string[];
  readonly suppressedBy?: PresentationControlSuppressionReason;
}
/**
 * These are intentional baseline operation-safety rules, not presentation drift:
 * modal dismissal cannot interrupt an in-flight submission unless explicitly
 * allowed; pager controls that are baseline-disabled or already current cannot
 * invoke an owner callback.
 */
export const PRESENTATION_CONTROL_OPERATION_SAFETY_EXCEPTIONS = Object.freeze({
  submittingModalDismissal: 'submitting-modal-dismissal',
  baselineDisabledPagerAction: 'baseline-disabled-pager-action',
  currentPagerAction: 'current-pager-action',
} as const);

function invokeOwner<TState, TName extends string, TArguments extends readonly unknown[]>(
  ownerState: TState,
  index: number,
  name: TName,
  args: TArguments,
  callback: PresentationOwnerReducer<TState, TArguments>,
): PresentationControlCallbackInvocation<TState, TName, TArguments> {
  return {
    index,
    name,
    arguments: args,
    callback,
    previousOwnerState: ownerState,
    ownerState: callback(ownerState, ...args),
  };
}

function noCallbackTransition<
  TState,
  TControl extends PresentationControlKind,
  TEvent,
  TInvocation,
>(
  control: TControl,
  event: TEvent,
  ownerState: TState,
  suppressedBy: PresentationControlSuppressionReason,
): PresentationControlTransition<TState, TControl, TEvent, TInvocation> {
  return {
    control,
    event,
    previousOwnerState: ownerState,
    ownerState,
    callbacks: [],
    callbackOrder: [],
    suppressedBy,
  };
}

function callbackTransition<
  TState,
  TControl extends PresentationControlKind,
  TEvent,
  TInvocation extends Readonly<{ name: string; ownerState: TState }>,
>(
  control: TControl,
  event: TEvent,
  previousOwnerState: TState,
  callbacks: readonly TInvocation[],
): PresentationControlTransition<TState, TControl, TEvent, TInvocation> {
  return {
    control,
    event,
    previousOwnerState,
    ownerState: callbacks.at(-1)?.ownerState ?? previousOwnerState,
    callbacks,
    callbackOrder: callbacks.map(({ name }) => name),
  };
}
export type ModalDismissEvent = 'close-button' | 'cancel' | 'backdrop' | 'escape';

export type ModalOwnerCallbacks<TState> =
  | Readonly<{
      onOpenChange: PresentationOwnerReducer<TState, readonly [open: boolean]>;
      onClose?: never;
    }>
  | Readonly<{
      onClose: PresentationOwnerReducer<TState, readonly []>;
      onOpenChange?: never;
    }>;

export interface ModalTransitionPolicy {
  readonly closeOnEscape?: boolean;
  readonly closeOnBackdrop?: boolean;
  readonly submitting?: boolean;
  readonly allowCloseWhileSubmitting?: boolean;
}

type ModalInvocation<TState> =
  | PresentationControlCallbackInvocation<TState, 'onOpenChange', readonly [open: boolean]>
  | PresentationControlCallbackInvocation<TState, 'onClose', readonly []>;

export function transitionModalControl<TState>(
  ownerState: TState,
  open: boolean,
  event: ModalDismissEvent,
  callbacks: ModalOwnerCallbacks<TState>,
  policy: ModalTransitionPolicy = {},
): PresentationControlTransition<TState, 'modal', ModalDismissEvent, ModalInvocation<TState>> {
  if (!open) {
    return noCallbackTransition('modal', event, ownerState, 'interaction-not-applicable');
  }
  if (event === 'escape' && policy.closeOnEscape === false) {
    return noCallbackTransition('modal', event, ownerState, 'dismissal-disabled');
  }
  if (event === 'backdrop' && policy.closeOnBackdrop === false) {
    return noCallbackTransition('modal', event, ownerState, 'dismissal-disabled');
  }
  if (policy.submitting && !policy.allowCloseWhileSubmitting) {
    return noCallbackTransition('modal', event, ownerState, 'submitting-modal-dismissal');
  }

  const invocation: ModalInvocation<TState> = callbacks.onOpenChange
    ? invokeOwner<TState, 'onOpenChange', readonly [boolean]>(
        ownerState,
        0,
        'onOpenChange',
        [false],
        callbacks.onOpenChange,
      )
    : invokeOwner(ownerState, 0, 'onClose', [] as const, callbacks.onClose);
  return callbackTransition('modal', event, ownerState, [invocation]);
}

export type DrawerTransitionEvent =
  | 'open-trigger'
  | 'close-button'
  | 'backdrop'
  | 'escape'
  | 'route-change'
  | 'desktop-enter';

export interface DrawerTransitionPolicy {
  readonly desktop?: boolean;
}

type OpenChangeInvocation<TState> = PresentationControlCallbackInvocation<
  TState,
  'onOpenChange',
  readonly [open: boolean]
>;
export function transitionDrawerControl<TState>(
  ownerState: TState,
  open: boolean,
  event: DrawerTransitionEvent,
  onOpenChange: PresentationOwnerReducer<TState, readonly [open: boolean]>,
  policy: DrawerTransitionPolicy = {},
): PresentationControlTransition<TState, 'drawer', DrawerTransitionEvent, OpenChangeInvocation<TState>> {
  const opening = event === 'open-trigger';
  if ((opening && (open || policy.desktop)) || (!opening && !open)) {
    return noCallbackTransition('drawer', event, ownerState, 'interaction-not-applicable');
  }

  const invocation = invokeOwner(ownerState, 0, 'onOpenChange', [opening] as const, onOpenChange);
  return callbackTransition('drawer', event, ownerState, [invocation]);
}

export type FilterTransitionEvent = 'trigger' | 'escape' | 'outside-pointer';

export function transitionFilterControl<TState>(
  ownerState: TState,
  open: boolean,
  event: FilterTransitionEvent,
  onOpenChange: PresentationOwnerReducer<TState, readonly [open: boolean]>,
  policy: Readonly<{ closeOnEscape?: boolean; closeOnOutsidePointer?: boolean }> = {},
): PresentationControlTransition<TState, 'filter', FilterTransitionEvent, OpenChangeInvocation<TState>> {
  if (event === 'escape' && (!open || policy.closeOnEscape === false)) {
    return noCallbackTransition('filter', event, ownerState, 'dismissal-disabled');
  }
  if (event === 'outside-pointer' && (!open || policy.closeOnOutsidePointer === false)) {
    return noCallbackTransition('filter', event, ownerState, 'dismissal-disabled');
  }

  const nextOpen = event === 'trigger' ? !open : false;
  const invocation = invokeOwner(ownerState, 0, 'onOpenChange', [nextOpen] as const, onOpenChange);
  return callbackTransition('filter', event, ownerState, [invocation]);
}

export type PresentationControlId = string | number;
export interface PagerTransitionPage<Id extends PresentationControlId> {
  readonly id: Id;
  readonly disabled?: boolean;
}
export type PagerTransitionEvent<Id extends PresentationControlId> =
  | Readonly<{ type: 'previous' }>
  | Readonly<{ type: 'next' }>
  | Readonly<{ type: 'page'; pageId: Id }>;
export interface PagerOwnerCallbacks<TState, Id extends PresentationControlId> {
  readonly onPrevious: PresentationOwnerReducer<TState, readonly []>;
  readonly onNext: PresentationOwnerReducer<TState, readonly []>;
  readonly onPageChange: PresentationOwnerReducer<TState, readonly [pageId: Id]>;
}

type PagerInvocation<TState, Id extends PresentationControlId> =
  | PresentationControlCallbackInvocation<TState, 'onPrevious', readonly []>
  | PresentationControlCallbackInvocation<TState, 'onNext', readonly []>
  | PresentationControlCallbackInvocation<TState, 'onPageChange', readonly [pageId: Id]>;
export function transitionPagerControl<TState, Id extends PresentationControlId>(
  ownerState: TState,
  currentPageId: Id,
  event: PagerTransitionEvent<Id>,
  pages: readonly PagerTransitionPage<Id>[],
  callbacks: PagerOwnerCallbacks<TState, Id>,
  disabled: Readonly<{ previous: boolean; next: boolean }>,
): PresentationControlTransition<TState, 'pager', PagerTransitionEvent<Id>, PagerInvocation<TState, Id>> {
  if (event.type === 'previous') {
    if (disabled.previous) {
      return noCallbackTransition('pager', event, ownerState, 'baseline-disabled-pager-action');
    }
    const invocation = invokeOwner(ownerState, 0, 'onPrevious', [] as const, callbacks.onPrevious);
    return callbackTransition('pager', event, ownerState, [invocation]);
  }
  if (event.type === 'next') {
    if (disabled.next) {
      return noCallbackTransition('pager', event, ownerState, 'baseline-disabled-pager-action');
    }
    const invocation = invokeOwner(ownerState, 0, 'onNext', [] as const, callbacks.onNext);
    return callbackTransition('pager', event, ownerState, [invocation]);
  }

  const page = pages.find(({ id }) => Object.is(id, event.pageId));
  if (!page || page.disabled) {
    return noCallbackTransition('pager', event, ownerState, 'baseline-disabled-pager-action');
  }
  if (Object.is(event.pageId, currentPageId)) {
    return noCallbackTransition('pager', event, ownerState, 'current-pager-action');
  }
  const invocation = invokeOwner(
    ownerState,
    0,
    'onPageChange',
    [event.pageId] as const,
    callbacks.onPageChange,
  );
  return callbackTransition('pager', event, ownerState, [invocation]);
}

export type DropdownTransitionEvent<Id extends PresentationControlId> =
  | 'trigger'
  | 'escape'
  | 'outside-pointer'
  | Readonly<{ type: 'select'; optionId: Id }>;
export interface DropdownOwnerCallbacks<TState, Id extends PresentationControlId> {
  readonly onOpenChange: PresentationOwnerReducer<TState, readonly [open: boolean]>;
  readonly onSelectedIdChange: PresentationOwnerReducer<TState, readonly [selectedId: Id]>;
}
export interface DropdownTransitionPolicy<Id extends PresentationControlId> {
  readonly disabled?: boolean;
  readonly disabledOptionIds?: readonly Id[];
  readonly closeOnEscape?: boolean;
  readonly closeOnOutsidePointer?: boolean;
}

type DropdownInvocation<TState, Id extends PresentationControlId> =
  | OpenChangeInvocation<TState>
  | PresentationControlCallbackInvocation<TState, 'onSelectedIdChange', readonly [selectedId: Id]>;
export function transitionDropdownControl<TState, Id extends PresentationControlId>(
  ownerState: TState,
  open: boolean,
  event: DropdownTransitionEvent<Id>,
  callbacks: DropdownOwnerCallbacks<TState, Id>,
  policy: DropdownTransitionPolicy<Id> = {},
): PresentationControlTransition<TState, 'dropdown', DropdownTransitionEvent<Id>, DropdownInvocation<TState, Id>> {
  if (policy.disabled) {
    return noCallbackTransition('dropdown', event, ownerState, 'control-disabled');
  }
  if (event === 'escape' && (!open || policy.closeOnEscape === false)) {
    return noCallbackTransition('dropdown', event, ownerState, 'dismissal-disabled');
  }
  if (event === 'outside-pointer' && (!open || policy.closeOnOutsidePointer === false)) {
    return noCallbackTransition('dropdown', event, ownerState, 'dismissal-disabled');
  }
  if (typeof event === 'object') {
    if (!open || policy.disabledOptionIds?.some((id) => Object.is(id, event.optionId))) {
      return noCallbackTransition('dropdown', event, ownerState, 'interaction-not-applicable');
    }
    const selected = invokeOwner(
      ownerState,
      0,
      'onSelectedIdChange',
      [event.optionId] as const,
      callbacks.onSelectedIdChange,
    );
    const closed = invokeOwner<TState, 'onOpenChange', readonly [boolean]>(
      selected.ownerState,
      1,
      'onOpenChange',
      [false],
      callbacks.onOpenChange,
    );
    return callbackTransition('dropdown', event, ownerState, [selected, closed]);
  }

  const nextOpen = event === 'trigger' ? !open : false;
  const invocation = invokeOwner(ownerState, 0, 'onOpenChange', [nextOpen] as const, callbacks.onOpenChange);
  return callbackTransition('dropdown', event, ownerState, [invocation]);
}

export type PresentationPopupRole = 'dialog' | 'listbox';
export interface PresentationRelationshipMetadata {
  readonly triggerId: string;
  readonly contentId: string;
  readonly expanded: boolean;
  readonly popupRole: PresentationPopupRole;
}
export interface PresentationFocusMetadata {
  readonly initialFocus: 'dialog' | 'close-control' | 'selected-or-first-option' | 'owner-managed';
  readonly containment: 'modal' | 'none';
  readonly restoreFocus: 'invoker-or-fallback' | 'invoker' | 'owner-managed';
}
export interface PresentationControlMetadata {
  readonly control: Exclude<PresentationControlKind, 'pager'>;
  readonly relationship?: PresentationRelationshipMetadata;
  readonly focus: PresentationFocusMetadata;
}
/** Accessibility metadata is deliberately outside owner transition results. */
export function createPresentationControlMetadata(
  control: Exclude<PresentationControlKind, 'pager'>,
  relationship?: PresentationRelationshipMetadata,
): PresentationControlMetadata {
  if (control === 'modal') {
    return {
      control,
      focus: {
        initialFocus: 'dialog',
        containment: 'modal',
        restoreFocus: 'invoker-or-fallback',
      },
    };
  }
  if (control === 'drawer') {
    return {
      control,
      relationship,
      focus: {
        initialFocus: 'close-control',
        containment: 'modal',
        restoreFocus: 'invoker',
      },
    };
  }
  return {
    control,
    relationship,
    focus: {
      initialFocus: control === 'dropdown' ? 'selected-or-first-option' : 'owner-managed',
      containment: 'none',
      restoreFocus: 'invoker',
    },
  };
}
