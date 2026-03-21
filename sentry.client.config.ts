import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Tracing
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay (solo producción)
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate:  1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],
})






