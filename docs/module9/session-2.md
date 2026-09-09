# Module 9 — Session 2: Performance & the Enterprise Grid

**Commit:** `1bc4b70`

## Exercises covered

- Exercise 2 — `@defer` block chunk-splitting for a heavy chart
- Exercise 3 — Angular Material `MatTable` grid (sort + paginate + accessible)

## Exercise 2: `@defer` code splitting

### Files

| File | Role |
| ---- | ---- |
| `src/app/features/instructor-dashboard/instructor-dashboard.ts/.html/.css` | Command Center: info first, chart deferred |
| `src/app/ui/analytics-chart/analytics-chart.ts/.html/.css` | the chart (shipped as its own chunk) |
| `src/app/app.routes.ts`, `app.component.html` | `/command-center` route + nav |

### How it works

The dashboard header (pending count) renders immediately; the chart block is
wrapped so its code physically ships in a **separate JS chunk**:

```html
@defer (on viewport; prefetch on idle(500)) {
  <tms-analytics-chart [data]="store.entities()" />
} @placeholder {
  <div class="skeleton-chart">Scroll down to view analytics...</div>
} @loading (minimum 500ms) {
  <div class="spinner">Downloading chart engine...</div>
} @error {
  <p>Failed to load chart. Check your connection.</p>
}
```

| Block / trigger | Meaning |
| --------------- | ------- |
| `on viewport` | download triggered by IntersectionObserver when scrolled into view |
| `prefetch on idle(500)` | start downloading during browser idle; 500 ms floor so a never-idle device still fires |
| `@placeholder` | what Liya sees instantly — no blank screen |
| `@loading (minimum 500ms)` | spinner, minimum duration so a fast download doesn't flash |
| `@error` | offline mid-download fallback |

The `.chart-section` has extra bottom padding so the chart sits below the fold —
making the viewport trigger real.

### Verify (build proof)

```bash
npm run build
```

The output lists `analytics-chart` as its **own lazy chunk** (`chunk-*.js`,
~3.2 kB) rather than part of the main bundle — code that literally does not
load until the trigger fires. DevTools → Network → Slow 3G → load
`/command-center`: header + pending count appear in ~1-2 s; the chart chunk
stays pending until you scroll.

> **OnPush note:** new components declare
> `changeDetection: ChangeDetectionStrategy.OnPush` (the lab says the CLI does
> this by default; Angular 22's generator here does not emit the property, so we
> set it explicitly). Because every component reads the signal-based
> `EnrollmentStore`, OnPush stays automatically correct.

## Exercise 3: Angular Material data grid

### Files

| File | Role |
| ---- | ---- |
| `package.json` | `@angular/material@22.1.6`, `@angular/cdk@22.1.6` |
| `angular.json` | prebuilt `indigo-pink` theme added to `styles`; initial budget 500→700 kB |
| `src/app/app.config.ts` | `provideAnimations()` |
| `src/app/features/enrollment-list/enrollment-list.component.ts` | `MatTableDataSource` + `effect` + `viewChild.required` |
| `src/app/features/enrollment-list/enrollment-list.component.html/.scss` | `mat-table` + `mat-paginator` |

### How it works

- `MatTableDataSource<Enrollment>` is the bridge between the store's plain array
  and Material's sort/paginate/filter pipeline.
- Two `effect()`s in the constructor keep it wired:
  ```ts
  effect(() => { this.dataSource.data = this.store.entities(); });
  effect(() => {
    this.dataSource.paginator = this.paginator();
    this.dataSource.sort = this.sort();
  });
  ```
  The second runs once Angular resolves the `viewChild.required(..)` queries —
  the signal-based replacement for `@ViewChild`, so no `ngAfterViewInit`.
- Columns are declared with `<ng-container matColumnDef>` and rendered with
  `*matHeaderCellDef` / `*matCellDef` structural directives — Material needs
  those template references to manage its rendering pipeline internally (that's
  why it doesn't use `@for`, and why the `*` syntax remains).
- `mat-sort-header` on Student / Course / Status gives click-to-sort;
  `<mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons>` gives
  paging — 5000 rows never render 5000 DOM nodes at once.
- Status cells render colored chips via `@switch`.

### Why the theme is its own cost driver

The prebuilt Material theme CSS (~55 kB) is global, so the **initial** budget
warning (500 kB) was exceeded. We raised the warning to **700 kB** (error stays
1 MB). Material's grid is a real, intentional cost; the deferred-chart + lazy
route chunks keep initial **JS** at ~200 kB. Nothing about that conflicts with
the defer lesson — components, not CSS themes, are what we chunk-split.

### Verify

```bash
npm start   # → http://localhost:4200/enrollments
```

- Click Student / Course / Status headers → rows sort alphabetically/numerically.
- Pagination arrows step 10 / 25 / 50 rows at a time.
- Approve still flips status via the shared store; the Grid reflects instantly.

## Session summary

| Metric | Before (M8) | After (M9 S2) |
| ------ | ----------- | ------------- |
| Chart code in main bundle | n/a | separate 3.2 kB lazy chunk |
| Grid capabilities | raw `<table>` + `@for` | sort / paginate / ARIA |
| Widget sync | per-widget HTTP + local signals | single `EnrollmentStore` |

Build + `npx tsc --noEmit`: exit 0, no warnings.