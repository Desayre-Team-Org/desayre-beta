import { NextRequest, NextResponse } from 'next/server';
import { logTelemetry, TelemetryEvent } from '@/lib/telemetry/logger';

interface TelemetryPayload {
  events?: TelemetryEvent[];
  event?: TelemetryEvent;
}

const MAX_EVENTS = 50;

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('x-telemetry-token');
    const requiredToken = process.env.TELEMETRY_INGEST_TOKEN;
    if (requiredToken && token !== requiredToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as TelemetryPayload;
    const events = body.events ?? (body.event ? [body.event] : []);
    const limited = events.slice(0, MAX_EVENTS);

    await Promise.all(
      limited.map((event) =>
        logTelemetry({
          ...event,
          ts: event.ts || new Date().toISOString(),
          source: event.source || 'client',
          level: event.level || 'info',
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    await logTelemetry({
      ts: new Date().toISOString(),
      level: 'error',
      source: 'server',
      event: 'telemetry_ingest_failed',
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    return NextResponse.json({ success: false, error: 'Bad request' }, { status: 400 });
  }
}
