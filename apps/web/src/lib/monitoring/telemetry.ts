// Minimal telemetry stubs; replace with Sentry or other provider in production

export function captureException(error: unknown, context?: Record<string, unknown>) {
  // Replace with Sentry.captureException when DSN is configured
  // eslint-disable-next-line no-console
  console.error('[telemetry] exception', { error, context })
}

export function captureMessage(message: string, context?: Record<string, unknown>) {
  // Replace with Sentry.captureMessage when DSN is configured
  // eslint-disable-next-line no-console
  console.warn('[telemetry] message', { message, context })
}
