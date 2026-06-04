import { AppProviders } from '@app/providers';
import { AppRouter } from '@app/router';

/**
 * Application root.
 *
 * Composition only — global providers wrap the router which owns
 * all navigation and layout concerns.
 */
export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
