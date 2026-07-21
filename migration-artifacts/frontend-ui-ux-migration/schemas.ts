// Test/release artifact schemas for frontend-ui-ux-migration.
// This module is intentionally outside src/ and must never be imported by runtime code.

export const MIGRATION_SLICE_KINDS = [
  'foundation',
  'shell',
  'primitive',
  'composition',
  'route-cohort',
  'cleanup',
] as const;

export const ARTIFACT_ROLES = [
  'PUBLIC',
  'UNAUTHENTICATED',
  'ADMIN',
  'OP. TEAM',
  'CLIENT',
  'DRIVER',
] as const;

export const VIEWPORTS = [320, 640, 768, 1024, 1280, 1536] as const;
export const THEMES = ['light', 'dark', 'system'] as const;
export const VALIDATION_RESULTS = ['pass', 'fail', 'blocked'] as const;
export const RELEASE_DECISIONS = ['planned', 'blocked', 'passed', 'rolled-back'] as const;
export const PROMOTION_GATE_KINDS = [
  'route',
  'role',
  'workflow',
  'responsive',
  'theme',
  'accessibility',
  'build',
  'typescript',
  'lint',
] as const;

export type MigrationSliceKind = (typeof MIGRATION_SLICE_KINDS)[number];
export type ArtifactRole = (typeof ARTIFACT_ROLES)[number];
export type Viewport = (typeof VIEWPORTS)[number];
export type Theme = (typeof THEMES)[number];
export type ValidationResult = (typeof VALIDATION_RESULTS)[number];
export type ReleaseDecision = (typeof RELEASE_DECISIONS)[number];
export type PromotionGateKind = (typeof PROMOTION_GATE_KINDS)[number];
export type RequirementId = `R${number}.${number}`;

export interface EvidenceReference {
  readonly id: string;
  readonly kind: 'screenshot' | 'command-output' | 'test-report' | 'accessibility-report' | 'api-parity' | 'manual-check';
  readonly path: string;
  readonly description: string;
  readonly requirementIds: readonly RequirementId[];
  readonly affectedFiles: readonly string[];
}

export interface ApiParityRecord {
  readonly id: string;
  readonly operation: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly normalizedPath: string;
  readonly requestShapeHash: string;
  readonly responseStatus: number;
  readonly observableOutcome: string;
  readonly matchesBaseline: boolean;
  readonly evidenceIds: readonly string[];
}

export interface CompatibilityAdapterRecord {
  readonly name: string;
  readonly file: string;
  readonly legacyContract: string;
  readonly replacementContract: string;
  readonly rollbackExport: string;
  readonly removalCriteria: string;
}

export interface ValidationRecord {
  readonly id: string;
  readonly requirementIds: readonly RequirementId[];
  readonly route: string;
  readonly role: ArtifactRole;
  readonly viewport: Viewport;
  readonly theme: Theme;
  readonly checks: readonly string[];
  readonly result: ValidationResult;
  readonly evidenceIds: readonly string[];
  readonly migrationAttributableErrors: readonly string[];
}

export interface PromotionGateRecord {
  readonly kind: PromotionGateKind;
  readonly applicability: 'required' | 'not-applicable';
  readonly rationale?: string;
  readonly validationRecordIds: readonly string[];
}

export interface RollbackBoundary {
  readonly sliceId: string;
  readonly strategy: 'file-component';
  readonly baselineRef: string;
  readonly affectedFiles: readonly string[];
  readonly restoreSteps: readonly string[];
  readonly verificationSteps: readonly string[];
  readonly preservedAuthorities: readonly string[];
  readonly independentlyReversible: true;
}

export interface MigrationSliceManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly kind: MigrationSliceKind;
  readonly title: string;
  readonly requirementIds: readonly RequirementId[];
  readonly affectedRoutes: readonly string[];
  readonly affectedRoles: readonly ArtifactRole[];
  readonly affectedFiles: readonly string[];
  readonly compatibilityAdapters: readonly CompatibilityAdapterRecord[];
  readonly baselineOperations: readonly ApiParityRecord[];
  readonly baselineOperationRationale?: string;
  readonly validationRecords: readonly ValidationRecord[];
  readonly promotionGates: readonly PromotionGateRecord[];
  readonly evidence: readonly EvidenceReference[];
  readonly compatibilityIssues: readonly string[];
  readonly remainingWork: readonly string[];
  readonly rollbackBoundary: RollbackBoundary;
  readonly releaseDecision: ReleaseDecision;
}

export interface SchemaIssue {
  readonly path: string;
  readonly message: string;
}

export type SchemaValidation<T> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly issues: readonly SchemaIssue[] };

const REQUIRED_REQUIREMENTS = ['R11.3', 'R11.5', 'R12.7', 'R12.8'] as const;
const REQUIREMENT_ID_PATTERN = /^R\d+\.\d+$/;
const SLICE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown, allowEmpty = false): value is string[] {
  return Array.isArray(value)
    && (allowEmpty || value.length > 0)
    && value.every(isNonEmptyString);
}

function isUnique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function hasSameMembers(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function isOneOf<const T extends readonly unknown[]>(value: unknown, allowed: T): value is T[number] {
  return allowed.includes(value);
}

function addIssue(issues: SchemaIssue[], path: string, message: string): void {
  issues.push({ path, message });
}

function validateRequirementIds(value: unknown, path: string, issues: SchemaIssue[]): value is RequirementId[] {
  if (!isStringArray(value)) {
    addIssue(issues, path, 'must be a non-empty array of requirement IDs');
    return false;
  }
  if (!value.every((id) => REQUIREMENT_ID_PATTERN.test(id))) {
    addIssue(issues, path, 'must contain only IDs in R<number>.<number> format');
    return false;
  }
  if (!isUnique(value)) addIssue(issues, path, 'must not contain duplicate requirement IDs');
  return true;
}

function validateEvidenceReference(value: unknown, path: string, issues: SchemaIssue[]): value is EvidenceReference {
  if (!isObject(value)) {
    addIssue(issues, path, 'must be an evidence object');
    return false;
  }
  if (!isNonEmptyString(value.id)) addIssue(issues, `${path}.id`, 'must be non-empty');
  const kinds = ['screenshot', 'command-output', 'test-report', 'accessibility-report', 'api-parity', 'manual-check'] as const;
  if (!isOneOf(value.kind, kinds)) addIssue(issues, `${path}.kind`, 'is not a supported evidence kind');
  if (!isNonEmptyString(value.path) || value.path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value.path)) {
    addIssue(issues, `${path}.path`, 'must be a repository-relative path');
  }
  if (!isNonEmptyString(value.description)) addIssue(issues, `${path}.description`, 'must be non-empty');
  validateRequirementIds(value.requirementIds, `${path}.requirementIds`, issues);
  if (!isStringArray(value.affectedFiles)) addIssue(issues, `${path}.affectedFiles`, 'must identify affected files');
  return true;
}

export function validateValidationRecord(value: unknown): SchemaValidation<ValidationRecord> {
  const issues: SchemaIssue[] = [];
  if (!isObject(value)) return { success: false, issues: [{ path: '$', message: 'must be an object' }] };
  if (!isNonEmptyString(value.id)) addIssue(issues, 'id', 'must be non-empty');
  validateRequirementIds(value.requirementIds, 'requirementIds', issues);
  if (!isNonEmptyString(value.route) || !value.route.startsWith('/')) addIssue(issues, 'route', 'must be an absolute application route');
  if (!isOneOf(value.role, ARTIFACT_ROLES)) addIssue(issues, 'role', 'is not an artifact role');
  if (!isOneOf(value.viewport, VIEWPORTS)) addIssue(issues, 'viewport', 'is not a required viewport');
  if (!isOneOf(value.theme, THEMES)) addIssue(issues, 'theme', 'is not a supported theme');
  if (!isStringArray(value.checks)) addIssue(issues, 'checks', 'must contain at least one check');
  if (!isOneOf(value.result, VALIDATION_RESULTS)) addIssue(issues, 'result', 'is not pass, fail, or blocked');
  if (!isStringArray(value.evidenceIds)) addIssue(issues, 'evidenceIds', 'must contain at least one evidence reference');
  if (!isStringArray(value.migrationAttributableErrors, true)) addIssue(issues, 'migrationAttributableErrors', 'must be a string array');
  if (value.result === 'pass' && Array.isArray(value.migrationAttributableErrors) && value.migrationAttributableErrors.length > 0) {
    addIssue(issues, 'migrationAttributableErrors', 'must be empty when result is pass');
  }
  return issues.length === 0
    ? { success: true, value: value as unknown as ValidationRecord }
    : { success: false, issues };
}

function validateCompatibilityAdapter(value: unknown, path: string, issues: SchemaIssue[]): void {
  if (!isObject(value)) {
    addIssue(issues, path, 'must be a compatibility adapter object');
    return;
  }
  for (const field of ['name', 'file', 'legacyContract', 'replacementContract', 'rollbackExport', 'removalCriteria'] as const) {
    if (!isNonEmptyString(value[field])) addIssue(issues, `${path}.${field}`, 'must be non-empty');
  }
}

function validateApiParityRecord(value: unknown, path: string, issues: SchemaIssue[]): void {
  if (!isObject(value)) {
    addIssue(issues, path, 'must be an API parity object');
    return;
  }
  for (const field of ['id', 'operation', 'normalizedPath', 'requestShapeHash', 'observableOutcome'] as const) {
    if (!isNonEmptyString(value[field])) addIssue(issues, `${path}.${field}`, 'must be non-empty');
  }
  if (!isOneOf(value.method, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const)) addIssue(issues, `${path}.method`, 'is not supported');
  if (typeof value.responseStatus !== 'number' || !Number.isInteger(value.responseStatus) || value.responseStatus < 100 || value.responseStatus > 599) {
    addIssue(issues, `${path}.responseStatus`, 'must be an HTTP status from 100 through 599');
  }
  if (typeof value.matchesBaseline !== 'boolean') addIssue(issues, `${path}.matchesBaseline`, 'must be boolean');
  if (!isStringArray(value.evidenceIds)) addIssue(issues, `${path}.evidenceIds`, 'must identify parity evidence');
}

function validateRollbackBoundary(value: unknown, manifestId: unknown, affectedFiles: unknown, issues: SchemaIssue[]): void {
  const path = 'rollbackBoundary';
  if (!isObject(value)) {
    addIssue(issues, path, 'must be a rollback boundary object');
    return;
  }
  if (value.sliceId !== manifestId) addIssue(issues, `${path}.sliceId`, 'must equal the manifest id');
  if (value.strategy !== 'file-component') addIssue(issues, `${path}.strategy`, 'must use the file-component boundary');
  if (!isNonEmptyString(value.baselineRef)) addIssue(issues, `${path}.baselineRef`, 'must identify a prior commit, tag, or baseline');
  if (!isStringArray(value.affectedFiles)) {
    addIssue(issues, `${path}.affectedFiles`, 'must identify files restored by this slice');
  } else if (isStringArray(affectedFiles) && !hasSameMembers(value.affectedFiles, affectedFiles)) {
    addIssue(issues, `${path}.affectedFiles`, 'must cover exactly the manifest affectedFiles');
  }
  if (!isStringArray(value.restoreSteps)) addIssue(issues, `${path}.restoreSteps`, 'must contain restoration instructions');
  if (!isStringArray(value.verificationSteps)) addIssue(issues, `${path}.verificationSteps`, 'must contain post-rollback verification');
  if (!isStringArray(value.preservedAuthorities)) addIssue(issues, `${path}.preservedAuthorities`, 'must name untouched runtime authorities');
  if (value.independentlyReversible !== true) addIssue(issues, `${path}.independentlyReversible`, 'must be true');
}

function validatePromotionGates(value: unknown, validationRecordIds: readonly string[], issues: SchemaIssue[]): PromotionGateRecord[] {
  if (!Array.isArray(value)) {
    addIssue(issues, 'promotionGates', 'must be an array');
    return [];
  }
  const gates: PromotionGateRecord[] = [];
  value.forEach((candidate, index) => {
    const path = `promotionGates[${index}]`;
    if (!isObject(candidate)) {
      addIssue(issues, path, 'must be a promotion gate object');
      return;
    }
    if (!isOneOf(candidate.kind, PROMOTION_GATE_KINDS)) addIssue(issues, `${path}.kind`, 'is not a supported gate');
    if (!isOneOf(candidate.applicability, ['required', 'not-applicable'] as const)) addIssue(issues, `${path}.applicability`, 'is invalid');
    if (!isStringArray(candidate.validationRecordIds, true)) {
      addIssue(issues, `${path}.validationRecordIds`, 'must be a string array');
    } else if (candidate.validationRecordIds.some((id) => !validationRecordIds.includes(id))) {
      addIssue(issues, `${path}.validationRecordIds`, 'contains an unknown validation record');
    }
    if (candidate.applicability === 'required' && (!Array.isArray(candidate.validationRecordIds) || candidate.validationRecordIds.length === 0)) {
      addIssue(issues, `${path}.validationRecordIds`, 'must contain evidence-backed checks when required');
    }
    if (candidate.applicability === 'not-applicable' && !isNonEmptyString(candidate.rationale)) {
      addIssue(issues, `${path}.rationale`, 'must explain why the gate is not applicable');
    }
    gates.push(candidate as unknown as PromotionGateRecord);
  });
  for (const kind of PROMOTION_GATE_KINDS) {
    if (gates.filter((gate) => gate.kind === kind).length !== 1) addIssue(issues, 'promotionGates', `must contain exactly one ${kind} gate`);
  }
  return gates;
}

export function validateMigrationSliceManifest(value: unknown): SchemaValidation<MigrationSliceManifest> {
  const issues: SchemaIssue[] = [];
  if (!isObject(value)) return { success: false, issues: [{ path: '$', message: 'must be an object' }] };

  if (value.schemaVersion !== 1) addIssue(issues, 'schemaVersion', 'must be 1');
  if (!isNonEmptyString(value.id) || !SLICE_ID_PATTERN.test(value.id)) addIssue(issues, 'id', 'must be a kebab-case identifier');
  if (!isOneOf(value.kind, MIGRATION_SLICE_KINDS)) addIssue(issues, 'kind', 'is not a supported migration slice kind');
  if (!isNonEmptyString(value.title)) addIssue(issues, 'title', 'must be non-empty');
  const requirementIds = value.requirementIds;
  const requirementIdsValid = validateRequirementIds(requirementIds, 'requirementIds', issues);
  if (requirementIdsValid) {
    for (const requirement of REQUIRED_REQUIREMENTS) {
      if (!requirementIds.includes(requirement)) addIssue(issues, 'requirementIds', `must trace ${requirement}`);
    }
  }
  if (!isStringArray(value.affectedRoutes, true) || value.affectedRoutes.some((route) => !route.startsWith('/'))) {
    addIssue(issues, 'affectedRoutes', 'must contain only absolute application routes');
  }
  if (!Array.isArray(value.affectedRoles) || value.affectedRoles.length === 0 || !value.affectedRoles.every((role) => isOneOf(role, ARTIFACT_ROLES))) {
    addIssue(issues, 'affectedRoles', 'must contain at least one supported role');
  }
  if (!isStringArray(value.affectedFiles) || !isUnique(value.affectedFiles)) addIssue(issues, 'affectedFiles', 'must contain unique repository-relative files');

  if (!Array.isArray(value.compatibilityAdapters)) {
    addIssue(issues, 'compatibilityAdapters', 'must be an array');
  } else {
    value.compatibilityAdapters.forEach((adapter, index) => validateCompatibilityAdapter(adapter, `compatibilityAdapters[${index}]`, issues));
  }

  if (!Array.isArray(value.baselineOperations)) {
    addIssue(issues, 'baselineOperations', 'must be an array');
  } else {
    value.baselineOperations.forEach((operation, index) => validateApiParityRecord(operation, `baselineOperations[${index}]`, issues));
    if (value.baselineOperations.length === 0 && !isNonEmptyString(value.baselineOperationRationale)) {
      addIssue(issues, 'baselineOperationRationale', 'must explain why this slice observes no baseline operation');
    }
  }

  const validationRecords: ValidationRecord[] = [];
  if (!Array.isArray(value.validationRecords) || value.validationRecords.length === 0) {
    addIssue(issues, 'validationRecords', 'must contain at least one validation record');
  } else {
    value.validationRecords.forEach((record, index) => {
      const result = validateValidationRecord(record);
      if (result.success) validationRecords.push(result.value);
      else result.issues.forEach((issue) => addIssue(issues, `validationRecords[${index}].${issue.path}`, issue.message));
    });
  }

  const validationRecordIds = validationRecords.map((record) => record.id);
  if (!isUnique(validationRecordIds)) addIssue(issues, 'validationRecords', 'must have unique ids');
  const gates = validatePromotionGates(value.promotionGates, validationRecordIds, issues);

  const evidenceRecords: EvidenceReference[] = [];
  if (!Array.isArray(value.evidence) || value.evidence.length === 0) {
    addIssue(issues, 'evidence', 'must contain traceable evidence');
  } else {
    value.evidence.forEach((record, index) => {
      if (validateEvidenceReference(record, `evidence[${index}]`, issues)) evidenceRecords.push(record);
    });
  }
  const evidenceIds = evidenceRecords.map((record) => record.id);
  if (!isUnique(evidenceIds)) addIssue(issues, 'evidence', 'must have unique ids');
  for (const record of validationRecords) {
    for (const evidenceId of record.evidenceIds) {
      if (!evidenceIds.includes(evidenceId)) addIssue(issues, `validationRecords.${record.id}.evidenceIds`, `references unknown evidence ${evidenceId}`);
    }
  }
  if (Array.isArray(value.baselineOperations)) {
    for (const operation of value.baselineOperations) {
      if (isObject(operation) && Array.isArray(operation.evidenceIds)) {
        for (const evidenceId of operation.evidenceIds) {
          if (typeof evidenceId === 'string' && !evidenceIds.includes(evidenceId)) addIssue(issues, `baselineOperations.${String(operation.id)}.evidenceIds`, `references unknown evidence ${evidenceId}`);
        }
      }
    }
  }

  if (!isStringArray(value.compatibilityIssues, true)) addIssue(issues, 'compatibilityIssues', 'must be a string array');
  if (!isStringArray(value.remainingWork, true)) addIssue(issues, 'remainingWork', 'must be a string array');
  validateRollbackBoundary(value.rollbackBoundary, value.id, value.affectedFiles, issues);
  if (!isOneOf(value.releaseDecision, RELEASE_DECISIONS)) addIssue(issues, 'releaseDecision', 'is not supported');

  if (value.releaseDecision === 'passed') {
    const failedGate = gates.some((gate) => gate.applicability === 'required' && gate.validationRecordIds.some((id) => validationRecords.find((record) => record.id === id)?.result !== 'pass'));
    const baselineMismatch = Array.isArray(value.baselineOperations) && value.baselineOperations.some((operation) => isObject(operation) && operation.matchesBaseline !== true);
    const hasMigrationErrors = validationRecords.some((record) => record.migrationAttributableErrors.length > 0);
    if (failedGate || baselineMismatch || hasMigrationErrors) {
      addIssue(issues, 'releaseDecision', 'cannot be passed until required gates pass with matching baselines and zero migration-attributable errors');
    }
  }

  return issues.length === 0
    ? { success: true, value: value as unknown as MigrationSliceManifest }
    : { success: false, issues };
}

export function assertMigrationSliceManifest(value: unknown): asserts value is MigrationSliceManifest {
  const result = validateMigrationSliceManifest(value);
  if (!result.success) {
    throw new TypeError(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'));
  }
}
