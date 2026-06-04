import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@shared/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/** Catches render-time errors so a single feature can't blank the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Wire this into your monitoring provider (Sentry, etc.).
    console.error('Uncaught error:', error, info);
  }

  handleReset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
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
              An unexpected error occurred while rendering this view.
            </p>
          </div>
          <Button onClick={this.handleReset}>Try again</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
