import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { Department } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  template: `
<div class="p-4 sm:p-6 max-w-2xl mx-auto fade-in">

  <!-- Page header -->
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
    <a routerLink="/employees" class="sc-btn sc-btn-secondary sc-btn-icon sc-btn-sm" style="text-decoration:none;flex-shrink:0">
      <mat-icon>arrow_back</mat-icon>
    </a>
    <div>
      <h1 style="font-size:1.35rem;font-weight:700;color:var(--text-primary);letter-spacing:-.02em">
        {{isEdit() ? 'Edit Employee' : 'Add Employee'}}
      </h1>
      <p style="font-size:13px;color:var(--text-muted);margin-top:2px">
        {{isEdit() ? 'Update employee details and role' : 'Onboard a new team member to the system'}}
      </p>
    </div>
  </div>

  <div class="sc-card" style="padding:0">
    <form [formGroup]="form" (ngSubmit)="submit()">

      <!-- Section: Personal Info -->
      <div style="padding:20px 24px;border-bottom:1px solid var(--border-color)">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:18px">
          Personal Information
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
          <div class="sc-field">
            <label class="sc-label">First Name <span class="req">*</span></label>
            <input formControlName="firstName" type="text" class="sc-input" placeholder="e.g. Rahul">
            @if (form.get('firstName')?.invalid && form.get('firstName')?.touched) {
              <p class="sc-error"><mat-icon style="font-size:13px">error_outline</mat-icon>Required</p>
            }
          </div>
          <div class="sc-field">
            <label class="sc-label">Last Name <span class="req">*</span></label>
            <input formControlName="lastName" type="text" class="sc-input" placeholder="e.g. Sharma">
            @if (form.get('lastName')?.invalid && form.get('lastName')?.touched) {
              <p class="sc-error"><mat-icon style="font-size:13px">error_outline</mat-icon>Required</p>
            }
          </div>
        </div>

        <div class="sc-field" style="margin-bottom:14px">
          <label class="sc-label">Email Address <span class="req">*</span></label>
          <div class="sc-input-group">
            <mat-icon class="sc-input-icon">alternate_email</mat-icon>
            <input formControlName="email" type="email" class="sc-input"
                   placeholder="employee@company.com" [readonly]="isEdit()">
          </div>
          @if (form.get('email')?.invalid && form.get('email')?.touched) {
            <p class="sc-error"><mat-icon style="font-size:13px">error_outline</mat-icon>Valid email required</p>
          }
          @if (isEdit()) {
            <p class="sc-hint">Email cannot be changed after creation</p>
          }
        </div>

        <div class="sc-field" style="margin-bottom:14px">
          <label class="sc-label">Phone Number</label>
          <div class="sc-input-group">
            <mat-icon class="sc-input-icon">phone</mat-icon>
            <input formControlName="phone" type="tel" class="sc-input" placeholder="+91-9876543210">
          </div>
          <p class="sc-hint">Used for OTP / 2FA (optional)</p>
        </div>

        <div class="sc-field">
          <label class="sc-label">Date of Joining</label>
          <input formControlName="dateOfJoining" type="date" class="sc-input">
        </div>
      </div>

      <!-- Section: Access -->
      @if (!isEdit()) {
        <div style="padding:20px 24px;border-bottom:1px solid var(--border-color)">
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:18px">
            Login Credentials
          </p>
          <div class="sc-field">
            <label class="sc-label">Initial Password <span class="req">*</span></label>
            <div class="sc-input-group">
              <mat-icon class="sc-input-icon">lock_outline</mat-icon>
              <input formControlName="password" [type]="showPwd() ? 'text' : 'password'"
                     class="sc-input" placeholder="Min 8 chars with uppercase, digit & symbol">
              <button type="button" class="sc-input-suffix" (click)="showPwd.set(!showPwd())">
                <mat-icon style="font-size:18px;color:var(--text-muted)">{{showPwd()?'visibility_off':'visibility'}}</mat-icon>
              </button>
            </div>
            @if (form.get('password')?.invalid && form.get('password')?.touched) {
              <p class="sc-error"><mat-icon style="font-size:13px">error_outline</mat-icon>
                Min 8 chars with uppercase, digit &amp; special character (&#64;#$%^&amp;+=!)
              </p>
            }
          </div>
        </div>
      }

      <!-- Section: Work Details -->
      <div style="padding:20px 24px;border-bottom:1px solid var(--border-color)">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:18px">
          Role &amp; Department
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
          <div class="sc-field">
            <label class="sc-label">Role <span class="req">*</span></label>
            <select formControlName="role" class="sc-select">
              @for (r of roles; track r.value) {
                <option [value]="r.value">{{r.label}}</option>
              }
            </select>
          </div>
          <div class="sc-field">
            <label class="sc-label">Department</label>
            <select formControlName="departmentId" class="sc-select">
              <option value="">— None —</option>
              @for (d of departments(); track d.id) {
                <option [value]="d.id">{{d.name}}</option>
              }
            </select>
          </div>
        </div>

        <div class="sc-field">
          <label class="sc-label">Job Title</label>
          <input formControlName="jobTitle" type="text" class="sc-input"
                 placeholder="e.g. Senior Backend Developer">
        </div>
      </div>

      <!-- Error -->
      @if (error()) {
        <div style="padding:0 24px;margin-top:16px">
          <div class="sc-alert sc-alert-error">
            <mat-icon>error_outline</mat-icon><span>{{error()}}</span>
          </div>
        </div>
      }

      <!-- Actions -->
      <div style="padding:20px 24px;display:flex;gap:10px;flex-wrap:wrap">
        <button type="submit" class="sc-btn sc-btn-primary" [disabled]="form.invalid || saving()">
          @if (saving()) { <mat-spinner diameter="16"></mat-spinner> }
          @else { <mat-icon style="font-size:18px">{{isEdit()?'save':'person_add'}}</mat-icon> }
          {{isEdit() ? 'Save Changes' : 'Add Employee'}}
        </button>
        <a routerLink="/employees" class="sc-btn sc-btn-secondary" style="text-decoration:none">Cancel</a>
      </div>
    </form>
  </div>
</div>
  `,
  styles: [`:host{display:block}
  .req { color:#dc2626; margin-left:2px; }
  `]
})
export class EmployeeFormComponent implements OnInit {
  form: FormGroup;
  saving      = signal(false);
  error       = signal('');
  showPwd     = signal(false);
  isEdit      = signal(false);
  departments = signal<Department[]>([]);
  editId      = signal<string | null>(null);

  roles = [
    { value: 'ADMINISTRATOR',   label: 'Administrator' },
    { value: 'PROJECT_MANAGER', label: 'Project Manager' },
    { value: 'HR_MANAGER',      label: 'HR Manager' },
    { value: 'EMPLOYEE',        label: 'Employee' },
    { value: 'INTERN',          label: 'Intern' },
    { value: 'STUDENT',         label: 'Student' },
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      firstName:    ['', [Validators.required, Validators.minLength(2)]],
      lastName:     ['', [Validators.required, Validators.minLength(2)]],
      email:        ['', [Validators.required, Validators.email]],
      password:     ['', [Validators.required, Validators.minLength(8),
                          Validators.pattern(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).*$/)]],
      role:         ['EMPLOYEE', Validators.required],
      departmentId: [''],
      jobTitle:     [''],
      phone:        [''],
      dateOfJoining:[''],
    });
  }

  ngOnInit(): void {
    this.http.get<Department[]>(`${environment.apiUrl}/departments`).subscribe({
      next: d => this.departments.set(d), error: () => {}
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id && this.route.snapshot.url.some(s => s.path === 'edit')) {
      this.isEdit.set(true);
      this.editId.set(id);
      this.form.get('password')?.clearValidators();
      this.form.get('password')?.updateValueAndValidity();

      this.http.get<any>(`${environment.apiUrl}/users/${id}`).subscribe({
        next: u => this.form.patchValue({
          firstName: u.firstName, lastName: u.lastName,
          email: u.email, role: u.role, jobTitle: u.jobTitle,
          phone: u.phone,
          dateOfJoining: u.dateOfJoining ? u.dateOfJoining.substring(0, 10) : '',
          departmentId: u.departmentId ?? ''
        })
      });
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.error.set('');
    const val = { ...this.form.value };
    if (!val.departmentId) delete val.departmentId;
    if (this.isEdit() && !val.password) delete val.password;
    if (val.email) val.email = val.email.trim().toLowerCase();
    if (!val.dateOfJoining) delete val.dateOfJoining;

    const req = this.isEdit()
      ? this.http.put(`${environment.apiUrl}/users/${this.editId()}`, val)
      : this.http.post(`${environment.apiUrl}/auth/register`, val);

    req.subscribe({
      next: (res: any) => {
        this.snackBar.open(`Employee ${this.isEdit() ? 'updated' : 'added'} successfully!`, '✓', {
          duration: 3000, panelClass: ['success-snackbar']
        });
        const uid = this.isEdit() ? this.editId()! : (res?.user?.id ?? res?.id ?? '');
        this.router.navigate(uid ? ['/employees', uid] : ['/employees']);
      },
      error: err => { this.error.set(err?.error?.message ?? 'Operation failed'); this.saving.set(false); }
    });
  }
}
