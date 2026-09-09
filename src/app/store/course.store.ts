import { inject } from '@angular/core';
import { signalStore, withMethods, patchState, withState } from '@ngrx/signals';
import {
  withEntities,
  removeEntity,
  setAllEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { Observable, pipe, concatMap, tap, catchError, map, of } from 'rxjs';
import { CourseService } from '../services/course.service';
import { Course } from '../models/course.model';

/**
 * Singleton catalog store. Both the course list and course detail read from
 * this same instance, so edits/deletes are reflected everywhere instantly.
 *
 * Exercise 3 Part B: optimistic deletion with snapshot rollback.
 * The deletion UI mutates local state FIRST for instant feedback; if the
 * server rejects the call (e.g. active student enrollments → 409), the full
 * pre-mutation snapshot is restored.
 */
export const CourseStore = signalStore(
  { providedIn: 'root' },
  withState({
    loading: false,
    loaded: false,
    loadError: null as string | null,
    deleteError: null as string | null,
  }),
  withEntities<Course>(),
  withMethods((store, svc = inject(CourseService)) => ({
    /** Fetch the catalog once; later navigations reuse it unless empty. */
    loadCourses: rxMethod<void>((source$) =>
      source$.pipe(
        tap(() => patchState(store, { loading: true, loadError: null })),
        concatMap(() =>
          svc.getCourses(1, 50).pipe(
            tap((page) =>
              patchState(store, setAllEntities(page.items), {
                loading: false,
                loaded: true,
              }),
            ),
            catchError(() => {
              patchState(store, { loading: false, loadError: 'Failed to load courses.' });
              return of(undefined);
            }),
          ),
        ),
      ),
    ),
    /**
     * Optimistic delete with automatic rollback.
     * 1. Snapshot entities BEFORE mutating local state. (Snapshot order is
     *    critical: taken after removal, the snapshot would already be missing
     *    the deleted item.)
     * 2. Remove the entity immediately — the card vanishes with zero latency.
     * 3. Call the server. On success resolve `true`; on rejection restore the
     *    snapshot, surface the error, resolve `false`.
     */
    deleteCourse(id: number): Observable<boolean> {
      const snapshot = store['entities']();
      patchState(store, removeEntity(id), { deleteError: null });

      return svc.deleteCourse(id).pipe(
        map(() => true),
        catchError(() => {
          patchState(store, setAllEntities(snapshot));
          patchState(store, {
            deleteError: 'Cannot delete course: active student enrollments exist.',
          });
          return of(false);
        }),
      );
    },
    /** Clear transient errors once the user interacts with the UI again. */
    clearDeleteError(): void {
      patchState(store, { deleteError: null });
    },
  })),
);