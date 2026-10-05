import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { Button } from '@shared/components/ui';
import { reportClientError } from '@shared/lib/clientErrors';
import {
  isStaleBuildError,
  reloadForNewBuild,
  reloadInProgress,
} from '@shared/lib/staleBuild';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  /** The tab is on an older build and is loading the new one. */
  updating?: boolean;
}

/** Catches render-time errors so a single feature can't blank the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, updating: isStaleBuildError(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Not a fault: the tab predates the last deploy. Load the new build —
    // unless that was just tried, in which case it is a real problem.
    if (isStaleBuildError(error)) {
      if (reloadInProgress() || reloadForNewBuild()) return;
      this.setState({ updating: false });
    }
    console.error('Uncaught error:', error, info);
    // To Configuration → API Logs, with the component stack that threw.
    reportClientError(error, info.componentStack ?? undefined);
  }

  handleReset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError && this.state.updating) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
          <p className="text-sm text-slate-500">Loading the latest version of DBL HRM…</p>
        </div>
      );
    }
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      // "Try again" cannot fetch a file the last deploy removed; a reload can.
      const stale = isStaleBuildError(this.state.error);
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Something went wrong
            </h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {stale
                ? 'This page could not be loaded. Reloading usually fixes it.'
                : 'An unexpected error occurred while rendering this view.'}
            </p>
          </div>
          {stale ? (
            <Button onClick={() => window.location.reload()}>Reload page</Button>
          ) : (
            <Button onClick={this.handleReset}>Try again</Button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
