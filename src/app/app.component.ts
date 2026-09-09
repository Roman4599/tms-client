import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { EnrollmentStore } from './store/enrollment.store';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'tms-client';

  private store = inject(EnrollmentStore);
  private auth = inject(AuthService);

  currentUser = this.auth.currentUser;
  isAuthenticated = this.auth.isAuthenticated;

  ngOnInit() {
    // Central load: every widget reads the same singleton store.
    this.store.loadEnrollments();
    // Open the SignalR stream so remote status changes patch all widgets.
    this.store.listenForLiveUpdates();
    // Re-check the HttpOnly cookie session after a refresh.
    this.auth.restoreSession();
  }

  logout() {
    this.auth.logout();
  }
}