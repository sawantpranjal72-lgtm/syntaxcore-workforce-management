import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
<div class="p-4 sm:p-6 max-w-lg mx-auto">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Change Password</h1>
    <p class="text-slate-500 text-sm mt-0.5">Keep your account secure with a strong password</p>
  </div>

  <div class="rounded-2xl border p-6" style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
    <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
      @for (f of fields; track f.key) {
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{{f.label}}</label>
          <div class="relative">
            <input [formControlName]="f.key" [type]="show()[f.key] ? 'text' : 'password'"
                   [placeholder]="f.placeholder"
                   class="w-full px-4 py-3 rounded-xl border text-sm outline-none pr-11"
                   style="border-color:var(--border-color,#e2e8f0);background:var(--page-bg,#f8fafc);color:var(--text-primary)">
            <button type="button" (click)="toggleShow(f.key)"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <mat-icon class="text-base">{{show()[f.key] ? 'visibility_off' : 'visibility'}}</mat-icon>
            </button>
          </div>
          @if (form.get(f.key)?.invalid && form.get(f.key)?.touched) {
            <p class="text-xs text-red-500 mt-1">{{f.error}}</p>
          }
        </div>
      }

      <!-- Password strength -->
      @if (form.get('newPassword')?.value) {
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-slate-500">Password strength</span>
            <span class="text-xs font-medium" [ngClass]="strengthColor()">{{strengthLabel()}}</span>
          </div>
          <div class="h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div class="h-full rounded-full transition-all duration-300" [ngClass]="strengthBar()"
                 [style.width]="strengthWidth()"></div>
          </div>
        </div>
      }

      @if (form.hasError('mismatch') && form.get('confirmPassword')?.touched) {
        <div class="px-4 py-3 rounded-xl" style="background:#fef2f2;border:1px solid #fecaca">
          <p class="text-sm text-red-600">Passwords do not match</p>
        </div>
      }

      @if (error()) {
        <div class="px-4 py-3 rounded-xl" style="background:#fef2f2;border:1px solid #fecaca">
          <p class="text-sm text-red-600">{{error()}}</p>
        </div>
      }

      <button type="submit" [disabled]="form.invalid || saving()"
              class="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              style="background:linear-gradient(135deg,#3b82f6,#2563eb)">
        @if (saving()) { <mat-spinner diameter="18"></mat-spinner> Changing... }
        @else { <mat-icon class="text-base">lock_reset</mat-icon> Change Password }
      </button>
    </form>
  </div>
</div>
  `,
  styles: [':host{display:block}']
})
export class ChangePasswordComponent {
  form:   FormGroup;
  saving  = signal(false);
  error   = signal('');
  show    = signal<Record<string, boolean>>({ currentPassword: false, newPassword: false, confirmPassword: false });

  fields = [
    { key:'currentPassword', label:'Current Password', placeholder:'Your current password', error:'Current password is required' },
    { key:'newPassword',     label:'New Password',     placeholder:'Min 8 characters',      error:'Password must be at least 8 characters' },
    { key:'confirmPassword', label:'Confirm Password', placeholder:'Repeat new password',    error:'Please confirm your new password' },
  ];

  constructor(private fb: FormBuilder, private http: HttpClient, private snackBar: MatSnackBar, private router: Router) {
    this.form = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword:     ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.matchPasswords });
  }

  matchPasswords(g: AbstractControl) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  toggleShow(key: string): void { this.show.update(s => ({ ...s, [key]: !s[key] })); }

  strengthScore(): number {
    const pw = this.form.get('newPassword')?.value ?? '';
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  }
  strengthLabel(): string { return ['', 'Weak', 'Fair', 'Good', 'Strong'][this.strengthScore()]; }
  strengthColor(): string { return ['', 'text-red-500', 'text-amber-500', 'text-blue-500', 'text-green-500'][this.strengthScore()]; }
  strengthBar():   string { return ['', 'bg-red-500', 'bg-amber-400', 'bg-blue-500', 'bg-green-500'][this.strengthScore()]; }
  strengthWidth(): string { return `${(this.strengthScore() / 4) * 100}%`; }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.error.set('');
    const { currentPassword, newPassword } = this.form.value;
    this.http.post(`${environment.apiUrl}/auth/change-password`, { currentPassword, newPassword }).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Password changed successfully!', '', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: err => { this.error.set(err?.error?.message ?? 'Failed to change password. Check your current password.'); this.saving.set(false); }
    });
  }
}
