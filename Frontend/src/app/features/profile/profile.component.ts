import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { UserDetail, Task, ROLE_LABELS } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatInputModule, MatFormFieldModule,
    MatTabsModule, MatProgressSpinnerModule],
  template: `
<div class="p-4 sm:p-6 max-w-5xl mx-auto">

  <!-- Banner -->
  <div class="rounded-2xl mb-6 overflow-hidden border" style="border-color:var(--border-color,#e2e8f0)">
    <div class="h-24 sm:h-32" style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 50%,#6366f1 100%)"></div>
    <div class="px-5 sm:px-7 pb-6 pt-0" style="background:var(--card-bg,#fff)">
      <div class="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
        <div class="w-20 h-20 rounded-2xl border-4 border-white dark:border-slate-900 flex items-center justify-center
                    text-white text-2xl font-bold flex-shrink-0"
             style="background:linear-gradient(135deg,#3b82f6,#6366f1)">
          {{initials()}}
        </div>
        <div class="flex-1 pb-1 min-w-0">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white truncate">{{profile()?.fullName}}</h2>
          <p class="text-slate-400 text-sm">
            {{profile()?.jobTitle ?? 'No title'}}
            @if (profile()?.departmentName) { · {{profile()?.departmentName}} }
          </p>
        </div>
        <div class="flex flex-wrap gap-2 pb-1">
          <span class="px-3 py-1.5 rounded-full text-xs font-semibold"
                style="background:#eff6ff;color:#3b82f6">
            {{roleLabel()}}
          </span>
          <span class="px-3 py-1.5 rounded-full text-xs font-medium"
                [ngClass]="profile()?.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'">
            {{profile()?.active ? 'Active' : 'Inactive'}}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="grid grid-cols-3 gap-4 mb-6">
    @for (s of profileStats(); track s.label) {
      <div class="rounded-2xl border p-4 text-center"
           style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
        <p class="text-2xl font-bold text-slate-900 dark:text-white">{{s.value}}</p>
        <p class="text-xs text-slate-400 mt-1">{{s.label}}</p>
      </div>
    }
  </div>

  <!-- Tabs -->
  <div class="rounded-2xl border overflow-hidden" style="border-color:var(--border-color,#e2e8f0)">
    <mat-tab-group animationDuration="200ms">

      <!-- Overview -->
      <mat-tab label="Overview">
        <div class="p-5 grid sm:grid-cols-2 gap-6" style="background:var(--card-bg,#fff)">
          <div>
            <h3 class="font-semibold text-slate-900 dark:text-white mb-4">Personal Information</h3>
            <dl class="space-y-3">
              @for (f of infoFields(); track f.label) {
                <div class="flex items-start gap-3">
                  <mat-icon class="text-slate-400 text-base mt-0.5 flex-shrink-0">{{f.icon}}</mat-icon>
                  <div class="min-w-0">
                    <dt class="text-xs text-slate-400">{{f.label}}</dt>
                    <dd class="text-sm text-slate-700 dark:text-slate-300 break-all">{{f.value || '—'}}</dd>
                  </div>
                </div>
              }
            </dl>
          </div>
          @if (skillList().length) {
            <div>
              <h3 class="font-semibold text-slate-900 dark:text-white mb-4">Skills & Expertise</h3>
              <div class="flex flex-wrap gap-2">
                @for (skill of skillList(); track skill) {
                  <span class="px-3 py-1 rounded-full text-xs font-medium"
                        style="background:#eff6ff;color:#3b82f6">{{skill}}</span>
                }
              </div>
            </div>
          }
        </div>
      </mat-tab>

      <!-- Edit Profile — Only for SUPER_ADMIN and ADMINISTRATOR -->
      @if (canEdit()) {
        <mat-tab label="Edit Profile">
          <form [formGroup]="editForm" (ngSubmit)="saveProfile()"
                class="p-5 space-y-4 max-w-xl" style="background:var(--card-bg,#fff)">
            <div class="flex items-center gap-2 px-3 py-2 rounded-xl mb-2"
                 style="background:#fef9c3;border:1px solid #fde047">
              <mat-icon class="text-yellow-600 text-sm">admin_panel_settings</mat-icon>
              <p class="text-xs text-yellow-700 font-medium">Administrator access — profile editing enabled</p>
            </div>
            <div class="grid sm:grid-cols-2 gap-4">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>First Name</mat-label>
                <input matInput formControlName="firstName">
              </mat-form-field>
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Last Name</mat-label>
                <input matInput formControlName="lastName">
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Phone</mat-label>
              <input matInput formControlName="phone">
              <mat-icon matSuffix>phone</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Job Title</mat-label>
              <input matInput formControlName="jobTitle">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>GitHub URL</mat-label>
              <input matInput formControlName="githubUrl">
              <mat-icon matSuffix>code</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>LinkedIn URL</mat-label>
              <input matInput formControlName="linkedinUrl">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Skills (comma-separated)</mat-label>
              <input matInput formControlName="skills" placeholder="Java, Angular, Docker">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Bio</mat-label>
              <textarea matInput formControlName="bio" rows="3"></textarea>
            </mat-form-field>
            <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
              @if (saving()) { <mat-spinner diameter="16" class="inline mr-2"></mat-spinner> }
              {{saving() ? 'Saving...' : 'Save Changes'}}
            </button>
          </form>
        </mat-tab>
      }

      <!-- My Tasks -->
      <mat-tab label="My Tasks">
        <div class="p-5 space-y-2" style="background:var(--card-bg,#fff)">
          @for (task of recentTasks(); track task.id) {
            <div class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <div class="w-2 h-2 rounded-full flex-shrink-0" [ngClass]="statusDot(task.status)"></div>
              <p class="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">{{task.title}}</p>
              <span class="text-xs px-2 py-0.5 rounded-full" [ngClass]="priorityChip(task.priority)">{{task.priority}}</span>
            </div>
          }
          @if (!recentTasks().length) {
            <div class="text-center py-10 text-slate-400 text-sm">No tasks assigned</div>
          }
        </div>
      </mat-tab>
    </mat-tab-group>
  </div>
</div>
  `,
  styles: [`:host{display:block} mat-form-field{width:100%}`]
})
export class ProfileComponent implements OnInit {
  profile     = signal<UserDetail | null>(null);
  recentTasks = signal<Task[]>([]);
  saving      = signal(false);
  editForm: FormGroup;

  canEdit  = computed(() => this.authService.canEditProfiles());
  initials = computed(() => { const p = this.profile(); return p ? `${p.firstName[0]}${p.lastName[0]}`.toUpperCase() : 'SC'; });
  roleLabel = computed(() => ROLE_LABELS[this.profile()?.role ?? ''] ?? this.profile()?.role ?? '');
  skillList = computed(() => this.profile()?.skills?.split(',').map(s => s.trim()).filter(Boolean) ?? []);
  profileStats = computed(() => [
    { label: 'Tasks Assigned', value: this.profile()?.totalTasksAssigned ?? 0 },
    { label: 'Completed',      value: this.profile()?.completedTasks ?? 0 },
    { label: 'Pending',        value: this.profile()?.pendingTasks ?? 0 },
  ]);
  infoFields = computed(() => [
    { icon: 'mail',     label: 'Email',      value: this.profile()?.email },
    { icon: 'phone',    label: 'Phone',       value: this.profile()?.phone },
    { icon: 'badge',    label: 'Employee ID', value: this.profile()?.employeeId },
    { icon: 'business', label: 'Department',  value: this.profile()?.departmentName },
    { icon: 'event',    label: 'Joined',      value: this.profile()?.dateOfJoining },
    { icon: 'code',     label: 'GitHub',      value: this.profile()?.githubUrl },
    { icon: 'link',     label: 'LinkedIn',    value: this.profile()?.linkedinUrl },
  ]);

  constructor(
    private fb: FormBuilder, private http: HttpClient,
    public authService: AuthService, private snackBar: MatSnackBar
  ) {
    this.editForm = this.fb.group({
      firstName: [''], lastName: [''], phone: [''], jobTitle: [''],
      githubUrl: [''], linkedinUrl: [''], skills: [''], bio: ['']
    });
  }

  ngOnInit(): void {
    this.http.get<UserDetail>(`${environment.apiUrl}/users/me`).subscribe({
      next: p => { this.profile.set(p); this.editForm.patchValue({ ...p }); }
    });
    this.http.get<Task[]>(`${environment.apiUrl}/tasks/my-tasks`).subscribe({
      next: t => this.recentTasks.set(t.slice(0, 10)), error: () => {}
    });
  }

  saveProfile(): void {
    if (!this.canEdit()) return;
    this.saving.set(true);
    this.http.put<UserDetail>(`${environment.apiUrl}/users/me`, this.editForm.value).subscribe({
      next: p => {
        this.profile.set(p); this.saving.set(false);
        this.snackBar.open('Profile updated successfully!', '', { duration: 2500 });
      },
      error: () => this.saving.set(false)
    });
  }

  statusDot(s: string): string {
    return { PENDING:'bg-slate-400', IN_PROGRESS:'bg-blue-500', COMPLETED:'bg-green-500', REJECTED:'bg-red-500', UNDER_REVIEW:'bg-yellow-500' }[s] ?? 'bg-slate-300';
  }
  priorityChip(p: string): string {
    return { LOW:'bg-slate-100 text-slate-600', MEDIUM:'bg-blue-100 text-blue-700', HIGH:'bg-orange-100 text-orange-700', CRITICAL:'bg-red-100 text-red-700' }[p] ?? 'bg-slate-100 text-slate-600';
  }
}
