export function captureClientError(error: unknown) {
  if (process.env.NEXT_PUBLIC_SENTRY_ENABLED !== "true") return;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  console.error("[sentry-placeholder]", dsn, error);
}
