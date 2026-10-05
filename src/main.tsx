import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Inter is bundled with the app, not loaded from Google: the site's security
// policy only allows stylesheets and fonts from its own address, and the
// server should not depend on (or report visitors to) a third party at load.
// Latin only, the four weights Tailwind uses.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import App from './App';
import { installClientErrorReporting } from '@shared/lib/clientErrors';
import { installStaleBuildRecovery } from '@shared/lib/staleBuild';
import './index.css';

installClientErrorReporting();
installStaleBuildRecovery();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element "#root" was not found in the document.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
