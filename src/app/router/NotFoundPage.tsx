import { Link } from 'react-router-dom';

import { Button } from '@shared/components/ui';
import { ROUTES } from './paths';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-6 text-center">
      <p className="text-6xl font-bold text-brand-600">404</p>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The page you’re looking for doesn’t exist or has been moved.
      </p>
      <Link to={ROUTES.dashboard} className="mt-6">
        <Button>Back to dashboard</Button>
      </Link>
    </div>
  );
}
