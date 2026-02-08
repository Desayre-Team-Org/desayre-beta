import { appendFile } from 'fs/promises';

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

export async function logTelemetry(event: TelemetryEvent): Promise<void> {
  const payload = clampPayload(event.payload);
  const line = JSON.stringify({
    ...event,
    payload,
  }) + '\n';

  const logPath = process.env.TELEMETRY_LOG_PATH;
  if (logPath) {
    await appendFile(logPath, line);
    return;
  }

  console.log(line.trim());
}
