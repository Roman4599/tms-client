# TMS Client — Training Management System Frontend

Angular 22 frontend for the Training Management System (TMS). Students browse a
course catalog, request enrollment, and drill into course details; admins manage
courses (add / edit / delete).

## Tech Stack

- Angular 22 (standalone components, no NgModules)
- Angular Signals (`signal()`, `computed()`, `input()`, `output()`)
- Angular Router (lazy-loaded routes, component input binding for route params)
- SCSS
- TypeScript 6 (strict mode)

## Project Structure

```
src/
└── app/
    ├── app.component.*           App shell: nav bar + <router-outlet>
    ├── app.config.ts             App providers (router, HTTP, input binding)
    ├── app.routes.ts             Route table (lazy-loaded features)
    ├── ui/                       Reusable presentational components
    │   └── course-card/          CourseCardComponent (course @input, enroll @output)
    ├── features/                 Route-backed, lazy-loaded views
    │   ├── student-dashboard/    Student dashboard + course catalog grid
    │   ├── course-list/          Admin course list w/ pagination UI
    │   ├── course-form/          Create & edit course form (reactive forms)
    │   └── course-detail/        Course detail: seats, status, edit/delete
    ├── models/                   Domain models (Course, CourseDetail, PagedResponse)
    └── services/                 API services
        └── course.service.ts     CourseService (mock data behind a real API shape)

legacy/
└── m2-data-layer/                Earlier Node/TypeScript data-layer (Module 2),
                                  kept for reference, not part of the Angular app.
```

### Where changes go (convention)

| What you're adding            | Where it belongs                    |
| ----------------------------- | ----------------------------------- |
| A small reusable UI block     | `src/app/ui/…` (e.g. `course-card`) |
| A page / routed view          | `src/app/features/…`                |
| A domain type                 | `src/app/models/…`                  |
| API interaction               | `src/app/services/…`                |

Every component is standalone, prefixed `tms-` (reusable) or `app-` (feature),
and uses the `*.component.{ts,html,scss}` naming.

## Features

- **Student Dashboard** (`/dashboard`) — credit tracker with signals; reactive
  "Register for a Class" button; **Course Catalog** grid of `CourseCardComponent`s
  with honest empty state.
- **Course Cards** — display title, code, seats; badge flips to "Full" and the
  Enroll button disables when `enrollmentCount >= maxCapacity`; Enroll emits the
  course back to the parent; the title links to `/courses/:id`.
- **Course Detail** (`/courses/:id`) — route param arrives via component input
  binding; shows seats, available spots, status, and edit/delete actions.
- **Course List** (`/courses`) and **Course Form** (`/courses/new`, `/courses/edit/:id`)
  — CRUD administered through `CourseService`.
- **Lazy loading** — each feature route loads its chunk on demand.

## Getting Started

Prerequisites: Node.js 20+, Angular CLI 22.

```bash
npm install
npm start        # dev server → http://localhost:4200/dashboard
npm run build    # production build to dist/tms-client
npm test         # unit tests (Karma)
```

## Data Notes

`CourseService` currently serves mock data in-memory (same shape as the TMS API
contract: `Course` list rows, `PagedResponse<T>`, `CourseDetail` with links).
Swap its `mockCourses` array for real `HttpClient` calls when the API is live.