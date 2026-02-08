import { appendFile, rename, stat, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';

type TelemetryLevel = 'info' | 'warn' | 'error';
type TelemetrySource = 'client' | 'server';

export interface TelemetryEvent {
  ts: string;
  level: TelemetryLevel;
  source: TelemetrySource;
  event: string;
  requestId?: string;
  userId?: string;
  payload?: Record<string, unknown>;
}

const REDACT_KEYS = [
  'authorization',
  'cookie',
  'token',
  'password',
  'secret',
  'apikey',
  'api_key',
  'accesskey',
  'access_key',
];

const MAX_PAYLOAD_CHARS = 50_000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

function shouldRedact(key: string): boolean {
  const normalized = key.toLowerCase();
  return REDACT_KEYS.some((needle) => normalized.includes(needle));
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(record)) {
      output[key] = shouldRedact(key) ? '[REDACTED]' : redactValue(nested);
    }
    return output;
  }
  return value;
}

function clampPayload(payload?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!payload) return undefined;
  const redacted = redactValue(payload) as Record<string, unknown>;
  const serialized = JSON.stringify(redacted);
  if (serialized.length <= MAX_PAYLOAD_CHARS) return redacted;
  return {
    truncated: true,
    preview: serialized.slice(0, MAX_PAYLOAD_CHARS),
  };
}

async function rotateIfNeeded(logPath: string): Promise<void> {
  const maxBytes = Number.parseInt(process.env.TELEMETRY_MAX_BYTES || '', 10) || DEFAULT_MAX_BYTES;
  try {
    const info = await stat(logPath);
    if (info.size < maxBytes) return;

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = `${logPath}.${stamp}`;
    await rename(logPath, rotatedPath);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      if ((error as { code?: string }).code === 'ENOENT') return;
    }
    throw error;
  }
}

export async function logTelemetry(event: TelemetryEvent): Promise<void> {
  const payload = clampPayload(event.payload);
  const line = JSON.stringify({
    ...event,
    payload,
  }) + '\n';

  const enabled = process.env.TELEMETRY_ENABLED === '1';
  const logPath = process.env.TELEMETRY_LOG_PATH
    ? resolve(process.env.TELEMETRY_LOG_PATH)
    : enabled
      ? resolve(process.cwd(), 'telemetry.jsonl')
      : undefined;

  if (logPath) {
    try {
      await mkdir(dirname(logPath), { recursive: true });
      await rotateIfNeeded(logPath);
      await appendFile(logPath, line);
      return;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === 'EROFS'
      ) {
        console.warn(`[telemetry] Read-only filesystem at ${logPath}. Falling back to stdout.`);
      } else {
        console.warn('[telemetry] Failed to write log file. Falling back to stdout.', error);
      }
    }
  }

  console.log(line.trim());
}
