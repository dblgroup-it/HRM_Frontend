# DBL HRM — Frontend

Production-ready HR Management System frontend for **DBL Group**, built with a
feature-based (modular) architecture and clean-architecture principles.

## Tech Stack

| Concern          | Library                          |
| ---------------- | -------------------------------- |
| Framework        | React 19 + TypeScript            |
| Build tool       | Vite 6                           |
| Routing          | React Router 7                   |
| Server state     | TanStack Query 5                 |
| Client state     | Zustand 5                        |
| Forms            | React Hook Form 7 + Zod          |
| Styling          | Tailwind CSS 3                   |
| Icons            | lucide-react                     |
| HTTP             | Axios                            |
| Tooling          | ESLint 9 (flat) + Prettier       |

## Getting Started

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
```

### Demo credentials

The app ships with a **mock API layer** enabled by default
(`VITE_USE_MOCK_API=true`), so no backend is required.

```
Email:    admin@dbl-group.com
Password: password123
```

## Scripts

| Script                 | Description                              |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start Vite dev server                    |
| `npm run build`        | Type-check and build for production       |
| `npm run preview`      | Preview the production build              |
| `npm run lint`         | Lint the codebase                        |
| `npm run lint:fix`     | Lint and auto-fix                        |
| `npm run format`       | Format with Prettier                     |
| `npm run typecheck`    | Type-check without emitting              |

## Architecture

A **feature-based (module-based)** structure. Each module is self-contained
and owns its `api`, `components`, `hooks`, `pages`, `types`, `schemas`, and a
barrel `index.ts`. Cross-cutting concerns live in `shared/`; app composition
(providers, layouts, routing) lives in `app/`.

```
src/
├── app/                  # Composition root: providers, layouts, routing, nav
│   ├── config/           # Navigation config
│   ├── layouts/          # DashboardLayout + Sidebar/Header
│   ├── providers/        # Global providers (Query, Router, ErrorBoundary)
│   └── router/           # AppRouter, ProtectedRoute, route paths
├── modules/              # Feature modules (self-contained)
│   ├── auth/             # Login, auth store, guards
│   ├── dashboard/        # HR statistics & widgets
│   ├── employees/        # Employee directory + detail
│   ├── attendance/       # Daily attendance log
│   ├── leave/            # Leave requests & balances
│   ├── payroll/          # Payslips & payroll summary
│   ├── recruitment/      # Job openings & candidate pipeline
│   └── settings/         # Profile, notifications, security
├── shared/               # Reusable UI, hooks, utils, api, types, constants
│   ├── api/              # Axios client + QueryClient
│   ├── components/       # UI kit (Button, Card, DataTable, …) + feedback
│   ├── hooks/            # useDebounce, useMediaQuery
│   ├── lib/              # cn() class merger
│   ├── types/            # Shared TypeScript primitives
│   └── utils/            # Formatters, delay
├── assets/
├── App.tsx
└── main.tsx
```

### Key principles

- **Barrel exports** — every module/folder exposes a clean public API via
  `index.ts`. Import from the module root, not deep paths.
- **Type-safe API layer** — services return typed promises and transparently
  switch between the mock layer and a real HTTP backend via `VITE_USE_MOCK_API`.
- **Path aliases** — `@/`, `@app/`, `@modules/`, `@shared/`, `@assets/`.
- **Scalable** — add a new HR module by copying the structure of an existing
  one and registering a route in `app/router` + an item in `app/config`.

## Connecting a real backend

1. Set `VITE_USE_MOCK_API=false` and `VITE_API_BASE_URL` in `.env`.
2. Each module's `*.api.ts` already contains the real `http` calls behind the
   mock branch — they activate automatically.

## Adding a new module

1. `src/modules/<name>/` with `api/ components/ hooks/ pages/ types/ index.ts`.
2. Add the route in [`src/app/router/AppRouter.tsx`](src/app/router/AppRouter.tsx)
   and a path in [`src/app/router/paths.ts`](src/app/router/paths.ts).
3. Add a nav item in [`src/app/config/navigation.ts`](src/app/config/navigation.ts).

---

© DBL Group · Internal HR platform.
