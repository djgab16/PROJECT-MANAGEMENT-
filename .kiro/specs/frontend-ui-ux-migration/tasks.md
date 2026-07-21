# Implementation Plan: Frontend UI/UX Migration

## Overview

Execute the presentation-only migration as reversible, mobile-first slices: establish parity baselines and tooling approval first; migrate foundations and the largest shell boundaries; add typed primitives and compatibility wrappers; compose shared UI; migrate route cohorts; harden cross-route parity; and remove only proven zero-caller legacy assets. Existing routes, roles, APIs, contexts, state owners, validation, calculations, polling, third-party integrations, and workflows remain authoritative.

## Tasks

- [x] 1. Establish machine-readable migration baselines and reversible slice records
  - [x] 1.1 Create the route, role, redirect, primitive-caller, and state-owner inventory fixtures
    - Add typed test/evidence fixtures covering every route in `src/App.tsx`, applicable PUBLIC/UNAUTHENTICATED/ADMIN/OP. TEAM/CLIENT/DRIVER states, redirects, shell ownership, primitive callers, and controlled/stateful boundaries.
    - Record the six required viewports, light/dark/system modes, API/workflow owners, existing diagnostics, and representative visual baseline references without changing runtime routing or providers.
    - _Requirements: R1.2, R4.1, R11.1, R11.4, R12.1, R12.5, R12.8_

  - [x] 1.2 Create API and observable-outcome parity fixtures
    - Add test-only normalization for method, URL, behavior-relevant headers, payload shape, response status, and visible outcome; redact tokens and volatile values.
    - Inventory login/session/refresh/logout, CRUD, assignment, status, notifications, exports, archive/restore, QR, GPS/maps, POD/POT, re-delivery, pickup, settings, and role-access operations without importing this harness into production code.
    - _Requirements: R1.2, R7.1, R7.2, R7.4, R7.6, R12.2, R12.3, R12.4_

  - [x] 1.3 Implement migration slice manifest and validation-record schemas
    - Create test/release artifact code for affected routes, roles, files, compatibility adapters, baseline operations, checks, evidence, and rollback boundaries.
    - Keep manifests outside runtime application state and make each foundation, shell, primitive, composition, route-cohort, and cleanup slice independently reversible.
    - _Requirements: R11.3, R11.5, R12.7, R12.8_

- [ ] 2. Test-tooling approval and dependency gate
  - Before any package or lockfile edit, obtain explicit approval for exact pinned versions of `fast-check` and each proposed test runner, React component harness, browser automation tool, and accessibility tool, including purpose, bundle/maintenance/accessibility impact, and no-dependency alternative.
  - Do not add Tailwind, shadcn, Radix, Tabler, a second toast system, or any runtime dependency. Until approval is recorded, leave `package.json` and the lockfile unchanged and treat all starred automated-test tasks as blocked rather than hand-rolling substitutes.
  - After approval, install only the approved exact versions and add non-watch test commands; keep test tooling development-only.
  - _Requirements: R3.3, R8.4, R11.2, R11.6_

- [x] 3. Build semantic token, theme, focus, and motion foundations
  - [x] 3.1 Add scoped semantic tokens and compatibility aliases
    - Extend `src/index.css` with brand, background, surface, text, border, focus, canonical status, chart, spacing, size, radius, elevation, duration, and easing variables under the existing light/dark class model.
    - Preserve temporary aliases for current variable names, namespace migrated selectors, and avoid hardcoded component colors or source-global class leakage.
    - _Requirements: R1.1, R3.1, R3.5, R3.6, R11.3_
  - [x] 3.2 Preserve light, dark, and system theme ownership
    - Route all migrated styles through semantic variables while retaining `ThemeProvider`, `app-theme` persistence, `html.light`/`html.dark`, live system-preference updates, and the approved Inter fallback chain with no network font request.
    - Verify the fallback-only path; add local Inter assets only after separate asset approval.
    - _Requirements: R3.2, R3.6, R11.2_

  - [x] 3.3 Add mobile-first focus, target-size, overflow, and reduced-motion foundations
    - Implement base rules for 320px, then min-width enhancements at 640/768/1024/1280/1536; add visible/unobscured focus, 44×44 touch targets, safe gutters, bounded overflow utilities, and reduced-motion overrides.
    - Ensure status and state changes remain perceivable without depending only on color, shape, position, icon, or animation.
    - _Requirements: R2.5, R9.1, R9.2, R9.4, R9.7, R10.2, R10.4, R10.6, R10.7_

  - [ ]* 3.4 Write foundation unit and static tests
    - Validate semantic token presence/aliases, contrast pairs, theme persistence and live system switching, focus-visible rules, reduced motion, breakpoint declarations, scoped selectors, and the absence of unapproved dependency or icon/toast imports.
    - _Requirements: R3.1, R3.2, R3.3, R3.6, R9.1, R9.7, R10.2, R11.2, R11.3_

- [x] 4. Migrate the largest shell boundaries before route details
  - [x] 4.1 Adapt the desktop and mobile staff shell without changing routing
    - Refactor `DashboardLayout`, `Sidebar`, `Header`, and their CSS as one reversible shell slice; preserve the current outlet, role-filtered links, global search, notifications, profile/logout, active routes, and desktop collapse behavior.
    - At `lg` and above reserve content width for the persistent sidebar; below `lg` render a closed-by-default modal drawer without changing `App.tsx`, `ProtectedRoute`, provider order, or role destinations.
    - _Requirements: R2.1, R2.3, R2.4, R2.6, R7.2, R9.1, R11.1_

  - [x] 4.2 Implement accessible staff-drawer control transitions
    - Add labelled open/close controls, backdrop and Escape dismissal, initial focus, Tab/Shift+Tab containment, background isolation, body-scroll restoration, route-selection close, and invoker focus restoration.
    - Keep drawer/collapse state in the shell, CSS-first responsiveness, stable component identity, and callback results equivalent to the current owner contract.
    - _Requirements: R2.5, R4.1, R4.4, R9.3, R10.3, R10.4_

  - [x] 4.3 Tokenize and validate the retained public/auth and driver shells
    - Apply presentation-only token/safe-area changes to `DriverLayout` and public/auth framing while preserving driver back behavior, bottom navigation, staff-shell separation, route outlets, and focused-control clearance.
    - Confirm no private staff navigation leaks into public/auth surfaces and no driver QR/GPS/POD/POT state or lifecycle moves into shell code.
    - _Requirements: R2.2, R7.4, R9.2, R9.3, R10.1, R11.1_

  - [ ]* 4.4 Write shell route, focus, responsive, and theme tests
    - Exercise unauthenticated redirects, role-home redirects, staff links/outlets, desktop collapse, mobile drawer containment/restoration, driver bottom navigation/back behavior, and public isolation.
    - Check 320/640/768/1024/1280/1536 in light/dark plus system switching, 200% zoom, reduced motion, no page-level overflow, 44×44 targets, and no obscured focus.
    - _Requirements: R2.1–R2.6, R9.1–R9.7, R10.1–R10.7, R12.1, R12.5, R12.6_

- [ ] 5. Introduce typed base primitives and fidelity/status compatibility
  - [x] 5.1 Add presentation-only contracts and exports
    - Create typed `Tone`, `Size`, `ButtonProps`, `StatusBadgeProps`, `FeedbackStateProps`, `PageHeaderProps`, `AsyncViewState`, and evidence-facing models beside `src/components/ui`, not in API/domain modules.
    - Keep production fetching, calculations, validation, permissions, statuses, and state ownership outside primitive/template modules.
    - _Requirements: R1.2, R3.4, R4.6, R11.4_

  - [x] 5.2 Implement button, card, page-header, and feedback-state primitives
    - Build tokenized, responsive primitives with native semantics, accessible icon-only names, loading/disabled behavior, explicit loading/empty/error content, retry slots, and assistive announcements.
    - Use Lucide only, omit unavailable information instead of fabricating records or successful states, and preserve legacy components until callers migrate.
    - _Requirements: R1.4, R3.3, R3.4, R5.4, R5.5, R8.6, R10.5_

  - [x] 5.3 Implement Property 1 presentation-projection fidelity
    - Add pure presentation adapters/selectors that retain input domain identities, labels, values, meaningful order, and cardinality or an explicitly selected subset across records, KPIs, and chart series.
    - Prevent adapters and templates from manufacturing metrics, statuses, coordinates, counts, timestamps, records, or outcomes.
    - _Requirements: R1.4, R5.1, R5.2_

  - [x] 5.4 Implement Property 5 canonical status mapping
    - Replace presentation substring heuristics with one exhaustive typed delivery/account/POD/POT status-to-label/tone/icon/text map and a neutral development-reported fallback for truly unknown runtime values.
    - Keep legal transition authorization in existing workflow owners and ensure every status has a non-color-readable representation.
    - _Requirements: R3.4, R5.7, R7.3, R10.6_
  - [x] 5.5 Add compatibility wrappers for existing base primitive contracts
    - Adapt current `StatCard`, `StatusBadge`, `RoleBadge`, `EmptyState`, and approved button/card callers through legacy-prop wrappers or exports; inventory each caller before changing a contract.
    - Keep rollback imports available until each caller and route cohort passes parity checks.
    - _Requirements: R3.5, R11.4, R11.5_

  - [ ]* 5.6 Write the property-based test for Property 1
    - **Property 1: Presentation Projection Fidelity**
    - Generate valid record/KPI/chart view models and selected subsets; assert exact derived identities, labels, values, ordering, cardinality, and absence of fabricated output over at least 100 runs with deterministic seed/replay and retained minimal counterexamples.
    - Include `// Feature: frontend-ui-ux-migration, Property 1: Presentation Projection Fidelity` and make no network, timer, filesystem, or browser-service calls.
    - **Validates: Requirements R1.4, R5.1, R5.2**

  - [ ]* 5.7 Write the property-based test for Property 5
    - **Property 5: Canonical Status Mapping Is Total and Deterministic**
    - Generate every valid canonical status and repeated mappings; assert one stable label/tone/non-color representation, deterministic output, and no substring inference over at least 100 runs with replay metadata.
    - Include `// Feature: frontend-ui-ux-migration, Property 5: Canonical Status Mapping Is Total and Deterministic`.
    - **Validates: Requirements R5.7**

  - [ ]* 5.8 Write focused base-primitive and wrapper tests
    - Cover icon-only names, native disabled/loading semantics, loading/empty/stale/retry/blocking-error states, exact status examples and unknown fallback, legacy prop compatibility, Lucide-only usage, and no fabricated content.
    - _Requirements: R1.4, R3.3–R3.5, R5.4, R5.5, R5.7, R8.6_

- [ ] 6. Implement controlled fields, overlays, search, filters, dropdowns, and modals
  - [x] 6.1 Build `FieldShell` and validation-summary primitives
    - Bind labels, hints, errors, required state, `aria-invalid`, and `aria-describedby` while forwarding the original input identity, ref, native attributes, `value`/`checked`, and synchronous change handler.
    - Add first-invalid-field focus after errors render, reduced-motion-safe nearest scrolling, and stacked mobile layouts that keep focused inputs visible.
    - _Requirements: R4.3, R6.1, R6.2, R9.5, R10.5_

  - [x] 6.2 Implement Property 3 controlled-form contract equivalence
    - Add stable form wrappers/harnessable pure adapters that preserve owner state, change sequences, validation timing, payload construction, callback order, read-only rules, and recoverable values after rejection.
    - Do not move validation, API calls, submission ordering, or rollback rules from existing pages/contexts.
    - _Requirements: R4.3, R4.5, R6.1, R6.3_

  - [x] 6.3 Build the accessible modal and destructive-confirm contract
    - Extend/replace `Modal` behind a compatibility wrapper with labelled `role="dialog"`, `aria-modal`, initial focus, focus containment, background isolation, internal overflow, Escape safety, submitting state, and existing/removed-invoker restoration.
    - Preserve owner-controlled open state, distinct cancel/confirm callbacks, operation order, and current cancellation rules.
    - _Requirements: R4.4, R6.4, R6.5, R6.6, R10.3, R10.4_

  - [x] 6.4 Build controlled search, filter, dropdown, and pager presentation contracts
    - Keep matching, selected values, pagination, state owners, and callbacks in current pages; add labelled popup/list semantics, expanded relationships, clear no-results context, Escape/outside dismissal, keyboard order, and invoker restoration.
    - Preserve native/domain identifiers and avoid viewport-based component swaps that reset state.
    - _Requirements: R4.1, R4.4, R5.3, R9.3, R10.3, R10.5_

  - [x] 6.5 Implement Property 4 presentation-control transition equivalence
    - Centralize accessibility-only control mechanics for modal, drawer, filter, pager, and dropdown while preserving all valid owner-state transitions and callback arguments.
    - Keep presentation metadata separate from domain outcomes and document intentional operation-safety exceptions.
    - _Requirements: R4.4_

  - [ ]* 6.6 Write the property-based test for Property 3
    - **Property 3: Controlled Form Contract Equivalence**
    - Generate valid controlled form states and user change/submission/rejection sequences; assert identical owner changes, validation timing, payloads, callback order, and recoverable value retention over at least 100 deterministic, replayable runs.
    - Include `// Feature: frontend-ui-ux-migration, Property 3: Controlled Form Contract Equivalence`.
    - **Validates: Requirements R4.3, R4.5, R6.1**

  - [ ]* 6.7 Write the property-based test for Property 4
    - **Property 4: Presentation Control Transition Equivalence**
    - Generate valid modal/drawer/filter/pager/dropdown states and event sequences; compare baseline and migrated owner transitions/callback arguments while excluding non-domain accessibility metadata over at least 100 replayable runs.
    - Include `// Feature: frontend-ui-ux-migration, Property 4: Presentation Control Transition Equivalence`.
    - **Validates: Requirements R4.4**

  - [ ]* 6.8 Write focused field, search, dropdown, modal, and upload-boundary tests
    - Cover label/hint/error association, first-invalid focus, unchanged controlled handlers, failure retention, no-results context, Escape/outside dismissal, destructive cancel/confirm/loading, both focus-restoration paths, modal overflow, and POD JPEG/PNG acceptance at/below 5 MB versus wrong type/over-limit.
    - _Requirements: R4.3–R4.5, R6.1–R6.7, R9.5, R10.3–R10.5_
- [ ] 7. Centralize data-table identity and reusable route templates
  - [x] 7.1 Implement the typed `DataTable` and bounded data-region contract
    - Upgrade `DataTable` with generic column definitions, caption/header semantics, `getRowKey`, busy/empty states, named row destinations/actions, and a labelled bounded horizontal scroll region below `md`.
    - Preserve owner-held records, search, sort, pagination, selection, exports, row routes, and permissions; never hide required columns/actions or fabricate rows.
    - _Requirements: R3.4, R5.3–R5.6, R9.2, R10.5, R10.7_

  - [x] 7.2 Implement Property 2 stable React identity
    - Update interactive collections and compatibility adapters to use stable domain identifiers and stable module-scope component types through reorder, filtering, pagination, and cosmetic responsive variants.
    - Permit index keys only for immutable non-interactive decorative data with no domain identifier and document intentional reset keys.
    - _Requirements: R4.1, R4.2_

  - [x] 7.3 Add presentation-only data, detail, form, and analytics templates
    - Implement slot/prop-driven templates for headings, controls, states, tables/collections, details/timelines/maps/proofs, forms, metrics/charts/drill-down/exports, and action areas.
    - Prohibit API/context imports and domain calculations in pure templates; existing route pages remain state/controller owners.
    - _Requirements: R1.2, R4.6, R5.1–R5.5, R6.1, R7.6_

  - [ ]* 7.4 Write the property-based test for Property 2
    - **Property 2: State Follows Stable Identity**
    - Generate uniquely identified stateful item models, local states, cosmetic variants, and permutations; assert rerender continuity and item-state association by domain ID over at least 100 deterministic, replayable runs.
    - Include `// Feature: frontend-ui-ux-migration, Property 2: State Follows Stable Identity`.
    - **Validates: Requirements R4.1, R4.2**

  - [ ]* 7.5 Write table, template, responsive-overflow, and compatibility tests
    - Cover captions/headers, named row actions, stable keys, empty/busy/error states, bounded scroll labels, retained actions/data, long content, template dependency scans, and legacy `DataTable` caller contracts.
    - Check 320/640/768/1024/1280/1536 geometry without page-level overflow.
    - _Requirements: R3.5, R4.6, R5.3–R5.7, R9.1–R9.3, R10.5, R11.4_

- [ ] 8. Consolidate confirmed notification state and Sonner-only feedback
  - [x] 8.1 Implement Property 6 confirmed-outcome notification adapter
    - Add a presentation-boundary adapter around current async read/read-all/delete/clear operations that returns an explicit confirmed result without changing endpoints, call order, context ownership, or visible state ahead of confirmation.
    - On rejection retain/restore the last confirmed list and identify the failed operation; do not modify API/domain modules solely for styling.
    - _Requirements: R8.1, R8.2, R8.3_

  - [x] 8.2 Implement Property 7 idempotent Sonner feedback adapter
    - Add a thin non-stateful action-id adapter that emits at most one Sonner toast per user action across pending/success/retry/failure completion sequences.
    - Keep field-level/contextual feedback where required, avoid duplicate live text, and exclude source `ToastContext` as a production state owner.
    - _Requirements: R8.4, R8.5, R8.6_

  - [x] 8.3 Build shared notification presentation for header, staff, and driver surfaces
    - Render current records, unread counts, grouping, links, read state, mutations, loading/empty/error states, and navigation through typed presentation props while retaining `DataContext`/API authority.
    - Preserve last-confirmed state on failures and route-linked order navigation; do not introduce demo notifications or optimistic success claims.
    - _Requirements: R1.4, R8.1–R8.6_

  - [ ]* 8.4 Write the property-based test for Property 6
    - **Property 6: Notification State Changes Only on Confirmed Outcomes**
    - Generate confirmed lists, IDs, operations, and fulfilled/rejected outcomes; assert only required records change after confirmation and rejected outcomes deep-equal the prior confirmed state while naming the failed action over at least 100 replayable runs.
    - Include `// Feature: frontend-ui-ux-migration, Property 6: Notification State Changes Only on Confirmed Outcomes`.
    - **Validates: Requirements R8.2, R8.3**

  - [ ]* 8.5 Write the property-based test for Property 7
    - **Property 7: Feedback Is At-Most-Once Per Action**
    - Generate action identifiers and pending/success/retry/failure completion sequences; assert no more than one Sonner emission per identifier while allowing field feedback over at least 100 replayable runs.
    - Include `// Feature: frontend-ui-ux-migration, Property 7: Feedback Is At-Most-Once Per Action`.
    - **Validates: Requirements R8.5**

  - [ ]* 8.6 Write notification and feedback integration tests
    - Cover confirmed read/read-all/delete/clear outcomes, failure restoration, counts/grouping/navigation, one success/error toast, non-duplicated announcements, Sonner-only imports, and staff/driver shared data authority.
    - _Requirements: R8.1–R8.6, R12.3, R12.4_
- [ ] 9. Compose shared header, query controls, charts, and maps
  - [x] 9.1 Wire the shared header composition
    - Compose existing global search, notification trigger, profile, theme access, logout, and mobile navigation controls from typed primitives without relocating auth, search, notification, or navigation state.
    - Preserve role-visible actions, accessible names/expanded state, focus order, and compact reflow through all six widths.
    - _Requirements: R2.1, R3.3, R4.4, R8.1, R9.2, R10.3_

  - [x] 9.2 Wire shared search and filter compositions
    - Adopt the controlled search/filter/dropdown/pager contracts in repeated list controls while preserving route-specific fields, matching, sorting, pagination, reset behavior, exports, and selected values.
    - Keep required actions visible at 320px and retain query context in empty/error states.
    - _Requirements: R4.3, R4.4, R5.3, R5.4, R9.2, R9.3_

  - [x] 9.3 Add the accessible Recharts container composition
    - Wrap existing Recharts callers with tokenized series colors, titles, summaries/table alternatives for essential data, legends/tooltips/drill-down/export slots, minimum mobile dimensions, and reduced-motion animation handling.
    - Pass current series, labels, values, filters, calculations, and callbacks unchanged.
    - _Requirements: R5.2, R9.6, R10.5, R10.6_

  - [x] 9.4 Add the accessible Leaflet map container composition
    - Wrap current Leaflet/static-map callers with a title, textual location/connection/last-update state, stable responsive height, bounded overflow, and keyboard-accessible alternative where needed.
    - Preserve markers, coordinates, privacy, permissions, 5-second live polling, heartbeat/cleanup, and current recovery callbacks; never make the map the sole status signal.
    - _Requirements: R7.4, R7.5, R9.6, R10.5, R10.6_

  - [ ]* 9.5 Write shared-composition interaction and third-party contract tests
    - Verify header/search/filter owner callbacks, no-results behavior, Recharts data/labels/tooltips/drill-down/export passthrough, Leaflet coordinates/status alternatives, reduced motion, long labels, bounded regions, and no API/context imports in pure wrappers.
    - _Requirements: R4.4, R5.2, R5.3, R7.4, R8.1, R9.6, R10.5, R12.3, R12.4_

- [ ] 10. Checkpoint - Ensure foundations, shells, primitives, and shared compositions pass
  - Ensure all tests pass, ask the user if questions arise.
  - Confirm the slice cannot advance on route/role/API/workflow drift, state reset, page overflow, theme/accessibility failure, duplicate feedback, unapproved package changes, or new build/lint/type errors.

- [ ] 11. Migrate the dashboard cohort
  - [ ] 11.1 Adapt dashboard presentation from shell boundaries down to widgets
    - Migrate `Dashboard` markup/CSS to page-header, KPI/card, feedback, chart, and bounded-data compositions while preserving role filtering, links, current API-backed calculations, loading/error states, and Recharts inputs.
    - Validate at 320/640/768/1024/1280/1536 with light/dark/system behavior and no fabricated metrics.
    - _Requirements: R1.2, R1.4, R5.1, R5.2, R9.1–R9.3, R12.5_

  - [ ]* 11.2 Write dashboard projection, role, responsive, and API-parity tests
    - Compare baseline versus migrated KPI/chart identities, labels, values, order/cardinality, links, requests, visible outcomes, loading/empty/error behavior, role visibility, and all required width/theme cells.
    - _Requirements: R5.1, R5.2, R12.1, R12.4, R12.5_

- [ ] 12. Migrate staff list and operations cohorts
  - [ ] 12.1 Migrate delivery-order, archive, and failed-pickup lists
    - Adopt shared headers, query controls, status badges, feedback states, tables, actions, and confirmations in `DeliveryOrders`, `Archive`, and `FailedPickups` without changing records, filters, pagination, row routes, permissions, archive/restore eligibility, pickup rules, or API operations.
    - Keep dense content in labelled bounded scroll regions and retain every required action at all six widths.
    - _Requirements: R5.3–R5.7, R7.2–R7.4, R9.2, R12.3_

  - [ ] 12.2 Migrate activity-log, employee, and notification lists
    - Apply data templates/primitives to `ActivityLogs`, `Employees`, and the staff notification page while preserving ordering, pagination, audit data, employee CRUD/permissions, confirmed notification operations, counts, and navigation.
    - Retain ADMIN-only behavior and existing data/context ownership.
    - _Requirements: R2.1, R5.3–R5.7, R7.2, R8.1–R8.3, R12.1, R12.3_

  - [ ] 12.3 Migrate tasks and dispatch operational lists
    - Apply responsive list/action compositions to staff `/tasks` and `/dispatch` surfaces without changing assignment rules, driver eligibility, status gates, role restrictions, polling, or current request paths.
    - Preserve stable item identity and last-confirmed data during partial failures.
    - _Requirements: R4.2, R5.3–R5.7, R7.2, R7.3, R7.5_

  - [ ]* 12.4 Write staff-list cohort regression tests
    - Cover records/search/filter/sort/pagination/selection/exports, authorized actions, row routes, status text, archive/restore, failed-pickup semantics, employee CRUD, notifications, tasks/dispatch, API parity, stable keys, empty/error states, and six-width/theme accessibility.
    - _Requirements: R5.3–R5.7, R7.2–R7.5, R8.1–R8.6, R12.1, R12.3–R12.6_
- [ ] 13. Migrate detail, history, and tracking cohorts
  - [ ] 13.1 Adapt delivery detail and history presentation
    - Apply detail/timeline/status/map/proof/action slots to `DeliveryOrderDetail` and `DeliveryHistoryLog` while preserving detail data, canonical history ordering, permissions, status gates, driver assignment, archive links, and operation callbacks.
    - Keep links/headings/focus destinations stable when actions remove or replace content.
    - _Requirements: R4.1, R5.7, R7.2–R7.4, R10.4, R12.3_

  - [ ] 13.2 Adapt authenticated track and waybill-search presentation
    - Migrate `/track` and `/search-waybill` presentation with controlled search, feedback, timeline, and map compositions while preserving matching, real records, live/static coordinates, polling, connection state, privacy, and cleanup.
    - Keep maps/charts bounded and expose equivalent textual status/location at all six widths.
    - _Requirements: R5.3–R5.5, R7.4, R7.5, R9.6, R10.5, R10.6_

  - [ ]* 13.3 Write detail/history/tracking parity tests
    - Verify route parameters, records, timeline/history order, statuses/actions, assignment/status API outcomes, search state, map coordinates/polling cleanup, textual alternatives, focus recovery, roles, themes, and responsive geometry.
    - _Requirements: R4.1, R5.7, R7.2–R7.5, R12.1, R12.3–R12.6_

- [ ] 14. Migrate forms, confirmations, and transactional proof surfaces
  - [ ] 14.1 Adapt create/edit and administrative transactional forms
    - Apply form/page/modal primitives to create/edit order and reusable employee/settings/role form surfaces while preserving every controlled owner, required/conditional field, format/bound/read-only rule, validation timing, payload, callback order, authorization, and server-error recovery.
    - Stack fields/actions below `md`, focus the first invalid field, and retain values after recoverable failures.
    - _Requirements: R4.3–R4.5, R6.1–R6.6, R9.5, R10.5_

  - [ ] 14.2 Adapt POT/POD, archive/restore, assignment, and other destructive dialogs
    - Adopt the accessible modal/confirm contract for existing upload and destructive flows without changing eligibility, file/type/size checks, recipient/proof data, preview, progress, operation order, audit association, or workflow result.
    - Retain JPEG/PNG acceptance and the 5 MB POD maximum; emit one final Sonner outcome and restore focus safely when invokers remain or are removed.
    - _Requirements: R6.4–R6.7, R7.2–R7.4, R8.4–R8.6_

  - [ ]* 14.3 Write controlled-form and transactional regression tests
    - Compare change events, validation timing, payloads, callback order, legal authorization, failure retention, first-invalid focus, modal containment/restoration, file boundaries, assignment/archive/POT/POD API parity, and single feedback outcomes.
    - _Requirements: R4.3–R4.5, R6.1–R6.7, R7.2–R7.4, R8.5, R12.3, R12.4, R12.6_

- [ ] 15. Migrate reports, analytics, and remaining admin routes
  - [ ] 15.1 Adapt reports, delivery summary, and analytics
    - Apply analytics templates, metric/cards, filters, Recharts containers, data tables, drill-down, and export actions while retaining real datasets, calculations, labels, values, legends, tooltips, filters, CSV/PDF behavior, and ADMIN access.
    - Reflow charts/data at every required width without clipping controls or inventing unavailable metrics.
    - _Requirements: R5.1–R5.6, R7.6, R9.6, R12.1, R12.3_

  - [ ] 15.2 Adapt settings, role access, and design-system routes
    - Migrate presentation around current settings and role-access state/operations, and update `DesignSystem` to exercise approved production primitives, themes, states, responsive behavior, and compatibility wrappers without becoming a second source of domain truth.
    - Preserve ADMIN-only routes and all current API/permission outcomes.
    - _Requirements: R2.4, R3.2–R3.5, R7.2, R12.1, R12.3_

  - [ ]* 15.3 Write admin cohort authorization and data-parity tests
    - Cover ADMIN guards, calculations, charts, filters, tooltips, drill-down, exports/downloads, settings/role operations, API outcomes, primitive examples, six widths/themes, keyboard semantics, and bounded data/media.
    - _Requirements: R5.1–R5.6, R7.2, R7.6, R9.6, R10.5, R12.1, R12.3–R12.6_

- [ ] 16. Migrate auth and public tracking routes
  - [ ] 16.1 Restyle login and account-locked routes
    - Apply auth shell, fields, feedback, and action primitives while preserving login, lockout, session creation/restoration, validation/errors, role redirect, logout/session cleanup authority, and no private-data leakage.
    - Maintain controlled credentials, recoverable state, keyboard order, announcements, and 320px/200% zoom reflow.
    - _Requirements: R1.2, R4.3, R6.1–R6.3, R7.1, R10.1, R12.2_

  - [ ] 16.2 Adapt the public tracking cohort and child components
    - Migrate `PublicTracking`, `TrackingSearch`, `TrackingTimeline`, `StaticMapBox`, and `SupportBanner` with public shell/search/timeline/map/state primitives while preserving lookup, privacy, receipt confirmation, re-delivery request/date/rules, real coordinates, and error recovery.
    - Do not expose private records or source demo data; keep all required content/actions visible across the six widths and themes.
    - _Requirements: R1.4, R5.4–R5.7, R7.4, R7.6, R9.1–R9.6, R10.5_

  - [ ]* 16.3 Write auth/public route and API-parity tests
    - Cover login/lockout/restore/valid-refresh/failed-refresh/logout outcomes, role redirects, public lookup/privacy, maps/timeline, receipt/re-delivery requests, controlled failure retention, accessibility, and six-width light/dark/system behavior.
    - _Requirements: R7.1, R7.4, R7.6, R12.1, R12.2, R12.4–R12.6_
- [ ] 17. Apply style-only migration to driver routes and workflows
  - [ ] 17.1 Adapt driver dashboard, tasks, settings, and notifications
    - Apply retained driver shell, tokenized primitives, safe-area spacing, statuses, feedback, and responsive action hierarchy without changing bottom navigation, back behavior, assignments, notifications, settings, sequential statuses, or role restrictions.
    - Ensure fixed navigation never obscures content, focused controls, or 44×44 actions at base/`sm`.
    - _Requirements: R2.2, R5.7, R7.2–R7.5, R8.1–R8.3, R9.4, R10.4_

  - [ ] 17.2 Adapt QR, GPS, delivery detail, failure, pickup, and POD/POT surfaces
    - Restyle `QRScannerView`, `DriverDeliveryDetail`, `FailureModal`, `PODModal`, map/GPS states, and recovery paths while retaining camera/geolocation permissions, lookup, 5-second location polling/cleanup, legal status sequence, failure/return rules, office pickup, proof validation/upload, attempt limits, and API calls.
    - Preserve alternative lookup/text status, input/file state on failure, modal focus, and Sonner-only final feedback.
    - _Requirements: R6.5–R6.7, R7.3–R7.6, R8.4–R8.6, R9.5, R9.6, R10.5_

  - [ ]* 17.3 Write driver workflow, lifecycle, and responsive tests
    - Cover DRIVER guards, bottom nav/back, QR permission/lookup, GPS capture/polling/cleanup, map status alternatives, legal/illegal delivery and pickup transitions, failures, POD/POT file boundaries, re-delivery/attempt limits, notifications, API parity, focus, reduced motion, and all six widths/themes.
    - _Requirements: R2.2, R6.7, R7.3–R7.6, R8.1–R8.6, R9.1–R9.7, R10.1–R10.7, R12.1, R12.3–R12.6_

- [ ] 18. Checkpoint - Ensure every route cohort passes before hardening
  - Ensure all tests pass, ask the user if questions arise.
  - Revert only the failing route cohort if any role, route, API, workflow, state, responsive, theme, accessibility, build, lint, or type gate fails; keep compatibility wrappers and legacy selectors intact.

- [ ] 19. Harden cross-route parity and release gates
  - [ ]* 19.1 Implement the complete route, role, redirect, and authentication matrix
    - Automate every current route for applicable PUBLIC/UNAUTHENTICATED/ADMIN/OP. TEAM/CLIENT/DRIVER states, including links, outlets, guards/loading, role-home redirects, `/`, `/POT-records`, unknown fallbacks, login, lockout, restore, refresh success/failure, and logout.
    - _Requirements: R2.1–R2.4, R12.1, R12.2_

  - [ ]* 19.2 Implement API, polling, partial-success, and state-owner parity tests
    - Compare normalized pre/post requests and outcomes for method/path/headers/payload/status, 30-second Axios timeout, token attachment, one-refresh retry, failed-refresh cleanup, 10-second authenticated refresh, `Promise.allSettled` partial success, 5-second location polling, and lifecycle cleanup.
    - Assert templates/primitives do not own APIs, domain calculations, production state, or fabricated data.
    - _Requirements: R1.2, R1.4, R4.6, R7.1, R7.5, R12.4_

  - [ ]* 19.3 Implement end-to-end workflow parity tests with mocked external boundaries
    - Exercise CRUD, assignment, legal/illegal statuses, filters/search, notifications, reports/exports, archive/restore, GPS/maps, QR, POD/POT, re-delivery, pickup, settings, role access, validation, and failure recovery through current operations.
    - Use controlled API/library doubles only; do not test third-party internals or call real network, camera, geolocation, or filesystem services.
    - _Requirements: R6.1–R6.7, R7.2–R7.6, R8.1–R8.6, R12.3, R12.4_

  - [ ]* 19.4 Implement Recharts, Leaflet, QR, Lucide, and Sonner contract smoke tests
    - Verify current data/callback contracts, textual alternatives, lifecycle cleanup, Lucide-only icons, canonical statuses, and one Sonner outcome while leaving library internals and dependencies unchanged.
    - _Requirements: R3.3, R5.2, R7.4, R8.4, R8.5, R11.2_

  - [ ]* 19.5 Implement the six-width and three-theme regression matrix
    - Run each migrated route at 320/640/768/1024/1280/1536 in light/dark, plus system persistence and live preference switching per shell cohort.
    - Assert root `scrollWidth <= clientWidth`, bounded labelled table/chart/map overflow only, visible labels/errors/status/actions, 44×44 mobile targets, long-content reflow, software-keyboard-safe forms, fixed/sticky clearance, and stable screenshots for intentional diffs.
    - _Requirements: R9.1–R9.7, R12.5_

  - [ ]* 19.6 Implement WCAG 2.2 AA regression checks and evidence
    - Automate semantics, names/roles/values, landmarks/headings, table headers, field associations, live states, non-color status, focus visibility/order/containment/restoration, contrast calculations, reduced motion, 200% zoom/320px reflow, and unobscured focused targets.
    - Produce manual-assisted screen-reader/keyboard review records for behavior automation cannot establish; block critical/serious regressions.
    - _Requirements: R10.1–R10.7, R12.6_

  - [ ]* 19.7 Run static, build, lint, type, dependency, bundle, and visual gates
    - Run approved non-watch tests, `npm run lint`, and `npm run build` (`tsc -b` plus Vite); inventory hardcoded migrated colors, unscoped selectors, unsafe listeners/timers, interactive index keys, pure-template API/context imports, non-Lucide icons, `ToastContext`, and dependency diffs.
    - Compare representative shell/dashboard/list/detail/form/report/driver visuals, bundle output, and render/interaction timing; record unrelated pre-existing warnings separately and reject unexplained material regressions.
    - _Requirements: R11.2, R11.3, R11.5, R11.6, R12.5–R12.7_
- [ ] 20. Remove proven legacy duplication and finalize rollback traceability
  - [ ] 20.1 Remove only zero-caller legacy presentation assets
    - Use repository-wide caller/import/class scans plus passing compatibility tests to remove duplicate components, CSS, aliases, and wrappers only after all callers have migrated.
    - Never combine cleanup with behavior changes; preserve `App.tsx`, providers, contexts, API/domain modules, and rollback references, and restore the prior import/export if any regression appears.
    - _Requirements: R3.4, R3.5, R11.3–R11.5_

  - [ ] 20.2 Generate final migration evidence and rollback artifacts
    - Complete slice manifests linking every requirement/mapping to routes, roles, changed files/components, API operations, validation records, compatibility resolutions/deferrals, screenshots, bundle results, remaining risks, and exact rollback boundary.
    - Record no-fabricated-data, Sonner-only, dependency-approval, route/role/workflow/API parity, six-width/theme, WCAG, build/lint/type, and zero-caller cleanup evidence.
    - _Requirements: R1.4, R8.4, R11.5, R11.6, R12.4–R12.8_

  - [ ]* 20.3 Run the final full regression and rollback-restoration suite
    - Re-run all seven property tests with at least 100 deterministic runs and replay data, focused unit/component tests, route/workflow/API integration, six-width/theme/accessibility matrices, and non-watch build/lint/type gates after cleanup.
    - Verify each slice can restore previous component/CSS imports and compatibility exports without route/provider/context/API changes.
    - _Requirements: R11.5, R12.1–R12.8_

- [ ] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Confirm final evidence contains zero unintended route, role, API, workflow, controlled-input, React-identity, data, feedback, accessibility, responsive, theme, dependency, build, lint, or type differences before considering the migration complete.

## Notes

- Tasks marked with `*` are optional test tasks in the Kiro execution UI, but every slice promotion gate still requires the applicable approved validation to pass.
- Starred tests remain blocked until Task 2 approves exact pinned tooling versions; do not silently edit `package.json` or the lockfile and do not hand-roll a PBT generator.
- Every correctness property has a separate implementation task and exactly one property-based test with at least 100 runs, deterministic seed/replay metadata, shrinking/minimal counterexample retention, and the required feature/property comment.
- Migrate mobile-first from shell boundaries to shared primitives/compositions and then route details. At every slice check 320/640/768/1024/1280/1536, light/dark/system, WCAG 2.2 AA, focus containment/restoration, controlled state, stable React identity, Sonner-only feedback, and route/role/API/workflow parity.
- Presentation templates and primitives must not acquire business logic, API calls, calculations, status authorization, polling, persistence, or production state. Omit unavailable data rather than fabricating it.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["3.1"] },
    { "id": 2, "tasks": ["3.2"] },
    { "id": 3, "tasks": ["3.3"] },
    { "id": 4, "tasks": ["3.4", "4.1", "5.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "5.2", "5.3", "5.4"] },
    { "id": 6, "tasks": ["4.4", "5.5", "5.6", "5.7"] },
    { "id": 7, "tasks": ["5.8", "6.1", "6.3", "6.4", "8.2"] },
    { "id": 8, "tasks": ["6.2", "6.5", "7.1", "8.1"] },
    { "id": 9, "tasks": ["6.6", "6.7", "6.8", "7.2", "7.3", "8.3"] },
    { "id": 10, "tasks": ["7.4", "7.5", "8.4", "8.5", "9.2", "9.3", "9.4"] },
    { "id": 11, "tasks": ["8.6", "9.1"] },
    { "id": 12, "tasks": ["9.5", "11.1"] },
    { "id": 13, "tasks": ["11.2", "12.1", "12.2", "12.3"] },
    { "id": 14, "tasks": ["12.4", "13.1", "13.2"] },
    { "id": 15, "tasks": ["13.3", "14.1", "14.2"] },
    { "id": 16, "tasks": ["14.3", "15.1", "15.2", "16.1", "16.2", "17.1"] },
    { "id": 17, "tasks": ["15.3", "16.3", "17.2"] },
    { "id": 18, "tasks": ["17.3", "19.1", "19.2", "19.3", "19.4"] },
    { "id": 19, "tasks": ["19.5", "19.6"] },
    { "id": 20, "tasks": ["19.7"] },
    { "id": 21, "tasks": ["20.1"] },
    { "id": 22, "tasks": ["20.2"] },
    { "id": 23, "tasks": ["20.3"] }
  ]
}
```
