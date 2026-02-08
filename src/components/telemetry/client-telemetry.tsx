'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';

type TelemetryLevel = 'info' | 'warn' | 'error';

interface TelemetryEvent {
  ts: string;
  level: TelemetryLevel;
  source: 'client';
  event: string;
  requestId?: string;
  userId?: string;
  payload?: Record<string, unknown>;
}

const MAX_QUEUE = 100;

function now() {
  return new Date().toISOString();
}

function sendBatch(events: TelemetryEvent[]) {
  if (events.length === 0) return;
  const body = JSON.stringify({ events });
  const url = '/api/telemetry';

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
    return;
  }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => {
    // Ignore network errors
  });
}

export function ClientTelemetry() {
  const pathname = usePathname();
  const sessionId = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    const queue: TelemetryEvent[] = [];

    const enqueue = (event: Omit<TelemetryEvent, 'ts' | 'source'>) => {
      if (queue.length >= MAX_QUEUE) queue.shift();
      queue.push({
        ...event,
        ts: now(),
        source: 'client',
      });
    };

    const flush = () => {
      if (queue.length === 0) return;
      const batch = queue.splice(0, queue.length);
      sendBatch(batch);
    };

    const interval = setInterval(flush, 5000);

    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    };

    console.log = (...args) => {
      enqueue({ level: 'info', event: 'console_log', payload: { args, sessionId } });
      originalConsole.log(...args);
    };
    console.warn = (...args) => {
      enqueue({ level: 'warn', event: 'console_warn', payload: { args, sessionId } });
      originalConsole.warn(...args);
    };
    console.error = (...args) => {
      enqueue({ level: 'error', event: 'console_error', payload: { args, sessionId } });
      originalConsole.error(...args);
    };

    const handleError = (event: ErrorEvent) => {
      enqueue({
        level: 'error',
        event: 'window_error',
        payload: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          sessionId,
        },
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      enqueue({
        level: 'error',
        event: 'unhandled_rejection',
        payload: { reason: String(event.reason), sessionId },
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const start = performance.now();
      const response = await originalFetch(input, init);
      const durationMs = Math.round(performance.now() - start);
      const url = typeof input === 'string' ? input : input.url;

      if (!url.includes('/api/telemetry')) {
        enqueue({
          level: response.ok ? 'info' : 'warn',
          event: 'http_request',
          payload: {
            url,
            method: init?.method || 'GET',
            status: response.status,
            durationMs,
            sessionId,
          },
        });
      }

      return response;
    };

    enqueue({
      level: 'info',
      event: 'telemetry_started',
      payload: { sessionId, path: window.location.pathname },
    });

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      window.fetch = originalFetch;
      clearInterval(interval);
      flush();
    };
  }, [sessionId]);

  useEffect(() => {
    sendBatch([
      {
        ts: now(),
        level: 'info',
        source: 'client',
        event: 'route_change',
        payload: { path: pathname, sessionId },
      },
    ]);
  }, [pathname, sessionId]);

  return null;
}
