import {
  useCallback,
  useLayoutEffect,
  useRef,
  type RefObject,
} from 'react';

interface ControlledPopupOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rootRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  closeOnOutsidePointer?: boolean;
}

function focusInvoker(
  preferred: HTMLElement | null,
  trigger: HTMLElement | null,
  invoker: HTMLElement | null,
) {
  const target = [preferred, trigger, invoker].find(
    (element): element is HTMLElement => Boolean(element?.isConnected && !element.closest('[inert]')),
  );
  target?.focus({ preventScroll: true });
}

/** Accessibility-only mechanics; the caller remains the source of popup state. */
export function useControlledPopup({
  open,
  onOpenChange,
  rootRef,
  triggerRef,
  restoreFocusRef,
  closeOnEscape = true,
  closeOnOutsidePointer = true,
}: ControlledPopupOptions) {
  const restoreRequestedRef = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);

  useLayoutEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  const closeAndRestore = useCallback(() => {
    restoreRequestedRef.current = true;
    onOpenChangeRef.current(false);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    const trigger = triggerRef.current;
    const active = document.activeElement;
    const invoker = active instanceof HTMLElement ? active : trigger;
    const restoreTarget = restoreFocusRef?.current ?? null;
    restoreRequestedRef.current = false;

    const handlePointerDown = (event: PointerEvent) => {
      if (!closeOnOutsidePointer || root?.contains(event.target as Node)) return;
      closeAndRestore();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape'
        || !closeOnEscape
        || !root?.contains(document.activeElement)
      ) return;
      event.preventDefault();
      event.stopPropagation();
      closeAndRestore();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      const focused = document.activeElement;
      const focusWasInside = focused instanceof Node && Boolean(root?.contains(focused));
      if (!restoreRequestedRef.current && !focusWasInside) return;
      window.requestAnimationFrame(() => {
        focusInvoker(restoreTarget, trigger, invoker);
      });
    };
  }, [
    closeAndRestore,
    closeOnEscape,
    closeOnOutsidePointer,
    open,
    restoreFocusRef,
    rootRef,
    triggerRef,
  ]);

  return { closeAndRestore } as const;
}
