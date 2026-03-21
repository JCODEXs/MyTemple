// ─────────────────────────────────────────────────────────────────────────────
// src/components/ui/ErrorBoundary.tsx
// ─────────────────────────────────────────────────────────────────────────────

"use client"

import { Component, type ReactNode } from "react"
import * as Sentry from "@sentry/nextjs"

interface Props {
  children:  ReactNode
  fallback?: ReactNode
  section?:  string
}

interface State {
  hasError: boolean
  eventId?: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    const eventId = Sentry.captureException(error, {
      extra: {
        componentStack: info.componentStack,
        section:        this.props.section,
      },
    })
    this.setState({ eventId })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 p-8 text-center">
        <span className="text-4xl mb-3">⚠️</span>
        <p className="font-bold text-white mb-1">Algo salió mal</p>
        <p className="text-sm text-gray-400 mb-4">
          {this.props.section ? `Error en: ${this.props.section}` : "Error inesperado"}
        </p>
        <button
          onClick={() => this.setState({ hasError: false })}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/20 transition-colors">
          Reintentar
        </button>
        {this.state.eventId && (
          <p className="mt-2 text-[10px] text-gray-700 font-mono">
            ID: {this.state.eventId}
          </p>
        )}
      </div>
    )
  }
}

// Wrapper funcional para uso sencillo
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  section?: string
) {
  return function WrappedComponent(props: T) {
    return (
      <ErrorBoundary section={section}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

