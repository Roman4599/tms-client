# Module 8 — Session 1: Angular Signals & the Course Catalog

**Commit:** `03ee50e`

## Goal

Introduce Angular Signals (`signal`, `computed`) and build the first reusable UI
block — a course card — plus the student-facing catalog grid that renders it.

## Files

| File | Role |
| ---- | ---- |
| `src/app/ui/course-card/course-card.component.ts` | `tms-course-card` presentational component |
| `src/app/ui/course-card/course-card.component.html` | card layout (title, code, seats, badge, buttons) |
| `src/app/ui/course-card/course-card.component.scss` | card styling |
| `src/app/features/student-dashboard/student-dashboard.component.*` | catalog grid using `@for` over `course-card`s |

## How it works

- `CourseCardComponent` is **presentational**: it receives a `course` via an
  `@input()` signal and emits the selected course via an `@output()`.
- The badge is *derived*, not stored: `full = computed(() => course().enrollmentCount >= course().maxCapacity)`
  — when the input signal changes, the computed and every bound template cell
  re-evaluate automatically.
- The card title is a `routerLink` to `/courses/:id`.
- "Full" flips the `🟢 Full / 🟡 Available` badge and disables "Enroll".
- The dashboard renders a grid with `@for (course of catalog(); track course.id)`
  and an honest `@empty` state for an empty catalog.

## Why this matters

Each `signal()` is an isolated reactive container. Passing the course down as an
input and emitting events back up keeps the card reusable and side-effect-free —
the foundation that makes the M9 store pattern meaningful later.

## Verify

```bash
npm start            # → http://localhost:4200/dashboard
```

- Catalog renders cards with title/code/seats.
- Set a course's `enrollmentCount >= maxCapacity` → badge flips to Full and
  Enroll disables; title navigates to `/courses/:id`.