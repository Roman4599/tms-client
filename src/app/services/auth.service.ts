import { Injectable, computed, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { environment } from "../../environments/environment";

export interface TmsUser {
  displayName: string;
  role: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/auth`;

  currentUser = signal<TmsUser | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null);

  /** Admin outranks any specific role; everyone else must match exactly. */
  hasRole(role: string): boolean {
    const user = this.currentUser();
    return user?.role === role || user?.role === "Admin";
  }

  /**
   * The server writes the HttpOnly `tms_auth` cookie in the Set-Cookie
   * response header — raw tokens never touch JavaScript. Then the browser
   * sends that cookie automatically and we fetch the profile.
   */
  async login(credentials: LoginRequest): Promise<void> {
    await firstValueFrom(this.http.post<void>(`${this.base}/login`, credentials));
    const user = await firstValueFrom(this.http.get<TmsUser>(`${this.base}/me`));
    this.currentUser.set(user);
  }

  /** Re-check the session on app boot (cookie may still be valid after refresh). */
  async restoreSession(): Promise<void> {
    try {
      const user = await firstValueFrom(this.http.get<TmsUser>(`${this.base}/me`));
      this.currentUser.set(user);
    } catch {
      this.currentUser.set(null);
    }
  }

  logout(): void {
    this.currentUser.set(null);
  }
}