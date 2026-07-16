"use client";

import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { AlertOctagon, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          data-testid="error-boundary"
          className="flex items-center justify-center min-h-[400px] p-6"
        >
          <div className="w-full max-w-md rounded-xl border border-red/20 bg-[var(--nav-bg-secondary)] p-6 shadow-[0_0_24px_rgba(255,23,68,0.08)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center flex-shrink-0">
                <AlertOctagon className="w-5 h-5 text-red" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--nav-text-primary)]">
                  Something went wrong
                </h3>
                <p className="text-xs text-[var(--nav-text-muted)] mt-0.5">
                  An unexpected error occurred while rendering this page.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="mb-4">
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center gap-1.5 text-xs text-[var(--nav-text-muted)] hover:text-[var(--nav-text-secondary)] transition-colors"
                  data-testid="error-boundary-toggle-details"
                >
                  {this.state.showDetails ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  {this.state.showDetails ? "Hide details" : "Show details"}
                </button>

                {this.state.showDetails && (
                  <div className="mt-2 p-3 rounded-lg bg-[var(--nav-bg-primary)] border border-[var(--nav-border)] overflow-auto max-h-40">
                    <p className="text-xs font-mono text-red break-all">
                      {this.state.error.message}
                    </p>
                    {this.state.error.stack && (
                      <pre className="text-[10px] font-mono text-[var(--nav-text-muted)] mt-2 whitespace-pre-wrap break-all">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={this.handleReload}
              data-testid="error-boundary-reload"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red/10 text-red text-xs font-medium border border-red/20 hover:bg-red/20 transition-colors w-full justify-center"
            >
              <RefreshCw className="w-3 h-3" />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
