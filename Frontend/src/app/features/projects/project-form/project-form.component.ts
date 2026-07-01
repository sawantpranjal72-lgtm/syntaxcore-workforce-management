import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClient } from '@angular/common/http';
import { ProjectService } from '../../../core/services/project.service';
import { UserSummary, ROLE_LABELS } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink,
    MatIconModule, MatButtonModule, MatProgressSpinnerModule,
    MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule],
  template: `
<div class="p-4 sm:p-6 max-w-3xl mx-auto">
  <div class="flex items-center gap-3 mb-6">
    <a routerLink="/projects" mat-icon-button
       class="w-9 h-9 rounded-xl flex items-center justify-center border hover:bg-slate-50 transition-colors"
       style="border-color:var(--border-color,#e2e8f0)">
      <mat-icon style="font-size:20px;color:var(--text-muted)">arrow_back</mat-icon>
    </a>
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">{{isEdit() ? 'Edit' : 'New'}} Project</h1>
      <p class="text-slate-500 text-sm">{{isEdit() ? 'Update project details' : 'Create a new project and assign your team'}}</p>
    </div>
  </div>

  <form [formGroup]="form" (ngSubmit)="submit()">
    <!-- Section: Basic Info -->
    <div class="rounded-2xl border p-5 mb-4"
         style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
      <h3 class="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <mat-icon class="text-blue-500">info</mat-icon> Basic Information
      </h3>
      <div class="space-y-4">
        <!-- Name -->
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Project Name <span class="text-red-500">*</span>
          </label>
          <input formControlName="name" placeholder="e.g. SyntaxCore Portal v3.0"
                 class="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                 style="border-color:var(--border-color,#e2e8f0);background:var(--page-bg,#f8fafc);color:var(--text-primary)">
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            <p class="text-xs text-red-500 mt-1">Project name is required</p>
          }
        </div>

        <div class="grid sm:grid-cols-3 gap-4">
          <!-- Code -->
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Project Code</label>
            <input formControlName="code" placeholder="e.g. SCP-001"
                   class="w-full px-4 py-3 rounded-xl border text-sm outline-none font-mono"
                   style="border-color:var(--border-color,#e2e8f0);background:var(--page-bg,#f8fafc);color:var(--text-primary)">
          </div>
          <!-- Priority -->
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Priority</label>
            <select formControlName="priority"
                    class="w-full px-4 py-3 rounded-xl border text-sm outline-none appearance-none"
                    style="border-color:var(--border-color,#e2e8f0);background:var(--page-bg,#f8fafc);color:var(--text-primary)">
              <option value="LOW">🟢 Low</option>
              <option value="MEDIUM">🔵 Medium</option>
              <option value="HIGH">🟠 High</option>
              <option value="CRITICAL">🔴 Critical</option>
            </select>
          </div>
          <!-- Status -->
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
            <select formControlName="status"
                    class="w-full px-4 py-3 rounded-xl border text-sm outline-none appearance-none"
                    style="border-color:var(--border-color,#e2e8f0);background:var(--page-bg,#f8fafc);color:var(--text-primary)">
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
          <textarea formControlName="description" rows="3"
                    placeholder="Describe the project goals, scope and deliverables..."
                    class="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
                    style="border-color:var(--border-color,#e2e8f0);background:var(--page-bg,#f8fafc);color:var(--text-primary)"></textarea>
        </div>

        <!-- Dates & Budget -->
        <div class="grid sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Start Date</label>
            <mat-form-field appearance="outline" class="compact-date-field">
              <input matInput [matDatepicker]="projectStartPicker" formControlName="startDate" readonly>
              <mat-datepicker-toggle matIconSuffix [for]="projectStartPicker"></mat-datepicker-toggle>
              <mat-datepicker #projectStartPicker></mat-datepicker>
            </mat-form-field>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">End Date</label>
            <mat-form-field appearance="outline" class="compact-date-field">
              <input matInput [matDatepicker]="projectEndPicker" formControlName="endDate" [min]="form.get('startDate')?.value" readonly>
              <mat-datepicker-toggle matIconSuffix [for]="projectEndPicker"></mat-datepicker-toggle>
              <mat-datepicker #projectEndPicker></mat-datepicker>
            </mat-form-field>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Budget (₹)</label>
            <input formControlName="budget" type="number" placeholder="0"
                   class="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                   style="border-color:var(--border-color,#e2e8f0);background:var(--page-bg,#f8fafc);color:var(--text-primary)">
          </div>
        </div>
      </div>
    </div>

    <!-- Section: Tech -->
    <div class="rounded-2xl border p-5 mb-4"
         style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
      <h3 class="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <mat-icon class="text-violet-500">code</mat-icon> Technical Details
      </h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tech Stack</label>
          <input formControlName="techStack" placeholder="e.g. Angular 18, Spring Boot 3, PostgreSQL, Docker"
                 class="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                 style="border-color:var(--border-color,#e2e8f0);background:var(--page-bg,#f8fafc);color:var(--text-primary)">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Repository URL</label>
          <input formControlName="repositoryUrl" placeholder="https://github.com/org/repo"
                 class="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                 style="border-color:var(--border-color,#e2e8f0);background:var(--page-bg,#f8fafc);color:var(--text-primary)">
        </div>
      </div>
    </div>

    <!-- Section: Team -->
    <div class="rounded-2xl border p-5 mb-4"
         style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
      <h3 class="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <mat-icon class="text-green-500">group</mat-icon> Team Assignment
      </h3>

      @if (loadingUsers()) {
        <div class="flex justify-center py-4"><mat-spinner diameter="28"></mat-spinner></div>
      } @else {
        <!-- Manager -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Project Manager</label>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <div (click)="form.patchValue({managerId: ''})"
                 class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all"
                 [class]="!form.get('managerId')?.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'"
                 style="border-color:var(--border-color,#e2e8f0)">
              <mat-icon class="text-slate-400 text-sm">person_off</mat-icon>
              <span class="text-xs text-slate-500">No manager</span>
            </div>
            @for (u of managers(); track u.id) {
              <div (click)="form.patchValue({managerId: u.id})"
                   class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all"
                   [class]="form.get('managerId')?.value === u.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'"
                   style="border-color:var(--border-color,#e2e8f0)">
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                     [style.background]="avatarBg(u.fullName)">
                  {{u.firstName[0]}}{{u.lastName[0]}}
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-medium truncate" style="color:var(--text-primary)">{{u.fullName}}</p>
                  <p class="text-xs truncate" style="color:var(--text-muted)">{{roleLabel(u.role)}}</p>
                </div>
                @if (form.get('managerId')?.value === u.id) {
                  <mat-icon class="text-blue-500 text-sm ml-auto flex-shrink-0">check_circle</mat-icon>
                }
              </div>
            }
          </div>
        </div>

        <!-- Team Members -->
        <div>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Team Members
            <span class="text-slate-400 font-normal ml-1">({{selectedMembers().length}} selected)</span>
          </label>
          <!-- Search members -->
          <div class="flex items-center gap-2 px-3 py-2 rounded-xl border mb-3"
               style="border-color:var(--border-color,#e2e8f0);background:var(--page-bg,#f8fafc)">
            <mat-icon class="text-slate-400 text-sm">search</mat-icon>
            <input [(ngModel)]="memberSearch" [ngModelOptions]="{standalone:true}"
                   placeholder="Search members..."
                   class="flex-1 text-sm bg-transparent outline-none" style="color:var(--text-primary)">
          </div>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            @for (u of filteredAllUsers(); track u.id) {
              <div (click)="toggleMember(u.id)"
                   class="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all"
                   [class]="isMemberSelected(u.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'"
                   style="border-color:var(--border-color,#e2e8f0)">
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                     [style.background]="avatarBg(u.fullName)">
                  {{u.firstName[0]}}{{u.lastName[0]}}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium truncate" style="color:var(--text-primary)">{{u.fullName}}</p>
                  <p class="text-xs truncate" style="color:var(--text-muted)">{{userSubtitle(u)}}</p>
                </div>
                @if (isMemberSelected(u.id)) {
                  <mat-icon class="text-blue-500 text-sm flex-shrink-0">check_circle</mat-icon>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>

    <!-- Error -->
    @if (error()) {
      <div class="flex items-center gap-2 px-4 py-3 rounded-xl mb-4"
           style="background:#fef2f2;border:1px solid #fecaca">
        <mat-icon class="text-red-500 text-base">error_outline</mat-icon>
        <span class="text-sm text-red-600">{{error()}}</span>
      </div>
    }

    <!-- Actions -->
    <div class="flex gap-3">
      <button type="submit" [disabled]="form.invalid || saving()"
              class="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50"
              style="background:linear-gradient(135deg,#3b82f6,#2563eb)">
        @if (saving()) { <mat-spinner diameter="18"></mat-spinner> }
        @else { <mat-icon class="text-base">{{isEdit() ? 'save' : 'add_circle'}}</mat-icon> }
        {{isEdit() ? 'Save Changes' : 'Create Project'}}
      </button>
      <a routerLink="/projects"
         class="px-6 py-3 rounded-xl text-sm font-medium border transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
         style="border-color:var(--border-color,#e2e8f0);color:var(--text-muted)">
        Cancel
      </a>
    </div>
  </form>
</div>
  `,
  styles: [`:host{display:block}.compact-date-field{width:100%}`]
})
export class ProjectFormComponent implements OnInit {
  form: FormGroup;
  saving      = signal(false);
  error       = signal('');
  isEdit      = signal(false);
  loadingUsers= signal(false);
  managers    = signal<UserSummary[]>([]);
  allUsers    = signal<UserSummary[]>([]);
  memberSearch = '';

  selectedMembers = signal<string[]>([]);

  filteredAllUsers = () => {
    const q = this.memberSearch.toLowerCase();
    return this.allUsers().filter(u =>
      !q || u.fullName.toLowerCase().includes(q) ||
      (u.jobTitle ?? '').toLowerCase().includes(q) ||
      (u.role ?? '').toLowerCase().includes(q)
    );
  };

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      name:          ['', [Validators.required, Validators.maxLength(200)]],
      code:          [''],
      description:   [''],
      priority:      ['MEDIUM'],
      status:        ['PLANNING'],
      managerId:     [''],
      memberIds:     [[]],
      startDate:     [''],
      endDate:       [''],
      techStack:     [''],
      repositoryUrl: [''],
      budget:        [null],
    });
  }

  ngOnInit(): void {
    this.loadingUsers.set(true);
    this.http.get<any>(`${environment.apiUrl}/users?size=200&active=true`).subscribe({
      next: r => {
        const all: UserSummary[] = r.content ?? [];
        const visibleUsers = all.filter(u => u.role !== 'SUPER_ADMIN');
        this.managers.set(visibleUsers.filter(u => ['ADMINISTRATOR','PROJECT_MANAGER'].includes(u.role)));
        this.allUsers.set(visibleUsers.sort((a,b) => a.fullName.localeCompare(b.fullName)));
        this.loadingUsers.set(false);
      },
      error: () => this.loadingUsers.set(false)
    });
  }

  toggleMember(id: string): void {
    this.selectedMembers.update(ids => {
      const updated = ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id];
      this.form.patchValue({ memberIds: updated });
      return updated;
    });
  }

  isMemberSelected(id: string): boolean { return this.selectedMembers().includes(id); }

  avatarBg(name: string): string {
    const colors = ['#3b82f6','#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#14b8a6'];
    return colors[(name?.charCodeAt(0) ?? 0) % colors.length];
  }

  roleLabel(role?: string): string {
    return role ? (ROLE_LABELS[role] ?? role.replace(/_/g, ' ')) : '';
  }

  userSubtitle(user: UserSummary): string {
    return user.jobTitle ?? this.roleLabel(user.role);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.error.set('');
    const val = {
      ...this.form.value,
      startDate: this.formatDateValue(this.form.value.startDate),
      endDate: this.formatDateValue(this.form.value.endDate),
      memberIds: this.selectedMembers()
    };
    if (!val.managerId) delete val.managerId;

    this.projectService.createProject(val).subscribe({
      next: (p: any) => {
        this.snackBar.open('Project created successfully!', '', { duration: 3000 });
        this.router.navigate(['/projects', p.id]);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Failed to create project. Please try again.');
        this.saving.set(false);
      }
    });
  }

  private formatDateValue(value: Date | string | null | undefined): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
