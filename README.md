# TMS Client — Training Management System Frontend

Angular 22 frontend for the Training Management System (TMS). Students browse a
course catalog and request enrollment; instructors run a Command Center against a
single centralized enrollment store.

> **Lab docs:** every module/session exercise is documented with goal, files,
> implementation, and verification steps in [`docs/`](docs/README.md).

## Tech Stack

- Angular 22 (standalone components, no NgModules)
- Angular Signals (`signal()`, `computed()`, `input()`, `output()`, `rxResource`)
- NgRx SignalStore (`@ngrx/signals@22`) — centralized enrollment state
- Angular Material 22 (MatTable, MatPaginator, MatSort, forms/spinner)
- `@defer` / `@defer (on viewport; ...)` lazy chunk splitting
- `@microsoft/signalr` real-time hub client (auto-reconnect)
- Angular Router (lazy-loaded routes, component input binding for route params)
- Reactive Forms, SCSS, TypeScript 6 (strict mode)

## Project Structure

```
src/
└── app/
    ├── app.component.*           App shell: nav bar + <router-outlet>
    ├── app.config.ts             App providers (router, HTTP, animations)
    ├── app.routes.ts             Route table (lazy-loaded features)
    ├── ui/                       Reusable presentational components
    │   ├── course-card/          CourseCardComponent (course @input, enroll @output)
    │   └── analytics-chart/      Chart (deferred chunk) feeding off the store
    ├── features/                 Route-backed, lazy-loaded views
    │   ├── student-dashboard/    Student dashboard + live course catalog
    │   ├── course-list/          Admin course list w/ pagination UI
    │   ├── course-form/          Create & edit course form (reactive forms)
    │   ├── course-detail/        Course detail: seats, status, edit/delete
    │   ├── enrollment-form/      Enrollment request form (reactive, FormArray)
    │   ├── enrollment-list/      Material grid wired to EnrollmentStore
    │   ├── instructor-dashboard/ Command Center + deferred analytics chart
    │   └── grade-submission/     Rage-click-guarded grade form (exhaustMap)
    ├── store/                    SignalStore (single source of truth)
    │   └── enrollment.store.ts   EnrollmentStore: entities, pendingCount, actions
    ├── models/                   Domain models (Course, Enrollment, PagedResponse)
    └── services/                 API + real-time services
        ├── course.service.ts     CourseService (live .NET API, envelope mapping)
        ├── enrollment.service.ts EnrollmentService (relative path via proxy)
        ├── grade.service.ts      GradeService (relative path via proxy)
        └── live-sync.service.ts  LiveSyncService (SignalR hub connection manager)

legacy/
└── m2-data-layer/                Earlier Node/TypeScript data-layer (Module 2),
                                  kept for reference, excluded from tsconfig.
```

### Where changes go (convention)

| What you're adding            | Where it belongs                    |
| ----------------------------- | ----------------------------------- |
| A small reusable UI block     | `src/app/ui/…` (e.g. `course-card`) |
| A page / routed view          | `src/app/features/…`                |
| Shared reactive state         | `src/app/store/…`                   |
| A domain type                 | `src/app/models/…`                  |
| API interaction               | `src/app/services/…`                |

Components are standalone, prefixed `tms-` (reusable) or `app-` (feature), use
`*.component.{ts,html,scss}` naming, and (new components) `OnPush`.

## Features

- **Student Dashboard** (`/dashboard`) — **live** course catalog (`rxResource`
  against `CourseService`), loading/error/empty states, `CourseCardComponent`s.
- **Course Detail** (`/courses/:id`) — route param via component input binding;
  seats, available spots, status, edit/delete.
- **Course List / Form** (`/courses`, `/courses/new`, `/courses/edit/:id`) —
  CRUD through `CourseService` with pagination + reactive-form validation.
- **Enroll** (`/enroll`) — enrollment request form with dynamic backup-course
  rows (`FormArray`).
- **Enrollments** (`/enrollments`) — Material `MatTable` grid (sortable headers,
  pagination 10/25/50) driven by the **singleton `EnrollmentStore`**; optimistic
  Approve with server-error rollback keeps every widget in sync.
- **Command Center** (`/command-center`) — pending count renders instantly; the
  analytics chart is `@defer`red into its own lazy chunk, loaded on scroll with
  idle prefetch.
- **Grade Submission** (`/grade-submission`) — reactive grade form guarded by
  `exhaustMap`: rage-clicks collapse to exactly one POST; `takeUntilDestroyed`
  keeps the stream leak-free.
- **Real-time sync** — `LiveSyncService` (SignalR `/hubs/tms`, auto-reconnect)
  pushes `ReceiveEnrollmentStatusUpdated` events into the `EnrollmentStore`; the
  grid, dashboard, and Command Center update across all open tabs instantly. Dev
  server proxies `/api` + `/hubs` to the .NET API (`proxy.conf.json`).
- **Lazy loading** — each feature route and deferred block loads on demand; the
  main JS bundle stays ~200 kB.

## Getting Started

Prerequisites: Node.js 20+, Angular CLI 22.

```bash
npm install
npm start        # dev server → http://localhost:4200/dashboard
npm run build    # production build to dist/tms-client
npm test         # unit tests (Karma)
```

## Data Notes

- **Courses** — `CourseService` builds its base from `environment.apiUrl`
  (`/api/v1` in both environments); all calls are **relative** and forwarded by
  the dev proxy (`proxy.conf.json`, target `https://localhost:5001`) so the
  browser sees same-origin. The `{ items: [...] }` envelope is mapped to rows.
- **Enrollments / Grades / Hubs** — relative paths (`/api/enrollments`,
  `/api/grades`, `/hubs/tms`) are forwarded by the same proxy; `"ws": true` on
  `/hubs` enables the SignalR WebSocket upgrade.
- **Backend** — Exercise 5 needs the M7 `TmsHub` / `ITmsHubClient` extended with
  `ReceiveEnrollmentStatusUpdated` (see `docs/module9/session-3.md`). Exercise 1
  needs the named `TmsClient` CORS policy in `Program.cs` driven by
  `AllowedOrigins` in `appsettings.Development.json` (see
  `docs/module10/session-1.md`).