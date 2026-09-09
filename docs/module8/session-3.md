# Module 8 — Session 3: Enrollment Form & the Live API

**Commit:** `8d5df07`

## Exercises covered

- Exercise 5 — enrollment request form
- Exercise 6 — connect the catalog to the real .NET API

## Exercise 5: EnrollmentFormComponent

| File | Role |
| ---- | ---- |
| `src/app/features/enrollment-form/enrollment-form.component.ts` | reactive form model + submit logic |
| `src/app/features/enrollment-form/enrollment-form.component.html` | form field rendering + validation messages |
| `src/app/app.routes.ts` | `/enroll` route |
| `src/app/app.component.html` | 📝 Enroll nav link |

### How it works

- Controls:

  | Control | Validators |
  | ------- | ---------- |
  | `studentId` | required, pattern `^STU-[0-9]{4}$` |
  | `courseId` | required |
  | `term` | required (default "Fall 2026") |
  | `notes` | optional textarea |
  | `backupCourses` | dynamic `FormArray` (add / remove) |

- Submit calls `markAllAsTouched()` first so validation errors surface, then
  reads the payload with `getRawValue()`.
- The `backupCourses` FormArray demonstrates programmatic dynamic form growth.

### Verify

```bash
npm start   # → http://localhost:4200/enroll
```

- Entering a bad `studentId` (e.g. `123`) shows the pattern error on submit.
- Add/remove backup-course rows reactively; payload includes them.

## Exercise 6: Live API catalog

| File | Role |
| ---- | ---- |
| `src/app/services/course.service.ts` | `getAll()` via `HttpClient` (live) + preserved CRUD |
| `src/app/features/student-dashboard/student-dashboard.component.ts` | catalog through `rxResource` |
| `src/app/features/student-dashboard/student-dashboard.component.html` | **loading / error / data** states |

### How it works

- `CourseService.getAll()` does `GET https://localhost:5001/api/courses` and maps
  the **envelope** `{ items: [...] }` → `Course[]`. (Switch to `p.data` if the
  base URL ever changes to `/api/v2/courses`.)
- The dashboard loads the catalog with `rxResource`:
  ```ts
  rxResource({
    stream: () => this.api.getAll(),          // Angular 22 API
  })
  ```
- Loading / error / empty states render from `resource.isLoading()`,
  `resource.error()`, and `resource.value()`.

> **Divergence from the lab:** the lab shows `@Service()` from `@angular/core`.
> It does not exist in Angular 22 — the canonical `@Injectable({ providedIn:
> 'root' })` is used instead. The lab also writes `rxResource({ loader: ... })`;
> Angular 22 renamed the option to `stream`.

### Verify

With the .NET API running on `https://localhost:5001` (CORS allowing
`http://localhost:4200`):

```bash
npm start   # → http://localhost:4200/dashboard
```

- Cards render from the real API; kill the API and reload to see the error
  state.