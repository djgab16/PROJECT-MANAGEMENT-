import type { UserRole } from '../../types';

export type EvidenceRole = UserRole | 'PUBLIC' | 'UNAUTHENTICATED';
export type EvidenceViewport = 320 | 640 | 768 | 1024 | 1280 | 1536;
export type EvidenceTheme = 'light' | 'dark' | 'system';
export type ValidationResult = 'pass' | 'fail' | 'blocked';

/** Test/release evidence only; this is not application or domain state. */
export interface ApiParityRecord {
  operation: string;
  method: string;
  normalizedPath: string;
  requestShapeHash: string;
  responseStatus: number;
  observableOutcome: string;
  matchesBaseline: boolean;
}

/** Test/release evidence only; this is not application or domain state. */
export interface ValidationRecord {
  requirementIds: readonly string[];
  route: string;
  role: EvidenceRole;
  viewport: EvidenceViewport;
  theme: EvidenceTheme;
  checks: readonly string[];
  result: ValidationResult;
  evidence: string;
}

/** Describes an independently reversible migration slice for release evidence. */
export interface MigrationSliceManifest {
  id: string;
  routes: readonly string[];
  roles: readonly UserRole[] | readonly ['PUBLIC'];
  changedFiles: readonly string[];
  operations: readonly ApiParityRecord[];
  checks: readonly ValidationRecord[];
  compatibilityAdapters: readonly string[];
  rollbackBoundary: string;
}
