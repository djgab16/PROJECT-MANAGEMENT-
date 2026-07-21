import {
  BadgeCheck,
  Ban,
  CircleCheck,
  CircleHelp,
  CircleX,
  Clock3,
  FileCheck2,
  FileClock,
  FileX2,
  LoaderCircle,
  LockKeyhole,
  Navigation,
  PackageCheck,
  PackageOpen,
  RotateCcw,
  Truck,
  Undo2,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import type { AccountStatus, DeliveryStatus, PODStatus, POTStatus } from '../../types';
import type { Tone } from './contracts';

export interface SemanticStatusPresentation {
  readonly label: string;
  readonly tone: Tone;
  readonly icon: LucideIcon;
  readonly assistiveText: string;
}

export interface CanonicalStatusByDomain {
  readonly delivery: DeliveryStatus;
  readonly account: AccountStatus;
  readonly pod: PODStatus;
  readonly pot: POTStatus;
}

export type CanonicalStatusDomain = keyof CanonicalStatusByDomain;
export type CanonicalStatusFor<D extends CanonicalStatusDomain> = CanonicalStatusByDomain[D];
export type CanonicalStatusPresentationMap = {
  readonly [D in CanonicalStatusDomain]: Readonly<
    Record<CanonicalStatusFor<D>, SemanticStatusPresentation>
  >;
};

const status = (
  label: string,
  tone: Tone,
  icon: LucideIcon,
  assistiveText: string,
): SemanticStatusPresentation => Object.freeze({ label, tone, icon, assistiveText });
export const canonicalStatusPresentationMap = Object.freeze({
  delivery: Object.freeze({
    Pending: status('Pending', 'warning', Clock3, 'Delivery status: Pending'),
    Processing: status('Processing', 'info', LoaderCircle, 'Delivery status: Processing'),
    Assigned: status('Assigned', 'brand', UserCheck, 'Delivery status: Assigned'),
    'Picked Up': status('Picked Up', 'info', PackageCheck, 'Delivery status: Picked up'),
    'In Transit': status('In Transit', 'info', Truck, 'Delivery status: In transit'),
    'Out for Delivery': status(
      'Out for Delivery',
      'brand',
      Navigation,
      'Delivery status: Out for delivery',
    ),
    Delivered: status('Delivered', 'success', CircleCheck, 'Delivery status: Delivered'),
    Completed: status('Completed', 'success', BadgeCheck, 'Delivery status: Completed'),
    Failed: status('Failed', 'danger', CircleX, 'Delivery status: Failed'),
    Returning: status('Returning', 'warning', Undo2, 'Delivery status: Returning'),
    Returned: status('Returned', 'danger', RotateCcw, 'Delivery status: Returned'),
    Cancelled: status('Cancelled', 'danger', Ban, 'Delivery status: Cancelled'),
    Preparing: status('Preparing', 'info', PackageOpen, 'Delivery status: Preparing'),
    'Ready for Pickup': status(
      'Ready for Pickup',
      'brand',
      PackageCheck,
      'Delivery status: Ready for pickup',
    ),
    'Pending Approval': status(
      'Pending Approval',
      'warning',
      Clock3,
      'Delivery status: Pending approval',
    ),
  }),
  account: Object.freeze({
    Active: status('Active', 'success', CircleCheck, 'Account status: Active'),
    Pending: status('Pending', 'warning', Clock3, 'Account status: Pending'),
    Locked: status('Locked', 'danger', LockKeyhole, 'Account status: Locked'),
  }),
  pod: Object.freeze({
    Submitted: status('Submitted', 'success', FileCheck2, 'Proof of delivery status: Submitted'),
    'No POD': status('No POD', 'danger', FileX2, 'Proof of delivery status: No POD'),
    'Not Submitted': status(
      'Not Submitted',
      'warning',
      FileClock,
      'Proof of delivery status: Not submitted',
    ),
  }),
  pot: Object.freeze({
    Submitted: status('Submitted', 'success', FileCheck2, 'Proof of transaction status: Submitted'),
    'No POT': status('No POT', 'danger', FileX2, 'Proof of transaction status: No POT'),
    'Not Submitted': status(
      'Not Submitted',
      'warning',
      FileClock,
      'Proof of transaction status: Not submitted',
    ),
  }),
} satisfies CanonicalStatusPresentationMap);

export const UNKNOWN_STATUS_PRESENTATION: SemanticStatusPresentation = status(
  'Unknown status',
  'neutral',
  CircleHelp,
  'Status is not recognized',
);

const reportedUnknownStatuses = new Set<string>();
const reportUnknownStatus = (domain: CanonicalStatusDomain, value: string): void => {
  if (!import.meta.env.DEV) return;

  const reportKey = `${domain}\u0000${value}`;
  if (reportedUnknownStatuses.has(reportKey)) return;

  reportedUnknownStatuses.add(reportKey);
  console.warn(
    `[status-presentation] Unknown ${domain} status; using the neutral fallback.`,
    value,
  );
};

export function resolveCanonicalStatusPresentation<D extends CanonicalStatusDomain>(
  domain: D,
  value: CanonicalStatusFor<D>,
): SemanticStatusPresentation;
export function resolveCanonicalStatusPresentation(
  domain: CanonicalStatusDomain,
  value: string,
): SemanticStatusPresentation;
export function resolveCanonicalStatusPresentation(
  domain: CanonicalStatusDomain,
  value: string,
): SemanticStatusPresentation {
  const presentations: Readonly<Record<string, SemanticStatusPresentation>> =
    canonicalStatusPresentationMap[domain];

  if (Object.prototype.hasOwnProperty.call(presentations, value)) {
    return presentations[value];
  }

  reportUnknownStatus(domain, value);
  return UNKNOWN_STATUS_PRESENTATION;
}
