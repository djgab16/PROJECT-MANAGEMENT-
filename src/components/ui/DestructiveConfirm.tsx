import type { ReactNode, RefObject } from 'react';
import Button from './Button';
import Modal, { type ModalSize } from './Modal';

export interface DestructiveConfirmProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  children?: ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  submitting?: boolean;
  size?: ModalSize;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  allowCancelWhileSubmitting?: boolean;
}

/**
 * Presentation-only destructive confirmation. The owner controls `open`, performs
 * the operation, and decides when to close; confirm never calls cancel or closes.
 */
export default function DestructiveConfirm({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  children,
  cancelLabel = 'Cancel',
  confirmLabel,
  submitting = false,
  size = 'sm',
  initialFocusRef,
  restoreFocusRef,
  allowCancelWhileSubmitting = false,
}: DestructiveConfirmProps) {
  const cancellationDisabled = submitting && !allowCancelWhileSubmitting;

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
      }}
      title={title}
      description={description}
      size={size}
      initialFocusRef={initialFocusRef}
      restoreFocusRef={restoreFocusRef}
      submitting={submitting}
      allowCloseWhileSubmitting={allowCancelWhileSubmitting}
      showCloseButton={false}
      footer={
        <div className="ui-destructive-confirm__actions">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={cancellationDisabled}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            loading={submitting}
            disabled={submitting}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {children}
    </Modal>
  );
}