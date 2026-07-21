import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MIGRATION_SLICE_KINDS,
  PROMOTION_GATE_KINDS,
  validateMigrationSliceManifest,
  validateValidationRecord,
  type MigrationSliceManifest,
  type MigrationSliceKind,
} from './schemas.ts';

const evidence = {
  id: 'evidence-build-1',
  kind: 'command-output' as const,
  path: 'migration-artifacts/frontend-ui-ux-migration/evidence/build.txt',
  description: 'Focused schema tests, build, TypeScript, and lint output.',
  requirementIds: ['R12.7', 'R12.8'] as const,
  affectedFiles: ['src/components/ui/Example.tsx'] as const,
};

function createManifest(kind: MigrationSliceKind): MigrationSliceManifest {
  const validationRecords = PROMOTION_GATE_KINDS.map((gateKind) => ({
    id: `validation-${gateKind}`,
    requirementIds: ['R11.5', 'R12.7'] as const,
    route: '/dashboard',
    role: 'ADMIN' as const,
    viewport: 320 as const,
    theme: 'light' as const,
    checks: [`${gateKind} parity check`],
    result: 'pass' as const,
    evidenceIds: [evidence.id],
    migrationAttributableErrors: [],
  }));

  return {
    schemaVersion: 1,
    id: `${kind}-example`,
    kind,
    title: `${kind} reversible migration slice`,
    requirementIds: ['R11.3', 'R11.5', 'R12.7', 'R12.8'],
    affectedRoutes: ['/dashboard'],
    affectedRoles: ['ADMIN'],
    affectedFiles: ['src/components/ui/Example.tsx'],
    compatibilityAdapters: [{
      name: 'ExampleLegacyAdapter',
      file: 'src/components/ui/Example.tsx',
      legacyContract: 'Legacy props remain accepted.',
      replacementContract: 'Typed semantic props.',
      rollbackExport: 'LegacyExample',
      removalCriteria: 'Remove only after zero callers and route-cohort parity.',
    }],
    baselineOperations: [{
      id: 'load-dashboard',
      operation: 'Load dashboard',
      method: 'GET',
      normalizedPath: '/api/deliveryorder',
      requestShapeHash: 'sha256:empty',
      responseStatus: 200,
      observableOutcome: 'Existing dashboard records remain visible.',
      matchesBaseline: true,
      evidenceIds: [evidence.id],
    }],
    validationRecords,
    promotionGates: PROMOTION_GATE_KINDS.map((gateKind) => ({
      kind: gateKind,
      applicability: 'required' as const,
      validationRecordIds: [`validation-${gateKind}`],
    })),
    evidence: [evidence],
    compatibilityIssues: [],
    remainingWork: [],
    rollbackBoundary: {
      sliceId: `${kind}-example`,
      strategy: 'file-component',
      baselineRef: 'baseline/frontend-ui-before-slice',
      affectedFiles: ['src/components/ui/Example.tsx'],
      restoreSteps: ['Restore the prior component file and compatibility export.'],
      verificationSteps: ['Run focused tests, npm run build, and npm run lint.'],
      preservedAuthorities: ['src/App.tsx', 'src/context', 'src/api'],
      independentlyReversible: true,
    },
    releaseDecision: 'passed',
  };
}

test('accepts an independently reversible manifest for every slice kind', () => {
  for (const kind of MIGRATION_SLICE_KINDS) {
    const result = validateMigrationSliceManifest(createManifest(kind));
    assert.equal(result.success, true, `${kind} should be valid`);
  }
});

test('rejects promotion when a required gate fails', () => {
  const baseline = createManifest('shell');
  const manifest = {
    ...baseline,
    validationRecords: baseline.validationRecords.map((record, index) => index === 0
      ? { ...record, result: 'fail', migrationAttributableErrors: ['Drawer focus restoration regressed.'] }
      : record),
  };

  const result = validateMigrationSliceManifest(manifest);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.issues.some((issue) => issue.path === 'releaseDecision'));
  }
});

test('rejects rollback boundaries that do not cover exactly the changed files', () => {
  const baseline = createManifest('primitive');
  const manifest = {
    ...baseline,
    rollbackBoundary: {
      ...baseline.rollbackBoundary,
      affectedFiles: ['src/components/ui/Other.tsx'],
    },
  };

  const result = validateMigrationSliceManifest(manifest);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.issues.some((issue) => issue.path === 'rollbackBoundary.affectedFiles'));
  }
});

test('rejects unresolved evidence references', () => {
  const baseline = createManifest('composition');
  const manifest = {
    ...baseline,
    validationRecords: baseline.validationRecords.map((record, index) => index === 0
      ? { ...record, evidenceIds: ['missing-evidence'] }
      : record),
  };

  const result = validateMigrationSliceManifest(manifest);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.issues.some((issue) => issue.message.includes('unknown evidence')));
  }
});

test('validation records enforce the route, role, viewport, theme, checks, and evidence matrix', () => {
  const result = validateValidationRecord({
    id: '',
    requirementIds: ['bad-id'],
    route: 'dashboard',
    role: 'SUPERUSER',
    viewport: 500,
    theme: 'contrast',
    checks: [],
    result: 'pass',
    evidenceIds: [],
    migrationAttributableErrors: ['new lint failure'],
  });

  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.issues.length >= 9);
});
