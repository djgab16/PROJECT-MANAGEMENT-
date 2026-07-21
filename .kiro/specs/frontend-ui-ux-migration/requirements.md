# Requirements Document

**Spec:** `frontend-ui-ux-migration`  
**Type:** Build a Feature — Requirements-first  
**Status:** Requirements ready for review; Technical Design blocked on open decisions  
**Source UI revision:** `a4305544058333285bfe6517b258db10e246a1c8`

## Introduction

Migrate the presentation layer of the existing React + TypeScript logistics system toward the verified visual language of `Hermione-Benitez/Capstone-Frontend-Integration` without replacing the current architecture, backend, contracts, routes, state ownership, or business workflows.

The current application is the functional authority. The source repository is a compact UI/component demonstration with no routed pages, production APIs, route guards, contexts, maps, GPS, QR/POD/POT workflows, or complete chart-page equivalents. It SHALL be used as a design-system and component-pattern source only.

## 2. Scope

In scope:
- Adapt staff shell, sidebar, header, KPI cards, tables, searches, filters, buttons, badges, dropdowns, forms, modals, notifications, toasts, page states, and selected public landing patterns.
- Retain and restyle current auth, orders, dispatch, tracking, reports, analytics, archive, employees, role access, settings, and driver workflows.
- Centralize duplicate presentation primitives behind semantic tokens and typed reusable interfaces.
- Preserve light, dark, and system themes through the existing `ThemeProvider`.
- Deliver the migration incrementally, beginning with responsive shells and shared primitives.

Out of scope:
- Replacing or redesigning the ASP.NET backend, SQL schema, API contracts, Axios/JWT behavior, route guards, contexts, domain models, calculations, validation, or workflows.
- Importing source demo records, local state, `localStorage` navigation behavior, custom events, or source status semantics as production behavior.
- Replacing React Router, Recharts, Leaflet, Sonner, Lucide, QR libraries, or current state ownership merely to match the source.
- Adopting Tailwind, shadcn, Tabler icons, fonts, or any dependency without an approved Technical Design decision and exact pinned version.
- Writing implementation code during this requirements phase.

## 3. Evidence Baseline

### Current application
Verified technologies and authorities include React 19, TypeScript, Vite, React Router, Axios, Auth/Data/Theme contexts, protected routes, Lucide, Recharts, Leaflet, QR scanning, Sonner, API-backed pages, light/dark/system themes, and separate staff and mobile-driver shells.

### Source UI
Verified tracked components: `DashboardLayout`, `Sidebar`, `GlobalHeader`, `DataTable`, `SearchBar`, `ActionButtons`/`Buttons`, `StatusBadge`, `StatusCard`, `ConfirmModal`, `FormModals`, `Notifications`, `ToastBar`/`ToastContext`, `Dropdown`, and landing sections. It provides broader semantic tokens, Montserrat/Inter references, mixed Lucide/Tabler icons, responsive drawer/table/modal treatments, richer tables, and component state patterns.

## 4. Verified Current-to-Source Mapping

| Current surface | Source reference | Disposition | Current authority preserved |
|---|---|---|---|
| `DashboardLayout`, `Sidebar`, `Header` | Dashboard layout, sidebar, global header | Adapt | Router outlets, active routes, role-filtered links, search, real notifications, profile, collapse state, and logout |
| Dashboard | KPI grid and `StatusCard` | Adapt | API-backed calculations, role filtering, links, loading/error states, and Recharts |
| Orders, archive, failed pickups, activity logs, employees, reports | `DataTable`, `SearchBar`, actions, badges, dropdown | Adapt and centralize | Current data, filters, pagination, permissions, row routes, CRUD, exports, and audit data |
| Delivery detail, history, tracking, dispatch | Cards, badges, buttons | Adopt primitives only | Detail data, status history, timeline, maps, dispatch rules, and actions |
| Create/edit and transactional forms | `FormModals`, `ConfirmModal` | Decompose and adapt | Controlled inputs, validation, payloads, submission order, confirmations, and recovery behavior |
| Notifications and header dropdown | Source notification layout/states | Adapt | Existing context/API, read/delete/clear operations, counts, linked navigation, and refresh behavior |
| Reports and analytics | Shell, cards, table controls | Adapt presentation | Recharts, real datasets, calculations, filters, tooltips, drill-down, and exports |
| Login and account locked | Tokens and form primitives | Restyle only | Authentication, lockout, errors, session creation, and role redirect |
| Public tracking | Header/footer/hero patterns | Selectively adapt | Search, timeline, live map, privacy behavior, receipt confirmation, and re-delivery |
| All driver routes | Tokens, buttons, badges, modal/toast styling | Style-only adoption | Driver shell, bottom navigation, QR, GPS, sequential statuses, failures, POD, pickup, and permissions |
| Existing duplicate primitives | Source equivalents | Centralize gradually | Existing contracts and callers until each slice passes regression QA |
| Current theme | Source token breadth | Map through current theme | Existing light/dark/system behavior and persistence |
| Current Lucide icons | Mixed source icons | Retain Lucide | Accessible icon meaning; no Tabler dependency solely for visual parity |

## 5. Route Preservation Inventory

| Access | Routes | Migration rule |
|---|---|---|
| Public | `/login`, `/account-locked`, `/tracking` | Preserve auth/tracking behavior; presentation only |
| Staff | `/dashboard`, `/delivery-orders`, `/delivery-orders/:id`, `/delivery-orders/:id/history`, `/delivery-orders/:id/edit`, `/track`, `/search-waybill`, `/archive`, `/failed-pickups`, `/notifications`, `/tasks`, `/dispatch`, `/activity-logs` | Preserve current ADMIN/OP. TEAM/CLIENT guards and route behavior |
| Redirect | `/`, `/POT-records`, `*` | Preserve role-aware and archive redirects |
| Admin | `/reports`, `/delivery-summary`, `/analytics`, `/settings`, `/employees`, `/role-access`, `/design-system` | Preserve ADMIN-only access |
| Driver | `/driver/dashboard`, `/driver/scan`, `/driver/delivery/:id`, `/driver/settings`, `/driver/notifications` | Preserve DRIVER-only access and mobile shell |

## 6. Functional Preservation Matrix

| Capability | SHALL remain unchanged |
|---|---|
| API/Axios | Endpoints, methods, payloads, response mapping, base URL, headers, timeout, errors, uploads, and downloads |
| Authentication/JWT | Login, profile restoration, access-token attachment, one refresh attempt and retry, failed-refresh cleanup, account lock, and logout revocation |
| Routing/authorization | Paths, aliases, parameters, redirects, guard loading state, and role access |
| State | Auth/Data/Theme contexts, page-local ownership, controlled inputs, polling, optimistic/local updates, and partial-success refresh behavior |
| Business logic | Calculations, role/client scoping, activity logging, permissions, status gates, and workflow outcomes |
| Validation/CRUD | Required fields, formats, bounds, read-only rules, server errors, create/read/update/cancel/delete/restore behavior |
| Status logic | Canonical labels, legal sequence, failure/return/cancel/approval conditions, and task-type differences |
| Notifications | Records, unread counts, read/read-all/delete/clear, grouping, linked order navigation, and feedback |
| Reports/analytics | Real data, metrics, filters, charts, tooltips, drill-down, CSV/PDF exports, and access restrictions |
| Archive/audit | Inclusion, read-only behavior, ordering, pagination, restore eligibility, history, and role visibility |
| GPS/tracking | Permission handling, capture/static/live coordinates, polling/heartbeat rules, map states, connection state, and cleanup |
| POD/POT | Eligibility, file/type/size rules, preview, recipient/proof data, upload, association, audit, and completion behavior |
| Re-delivery | Request, future date, approval/rejection, assignment, attempt count, three-attempt limit, and feedback |
| Pickup | Pickup status sequence, office pickup, failed-pickup monitoring, overdue behavior, driver-assignment exclusion, and completion |

No migrated production surface SHALL introduce mock records, random values, fabricated metrics, hardcoded successful states, or source sample data.

## Requirements

### R1 — Source-bounded migration

**User story:** As a product owner, I want the source used only as a design-system reference so production behavior remains authoritative.

1. THE Migrated Frontend SHALL use the verified source only for visual tokens, responsive patterns, and reusable presentation.
2. THE Migrated Frontend SHALL retain the current application as authority for routes, roles, APIs, contexts, state, validation, calculations, permissions, and workflow outcomes.
3. IF a source pattern conflicts with current functionality, accessibility, or canonical status meaning, THEN THE Migrated Frontend SHALL adapt or omit the source pattern.
4. THE Migrated Frontend SHALL contain no source demo records, source-owned production state, custom-event workflow, or hardcoded production substitutes.

### R2 — Shell, navigation, and routes

**User story:** As a user, I want refreshed navigation with identical access and destinations.

1. WHEN an ADMIN, OP. TEAM, or CLIENT opens an authorized route, THE Migrated Frontend SHALL render the adapted staff shell with the current outlet, links, search, notifications, profile, and logout behavior.
2. WHEN a DRIVER opens an authorized driver route, THE Migrated Frontend SHALL retain the mobile driver shell and bottom navigation with presentation-only changes.
3. IF a visitor is unauthenticated, THEN THE Migrated Frontend SHALL preserve the current session check and `/login` redirect.
4. IF an authenticated user lacks access, THEN THE Migrated Frontend SHALL preserve the role-home redirect.
5. BELOW `lg`, staff navigation SHALL be a closed-by-default drawer with labelled open/close controls, backdrop and Escape dismissal, focus containment, and focus restoration.
6. AT OR ABOVE `lg`, staff navigation SHALL not obscure route content and SHALL preserve current expand/collapse behavior.

### R3 — Semantic design system and themes

**User story:** As a user, I want a consistent, readable interface in my selected theme.

1. THE Migrated Frontend SHALL centralize semantic variables for brand, background, surface, text, border, focus, status, chart, spacing, radius, elevation, and motion.
2. THE Migrated Frontend SHALL support light, dark, and system modes through the existing `ThemeProvider` and preserve selection across reloads.
3. THE Migrated Frontend SHALL use Lucide as the canonical icon set; icon-only controls SHALL have accessible names.
4. THE Migrated Frontend SHALL converge on one typed production primitive per approved button, badge, card, table, search, dropdown, field, modal, empty state, and toast category.
5. IF a caller has not migrated, THEN its existing component SHALL remain operational until that slice passes regression QA.
6. COMPONENT code SHALL reference semantic variables rather than hardcoded colors and SHALL provide focus-visible styles.

### R4 — React state integrity

**User story:** As a user, I want inputs and selections to survive visual refactoring.

1. THE Migrated Frontend SHALL preserve component identity for stateful sections unless the existing workflow intentionally resets them.
2. WHEN collections reorder, stable domain identifiers SHALL be React keys so row/item state remains associated correctly.
3. WHEN a controlled input is restyled, its value source, change handler, validation timing, submit handler, and state owner SHALL remain unchanged.
4. WHEN a modal, drawer, filter, pager, or dropdown is restyled, its state owner and callback results SHALL remain unchanged.
5. IF submission fails, user-entered values SHALL remain unless the existing workflow explicitly clears or rolls them back.
6. Presentation templates SHALL NOT own API calls, domain calculations, status rules, or production state.

### R5 — Cards, tables, charts, and data states

**User story:** As an operations user, I want richer data presentation backed only by current data.

1. WHEN dashboard data loads, adapted KPI cards SHALL display the same API-backed calculations and values.
2. WHEN dashboard/report/analytics charts load, the same Recharts series, labels, values, legends, filters, and tooltips SHALL be retained.
3. List routes SHALL preserve current records, search fields, filters, sorting, pagination, exports, selection, row routes, and authorized actions.
4. IF a valid query has no records, an explicit empty state SHALL identify the subject and filtering context without fabricated rows.
5. IF a request fails, an actionable error/retry state SHALL appear without displaying source sample data or false success.
6. Dense tables below `md` SHALL use a bounded horizontal scroll region or approved compact row pattern without hiding required data/actions.
7. Statuses SHALL use text plus color/icon and map from the current canonical status model, not source string heuristics.

### R6 — Forms, validation, and modals

**User story:** As a user completing a transaction, I want refreshed controls that preserve every rule and result.

1. Migrated forms SHALL preserve controlled values, required/conditional fields, formats, bounds, read-only rules, payloads, submission order, and authorized result.
2. IF client validation fails, submission SHALL be blocked, each invalid field SHALL receive associated text feedback, focus SHALL move to the first invalid field, and other values SHALL remain.
3. IF the server rejects a submission, the UI SHALL show actionable failure feedback without exposing internal details and retain recoverable state.
4. Current destructive confirmations SHALL use a labelled modal with distinct cancel/confirm actions and loading/disabled states.
5. WHEN a modal opens, focus SHALL move inside, remain contained, background interaction SHALL be prevented, and overflow SHALL scroll internally.
6. WHEN a modal closes, focus SHALL return to its invoker unless that element no longer exists after success.
7. POD SHALL retain JPEG/PNG acceptance and the current 5 MB maximum.

### R7 — Production workflows

**User story:** As an operator or driver, I want every workflow to behave identically after migration.

1. THE Migrated Frontend SHALL preserve Axios configuration, JWT attachment/refresh/retry, API errors, and the current 30-second timeout.
2. THE Migrated Frontend SHALL preserve order/employee CRUD, driver assignment, activity logs, notification actions, exports, archive/restore, and role restrictions.
3. Legal and illegal delivery/pickup status transitions SHALL produce the same result as before migration.
4. QR lookup, GPS capture, live tracking, maps, POD, POT, re-delivery, failed pickup, office pickup, history, and public privacy behavior SHALL remain unchanged.
5. Authenticated data refresh SHALL preserve the current polling and partial-success behavior.
6. Create Order, Assign Driver, Upload POT/POD, Archive/Restore, Analytics, Reports, Pickup, and Re-delivery actions SHALL continue invoking their existing operations and real data paths.

### R8 — Notifications and feedback

**User story:** As a user, I want consistent feedback without duplicate state systems.

1. Header, staff, and driver notification surfaces SHALL use the existing context/API as the source of records, counts, read state, and navigation.
2. Read/read-all/delete/clear actions SHALL preserve their current API calls and update visible state only according to confirmed outcomes.
3. IF a notification mutation fails, the last confirmed state SHALL remain or be restored and the failed action SHALL be identified.
4. Sonner SHOULD remain the single production toast path; the source `ToastContext` SHALL NOT become a competing state owner.
5. One user action SHALL produce no more than one toast, while field-level feedback MAY remain where needed.
6. Dynamic feedback SHALL use appropriate assistive-technology announcements.

### R9 — Mobile-first responsiveness

**User story:** As a user on any supported device, I want every authorized workflow readable and operable.

1. Responsive behavior SHALL use standard bands without requiring Tailwind: base `<640`, `sm` `≥640`, `md` `≥768`, `lg` `≥1024`, `xl` `≥1280`, and `2xl` `≥1536` CSS pixels.
2. At 320, 640, 768, 1024, 1280, and 1536 px, routed pages SHALL have no page-level horizontal overflow except bounded table/chart/map regions.
3. Reflow SHALL keep labels, validation, status text, primary content, and authorized actions visible.
4. Touch-oriented controls at base/`sm` SHALL target at least 44×44 CSS pixels with adequate spacing.
5. Forms and modals below `md` SHALL stack fields/actions logically and keep focused inputs visible with the software keyboard.
6. Charts/maps below `md` SHALL preserve essential labels, controls, and data access without overlap.
7. Reduced-motion preference SHALL disable non-essential animation without hiding state change meaning.

### R10 — WCAG 2.2 AA

**User story:** As a keyboard, screen-reader, low-vision, or motion-sensitive user, I want complete access to migrated workflows.

1. Every migrated route and shared primitive SHALL conform to WCAG 2.2 AA.
2. Contrast SHALL be at least 4.5:1 for normal text, 3:1 for large text, and 3:1 for meaningful non-text boundaries/focus indicators.
3. All functionality SHALL be keyboard reachable in logical order without traps, except intentional containment in an open modal/drawer.
4. Focus indicators SHALL remain visible and unobscured.
5. Fields, icon controls, headings, table headers, images, charts, maps, and dynamic states SHALL expose appropriate semantics or text alternatives.
6. Color, position, shape, icon, or animation SHALL NOT be the only means of conveying status or outcome.
7. At 200% zoom and 320 CSS-pixel reflow, content/functionality SHALL remain available except intrinsically two-dimensional content.

### R11 — Incremental compatibility

**User story:** As a maintainer, I want isolated and reversible migration slices.

1. Shells SHALL migrate before route templates; shared primitives SHALL migrate before repeated page markup.
2. Existing React, Router, Axios, Lucide, Recharts, Leaflet, QR, Sonner, TypeScript, and Vite dependencies SHALL remain unless separately approved.
3. Source class names and new styles SHALL be isolated so migrated components cannot unintentionally alter unmigrated routes.
4. WHEN a shared contract changes, every caller SHALL be inventoried and tested before the previous contract is removed.
5. IF a slice fails route, role, workflow, responsive, theme, accessibility, build, or lint checks, the slice SHALL NOT advance.
6. Any new dependency SHALL have an exact version, purpose, bundle/accessibility/maintenance impact, and no-dependency alternative approved first.

### R12 — QA, traceability, and completion

**User story:** As a release approver, I want objective parity evidence and a complete migration record.

1. Every current route SHALL be tested for each applicable unauthenticated, ADMIN, OP. TEAM, CLIENT, and DRIVER state.
2. Login, lockout, session restore, valid/failed refresh, logout, authorized/unauthorized routes, and fallbacks SHALL be tested.
3. CRUD, assignment, legal/illegal statuses, filters/search, notifications, reports/exports, archive/restore, GPS/maps, QR, POD/POT, re-delivery, pickup, settings, and role access SHALL be tested where applicable.
4. Pre/post API requests and observable outcomes SHALL show zero unintended contract differences for each migrated transaction.
5. Each migrated route SHALL be checked at all six required widths in light and dark modes, plus system-theme switching.
6. Keyboard, screen-reader smoke, contrast, zoom/reflow, reduced motion, focus containment/restoration, form errors, and table semantics SHALL be checked.
7. Production build, TypeScript, and lint validation SHALL produce zero new migration-attributable errors.
8. Traceability SHALL link each mapping/requirement to affected components, files, validation evidence, compatibility issues, and remaining work.

## 8. Phased Responsiveness and Migration Plan

| Phase | Boundary | Exit check before proceeding |
|---|---|---|
| 1 | Staff layout, sidebar/drawer, header, public shell, retained driver shell | Route access, drawer keyboard behavior, content widths, bottom navigation, six required widths |
| 2 | Tokens, typography, icons, buttons, badges, cards, focus, feedback | Light/dark/system, contrast, target size, focus visibility, reduced motion |
| 3 | Tables, search, filters, dropdowns, forms, modals, notifications, charts, state containers | Base through `2xl`, keyboard, long content, loading/error/empty, no hidden actions |
| 4 | Dashboard, lists, details, forms, reports/analytics, auth, public tracking, driver routes | Mapping parity, route/role workflows, API outcomes, responsive matrix |
| 5 | Cross-route hardening and cleanup | Full route-role-workflow QA, accessibility, build/lint/type checks, final report |

No phase SHALL move business logic from routes, contexts, hooks, or API services into presentation templates.

## 9. Compatibility and Risk Register

| Risk | Required mitigation |
|---|---|
| Global CSS/class collisions | Use deliberate namespacing/scoping and cross-route visual regression checks |
| Source monoliths (`GlobalHeader`, `Sidebar`, `FormModals`) | Decompose into small typed primitives and templates receiving current data/callbacks |
| Source demo state, `localStorage`, custom events | Do not migrate as production state; verify data origin for every visible value |
| Duplicate toast systems | Keep one production toast path and test one outcome notification per action |
| Tabler/font additions | Translate icons to Lucide; require explicit typography/dependency approval |
| Modal/table accessibility gaps | Implement one accessible contract and verify focus, semantics, keyboard, overflow, and announcements |
| Staff/source/driver responsive conflicts | Migrate shells first; retain the purpose-built driver shell |
| Source status semantic mismatch | Use an explicit map owned by current canonical statuses |
| Component key/identity changes | Stable domain keys and state-continuity tests |
| Controlled-input drift | Preserve owner, handlers, validation timing, and compare submitted payloads |
| Hardcoded/demo values | Omit unavailable elements rather than invent data |

## 10. Final Deliverables

After approved implementation, provide:
- Components migrated, reused, redesigned, retained, and adapted.
- UI improvements: tokens, spacing, typography, alignment, hierarchy, responsive layout, and consistency.
- UX improvements: accessibility, loading, empty/error states, validation feedback, confirmations, and action hierarchy.
- Compatibility issues and their resolutions or documented deferrals.
- Every modified file and validation result.
- Route/role/workflow/API parity evidence.
- Remaining tasks and unresolved risks.

This requirements phase authorizes only this `requirements.md`; it does not authorize implementation, `design.md`, or `tasks.md`.

## 11. Open Decisions Required Before Technical Design

1. **Typography:** A) Inter body + Montserrat headings, B) Inter only, or C) retain the current system stack.
2. **CSS strategy:** A) scoped existing CSS + semantic variables, B) CSS Modules + semantic variables, or C) explicitly approve another compatible strategy. Tailwind is not implied.
3. **Pinned/favorite navigation:** A) out of scope and retain current role links/collapse only, or B) include after defining persistence and authorization semantics.
4. **New dependencies:** A) none unless individually approved (recommended), or B) allow proposed exact versions after impact review.
5. **Palette:** A) extend the current teal/navy identity with source semantic depth, or B) broader source palette replacement while preserving status meaning.
6. **Font delivery if approved:** A) self-host, or B) external provider subject to privacy, CSP, and availability approval.
7. **Dense mobile tables:** A) bounded horizontal scrolling by default, or B) approved card-row alternatives on selected routes.
8. **Toast consolidation:** Confirm Sonner as the single production toast system and keep source `ToastContext` out of scope.

## 12. Definition of Requirements Completion

Phase 1 is complete when this document and its verified mapping are approved, the open decisions are answered, and no application source code has been changed. Technical Design SHALL begin only after that approval.

## Glossary

- **Current application:** The existing CAPSTONE frontend and its production backend integrations.
- **Source UI:** Revision `a4305544058333285bfe6517b258db10e246a1c8` of the external component demonstration.
- **Migrated Frontend:** The current application after an approved presentation-only migration.
- **Semantic token:** A purpose-named visual variable such as surface, text, focus, or failed status.
- **Primitive:** A reusable presentation component such as a button, badge, field, card, modal, or table.
- **Template:** A presentation composition receiving production state and callbacks without owning business logic.
- **POD:** Proof of Delivery.
- **POT:** Proof of Transaction.
- **WCAG:** Web Content Accessibility Guidelines.