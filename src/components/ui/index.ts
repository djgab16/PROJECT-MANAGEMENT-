export type {
  AsyncViewState,
  ButtonProps,
  CardElement,
  CardProps,
  ControlledFormProps,
  FeedbackStateProps,
  FieldControlProps,
  FieldShellProps,
  PageHeaderProps,
  Size,
  ValidationSummaryError,
  ValidationSummaryProps,
  StatusBadgeProps,
  StatusBadgeStatus,
  StatusBadgeDomain,
  Tone,
} from './contracts';

export type {
  ApiParityRecord,
  EvidenceRole,
  EvidenceTheme,
  EvidenceViewport,
  MigrationSliceManifest,
  ValidationRecord,
  ValidationResult,
} from './evidence';

export type {
  ActionFeedbackDecision,
  ActionFeedbackEvent,
  ActionFeedbackPhase,
  ActionFeedbackRetention,
  ActionToastContent,
  ActionToastType,
} from './actionFeedback';
export {
  ACTION_FEEDBACK_RETENTION_LIMIT,
  EMPTY_ACTION_FEEDBACK_RETENTION,
  notifyActionFeedback,
  reduceActionFeedback,
  resetActionFeedback,
  resetActionFeedbackRetention,
} from './actionFeedback';

export type {
  ControlledCallbackInvocation,
  ControlledCallbackStep,
  ControlledChangeTransition,
  ControlledFieldMode,
  ControlledFormContractTransition,
  ControlledOwnerChange,
  ControlledPayloadBuilder,
  ControlledPayloadTransition,
  ControlledRejectionRecovery,
  ControlledRejectionTransition,
  ControlledValidationTransition,
  ControlledValidator,
} from './controlledFormContract';
export {
  buildControlledPayload,
  forwardControlledChange,
  invokeControlledCallbacks,
  resolveControlledRejection,
  runControlledValidation,
} from './controlledFormContract';

export type {
  DrawerTransitionEvent,
  DrawerTransitionPolicy,
  DropdownOwnerCallbacks,
  DropdownTransitionEvent,
  DropdownTransitionPolicy,
  FilterTransitionEvent,
  ModalDismissEvent,
  ModalOwnerCallbacks,
  ModalTransitionPolicy,
  PagerOwnerCallbacks,
  PagerTransitionEvent,
  PagerTransitionPage,
  PresentationControlCallbackInvocation,
  PresentationControlId,
  PresentationControlKind,
  PresentationControlMetadata,
  PresentationControlSafetyException,
  PresentationControlSuppressionReason,
  PresentationControlTransition,
  PresentationFocusMetadata,
  PresentationOwnerReducer,
  PresentationPopupRole,
  PresentationRelationshipMetadata,
} from './presentationControlTransitions';

export type {
  ConfirmedNotificationMutationResult,
  NotificationMutation,
  NotificationMutationExecutor,
  NotificationMutationOperation,
  NotificationMutationResult,
  RejectedNotificationMutationResult,
} from './notificationMutations';
export {
  projectConfirmedNotificationMutation,
  runConfirmedNotificationMutation,
} from './notificationMutations';
export {
  createPresentationControlMetadata,
  PRESENTATION_CONTROL_OPERATION_SAFETY_EXCEPTIONS,
  transitionDrawerControl,
  transitionDropdownControl,
  transitionFilterControl,
  transitionModalControl,
  transitionPagerControl,
} from './presentationControlTransitions';

export type {
  PresentationProjection,
  PresentationProjectionKeys,
  PresentationSubsetSelector,
} from './presentationProjection';
export {
  projectChartSeries,
  projectKpis,
  projectRecords,
  selectPresentationSubset,
} from './presentationProjection';

export type {
  IdentityReconciliationOptions,
  StableDomainKey,
} from './stableIdentity';
export { reconcileStateByIdentity } from './stableIdentity';

export type {
  CanonicalStatusByDomain,
  CanonicalStatusDomain,
  CanonicalStatusFor,
  CanonicalStatusPresentationMap,
  SemanticStatusPresentation,
} from './statusPresentation';
export {
  canonicalStatusPresentationMap,
  resolveCanonicalStatusPresentation,
  UNKNOWN_STATUS_PRESENTATION,
} from './statusPresentation';

export { default as Button } from './Button';
export { default as Card } from './Card';
export { default as AccessibleChartContainer } from './AccessibleChartContainer';
export type {
  AccessibleChartContainerProps,
  ChartRenderContext,
} from './AccessibleChartContainer';
export { default as AccessibleMapContainer } from './AccessibleMapContainer';
export type { AccessibleMapContainerProps } from './AccessibleMapContainer';
export { default as FeedbackState } from './FeedbackState';
export { default as NotificationCollection } from './NotificationCollection';
export type {
  NotificationCollectionEmptyState,
  NotificationCollectionProps,
  NotificationPresentationVariant,
  NotificationViewState,
} from './NotificationCollection';
export { default as ControlledForm } from './ControlledForm';
export { default as FieldShell } from './FieldShell';
export { default as PageHeader } from './PageHeader';
export { default as StaffHeaderComposition } from './StaffHeaderComposition';
export type { StaffHeaderCompositionProps } from './StaffHeaderComposition';
export {
  AnalyticsTemplate,
  DataPageTemplate,
  DetailPageTemplate,
  FormPageTemplate,
} from './RouteTemplates';
export type {
  AnalyticsTemplateProps,
  DataPageTemplateProps,
  DetailPageTemplateProps,
  FormPageTemplateProps,
} from './RouteTemplates';
export { default as ValidationSummary } from './ValidationSummary';
export { default as Modal, default as LegacyModal } from './Modal';
export type {
  ControlledModalProps,
  LegacyModalProps,
  ModalProps,
  ModalSize,
} from './Modal';
export { default as DestructiveConfirm } from './DestructiveConfirm';
export type { DestructiveConfirmProps } from './DestructiveConfirm';

export { default as ControlledSearch } from './ControlledSearch';
export type { ControlledSearchProps } from './ControlledSearch';
export { default as QueryToolbar } from './QueryToolbar';
export type { QueryToolbarProps } from './QueryToolbar';
export { default as ControlledSearchResults } from './ControlledSearchResults';
export { default as DataTable } from './DataTable';
export type {
  ColumnDef,
  DataTableEmptyState,
  DataTableProps,
  LegacyDataTableColumn,
  LegacyDataTableProps,
  TypedDataTableProps,
} from './DataTable';

export type {
  ControlledSearchResultsProps,
  SearchResultId,
  SearchResultsEmptyState,
} from './ControlledSearchResults';
export { default as ControlledDropdown } from './ControlledDropdown';
export type {
  ControlledDropdownProps,
  DropdownEmptyState,
  DropdownOptionId,
} from './ControlledDropdown';
export { default as ControlledFilterPanel } from './ControlledFilterPanel';
export type { ControlledFilterPanelProps } from './ControlledFilterPanel';
export { default as ControlledPager } from './ControlledPager';
export type {
  ControlledPagerProps,
  PagerPage,
  PagerPageId,
} from './ControlledPager';

// Additive compatibility exports. Existing direct default-import paths remain the
// rollback boundary while route cohorts migrate and pass parity checks.
export { default as EmptyState, default as LegacyEmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { default as RoleBadge, default as LegacyRoleBadge } from './RoleBadge';
export type { RoleBadgeProps } from './RoleBadge';
export { default as StatCard, default as LegacyStatCard } from './StatCard';
export type { StatCardProps } from './StatCard';
export { default as StatusBadge, default as LegacyStatusBadge } from './StatusBadge';
