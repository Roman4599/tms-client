# Module 8 — Session 2: Course CRUD & Route-Bound Detail

**Commit:** `408af95`

## Goal

Build the admin side: a paginated course list, a create/edit reactive form, and a
course detail view whose id arrives as a route component input.

## Files

| File | Role |
| ---- | ---- |
| `src/app/features/course-list/course-list.component.*` | admin list + pagination controls |
| `src/app/features/course-form/course-form.component.*` | create (`/courses/new`) and edit (`/courses/edit/:id`) form |
| `src/app/features/course-detail/course-detail.component.*` | detail view + edit/delete actions |
| `src/app/services/course.service.ts` | CRUD methods (`getCourses`, `getCourseById`, `createCourse`, `updateCourse`, `deleteCourse`) |
| `src/app/models/course.model.ts` | `Course`, `CourseDetail`, `PagedResponse<T>`, `CourseLink` |
| `src/app/app.routes.ts` | `courses`, `courses/new`, `courses/edit/:id`, `courses/:id` |

## How it works

- `CourseService` exposes the full CRUD surface against a `PagedResponse<T>`
  envelope. The list uses `getCourses(page, pageSize)` for server-style paging.
- `CourseFormComponent` uses **reactive forms** (`FormGroup` + `Validators`):

  | Control | Validators |
  | ------- | ---------- |
  | `code` | required, minlength 3, maxlength 10 |
  | `title` | required, minlength 5, maxlength 100 |
  | `maxCapacity` | required, min 1, max 100 |
  | `enrollmentCount` | required, min 0 |

  The same form is reused for create and edit; edit pre-fills via `patchValue`.
  Validation messages render only after the control is `touched`.
- `CourseDetailComponent` is lazy-loaded and bound with
  `withComponentInputBinding()` — the `:id` param arrives directly as a
  component `input`, no `ActivatedRoute` subscription glue.
- **Error states**: template `@if (error())` blocks surface load failures
  instead of silently rendering empty.

## Verify

```bash
npm start
```

- `/courses` lists courses with working page controls.
- `/courses/new` rejects bad input (watch "Course code is required", etc.).
- `/courses/edit/:id` pre-fills the form; saving calls `updateCourse`.
- `/courses/:id` shows seats, available spots, status, and edit/delete.