export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ParityMethod = HttpMethod | 'LOCAL';

export type PayloadShape =
  | '<redacted>'
  | '<volatile>'
  | '<file>'
  | '<string>'
  | '<number>'
  | '<boolean>'
  | '<bigint>'
  | '<undefined>'
  | '<function>'
  | '<symbol>'
  | null
  | readonly PayloadShape[]
  | { readonly [key: string]: PayloadShape };

export interface RawParityObservation {
  method: string;
  url: string;
  headers?: Readonly<Record<string, string | undefined>>;
  payload?: unknown;
  responseStatus: number | null;
  visibleOutcome: string;
}

export interface NormalizedParityObservation {
  method: ParityMethod;
  normalizedUrl: string;
  behaviorHeaders: Readonly<Record<string, string>>;
  payloadShape: PayloadShape;
  responseStatus: number | null;
  visibleOutcome: string;
}

const SENSITIVE_KEY = /(?:authorization|cookie|password|secret|token|api[-_]?key|phone(?:number|last4)?)/i;
const VOLATILE_KEY = /(?:^|_)(?:id|.*Id|date|time|timestamp|expiresAt|lastUpdated|completedAt|latitude|longitude|lat|lng)$/i;
const REDACTED_QUERY = /^(?:waybill|q|search|token|access_token|refresh_token|api_key|key)$/i;
const VOLATILE_QUERY = /(?:^at$|date|time|timestamp|lat|lng|latitude|longitude)$/i;
const BEHAVIOR_HEADERS = new Set([
  'accept',
  'authorization',
  'content-type',
  'cookie',
  'idempotency-key',
  'if-match',
  'x-api-key',
  'x-requested-with',
]);

function normalizeMethod(method: string): ParityMethod {
  const normalized = method.trim().toUpperCase();
  if (normalized === 'LOCAL') return normalized;
  if (normalized === 'GET' || normalized === 'POST' || normalized === 'PUT' || normalized === 'PATCH' || normalized === 'DELETE') {
    return normalized;
  }
  throw new TypeError(`Unsupported parity method: ${method}`);
}

function normalizePathSegment(segment: string): string {
  const decoded = decodeURIComponent(segment);
  if (/^\d+$/.test(decoded)) return '{id}';
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(decoded)) return '{id}';
  if (/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?(?:;-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?)+$/.test(decoded)) return '<coordinates>';
  if (/^(?:WB|PN)-\d{4}-[a-z0-9-]+$/i.test(decoded)) return '<redacted>';
  return decoded;
}

export function normalizeUrl(rawUrl: string): string {
  if (rawUrl === 'browser://local-storage' || rawUrl === 'browser://qr-scanner' || rawUrl === 'browser://csv-download') {
    return rawUrl;
  }

  const url = new URL(rawUrl, 'http://parity.invalid');
  const path = url.pathname
    .split('/')
    .map(normalizePathSegment)
    .join('/')
    .replace(/\/{2,}/g, '/');
  const query = [...url.searchParams.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => {
      if (REDACTED_QUERY.test(key)) return `${key}=<redacted>`;
      if (VOLATILE_QUERY.test(key)) return `${key}=<volatile>`;
      return `${key}=${value}`;
    });

  return query.length > 0 ? `${path}?${query.join('&')}` : path;
}

export function normalizeHeaders(
  headers: Readonly<Record<string, string | undefined>> = {},
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(headers)
      .map(([name, value]) => [name.trim().toLowerCase(), value?.trim()] as const)
      .filter(([name, value]) => BEHAVIOR_HEADERS.has(name) && value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, value]) => {
        if (SENSITIVE_KEY.test(name)) {
          const prefix = name === 'authorization' && value?.toLowerCase().startsWith('bearer ') ? 'Bearer ' : '';
          return [name, `${prefix}<redacted>`];
        }
        return [name, value!.toLowerCase()];
      }),
  );
}

function isFileLike(value: unknown): boolean {
  return typeof value === 'object' && value !== null && (
    Object.prototype.toString.call(value) === '[object File]' ||
    Object.prototype.toString.call(value) === '[object Blob]'
  );
}

function normalizeArray(values: readonly unknown[]): readonly PayloadShape[] {
  if (values.length === 0) return [];
  const shapes = values.map((value) => normalizePayloadShape(value));
  const unique = new Map(shapes.map((shape) => [JSON.stringify(shape), shape]));
  return [...unique.values()];
}

export function normalizePayloadShape(value: unknown, key = ''): PayloadShape {
  if (SENSITIVE_KEY.test(key)) return '<redacted>';
  if (VOLATILE_KEY.test(key)) return '<volatile>';
  if (value === null) return null;
  if (value instanceof Date) return '<volatile>';
  if (isFileLike(value)) return '<file>';
  if (Array.isArray(value)) return normalizeArray(value);

  if (typeof FormData !== 'undefined' && value instanceof FormData) {
    return Object.fromEntries(
      [...value.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([entryKey, entryValue]) => [entryKey, normalizePayloadShape(entryValue, entryKey)]),
    );
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([entryKey, entryValue]) => [entryKey, normalizePayloadShape(entryValue, entryKey)]),
    );
  }

  if (typeof value === 'string') {
    if (/^data:[^;]+;base64,/i.test(value) || /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(value)) return '<redacted>';
    return '<string>';
  }
  if (typeof value === 'number') return '<number>';
  if (typeof value === 'boolean') return '<boolean>';
  if (typeof value === 'bigint') return '<bigint>';
  if (typeof value === 'undefined') return '<undefined>';
  if (typeof value === 'function') return '<function>';
  return '<symbol>';
}

export function normalizeVisibleOutcome(outcome: string): string {
  return outcome
    .trim()
    .replace(/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/g, '<redacted>')
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g, '<volatile>')
    .replace(/\b(last updated|synced|generated)\s+(?:at\s+)?\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\b/gi, '$1 <volatile>')
    .replace(/\s+/g, ' ');
}

export function normalizeParityObservation(raw: RawParityObservation): NormalizedParityObservation {
  if (raw.responseStatus !== null && (!Number.isInteger(raw.responseStatus) || raw.responseStatus < 100 || raw.responseStatus > 599)) {
    throw new RangeError(`Invalid HTTP response status: ${raw.responseStatus}`);
  }

  return Object.freeze({
    method: normalizeMethod(raw.method),
    normalizedUrl: normalizeUrl(raw.url),
    behaviorHeaders: Object.freeze(normalizeHeaders(raw.headers)),
    payloadShape: normalizePayloadShape(raw.payload),
    responseStatus: raw.responseStatus,
    visibleOutcome: normalizeVisibleOutcome(raw.visibleOutcome),
  });
}