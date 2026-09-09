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
- Angular Material 22 (MatTable, MatPaginator, MatSort)
- `@defer` / `@defer (on viewport; ...)` lazy chunk splitting
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
    │   └── instructor-dashboard/ Command Center + deferred analytics chart
    ├── store/                    SignalStore (single source of truth)
    │   └── enrollment.store.ts   EnrollmentStore: entities, pendingCount, actions
    ├── models/                   Domain models (Course, Enrollment, PagedResponse)
    └── services/                 API services (course live, enrollment via proxy)
        ├── course.service.ts     CourseService (live .NET API, envelope mapping)
        └── enrollment.service.ts EnrollmentService (relative path, proxy in M10 S1)

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

- **Courses** — `CourseService.getAll()` hits the live .NET API
  (`https://localhost:5001/api/courses`) and maps the `{ items: [...] }` envelope.
- **Enrollments** — `EnrollmentService` uses a **relative** `/api/enrollments`
  path (deployment-ready); the Angular dev proxy / environment wiring that
  routes it to the .NET API lands in **Module 10 Session 1**. Until then the
  grid needs that proxy (or the live API on the same origin) to populate.