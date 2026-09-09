import { computed, inject } from '@angular/core';
import {
  signalStore,
  withComputed,
  withMethods,
  patchState,
  withState,
} from '@ngrx/signals';
import {
  withEntities,
  setAllEntities,
  updateEntity,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, concatMap, tap, catchError, EMPTY, switchMap } from 'rxjs';
import { EnrollmentService } from '../services/enrollment.service';
import { LiveSyncService } from '../services/live-sync.service';
import { Enrollment } from '../models/enrollment.model';

/**
 * Singleton enrollment store. Every component injects this same instance,
 * so the enrollment list and any dashboard summary always read from one
 * source of truth - no state drift, no duplicate API calls.
 */
export const EnrollmentStore = signalStore(
  { providedIn: 'root' },
  // Simple flags beside the entity collection.
  withState({ isLoading: false, error: null as string | null }),
  // O(1) ID-indexed dictionary for enrollments: { ids, entityMap }.
  withEntities<Enrollment>(),
  // Derived signal - recomputes whenever the entity collection changes.
  withComputed((store) => ({
    pendingCount: computed(
      () => store.entities().filter((e) => e.status === 'Pending').length,
    ),
  })),
  withMethods((store, api = inject(EnrollmentService), sync = inject(LiveSyncService)) => ({
    /**
     * Real-time sync (Exercise 5)
     * The store owns state mutations; LiveSyncService owns the transport.
     * sync.events$ never completes, so switchMap stays subscribed for the
     * lifetime of the app and patches the matching entity on every push.
     */
    listenForLiveUpdates: rxMethod<void>((source$) =>
      source$.pipe(
        tap(() => sync.connect()),
        switchMap(() => sync.events$),
        tap((event) => {
          patchState(
            store,
            updateEntity({ id: event.id, changes: { status: event.status } }),
          );
        }),
      ),
    ),
    /**
     * Loading Data
     * concatMap processes one emission at a time in strict order. If
     * loadEnrollments() fires twice quickly, the second waits for the first
     * HTTP response. (switchMap would cancel the first request; mergeMap
     * would run both in parallel.)
     */
    loadEnrollments: rxMethod<void>((source$) =>
      source$.pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        concatMap(() =>
          api.getAll().pipe(
            tap((rows) =>
              patchState(store, setAllEntities(rows), { isLoading: false }),
            ),
            catchError((err) => {
              patchState(store, { isLoading: false, error: err.message });
              return EMPTY; // completes silently so the pipeline survives
            }),
          ),
        ),
      ),
    ),
    /**
     * Optimistic Approve
     * 1. Instantly flip status to "Approved" - every component reading the
     *    store re-renders before the network round-trip completes.
     * 2. Send the approval to the server.
     * 3. If the server rejects it, roll back to "Pending".
     */
    approveEnrollment: rxMethod<string>((source$) =>
      source$.pipe(
        tap((id) => {
          patchState(store, updateEntity({ id, changes: { status: 'Approved' } }));
        }),
        concatMap((id) =>
          api.approve(id).pipe(
            catchError(() => {
              patchState(store, updateEntity({ id, changes: { status: 'Pending' } }));
              patchState(store, { error: 'Server rejected the approval. Check enrollment constraints.' });
              return EMPTY;
            }),
          ),
        ),
      ),
    ),
  })),
);