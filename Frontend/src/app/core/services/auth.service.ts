import { Injectable, signal, computed, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, UserSummary } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY   = 'sc_access_token';
  private readonly REFRESH_KEY = 'sc_refresh_token';
  private readonly USER_KEY    = 'sc_user';
  private readonly SESSION_KEY = 'sc_session_id';

  // Inactivity auto-logout: 30 minutes of no user activity
  private readonly INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
  private _inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private _tokenCheckInterval: ReturnType<typeof setInterval> | null = null;

  currentUser     = signal<UserSummary | null>(this.loadUser());
  isAuthenticated = computed(() => !!this.currentUser());
  isSuperAdmin    = computed(() => this.currentUser()?.role === 'SUPER_ADMIN');
  isAdmin         = computed(() => ['SUPER_ADMIN', 'ADMINISTRATOR'].includes(this.currentUser()?.role ?? ''));
  isHR            = computed(() => ['SUPER_ADMIN', 'ADMINISTRATOR', 'HR_MANAGER'].includes(this.currentUser()?.role ?? ''));
  isManager       = computed(() => ['SUPER_ADMIN', 'ADMINISTRATOR', 'PROJECT_MANAGER', 'HR_MANAGER'].includes(this.currentUser()?.role ?? ''));
  canEditProfiles = computed(() => ['SUPER_ADMIN', 'ADMINISTRATOR'].includes(this.currentUser()?.role ?? ''));

  constructor(private http: HttpClient, private router: Router, private ngZone: NgZone) {
    // Start activity monitoring if user is already logged in
    if (this.loadUser()) {
      this.startActivityMonitoring();
      this.startTokenExpiryCheck();
    }
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/login`, {
      ...request, email: request.email.trim().toLowerCase()
    }).pipe(tap(res => { this.storeSession(res); this.startActivityMonitoring(); this.startTokenExpiryCheck(); }));
  }

  loginWithSessionChoice(request: LoginRequest, forceNew: boolean = false): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/login`, {
      ...request, email: request.email.trim().toLowerCase(),
      forceNewSession: forceNew, continueExistingSession: !forceNew
    }).pipe(tap(res => { this.storeSession(res); this.startActivityMonitoring(); this.startTokenExpiryCheck(); }));
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/register`, {
      ...request, email: request.email.trim().toLowerCase()
    }).pipe(tap(res => { this.storeSession(res); this.startActivityMonitoring(); this.startTokenExpiryCheck(); }));
  }

  refreshToken(token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/refresh`, { refreshToken: token }).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.accessToken);
        if (res.refreshToken) localStorage.setItem(this.REFRESH_KEY, res.refreshToken);
        // The backend re-fetches the user fresh from the DB on every refresh,
        // so res.user reflects any role change made since login. Previously
        // this was discarded, meaning an admin changing a logged-in user's
        // role had no effect on that user's session (menus/guards) until
        // they manually logged out and back in. Silent refresh already runs
        // automatically every ~5 minutes, so persisting res.user here makes
        // role changes take effect on their own without a forced re-login.
        if (res.user) {
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
          this.currentUser.set(res.user);
        }
      })
    );
  }

  forgotPassword(identifier: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API}/forgot-password/send-otp`, { identifier });
  }

  verifyForgotPasswordOtp(phone: string, otpCode: string): Observable<{ verifyToken: string; message: string }> {
    return this.http.post<{ verifyToken: string; message: string }>(`${this.API}/forgot-password/verify-otp`, { phone, otpCode });
  }

  resetPasswordWithToken(verifyToken: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API}/forgot-password/reset`, { verifyToken, newPassword });
  }

  checkActiveSessions(): Observable<{ count: number; sessions: any[] }> {
    return this.http.get<{ count: number; sessions: any[] }>(`${this.API}/sessions/active-count`);
  }

  logout(reason?: string): void {
    this.stopActivityMonitoring();
    this.http.post(`${this.API}/logout`, {}).subscribe({ error: () => {} });
    this.clearSession();
    const params: any = {};
    if (reason) params['reason'] = reason;
    this.router.navigate(['/auth/login'], { queryParams: Object.keys(params).length ? params : undefined });
  }

  getAccessToken(): string | null  { return localStorage.getItem(this.TOKEN_KEY); }
  getRefreshToken(): string | null { return localStorage.getItem(this.REFRESH_KEY); }

  hasRole(...roles: string[]): boolean {
    const role = this.currentUser()?.role;
    return role ? roles.includes(role) : false;
  }

  /** Reset inactivity timer on any user activity */
  resetInactivityTimer(): void {
    if (!this.currentUser()) return;
    if (this._inactivityTimer) clearTimeout(this._inactivityTimer);
    this._inactivityTimer = this.ngZone.runOutsideAngular(() =>
      setTimeout(() => {
        this.ngZone.run(() => {
          if (this.currentUser()) {
            this.logout('inactivity');
          }
        });
      }, this.INACTIVITY_TIMEOUT_MS)
    );
  }

  /** Get token expiration time in ms from now (null = no token) */
  getTokenExpiresIn(): number | null {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return (payload.exp * 1000) - Date.now();
    } catch { return null; }
  }

  private startActivityMonitoring(): void {
    if (typeof window === 'undefined') return;
    // Activity events that reset inactivity timer
    const events = ['mousedown','mousemove','keydown','touchstart','scroll','click'];
    const handler = () => this.resetInactivityTimer();
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    this.resetInactivityTimer();
    // Store handler ref for removal
    (window as any).__scActivityHandler = handler;
    (window as any).__scActivityEvents = events;
  }

  private stopActivityMonitoring(): void {
    if (this._inactivityTimer) clearTimeout(this._inactivityTimer);
    if (this._tokenCheckInterval) clearInterval(this._tokenCheckInterval);
    if (typeof window !== 'undefined' && (window as any).__scActivityHandler) {
      const events = (window as any).__scActivityEvents ?? [];
      events.forEach((e: string) => window.removeEventListener(e, (window as any).__scActivityHandler));
    }
  }

  private startTokenExpiryCheck(): void {
    if (this._tokenCheckInterval) clearInterval(this._tokenCheckInterval);
    // Check token every 60 seconds; if < 5 min left, try to refresh
    this._tokenCheckInterval = this.ngZone.runOutsideAngular(() =>
      setInterval(() => {
        this.ngZone.run(() => {
          const expiresIn = this.getTokenExpiresIn();
          if (expiresIn === null) return;
          if (expiresIn <= 0) {
            // Token expired — attempt silent refresh or logout
            const refresh = this.getRefreshToken();
            if (refresh) {
              this.refreshToken(refresh).subscribe({
                error: () => this.logout('session_expired')
              });
            } else {
              this.logout('session_expired');
            }
          } else if (expiresIn < 5 * 60 * 1000) {
            // Less than 5 minutes left — proactive silent refresh
            const refresh = this.getRefreshToken();
            if (refresh) {
              this.refreshToken(refresh).subscribe({ error: () => {} });
            }
          }
        });
      }, 60000)
    );
  }

  private storeSession(res: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY,   res.accessToken);
    localStorage.setItem(this.REFRESH_KEY, res.refreshToken);
    localStorage.setItem(this.USER_KEY,    JSON.stringify(res.user));
    this.currentUser.set(res.user);
  }

  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.SESSION_KEY);
    this.currentUser.set(null);
  }

  private loadUser(): UserSummary | null {
    try { const r = localStorage.getItem(this.USER_KEY); return r ? JSON.parse(r) : null; }
    catch { return null; }
  }
}
