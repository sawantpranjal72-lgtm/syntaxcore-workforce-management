import { Component, OnInit, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  template: `
<div class="login-root">
  <!-- ── Left Panel ─────────────────────────────────────── -->
  <div class="login-left">
    <div class="login-left-inner">
      <!-- Brand -->
      <div class="login-brand">
        <div class="login-logo-wrap">
          <img src="/syntaxcore-logo.jpg" alt="SyntaxCore" class="login-logo-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="login-logo-fallback" style="display:none">
            <span>S</span>
          </div>
        </div>
        <div>
          <p class="login-brand-name">SyntaxCore</p>
          <p class="login-brand-tagline">Workforce Management Platform</p>
        </div>
      </div>

      <!-- Hero text -->
      <div class="login-hero">
        <h1 class="login-hero-title">Manage your<br><span class="login-hero-accent">workforce</span><br>smarter.</h1>
        <p class="login-hero-sub">One platform for tasks, attendance, projects, and people — built for teams that mean business.</p>
      </div>

      <!-- Feature pills -->
      <div class="login-features">
        @for (f of features; track f.icon) {
          <div class="login-feature-pill">
            <span class="login-feature-icon material-icons">{{f.icon}}</span>
            <span>{{f.label}}</span>
          </div>
        }
      </div>

      <!-- Decorative dots -->
      <div class="login-dots" aria-hidden="true">
        @for (d of [1,2,3,4,5,6,7,8,9,10,11,12]; track d) {
          <div class="login-dot"></div>
        }
      </div>
    </div>
  </div>

  <!-- ── Right Panel ────────────────────────────────────── -->
  <div class="login-right">
    <div class="login-form-wrap">
      <!-- Mobile logo -->
      <div class="login-mobile-brand">
        <div class="login-logo-wrap-sm">
          <img src="/syntaxcore-logo.jpg" alt="" class="login-logo-sm" onerror="this.style.display='none'">
        </div>
        <p class="login-mobile-brand-name">SyntaxCore</p>
      </div>

      <div class="login-form-header">
        <h2 class="login-form-title">Welcome back</h2>
        <p class="login-form-sub">Sign in to your workspace</p>
      </div>

      <!-- Session revoked banner -->
      @if (sessionMsg()) {
        <div class="lf-alert lf-alert-warning">
          <span class="material-icons">security</span>
          <span>{{sessionMsg()}}</span>
        </div>
      }

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="lf-form" autocomplete="on">

        <!-- Email -->
        <div class="lf-field">
          <label class="lf-label">Email address <span class="lf-req">*</span></label>
          <div class="lf-input-wrap" [class.lf-focus]="emailFocused" [class.lf-error-wrap]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched">
            <span class="material-icons lf-icon">alternate_email</span>
            <input formControlName="email" type="email" autocomplete="email"
                   placeholder="you@company.com"
                   (focus)="emailFocused=true" (blur)="emailFocused=false">
          </div>
          @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
            <p class="lf-field-error"><span class="material-icons">error_outline</span>Enter a valid email address</p>
          }
        </div>

        <!-- Password -->
        <div class="lf-field">
          <div class="lf-pw-row">
            <label class="lf-label">Password <span class="lf-req">*</span></label>
            <a routerLink="/auth/forgot-password" class="lf-forgot">Forgot password?</a>
          </div>
          <div class="lf-input-wrap" [class.lf-focus]="pwFocused" [class.lf-error-wrap]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched">
            <span class="material-icons lf-icon">lock_outline</span>
            <input formControlName="password" [type]="showPw() ? 'text' : 'password'"
                   autocomplete="current-password" placeholder="••••••••"
                   (focus)="pwFocused=true" (blur)="pwFocused=false">
            <button type="button" class="lf-eye" (click)="showPw.set(!showPw())" [attr.aria-label]="showPw() ? 'Hide password' : 'Show password'">
              <span class="material-icons">{{showPw() ? 'visibility_off' : 'visibility'}}</span>
            </button>
          </div>
          @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
            <p class="lf-field-error"><span class="material-icons">error_outline</span>Password is required</p>
          }
        </div>

        <!-- Error -->
        @if (errorMsg() && !showSessionDialog()) {
          <div class="lf-alert lf-alert-error">
            <span class="material-icons">error_outline</span>
            <span>{{errorMsg()}}</span>
          </div>
        }

        <!-- Session conflict dialog -->
        @if (showSessionDialog()) {
          <div class="lf-session-box">
            <div class="lf-session-header">
              <span class="material-icons lf-session-icon">devices</span>
              <div>
                <p class="lf-session-title">Active session found</p>
                <p class="lf-session-sub">{{activeSessionCount()}} active session(s) on another device</p>
              </div>
            </div>
            <div class="lf-session-actions">
              <button type="button" (click)="loginWithChoice(false)" [disabled]="loading()" class="lf-session-btn lf-session-continue">
                <span class="material-icons">add_circle_outline</span>
                Keep existing &amp; login here
              </button>
              <button type="button" (click)="loginWithChoice(true)" [disabled]="loading()" class="lf-session-btn lf-session-force">
                <span class="material-icons">logout</span>
                Sign out all &amp; login here
              </button>
              <button type="button" (click)="showSessionDialog.set(false); loading.set(false)" class="lf-session-btn lf-session-cancel">
                Cancel
              </button>
            </div>
          </div>
        } @else {
          <!-- Remember me -->
          <label class="lf-remember">
            <input type="checkbox" formControlName="remember">
            <span class="lf-checkbox-custom"></span>
            <span>Keep me signed in for 30 days</span>
          </label>

          <!-- Submit -->
          <button type="submit" class="lf-submit" [disabled]="loading()">
            @if (loading()) {
              <mat-spinner diameter="20" class="lf-spinner"></mat-spinner>
              <span>Signing in…</span>
            } @else {
              <span>Sign in to workspace</span>
              <span class="material-icons">arrow_forward</span>
            }
          </button>
        }

        <!-- Divider + help -->
        <div class="lf-divider"></div>
        <p class="lf-contact">Don't have an account? <strong>Contact your administrator</strong></p>
      </form>
    </div>

    <!-- Footer -->
    <div class="login-footer">
      <span>© 2026 SyntaxCore Technologies</span>
      <span class="lf-dot-sep">·</span>
      <a href="#">Privacy</a>
      <span class="lf-dot-sep">·</span>
      <a href="#">Terms</a>
    </div>
  </div>
</div>
  `,
  styles: [`
    :host { display: block; height: 100vh; }

    /* ── Root layout ───────────────────────────────── */
    .login-root {
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 100vh;
      font-family: 'DM Sans', -apple-system, sans-serif;
    }
    @media (max-width: 900px) {
      .login-root { grid-template-columns: 1fr; }
    }

    /* ── Left panel ────────────────────────────────── */
    .login-left {
      background: linear-gradient(145deg, #0c1e3e 0%, #112d5a 40%, #0e4491 80%, #1557b0 100%);
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: stretch;
    }
    .login-left::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 60% 50% at 80% 20%, rgba(96,165,250,.18) 0%, transparent 60%),
        radial-gradient(ellipse 40% 60% at 10% 80%, rgba(37,99,235,.2) 0%, transparent 60%);
      pointer-events: none;
    }
    .login-left-inner {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 40px;
      padding: 48px 52px;
      width: 100%;
    }
    @media (max-width: 900px) { .login-left { display: none; } }

    /* Brand */
    .login-brand { display: flex; align-items: center; gap: 14px; }
    .login-logo-wrap {
      width: 52px; height: 52px;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,.3);
      border: 2px solid rgba(255,255,255,.15);
      flex-shrink: 0;
      background: rgba(255,255,255,.1);
      display: flex; align-items: center; justify-content: center;
    }
    .login-logo-img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .login-logo-fallback {
      width: 100%; height: 100%;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 800; color: #fff;
    }
    .login-brand-name { font-size: 22px; font-weight: 800; color: #fff; line-height: 1; letter-spacing: -.02em; }
    .login-brand-tagline { font-size: 12.5px; color: rgba(255,255,255,.55); margin-top: 3px; }

    /* Hero */
    .login-hero { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 20px; }
    .login-hero-title {
      font-size: 3.2rem; font-weight: 800; color: #fff; line-height: 1.1;
      letter-spacing: -.035em;
    }
    .login-hero-accent {
      background: linear-gradient(90deg, #93c5fd, #60a5fa);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .login-hero-sub { font-size: 15.5px; color: rgba(255,255,255,.6); line-height: 1.65; max-width: 340px; }

    /* Features */
    .login-features { display: flex; flex-wrap: wrap; gap: 10px; }
    .login-feature-pill {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 8px 14px; border-radius: 999px;
      background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.12);
      color: rgba(255,255,255,.8); font-size: 13px; font-weight: 500;
      backdrop-filter: blur(4px);
    }
    .login-feature-icon { font-size: 15px !important; color: #93c5fd; }

    /* Dots */
    .login-dots { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; width: 56px; margin-top: auto; }
    .login-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,.18); }
    .login-dot:nth-child(3n+1) { background: rgba(147,197,253,.4); }

    /* ── Right panel ───────────────────────────────── */
    .login-right {
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
      min-height: 100vh;
    }
    .login-form-wrap { width: 100%; max-width: 420px; }

    /* Mobile brand */
    .login-mobile-brand {
      display: none; align-items: center; gap: 10px; margin-bottom: 32px; justify-content: center;
    }
    @media (max-width: 900px) { .login-mobile-brand { display: flex; } }
    .login-logo-wrap-sm { width: 36px; height: 36px; border-radius: 10px; overflow: hidden; border: 2px solid #e2e8f0; }
    .login-logo-sm { width: 100%; height: 100%; object-fit: cover; }
    .login-mobile-brand-name { font-size: 18px; font-weight: 800; color: #0f172a; }

    /* Form header */
    .login-form-header { margin-bottom: 28px; }
    .login-form-title { font-size: 1.75rem; font-weight: 800; color: #0f172a; letter-spacing: -.025em; }
    .login-form-sub { color: #6b7280; font-size: 14.5px; margin-top: 4px; }

    /* Form */
    .lf-form { display: flex; flex-direction: column; gap: 18px; }
    .lf-field { display: flex; flex-direction: column; gap: 7px; }
    .lf-label { font-size: 13.5px; font-weight: 600; color: #374151; }
    .lf-req { color: #dc2626; margin-left: 2px; }
    .lf-pw-row { display: flex; justify-content: space-between; align-items: center; }
    .lf-forgot { font-size: 13px; color: #2563eb; font-weight: 500; text-decoration: none; }
    .lf-forgot:hover { color: #1d4ed8; text-decoration: underline; }

    /* Input wrap */
    .lf-input-wrap {
      display: flex; align-items: center;
      background: #fff;
      border: 1.5px solid #d1d5db;
      border-radius: 10px;
      height: 48px;
      transition: border-color .15s ease, box-shadow .15s ease;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0,0,0,.04);
    }
    .lf-input-wrap.lf-focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37,99,235,.12);
    }
    .lf-input-wrap.lf-error-wrap { border-color: #f87171; }
    .lf-icon {
      padding: 0 12px 0 14px; color: #9ca3af;
      font-size: 19px !important; flex-shrink: 0;
    }
    .lf-input-wrap input {
      flex: 1; height: 100%;
      border: none !important; outline: none !important; background: transparent !important;
      box-shadow: none !important; min-height: unset !important;
      font-size: 14.5px; color: #0f172a; font-family: 'DM Sans', sans-serif;
      padding: 0 12px 0 0 !important;
      border-radius: 0 !important;
    }
    .lf-input-wrap input::placeholder { color: #9ca3af; }
    .lf-eye {
      width: 44px; height: 100%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      color: #9ca3af; cursor: pointer; border: none; background: transparent;
      transition: color .15s;
    }
    .lf-eye:hover { color: #6b7280; }
    .lf-eye .material-icons { font-size: 19px; }

    /* Field error */
    .lf-field-error { display: flex; align-items: center; gap: 4px; font-size: 12.5px; color: #dc2626; }
    .lf-field-error .material-icons { font-size: 14px; }

    /* Alert */
    .lf-alert {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; border-radius: 10px; font-size: 13.5px; font-weight: 500;
      border: 1px solid;
    }
    .lf-alert .material-icons { font-size: 18px; flex-shrink: 0; }
    .lf-alert-error   { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
    .lf-alert-warning { background: #fffbeb; border-color: #fde68a; color: #92400e; }

    /* Remember */
    .lf-remember {
      display: flex; align-items: center; gap: 10px;
      cursor: pointer; font-size: 14px; color: #374151;
    }
    .lf-remember input[type="checkbox"] {
      position: absolute; opacity: 0; width: 0; height: 0;
    }
    .lf-checkbox-custom {
      width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0;
      border: 2px solid #d1d5db; background: #fff;
      transition: all .15s; display: flex; align-items: center; justify-content: center;
    }
    .lf-remember input:checked ~ .lf-checkbox-custom {
      background: #2563eb; border-color: #2563eb;
    }
    .lf-remember input:checked ~ .lf-checkbox-custom::after {
      content: '✓'; color: #fff; font-size: 11px; font-weight: 700;
    }

    /* Submit button */
    .lf-submit {
      width: 100%; height: 50px; border-radius: 11px;
      background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
      color: #fff; font-size: 15px; font-weight: 700;
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 9px;
      transition: all .15s ease;
      box-shadow: 0 2px 8px rgba(37,99,235,.35), 0 1px 3px rgba(37,99,235,.2);
      letter-spacing: -.01em;
      font-family: 'DM Sans', sans-serif;
    }
    .lf-submit .material-icons { font-size: 20px; }
    .lf-submit:hover:not(:disabled) {
      background: linear-gradient(180deg, #1d4ed8 0%, #1e40af 100%);
      box-shadow: 0 4px 14px rgba(37,99,235,.45), 0 2px 6px rgba(37,99,235,.25);
      transform: translateY(-1px);
    }
    .lf-submit:active { transform: translateY(0); }
    .lf-submit:disabled { opacity: .65; cursor: not-allowed; transform: none; }
    .lf-spinner { filter: brightness(0) invert(1); }

    /* Session box */
    .lf-session-box {
      background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 12px; padding: 16px;
    }
    .lf-session-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
    .lf-session-icon { font-size: 28px !important; color: #d97706; }
    .lf-session-title { font-size: 14px; font-weight: 700; color: #92400e; }
    .lf-session-sub   { font-size: 12.5px; color: #a16207; margin-top: 2px; }
    .lf-session-actions { display: flex; flex-direction: column; gap: 8px; }
    .lf-session-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; border-radius: 9px;
      font-size: 13.5px; font-weight: 600; cursor: pointer;
      border: 1.5px solid; width: 100%; justify-content: center;
      transition: all .15s; font-family: 'DM Sans', sans-serif;
    }
    .lf-session-btn .material-icons { font-size: 17px; }
    .lf-session-continue { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
    .lf-session-continue:hover { background: #dbeafe; }
    .lf-session-force   { background: #fff1f2; border-color: #fecdd3; color: #be123c; }
    .lf-session-force:hover { background: #ffe4e6; }
    .lf-session-cancel  { background: #f8fafc; border-color: #e2e8f0; color: #64748b; }
    .lf-session-cancel:hover { background: #f1f5f9; }

    /* Divider */
    .lf-divider { height: 1px; background: #e5e7eb; margin: 2px 0; }

    /* Contact */
    .lf-contact { font-size: 13.5px; color: #6b7280; text-align: center; }
    .lf-contact strong { color: #374151; }

    /* Footer */
    .login-footer {
      margin-top: 40px; display: flex; align-items: center; gap: 8px;
      font-size: 12.5px; color: #9ca3af; flex-wrap: wrap; justify-content: center;
    }
    .login-footer a { color: #6b7280; text-decoration: none; }
    .login-footer a:hover { color: #374151; }
    .lf-dot-sep { color: #d1d5db; }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  loading           = signal(false);
  showPw            = signal(false);
  errorMsg          = signal('');
  sessionMsg        = signal('');
  showSessionDialog = signal(false);
  activeSessionCount = signal(0);
  emailFocused = false;
  pwFocused    = false;

  features = [
    { icon: 'task_alt',     label: 'Task Management' },
    { icon: 'people',       label: 'Team Collaboration' },
    { icon: 'schedule',     label: 'Attendance Tracking' },
    { icon: 'bar_chart',    label: 'Analytics & Reports' },
    { icon: 'folder_open',  label: 'Project Tracking' },
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      remember: [false]
    });

    this.route.queryParams.subscribe(p => {
      if (p['reason'] === 'session_revoked')  this.sessionMsg.set('Your session was revoked. Please sign in again.');
      else if (p['reason'] === 'session_expired') this.sessionMsg.set('Your session expired. Please sign in again.');
      else if (p['reason'] === 'inactivity')      this.sessionMsg.set('You were logged out due to inactivity. Please sign in again.');
      else if (p['reason'] === 'expired')         this.sessionMsg.set('Your session expired. Please sign in again.');
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    this.loading.set(true); this.errorMsg.set(''); this.showSessionDialog.set(false);
    this.authService.login(this.loginForm.value).subscribe({
      next: (res: any) => {
        if (res?.hasActiveSession) {
          this.activeSessionCount.set(res.activeSessionCount ?? 1);
          this.showSessionDialog.set(true);
          this.loading.set(false);
          return;
        }
        this.snackBar.open('Welcome back!', '', { duration: 2000, panelClass: ['success-snackbar'] });
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.errorMsg.set(err?.error?.message ?? 'Invalid email or password. Please try again.');
        this.loading.set(false);
      }
    });
  }

  loginWithChoice(forceNew: boolean): void {
    this.loading.set(true); this.errorMsg.set('');
    const { email, password } = this.loginForm.value;
    this.authService.loginWithSessionChoice({ email, password }, forceNew).subscribe({
      next: () => {
        this.snackBar.open('Welcome back!', '', { duration: 2000, panelClass: ['success-snackbar'] });
        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.errorMsg.set(err?.error?.message ?? 'Login failed. Please try again.');
        this.loading.set(false);
        this.showSessionDialog.set(false);
      }
    });
  }
}
