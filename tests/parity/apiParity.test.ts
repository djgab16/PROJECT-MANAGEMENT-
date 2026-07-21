import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  normalizeHeaders,
  normalizeParityObservation,
  normalizePayloadShape,
  normalizeUrl,
  normalizeVisibleOutcome,
} from './apiParityNormalization.ts';
import { apiParityFixtures, requiredOperationCategories } from './apiParityOperations.ts';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('normalizes method, URL, behavior headers, payload shape, status, and visible outcome', () => {
  const normalized = normalizeParityObservation({
    method: ' patch ',
    url: 'https://api.example.test/api/deliveryorder/42/status?waybill=WB-2026-001&at=2026-08-01T10:20:30Z&status=Failed',
    headers: {
      Authorization: 'Bearer fixture-secret-token',
      'Content-Type': 'Application/JSON',
      'User-Agent': 'volatile-agent',
    },
    payload: {
      status: 'Failed',
      password: 'fixture-password',
      lastUpdated: '2026-08-01T10:20:30Z',
      coordinates: { lat: 14.6, lng: 121.0 },
    },
    responseStatus: 200,
    visibleOutcome: '  Status saved   successfully. ',
  });

  assert.deepEqual(normalized, {
    method: 'PATCH',
    normalizedUrl: '/api/deliveryorder/{id}/status?at=<volatile>&status=Failed&waybill=<redacted>',
    behaviorHeaders: {
      authorization: 'Bearer <redacted>',
      'content-type': 'application/json',
    },
    payloadShape: {
      coordinates: { lat: '<volatile>', lng: '<volatile>' },
      lastUpdated: '<volatile>',
      password: '<redacted>',
      status: '<string>',
    },
    responseStatus: 200,
    visibleOutcome: 'Status saved successfully.',
  });
});

test('redacts sensitive and volatile values while retaining contract structure', () => {
  assert.equal(normalizeUrl('/api/auth/refresh?token=secret'), '/api/auth/refresh?token=<redacted>');
  assert.equal(
    normalizeUrl('https://router.example/route/121.0,14.0;122.0,15.0?overview=full'),
    '/route/<coordinates>?overview=full',
  );
  assert.deepEqual(normalizeHeaders({ Cookie: 'session=secret', Accept: 'Application/JSON', Traceparent: 'volatile' }), {
    accept: 'application/json',
    cookie: '<redacted>',
  });
  assert.deepEqual(normalizePayloadShape({
    accessToken: 'secret',
    expiresAt: '2026-08-01T10:20:30Z',
    values: [1, 2, 3],
    active: true,
  }), {
    accessToken: '<redacted>',
    active: '<boolean>',
    expiresAt: '<volatile>',
    values: ['<number>'],
  });
  assert.equal(
    normalizeVisibleOutcome('Generated at 10:20 AM on 2026-08-01T10:20:30Z'),
    'Generated <volatile> on <volatile>',
  );
});

test('rejects unsupported methods and invalid HTTP statuses', () => {
  assert.throws(
    () => normalizeParityObservation({ method: 'TRACE', url: '/', responseStatus: 200, visibleOutcome: 'ignored' }),
    /Unsupported parity method/,
  );
  assert.throws(
    () => normalizeParityObservation({ method: 'GET', url: '/', responseStatus: 99, visibleOutcome: 'ignored' }),
    /Invalid HTTP response status/,
  );
});

test('inventory covers every required workflow category and critical auth outcome', () => {
  const categories = new Set(apiParityFixtures.map(({ category }) => category));
  assert.deepEqual([...requiredOperationCategories].sort(), [...categories].sort());

  const operations = apiParityFixtures.map(({ operation }) => operation);
  assert.equal(new Set(operations).size, operations.length, 'operation identifiers must be unique');
  for (const required of [
    'auth.login.success',
    'auth.login.locked',
    'auth.session.restore',
    'auth.refresh.valid',
    'auth.refresh.failed',
    'auth.logout.revoke',
    'status.driver.legal',
    'status.driver.illegal',
    'archive.restore',
    'qr.lookup.success',
    'gps.live-location.poll',
    'pod.driver-submit',
    'pot.order-save',
    'redelivery.public-request',
    'pickup.office-sequence',
    'settings.save',
    'role-access.save',
  ]) {
    assert.ok(operations.includes(required), `missing ${required}`);
  }
});

test('fixtures are normalized, source-grounded, and contain no raw credentials', () => {
  for (const entry of apiParityFixtures) {
    assert.ok(entry.sourceRefs.length > 0, `${entry.operation} must identify an owner`);
    assert.ok(entry.sourceRefs.every((source) => source.startsWith('src/')), `${entry.operation} has a non-production source`);
    assert.equal(entry.method === 'LOCAL', entry.transport === 'browser-local');
    assert.equal(entry.responseStatus === null, entry.transport === 'browser-local');
    if (entry.transport === 'http') {
      assert.ok(entry.normalizedUrl.startsWith('/'), `${entry.operation} must omit its volatile origin`);
      assert.match(entry.behaviorHeaders.authorization ?? '<redacted>', /<redacted>/);
    }
  }

  const serialized = JSON.stringify(apiParityFixtures);
  assert.doesNotMatch(serialized, /fixture-(?:access|refresh|secret)-token|fixture-password/i);
  assert.doesNotMatch(serialized, /Bearer (?!<redacted>)/i);
  assert.doesNotMatch(serialized, /data:image\/(?:png|jpeg);base64,fixture/i);
});

async function collectSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  }));
  return files.flat();
}

test('production code does not import the parity harness', async () => {
  const sourceFiles = await collectSourceFiles(resolve(repositoryRoot, 'src'));
  const offenders: string[] = [];
  for (const sourceFile of sourceFiles) {
    const source = await readFile(sourceFile, 'utf8');
    const importsHarness = /(?:from\s*['"][^'"]*(?:apiParity(?:Normalization|Operations)|tests[\\/]parity)|import\s*['"][^'"]*tests[\\/]parity)/.test(source);
    if (importsHarness) offenders.push(sourceFile.replace(`${repositoryRoot}\\`, ''));
  }
  assert.deepEqual(offenders, []);
});