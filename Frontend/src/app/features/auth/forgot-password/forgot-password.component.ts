import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

type Step = 'request' | 'otp' | 'reset' | 'done';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
<div class="min-h-screen flex items-center justify-center p-4"
     style="background:linear-gradient(135deg,#06102e 0%,#0c225a 45%,#0d3b8a 100%)">
  <div class="w-full max-w-sm">
    <div class="text-center mb-6">
      <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
           style="background:linear-gradient(135deg,#3b82f6,#6366f1)">
        <mat-icon class="text-white text-2xl">lock_reset</mat-icon>
      </div>
      <h2 class="text-2xl font-bold text-white mb-1">Reset Password</h2>
      <p class="text-blue-300 text-sm">
        @switch (step()) {
          @case ('request') { Enter your email or phone to receive an OTP }
          @case ('otp') { Enter the OTP sent to your registered contact }
          @case ('reset') { Set your new password }
          @case ('done') { Password reset successfully }
        }
      </p>
    </div>

    <div class="rounded-2xl p-6" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1)">

      <!-- Step 1: Request OTP -->
      @if (step() === 'request') {
        <form [formGroup]="requestForm" (ngSubmit)="sendOtp()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-blue-200 mb-1.5">Email or Phone Number</label>
            <input formControlName="identifier" type="text" placeholder="email@company.com or +91..."
                   class="w-full px-4 py-3 rounded-xl text-sm outline-none text-white"
                   style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15)">
            @if (requestForm.get('identifier')?.invalid && requestForm.get('identifier')?.touched) {
              <p class="text-xs text-red-400 mt-1">Please enter your email or phone number</p>
            }
          </div>
          @if (error()) {
            <div class="flex items-center gap-2 p-3 rounded-xl" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3)">
              <mat-icon class="text-red-400 text-sm">error_outline</mat-icon>
              <p class="text-xs text-red-400">{{error()}}</p>
            </div>
          }
          <button type="submit" [disabled]="requestForm.invalid || loading()"
                  class="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style="background:linear-gradient(135deg,#3b82f6,#2563eb)">
            @if (loading()) { <mat-spinner diameter="18" color="accent"></mat-spinner> Sending OTP... }
            @else { Send OTP }
          </button>
        </form>
      }

      <!-- Step 2: Enter OTP -->
      @if (step() === 'otp') {
        <form [formGroup]="otpForm" (ngSubmit)="verifyOtp()" class="space-y-4">
          <div class="text-center mb-2">
            <p class="text-blue-200 text-sm">OTP sent to your registered email/phone</p>
            <p class="text-white font-medium text-sm">{{maskedIdentifier()}}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-blue-200 mb-1.5">Enter OTP</label>
            <input formControlName="otp" type="text" placeholder="6-digit OTP" maxlength="6"
                   class="w-full px-4 py-3 rounded-xl text-sm outline-none text-white text-center tracking-widest text-lg font-bold"
                   style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15)">
            @if (otpForm.get('otp')?.invalid && otpForm.get('otp')?.touched) {
              <p class="text-xs text-red-400 mt-1">Please enter the 6-digit OTP</p>
            }
          </div>
          @if (error()) {
            <div class="flex items-center gap-2 p-3 rounded-xl" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3)">
              <mat-icon class="text-red-400 text-sm">error_outline</mat-icon>
              <p class="text-xs text-red-400">{{error()}}</p>
            </div>
          }
          <button type="submit" [disabled]="otpForm.invalid || loading()"
                  class="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style="background:linear-gradient(135deg,#3b82f6,#2563eb)">
            @if (loading()) { <mat-spinner diameter="18" color="accent"></mat-spinner> Verifying... }
            @else { Verify OTP }
          </button>
          <button type="button" (click)="step.set('request'); error.set('')"
                  class="w-full py-2 text-sm text-blue-300 hover:text-blue-200 transition-colors">
            ← Change email/phone
          </button>
        </form>
      }

      <!-- Step 3: Set New Password -->
      @if (step() === 'reset') {
        <form [formGroup]="resetForm" (ngSubmit)="resetPassword()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-blue-200 mb-1.5">New Password</label>
            <div class="relative">
              <input formControlName="password" [type]="showPwd() ? 'text' : 'password'" placeholder="Min 8 characters"
                     class="w-full px-4 py-3 pr-10 rounded-xl text-sm outline-none text-white"
                     style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15)">
              <button type="button" (click)="showPwd.set(!showPwd())"
                      class="absolute right-3 top-3 text-blue-300 hover:text-blue-200">
                <mat-icon class="text-sm">{{showPwd() ? 'visibility_off' : 'visibility'}}</mat-icon>
              </button>
            </div>
            @if (resetForm.get('password')?.invalid && resetForm.get('password')?.touched) {
              <p class="text-xs text-red-400 mt-1">Password must be at least 8 characters</p>
            }
          </div>
          <div>
            <label class="block text-sm font-medium text-blue-200 mb-1.5">Confirm Password</label>
            <input formControlName="confirm" type="password" placeholder="Repeat password"
                   class="w-full px-4 py-3 rounded-xl text-sm outline-none text-white"
                   style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15)">
            @if (resetForm.get('confirm')?.value && resetForm.get('password')?.value !== resetForm.get('confirm')?.value) {
              <p class="text-xs text-red-400 mt-1">Passwords do not match</p>
            }
          </div>
          @if (error()) {
            <div class="flex items-center gap-2 p-3 rounded-xl" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3)">
              <mat-icon class="text-red-400 text-sm">error_outline</mat-icon>
              <p class="text-xs text-red-400">{{error()}}</p>
            </div>
          }
          <button type="submit" [disabled]="resetForm.invalid || loading() || resetForm.get('password')?.value !== resetForm.get('confirm')?.value"
                  class="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style="background:linear-gradient(135deg,#3b82f6,#2563eb)">
            @if (loading()) { <mat-spinner diameter="18" color="accent"></mat-spinner> Resetting... }
            @else { Reset Password }
          </button>
        </form>
      }

      <!-- Step 4: Done -->
      @if (step() === 'done') {
        <div class="text-center py-4">
          <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style="background:#dcfce7">
            <mat-icon class="text-green-600 text-3xl">check_circle</mat-icon>
          </div>
          <p class="text-white font-semibold mb-1">Password Reset Successful!</p>
          <p class="text-blue-300 text-sm mb-6">You can now login with your new password</p>
          <a routerLink="/auth/login"
             class="inline-block px-6 py-3 rounded-xl text-white font-semibold text-sm"
             style="background:linear-gradient(135deg,#3b82f6,#2563eb)">
            Go to Login
          </a>
        </div>
      }
    </div>

    @if (step() !== 'done') {
      <div class="text-center mt-5">
        <a routerLink="/auth/login" class="text-sm text-blue-300 hover:text-blue-200 transition-colors">
          ← Back to Sign In
        </a>
      </div>
    }
  </div>
</div>
  `,
  styles: [':host{display:block}']
})
export class ForgotPasswordComponent {
  step = signal<Step>('request');
  loading = signal(false);
  error = signal('');
  showPwd = signal(false);
  maskedIdentifier = signal('');
  private verifyToken = '';
  private identifierPhone = '';

  requestForm: FormGroup;
  otpForm: FormGroup;
  resetForm: FormGroup;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.requestForm = this.fb.group({ identifier: ['', [Validators.required, Validators.minLength(3)]] });
    this.otpForm = this.fb.group({ otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]] });
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm:  ['', [Validators.required]]
    });
  }

  sendOtp(): void {
    if (this.requestForm.invalid) return;
    this.loading.set(true); this.error.set('');
    const identifier = this.requestForm.value.identifier.trim();
    // Store the identifier to use as phone in verify step
    this.identifierPhone = identifier;
    // Mask for display
    this.maskedIdentifier.set(identifier.includes('@')
      ? identifier.replace(/(.{2})(.*)(?=@)/, (m: string, p1: string, p2: string) => p1 + p2.replace(/./g, '*'))
      : identifier.substring(0, 4) + '****' + identifier.slice(-2));

    this.authService.forgotPassword(identifier).subscribe({
      next: () => { this.step.set('otp'); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.message ?? 'Could not send OTP. Please check your email/phone.'); this.loading.set(false); }
    });
  }

  verifyOtp(): void {
    if (this.otpForm.invalid) return;
    this.loading.set(true); this.error.set('');
    this.authService.verifyForgotPasswordOtp(this.identifierPhone, this.otpForm.value.otp).subscribe({
      next: (res) => { this.verifyToken = res.verifyToken; this.step.set('reset'); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.message ?? 'Invalid or expired OTP. Please try again.'); this.loading.set(false); }
    });
  }

  resetPassword(): void {
    if (this.resetForm.invalid) return;
    if (this.resetForm.value.password !== this.resetForm.value.confirm) {
      this.error.set('Passwords do not match'); return;
    }
    this.loading.set(true); this.error.set('');
    this.authService.resetPasswordWithToken(this.verifyToken, this.resetForm.value.password).subscribe({
      next: () => { this.step.set('done'); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.message ?? 'Failed to reset password. Please try again.'); this.loading.set(false); }
    });
  }
}
