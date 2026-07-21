import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './Modal.css';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface SharedModalProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  closeLabel?: string;
  submitting?: boolean;
  allowCloseWhileSubmitting?: boolean;
}

export interface LegacyModalProps extends SharedModalProps {
  isOpen: boolean;
  onClose: () => void;
  open?: never;
  onOpenChange?: never;
}

export interface ControlledModalProps extends SharedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOpen?: never;
  onClose?: never;
}

export type ModalProps = LegacyModalProps | ControlledModalProps;

type BodyChildSnapshot = Readonly<{
  ariaHidden: string | null;
  inert: string | null;
}>;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const activeModalLayers: HTMLElement[] = [];
const bodyChildSnapshots = new Map<HTMLElement, BodyChildSnapshot>();
let originalBodyOverflow = '';
let bodyObserver: MutationObserver | null = null;

function restoreBodyChild(element: HTMLElement, snapshot: BodyChildSnapshot) {
  if (snapshot.ariaHidden === null) element.removeAttribute('aria-hidden');
  else element.setAttribute('aria-hidden', snapshot.ariaHidden);

  if (snapshot.inert === null) element.removeAttribute('inert');
  else element.setAttribute('inert', snapshot.inert);
}

function applyBackgroundIsolation() {
  const activeLayer = activeModalLayers.at(-1);

  Array.from(document.body.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    if (!bodyChildSnapshots.has(child)) {
      bodyChildSnapshots.set(child, {
        ariaHidden: child.getAttribute('aria-hidden'),
        inert: child.getAttribute('inert'),
      });
    }
  });

  bodyChildSnapshots.forEach((snapshot, element) => {
    if (!element.isConnected) return;
    if (element === activeLayer) {
      restoreBodyChild(element, snapshot);
      return;
    }
    element.setAttribute('inert', '');
    element.setAttribute('aria-hidden', 'true');
  });
}

function registerModalLayer(layer: HTMLElement) {
  if (activeModalLayers.length === 0) {
    originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    bodyObserver = new MutationObserver(applyBackgroundIsolation);
    bodyObserver.observe(document.body, { childList: true });
  }

  activeModalLayers.push(layer);
  applyBackgroundIsolation();
  let registered = true;

  return () => {
    if (!registered) return;
    registered = false;
    const index = activeModalLayers.lastIndexOf(layer);
    if (index >= 0) activeModalLayers.splice(index, 1);

    if (activeModalLayers.length > 0) {
      applyBackgroundIsolation();
      return;
    }

    bodyObserver?.disconnect();
    bodyObserver = null;
    bodyChildSnapshots.forEach((snapshot, element) => restoreBodyChild(element, snapshot));
    bodyChildSnapshots.clear();
    document.body.style.overflow = originalBodyOverflow;
  };
}

function isTopModalLayer(layer: HTMLElement) {
  return activeModalLayers.at(-1) === layer;
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    const styles = window.getComputedStyle(element);
    return element.getAttribute('aria-hidden') !== 'true'
      && !element.closest('[inert]')
      && styles.display !== 'none'
      && styles.visibility !== 'hidden'
      && element.getClientRects().length > 0;
  });
}

function focusElement(element: HTMLElement) {
  if (!element.isConnected || element.closest('[inert]')) return false;
  element.focus({ preventScroll: true });
  return document.activeElement === element;
}

function focusInitialElement(dialog: HTMLElement, preferred?: HTMLElement | null) {
  if (preferred && focusElement(preferred)) return;
  const autofocus = dialog.querySelector<HTMLElement>('[autofocus]');
  if (autofocus && focusElement(autofocus)) return;
  const firstFocusable = getFocusableElements(dialog)[0];
  if (firstFocusable && focusElement(firstFocusable)) return;
  focusElement(dialog);
}

function trapTabKey(event: KeyboardEvent, dialog: HTMLElement) {
  const focusableElements = getFocusableElements(dialog);
  if (focusableElements.length === 0) {
    event.preventDefault();
    focusElement(dialog);
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (!dialog.contains(activeElement)) {
    event.preventDefault();
    focusElement(event.shiftKey ? lastElement : firstElement);
  } else if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    focusElement(lastElement);
  } else if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    focusElement(firstElement);
  }
}

function captureFocusFallbacks(invoker: HTMLElement | null) {
  const fallbacks: HTMLElement[] = [];
  let ancestor = invoker?.parentElement ?? null;
  while (ancestor) {
    fallbacks.push(ancestor);
    ancestor = ancestor.parentElement;
  }
  return fallbacks;
}

function focusWithTemporaryTabIndex(element: HTMLElement) {
  if (!element.isConnected || element.closest('[inert]')) return false;
  const previousTabIndex = element.getAttribute('tabindex');
  if (previousTabIndex === null) element.setAttribute('tabindex', '-1');
  const focused = focusElement(element);
  if (previousTabIndex === null) element.removeAttribute('tabindex');
  return focused;
}

function restoreFocus(
  preferred: HTMLElement | null,
  invoker: HTMLElement | null,
  fallbacks: readonly HTMLElement[],
) {
  if (preferred && focusElement(preferred)) return;
  if (invoker && focusElement(invoker)) return;

  const contextualFallback = fallbacks.find((element) => element.isConnected && !element.closest('[inert]'));
  if (contextualFallback && focusWithTemporaryTabIndex(contextualFallback)) return;

  const documentFallback = document.querySelector<HTMLElement>('[data-modal-focus-fallback], main, [role="main"]');
  if (documentFallback && focusWithTemporaryTabIndex(documentFallback)) return;
  focusWithTemporaryTabIndex(document.body);
}

export default function Modal(props: ModalProps) {
  const {
    title,
    description,
    children,
    footer,
    size = 'md',
    initialFocusRef,
    restoreFocusRef,
    closeOnEscape = true,
    closeOnBackdrop = true,
    showCloseButton = true,
    closeLabel = 'Close modal',
    submitting = false,
    allowCloseWhileSubmitting = false,
  } = props;
  const open = 'open' in props ? props.open : props.isOpen;
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = `ui-modal-title-${useId()}`;
  const descriptionId = `ui-modal-description-${useId()}`;
  const [portalLayer] = useState(() => {
    if (typeof document === 'undefined') return null;
    const layer = document.createElement('div');
    layer.className = 'ui-modal-portal';
    layer.dataset.modalLayer = '';
    return layer;
  });
  const ownerCloseRef = useRef<() => void>(() => undefined);
  const closePolicyRef = useRef({ closeOnEscape, closeOnBackdrop, submitting, allowCloseWhileSubmitting });
  const initialFocusTargetRef = useRef(initialFocusRef);
  const restoreFocusTargetRef = useRef(restoreFocusRef);
  const controlledClose = props.onOpenChange;
  const legacyClose = props.onClose;

  useLayoutEffect(() => {
    ownerCloseRef.current = typeof controlledClose === 'function'
      ? () => controlledClose(false)
      : (legacyClose ?? (() => undefined));
    closePolicyRef.current = { closeOnEscape, closeOnBackdrop, submitting, allowCloseWhileSubmitting };
    initialFocusTargetRef.current = initialFocusRef;
    restoreFocusTargetRef.current = restoreFocusRef;
  }, [
    allowCloseWhileSubmitting,
    closeOnBackdrop,
    closeOnEscape,
    controlledClose,
    initialFocusRef,
    legacyClose,
    restoreFocusRef,
    submitting,
  ]);

  const requestClose = useCallback(() => {
    const policy = closePolicyRef.current;
    if (policy.submitting && !policy.allowCloseWhileSubmitting) return;
    ownerCloseRef.current();
  }, []);

  useLayoutEffect(() => {
    if (!open || !portalLayer) return;
    document.body.appendChild(portalLayer);
    const unregisterLayer = registerModalLayer(portalLayer);
    const dialog = dialogRef.current;
    if (!dialog) {
      unregisterLayer();
      portalLayer.remove();
      return;
    }

    const activeElement = document.activeElement;
    const invoker = activeElement instanceof HTMLElement ? activeElement : null;
    const focusFallbacks = captureFocusFallbacks(invoker);
    const initialFocusFrame = window.requestAnimationFrame(() => {
      if (isTopModalLayer(portalLayer)) {
        focusInitialElement(dialog, initialFocusTargetRef.current?.current);
      }
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopModalLayer(portalLayer)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (closePolicyRef.current.closeOnEscape) requestClose();
      } else if (event.key === 'Tab') {
        trapTabKey(event, dialog);
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isTopModalLayer(portalLayer) || dialog.contains(event.target as Node)) return;
      focusInitialElement(dialog, initialFocusTargetRef.current?.current);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      window.cancelAnimationFrame(initialFocusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      unregisterLayer();
      portalLayer.remove();
      window.requestAnimationFrame(() => {
        restoreFocus(restoreFocusTargetRef.current?.current ?? null, invoker, focusFallbacks);
      });
    };
  }, [open, portalLayer, requestClose]);

  if (!open || !portalLayer) return null;

  const dismissBlocked = submitting && !allowCloseWhileSubmitting;
  const handleBackdropClick = () => {
    if (closePolicyRef.current.closeOnBackdrop) requestClose();
  };
  const stopDialogClick = (event: ReactMouseEvent<HTMLDivElement>) => event.stopPropagation();

  return createPortal(
    <div className="ui-modal modal-overlay" onClick={handleBackdropClick}>
      <div
        className={`ui-modal__dialog modal-container modal-${size} animate-scale-in`}
        onClick={stopDialogClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={submitting || undefined}
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="ui-modal__header modal-header">
          <div className="ui-modal__heading">
            <h2 className="ui-modal__title modal-title" id={titleId}>{title}</h2>
            {description && <p className="ui-modal__description" id={descriptionId}>{description}</p>}
          </div>
          {showCloseButton && (
            <button
              type="button"
              className="ui-modal__close modal-close"
              onClick={requestClose}
              aria-label={closeLabel}
              disabled={dismissBlocked}
            >
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="ui-modal__body modal-body">{children}</div>
        {footer && <div className="ui-modal__footer modal-footer">{footer}</div>}
      </div>
    </div>,
    portalLayer,
  );
}
