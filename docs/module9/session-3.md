# Module 9 — Session 3: Defensive RxJS & Real-Time Sync

## Exercises covered

- Exercise 4 — the rage-click defender (`exhaustMap` + `takeUntilDestroyed`)
- Exercise 5 — SignalR live sync into the `EnrollmentStore`

## Exercise 4: `exhaustMap` duplicate-submission guard

### The problem

Every click called `api.postGrade(payload).subscribe()` independently. Rage-click
Slow-3G Dawit → five identical POSTs → five duplicate grade records. That's a
**client** architecture failure, not a server bug. The fix is managing the event
stream, not adding spinners.

### The three flattening operators

| Operator | Behaviour with a busy request | Best use |
| -------- | ----------------------------- | -------- |
| `switchMap` | cancels old request, starts new | search-as-you-type |
| `exhaustMap` | **drops** new emissions, finishes old | submit buttons |
| `concatMap` | queues new behind old | sequential syncs |

`switchMap` here is dangerous: cancelling on the client can't un-save a grade the
server already committed.

### Files

| File | Role |
| ---- | ---- |
| `src/app/services/grade.service.ts` | `GradePayload` / `GradeResult` + `postGrade()` |
| `src/app/features/grade-submission/grade-submission.component.ts` | guarded form + `exhaustMap` stream |
| `src/app/features/grade-submission/grade-submission.component.html` | Material form + status UI |
| `src/app/features/grade-submission/grade-submission.component.scss` | dark "glass" theme |
| `src/app/app.routes.ts`, `app.component.html` | `/grade-submission` route + 🎓 nav |

### How the guard works

```ts
private submitClick$ = new Subject<GradePayload>();

constructor() {
  this.submitClick$
    .pipe(
      exhaustMap((payload) => {           // 1 POST at a time, drops the rest
        this.isSubmitting = true;
        return this.api.postGrade(payload);
      }),
      takeUntilDestroyed(),               // no dangling subscription
    )
    .subscribe({ next: ..., error: ... });
}

onSubmit() {
  if (this.gradeForm.valid) this.submitClick$.next(payloadFromRawValue());
}
```

- Clicks only *push a payload into the Subject*; nothing subscribes per click.
- `exhaustMap` silently ignores every emission while the previous POST is in
  flight → **10 clicks = exactly 1 request**.
- `takeUntilDestroyed()` (in the constructor → injection context) unsubscribes
  when the component is destroyed.
- The `Submit` button is disabled while `isSubmitting` or the form is invalid;
  `mat-error` blocks and a `mat-spinner` give feedback.

### Unique styling

The form is a dark glass panel (ordered, self-titled `grade-card`):
radial gradient glows on a deep navy shell, `backdrop-filter` blur, gradient
top-strip, clipped-gradient title text, cyan-focused outlined fields (via
scoped `::ng-deep` on Material internals), and a gradient indigo→cyan submit
button with glow/shadow. No Tailwind was added — the project stays
framework-free and the look is custom.

> **Divergence from the lab:** template classes are custom SCSS, not Tailwind
> utilities (the user explicitly asked for a unique look; adding a CSS framework
> for one form wasn't justified).

### Verify (Exercise 4)

1. `npm start` → `http://localhost:4200/grade-submission`.
2. Invalid input (score 150, empty student) → `mat-error` + disabled button.
3. DevTools → Network → throttle **Slow 3G**.
4. Click **Submit Final Grade** ~10× fast → exactly **one** POST to `/api/grades`
   (pattern: `POST /api/grades` alone in the Network tab; spinner visible).
5. On success the status box shows the returned Record ID.

## Exercise 5: SignalR live sync

### The problem with polling

Polling wastes bandwidth and lags. SignalR keeps a persistent WebSocket; the
server pushes `EnrollmentStatusUpdated` to every connected client instantly.

### Angular-side files

| File | Role |
| ---- | ---- |
| `src/app/services/live-sync.service.ts` | hub connection manager (transport only) |
| `src/app/store/enrollment.store.ts` | `listenForLiveUpdates` rxMethod (state only) |
| `src/app/app.component.ts` | starts `loadEnrollments()` + `listenForLiveUpdates()` at boot |
| `proxy.conf.json` | dev proxy: `/api` + `/hubs` → the .NET API (with `ws: true`) |
| `angular.json` | `serve.options.proxyConfig` wired in |

### How it works

- `LiveSyncService` builds the hub with `.withUrl('/hubs/tms')` + automatic
  reconnect `[0, 2000, 10000, 30000]`, guards duplicate connects, skips SSR
  (`isPlatformBrowser`), and registers:
  - `connection.on('ReceiveEnrollmentStatusUpdated', ...)` → pushes into a
    `Subject` (exposed as `events$`) — **never mutates state itself**.
  - `onreconnecting` / `onreconnected` / `onclose` → updates a `connectionState`
    signal.
- **Separation of concerns:** `LiveSyncService` = transport; `EnrollmentStore` =
  state. The store's `listenForLiveUpdates` rxMethod calls `sync.connect()`
  once, then `switchMap`s onto `events$` (a never-completing stream) and
  `patchState(updateEntity(...))` per event — every widget reading the store
  re-renders automatically.
- **Centralized bootstrap:** `AppComponent.ngOnInit` now does the single
  `loadEnrollments()` + `listenForLiveUpdates()`. The per-route `ngOnInit`
  loads in `EnrollmentListComponent` and `InstructorDashboardComponent` were
  **removed** — data loads once, shared everywhere.
- The event name `'ReceiveEnrollmentStatusUpdated'` matches the strongly-typed
  `ITmsHubClient` method exactly — the C# compiler catches mismatches.

### The two backend snippets (your TmsApi repo, M7 S3 hub)

`TmsApi.Application/Hubs/ITmsHubClient.cs` — add to the interface:

```csharp
Task ReceiveEnrollmentStatusUpdated(string enrollmentId, string status);
```

`TmsApi.Api/Controllers/V2/EnrollmentsController.cs` — in `Approve`, after the
DB commit:

```csharp
// constructor:  IHubContext<TmsHub, ITmsHubClient> hubContext
await hubContext.Clients.All.ReceiveEnrollmentStatusUpdated(id, "Approved");
```

`Clients.All` (not a group) — every instructor dashboard should see approvals.

### Dev proxy

`proxy.conf.json` forwards `/api` and `/hubs` to the backend so browser calls
look same-origin; `"ws": true` on `/hubs` upgrades to WebSocket (without it
SignalR silently falls back to slow long-polling).

> **Divergence from the lab:** the lab targets `http://localhost:5000`; this
> project's .NET API was verified on `https://localhost:5001` (M8 S3), so the
> proxy uses `https://localhost:5001` with `"secure": false` (self-signed cert).
> Change `proxy.conf.json` if your API listens elsewhere.

### Verify (Exercise 5)

1. `.NET` backend running; `npm start` (restart required; proxy is read at boot).
2. Two tabs: `/enrollments` and `/command-center` (or `/dashboard`).
3. Approve a pending row in Tab 1 → **Tab 2's pending count drops instantly**,
   no refresh.
4. Kill the backend → console reconnecting state; restart → reconnected
   (`withAutomaticReconnect`).

## Module 9 recap

| Session | Content | Commit |
| ------- | ------- | ------ |
| 1 | Centralized state with NgRx SignalStore | `fe7677c` |
| 2 | `@defer` splitting + Material grid | `1bc4b70` |
| 3 | `exhaustMap` guard + SignalR live sync | this session |

Build + `npx tsc --noEmit`: exit 0, no warnings. `grade-submission` ships as its
own lazy chunk (~28 kB).