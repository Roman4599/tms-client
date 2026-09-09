import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

export interface EnrollmentStatusEvent {
  id: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

@Injectable({ providedIn: 'root' })
export class LiveSyncService {
  private platformId = inject(PLATFORM_ID);
  private connection: HubConnection | null = null;
  private eventsSubject = new Subject<EnrollmentStatusEvent>();

  // Expose events as an observable - the store subscribes, transport stays here.
  events$ = this.eventsSubject.asObservable();

  // Connection state signal for UI status feedback.
  connectionState = signal<'connected' | 'reconnecting' | 'disconnected'>('disconnected');

  connect() {
    // Guard against duplicate connections if called more than once.
    if (this.connection) return;
    // SignalR uses WebSocket, which only exists in browsers - skip during SSR.
    if (!isPlatformBrowser(this.platformId)) return;

    this.connection = new HubConnectionBuilder()
      .withUrl('/hubs/tms')
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build();

    // Event name matches the ITmsHubClient method on the backend; strongly-typed
    // hubs send the method name as the event identifier automatically.
    this.connection.on(
      'ReceiveEnrollmentStatusUpdated',
      (enrollmentId: string, status: 'Pending' | 'Approved' | 'Rejected') => {
        this.eventsSubject.next({ id: enrollmentId, status });
      },
    );

    this.connection.onreconnecting(() => this.connectionState.set('reconnecting'));
    this.connection.onreconnected(() => this.connectionState.set('connected'));
    this.connection.onclose(() => this.connectionState.set('disconnected'));

    this.connection
      .start()
      .then(() => this.connectionState.set('connected'))
      .catch((err) => console.error('SignalR connection error:', err));
  }
}