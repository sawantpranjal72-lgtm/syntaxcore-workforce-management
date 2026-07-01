import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { Department, Role } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSelectModule, MatProgressSpinnerModule
  ],
  template: `
<div class="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
  <div class="w-full max-w-lg">

    <div class="flex items-center gap-3 mb-8">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold"
           style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">S</div>
      <span class="font-bold text-lg text-slate-900 dark:text-white">SyntaxCore WMS</span>
    </div>

    <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-1">Create your account</h2>
    <p class="text-slate-500 mb-6">Fill in the details to join your team</p>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <mat-form-field appearance="outline">
          <mat-label>First Name</mat-label>
          <input matInput formControlName="firstName">
          @if (form.get('firstName')?.invalid && form.get('firstName')?.touched) {
            <mat-error>Required</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Last Name</mat-label>
          <input matInput formControlName="lastName">
          @if (form.get('lastName')?.invalid && form.get('lastName')?.touched) {
            <mat-error>Required</mat-error>
          }
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Email address</mat-label>
        <input matInput type="email" formControlName="email">
        @if (form.get('email')?.invalid && form.get('email')?.touched) {
          <mat-error>Valid email required</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Password</mat-label>
        <input matInput [type]="showPwd() ? 'text' : 'password'" formControlName="password">
        <button mat-icon-button matSuffix type="button" (click)="showPwd.set(!showPwd())">
          <mat-icon>{{showPwd() ? 'visibility_off' : 'visibility'}}</mat-icon>
        </button>
        @if (form.get('password')?.invalid && form.get('password')?.touched) {
          <mat-error>Min 8 chars with uppercase, digit, and special char</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Role</mat-label>
        <mat-select formControlName="role">
          @for (role of roles; track role.value) {
            <mat-option [value]="role.value">{{role.label}}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Department</mat-label>
        <mat-select formControlName="departmentId">
          <mat-option value="">None</mat-option>
          @for (dept of departments(); track dept.id) {
            <mat-option [value]="dept.id">{{dept.name}}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Job Title</mat-label>
        <input matInput formControlName="jobTitle" placeholder="e.g. Backend Developer">
      </mat-form-field>

      @if (error()) {
        <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
          {{error()}}
        </div>
      }

      <button mat-flat-button color="primary" type="submit" class="w-full h-12 text-base font-medium"
              [disabled]="loading()">
        @if (loading()) {
          <mat-spinner diameter="20" class="inline-block mr-2"></mat-spinner>Creating account...
        } @else { Create Account }
      </button>
    </form>

    <p class="text-center text-sm text-slate-500 mt-6">
      Already have an account?
      <a routerLink="/auth/login" class="text-indigo-600 font-medium hover:underline">Sign in</a>
    </p>
  </div>
</div>
  `,
  styles: [`:host{display:block} mat-form-field{width:100%}`]
})
export class RegisterComponent implements OnInit {
  form: FormGroup;
  loading     = signal(false);
  showPwd     = signal(false);
  error       = signal('');
  departments = signal<Department[]>([]);

  roles: { value: Role; label: string }[] = [
    { value: 'SUPER_ADMIN',     label: 'Super Admin' },
    { value: 'ADMINISTRATOR',   label: 'Administrator' },
    { value: 'PROJECT_MANAGER', label: 'Project Manager' },
    { value: 'HR_MANAGER',      label: 'HR Manager' },
    { value: 'EMPLOYEE',        label: 'Employee' },
    { value: 'INTERN',          label: 'Intern' },
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      firstName:    ['', [Validators.required, Validators.minLength(2)]],
      lastName:     ['', [Validators.required, Validators.minLength(2)]],
      email:        ['', [Validators.required, Validators.email]],
      password:     ['', [Validators.required, Validators.minLength(8),
                          Validators.pattern(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).*$/)]],
      role:         ['EMPLOYEE', Validators.required],
      departmentId: [''],
      jobTitle:     ['']
    });
  }

  ngOnInit(): void {
    this.http.get<Department[]>(`${environment.apiUrl}/departments`).subscribe({
      next: d => this.departments.set(d),
      error: () => {}
    });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');

    this.authService.register(this.form.value).subscribe({
      next: () => {
        this.snackBar.open('Account created! Welcome to SyntaxCore.', '', {
          duration: 3000, panelClass: ['success-snackbar']
        });
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Registration failed');
        this.loading.set(false);
      }
    });
  }
}
