# Module 9 — Session 1: Centralized State with NgRx SignalStore

**Commit:** `fe7677c`

## Exercises covered

- Exercise 1 — NgRx SignalStore as the single source of truth for enrollments

## The problem being solved (state drift)

Two widgets that each `http.get('/api/enrollments')` and hold their own local
`signal()` see stale views: approving an enrollment in one widget does not update
the other. The fix is one **singleton store** — every component injects and
reads the *same* instance, so a `patchState` re-renders every reader.

## Files

| File | Role |
| ---- | ---- |
| `src/app/models/enrollment.model.ts` | `Enrollment` interface |
| `src/app/services/enrollment.service.ts` | `getAll()` + `approve(id)` |
| `src/app/store/enrollment.store.ts` | the `EnrollmentStore` SignalStore |
| `src/app/features/enrollment-list/enrollment-list.component.*` | store-backed list |
| `src/app/app.routes.ts`, `app.component.html` | `/enrollments` route + nav |

## How the store is built (`enrollment.store.ts`)

```ts
export const EnrollmentStore = signalStore(
  { providedIn: 'root' },                        // singleton
  withState({ isLoading: false, error: null }),  // simple flags
  withEntities<Enrollment>(),                    // { ids, entityMap } O(1) lookups
  withComputed(() => ({ pendingCount })),        // derived, auto-recalculates
  withMethods(/* loadEnrollments, approveEnrollment */),
);
```

### Building blocks

- **`withState`** — plain flags alongside the entity collection.
- **`withEntities`** — stores `{ ids, entityMap }` so ID lookups/updates are
  O(1), no array scanning.
- **`withComputed`** — `pendingCount = entities().filter(...).length`; it
  recomputes whenever the collection changes.
- **`withMethods` + `rxMethod`** — the two actions:
  - `loadEnrollments` — sets loading, calls `getAll()`, then
    `patchState(store, setAllEntities(rows))`. Errors patch `error` and return
    `EMPTY` so the pipeline survives.
  - `approveEnrollment` — **optimistic**: flip to `'Approved'` first, then POST;
    on server error roll back to `'Pending'` and record the rejection message.
- **Concurrency** — both rxMethods use `concatMap`, so a second call waits for
  the first to finish (no cancellation, no parallel races).

> **Divergence from the lab:**
> 1. `@Service()` does not exist in Angular 22 → `@Injectable({ providedIn: 'root' })`.
> 2. The lab writes `rxMethod(pipe(...))` (V18 API). `@ngrx/signals@22` only
>    accepts the generator form `rxMethod((source$) => source$.pipe(...))` —
>    identical `concatMap`/optimistic semantics, modernized syntax.
> 3. The service uses a **relative** `/api/enrollments` base URL per the lab's
>    "deployment-ready" note; the dev proxy for routing it to the .NET API is
>    wired in M10 S1, so approve/list need the proxy to actually populate.

## Component

`EnrollmentListComponent` injects the store and calls `loadEnrollments()`, binds
`store.entities()`, `store.isLoading()`, `store.error()`, and calls
`store.approveEnrollment(id)` from the Approve button.

## Verify

```bash
npm start   # → http://localhost:4200/enrollments
```

- Open the list (and any second widget reading `pendingCount`) — approving a row
  flips its status instantly in every reader, no refresh, no duplicate GETs.

## Build proof

`npm run build` and `npx tsc --noEmit` exit 0 with no warnings.