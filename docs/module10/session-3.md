# Module 10 — Session 3: Full-Stack Integration, Error Handling, Optimistic Rollback

## Exercises 3 & 4

Three layers close the loop:

1. **RFC 7807 ProblemDetails everywhere + a global error interceptor.** The
   .NET API emits structured error payloads; Angular parses them centrally
   (`err.error?.detail`) instead of showing "Http failure response… 0 Unknown
   Error", and expired sessions (401) bounce back to `/login`.
2. **Optimistic UI deletion with automatic rollback.** The course store removes
   the card instantly, snapshots the pre-mutation list, and restores it when the
   server rejects (e.g. an in-use course → 409).
3. **Integration sprint** — CORS + cookies + XSRF + interceptors + SignalR all
   work together.

Parts **A** and **C** are backend (documented). Part **B** is client-side
(implemented, including a brand-new `CourseStore` — this repo had no
`course.store.ts`, the lab assumed one existed).

## Part A — ProblemDetails + error interceptor

### Server (.NET, TmsApi repo)

`Program.cs` — DI registration:

```csharp
builder.Services.AddProblemDetails();
```

Pipeline (after `builder.Build()`):

```csharp
app.UseStatusCodePages(); // converts 4xx/5xx into standard ProblemDetails payloads
```

Validation/controller errors now arrive as JSON with a `detail` field, e.g.
`{ "type": "...", "title": "Bad Request", "status": 400, "detail": "Course DB-401 is at maximum capacity." }`.

### Client (this repo)

`src/app/interceptors/error.interceptor.ts` (new):

```ts
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const detailMessage = err.error?.detail ?? 'A system error occurred. Please try again.';
      if (err.status === 401) {
        router.navigate(['/login']);      // expired / missing session
      } else {
        console.error('API Error Response:', detailMessage);  // structured, not "unknown url"
      }
      return throwError(() => err);       // let the caller keep control
    }),
  );
};
```

Registered in `app.config.ts` AFTER `credentialsInterceptor`:

```ts
provideHttpClient(
  withInterceptors([credentialsInterceptor, errorInterceptor]),
  withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
)
```

Order matters: credentials attach first; the error handler is the last chance
to translate a transport failure. Because `useStatusCodePages()` runs server
side, the interceptor can trust `err.error.detail` to be the C# problem
message — no more `"0 Unknown Error"`.

> Note: a 401 from the boot-time `AuthService.restoreSession()` also routes to
> `/login`. That is the intended "hand back to the handshake" behaviour.

## Part B — Optimistic deletion with snapshot rollback (this repo)

`src/app/store/CourseStore` is a new root Signals store: `withState`
(loading/loaded/loadError/deleteError) + `withEntities<Course>()` + methods.

The lab taught "open course.store.ts and implement `deleteCourse`" — the file
didn't exist, so the store was built to spec and the list/detail views were
wired to it.

```ts
deleteCourse(id: number): Observable<boolean> {
  const snapshot = store['entities']();      // 1. snapshot BEFORE mutation!
  patchState(store, removeEntity(id), { deleteError: null });  // 2. instant UI feedback
  return svc.deleteCourse(id).pipe(
    map(() => true),                          // 3. server accepted → resolve true
    catchError(() => {
      patchState(store, setAllEntities(snapshot));   // 4. rejected → restore snapshot
      patchState(store, { deleteError: 'Cannot delete course: active student enrollments exist.' });
      return of(false);
    }),
  );
}
```

Key rules:

- **Snapshot order is critical.** `store.entities()` must be read *before*
  `removeEntity(id)` — snapshotting after removal already loses the entity.
- `loadCourses` fetches once (`loaded` flag); list & detail share the same
  collection so any rollback is visible everywhere.
- `course-list.component` now reads `entities()`/`loading()`/`loadError()` from
  the store instead of local signals.
- `course-detail.component` calls `store.deleteCourse(id)`; on `true` it
  navigates to `/courses`, on `false` the store restored the card and the page
  shows a `delete-error` banner with the surfaced message.

> **Divergence from the lab:** the store method returns `Observable<boolean>`
> so the detail view can navigate on success while *all* rollback logic stays
> in the store (the lab's inline `.subscribe()` variant is equivalent for state
> but can't signal success).

## Part C — SignalR under the named CORS policy (backend)

Express, so CORS-aware WebSockets also work from `localhost:4200`:

```csharp
app.MapHub<TmsHub>("/hubs/tms").RequireCors("TmsClient");
```

Now the hub's cross-origin negotiation accepts the browser from
`http://localhost:4200` through the same `TmsClient` policy.

## Exercise 4 — integration sprint (verification checklist)

1. **Both servers** — `dotnet run` (API) + `ng serve` (Angular).
2. **Identity handshake** — log in via `/login`; DevTools → Application →
   Cookies: `tms_auth` is **HttpOnly** ✓.
3. **Env-driven data** — browse the catalog; Network shows
   `GET /api/v1/courses` answered 200 (base came from `environment.apiUrl`).
4. **XSRF guard** — submit anything; the request carries `X-XSRF-TOKEN`.
5. **SignalR live stream** — two windows; approve in one, other updates over
   WebSocket instantly.
6. **Error interception** — enroll in a full course; the browser console
   prints the C# `ProblemDetails` `detail` text (not "Unknown Error").
7. **Optimistic rollback** — delete a course with active enrollments: the card
   disappears instantly, then reappears when the API answers **409**; the
   detail page shows the rejection banner.

## Module 10 recap

| Session | Content | Commit |
| ------- | ------- | ------ |
| 1 | CORS named policy + environment-driven API URLs + CourseService | `0b7ca6d` |
| 2 | Identity handshake: HttpOnly cookie, XSRF, interceptor, AuthService | `387ac02` |
| 3 | ProblemDetails + error interceptor, optimistic rollback, integration sprint | this session |

Build + `npx tsc --noEmit`: exit 0, no warnings.