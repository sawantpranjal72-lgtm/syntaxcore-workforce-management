import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { UserDetail, Task, Attendance } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule,
    MatTabsModule, MatProgressSpinnerModule, MatChipsModule],
  template: `
<div class="p-4 sm:p-6 max-w-5xl mx-auto">
  @if (loading()) {
    <div class="flex justify-center py-20"><mat-spinner diameter="40"></mat-spinner></div>
  } @else if (employee()) {

    <!-- Header banner -->
    <div class="rounded-2xl border mb-6 overflow-hidden"
         style="border-color:var(--border-color,#e2e8f0)">
      <div class="h-24" style="background:linear-gradient(135deg,#0f1b3d,#1a2f6b,#0e4da4)"></div>
      <div class="px-4 sm:px-6 pb-5" style="background:var(--card-bg,#fff)">
        <div class="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
          <div class="w-20 h-20 rounded-2xl border-4 border-white dark:border-slate-900 flex items-center
                      justify-center text-white text-2xl font-bold flex-shrink-0"
               style="background:linear-gradient(135deg,#0e4da4,#1a2f6b)">
            {{employee()!.firstName[0]}}{{employee()!.lastName[0]}}
          </div>
          <div class="flex-1 min-w-0 pb-1">
            <h1 class="text-xl font-bold text-slate-900 dark:text-white">{{employee()!.fullName}}</h1>
            <p class="text-slate-400 text-sm">
              {{employee()!.jobTitle ?? 'No title'}}
              @if (employee()!.departmentName) { · {{employee()!.departmentName}} }
            </p>
          </div>
          <div class="flex flex-wrap gap-2 pb-1">
            <span class="px-3 py-1.5 rounded-full text-xs font-medium" [ngClass]="roleChip(employee()!.role)">
              {{employee()!.role?.replace('_',' ')}}
            </span>
            <span class="px-3 py-1.5 rounded-full text-xs font-medium"
                  [class]="employee()!.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'">
              {{employee()!.active ? 'Active' : 'Inactive'}}
            </span>
          </div>
          @if (canManage()) {
            <a [routerLink]="['/employees', employee()!.id, 'edit']" mat-stroked-button class="flex-shrink-0">
              <mat-icon>edit</mat-icon> Edit
            </a>
          }
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="rounded-2xl border p-4 text-center"
           style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
        <p class="text-2xl font-bold text-slate-900 dark:text-white">{{employee()!.totalTasksAssigned ?? 0}}</p>
        <p class="text-xs text-slate-400 mt-1">Tasks Assigned</p>
      </div>
      <div class="rounded-2xl border p-4 text-center"
           style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
        <p class="text-2xl font-bold text-green-600">{{employee()!.completedTasks ?? 0}}</p>
        <p class="text-xs text-slate-400 mt-1">Completed</p>
      </div>
      <div class="rounded-2xl border p-4 text-center"
           style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
        <p class="text-2xl font-bold text-amber-600">{{employee()!.pendingTasks ?? 0}}</p>
        <p class="text-xs text-slate-400 mt-1">Pending</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="rounded-2xl border overflow-hidden"
         style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
      <mat-tab-group animationDuration="200ms">

        <mat-tab label="Profile">
          <div class="p-5 grid sm:grid-cols-2 gap-6">
            <div>
              <h3 class="font-semibold text-slate-900 dark:text-white mb-4">Contact Info</h3>
              <dl class="space-y-3">
                @for (f of contactFields(); track f.label) {
                  <div class="flex items-start gap-3">
                    <mat-icon class="text-slate-400 text-base flex-shrink-0 mt-0.5">{{f.icon}}</mat-icon>
                    <div class="min-w-0">
                      <dt class="text-xs text-slate-400">{{f.label}}</dt>
                      <dd class="text-sm text-slate-700 dark:text-slate-300 break-all">{{f.value || '—'}}</dd>
                    </div>
                  </div>
                }
              </dl>
            </div>
            <div>
              <h3 class="font-semibold text-slate-900 dark:text-white mb-4">Work Details</h3>
              <dl class="space-y-3">
                @for (f of workFields(); track f.label) {
                  <div>
                    <dt class="text-xs text-slate-400">{{f.label}}</dt>
                    <dd class="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{{f.value || '—'}}</dd>
                  </div>
                }
              </dl>
              @if (employee()!.skills) {
                <div class="mt-4">
                  <p class="text-xs text-slate-400 mb-2">Skills</p>
                  <div class="flex flex-wrap gap-1.5">
                    @for (skill of skillList(); track skill) {
                      <span class="px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30">
                        {{skill}}
                      </span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Tasks">
          <div class="p-4 space-y-2">
            @for (task of tasks(); track task.id) {
              <a [routerLink]="['/tasks', task.id]"
                 class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <div class="w-2 h-2 rounded-full flex-shrink-0" [ngClass]="dot(task.status)"></div>
                <span class="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">{{task.title}}</span>
                <span class="text-xs px-2 py-0.5 rounded-full flex-shrink-0" [ngClass]="pChip(task.priority)">
                  {{task.priority}}
                </span>
              </a>
            }
            @if (!tasks().length) {
              <div class="text-center py-8 text-slate-400 text-sm">No tasks assigned</div>
            }
          </div>
        </mat-tab>

        <mat-tab label="Attendance">
          <div class="p-4 space-y-2">
            @for (att of attendance(); track att.id) {
              <div class="flex items-center gap-3 p-3 rounded-xl"
                   style="background:var(--hover-bg,rgba(0,0,0,0.03))">
                <div class="w-2 h-2 rounded-full flex-shrink-0" [ngClass]="attDot(att.status)"></div>
                <span class="text-sm text-slate-700 dark:text-slate-300 w-32 flex-shrink-0">{{fmtDate(att.date)}}</span>
                <span class="text-xs px-2 py-0.5 rounded-full flex-shrink-0" [ngClass]="attChip(att.status)">
                  {{att.status}}
                </span>
                @if (att.totalHours) {
                  <span class="text-xs text-slate-400 ml-auto">{{att.totalHours | number:'1.1-1'}}h</span>
                }
              </div>
            }
            @if (!attendance().length) {
              <div class="text-center py-8 text-slate-400 text-sm">No attendance records</div>
            }
          </div>
        </mat-tab>

        @if (canManage()) {
          <mat-tab label="Admin">
            <div class="p-5 space-y-4">
              <h3 class="font-semibold text-slate-900 dark:text-white">Admin Actions</h3>
              <div class="flex flex-wrap gap-3">
                <button mat-stroked-button (click)="toggleStatus()">
                  <mat-icon>{{employee()!.active ? 'block' : 'check_circle'}}</mat-icon>
                  {{employee()!.active ? 'Deactivate Account' : 'Activate Account'}}
                </button>
                <button mat-stroked-button color="warn" (click)="forceLogout()">
                  <mat-icon>logout</mat-icon> Force Logout
                </button>
              </div>
            </div>
          </mat-tab>
        }
      </mat-tab-group>
    </div>
  }
</div>
  `,
  styles: [`:host{display:block}`]
})
export class EmployeeDetailComponent implements OnInit {
  employee   = signal<UserDetail | null>(null);
  tasks      = signal<Task[]>([]);
  attendance = signal<Attendance[]>([]);
  loading    = signal(true);

  canManage  = () => this.authService.isManager();
  skillList  = () => this.employee()?.skills?.split(',').map(s => s.trim()).filter(Boolean) ?? [];

  contactFields = () => [
    { icon: 'mail',      label: 'Email',    value: this.employee()?.email },
    { icon: 'phone',     label: 'Phone',    value: this.employee()?.phone },
    { icon: 'badge',     label: 'Emp ID',   value: this.employee()?.employeeId },
    { icon: 'location_on',label:'Address',  value: this.employee()?.address },
    { icon: 'code',      label: 'GitHub',   value: this.employee()?.githubUrl },
    { icon: 'link',      label: 'LinkedIn', value: this.employee()?.linkedinUrl },
  ];

  workFields = () => [
    { label: 'Department',   value: this.employee()?.departmentName },
    { label: 'Job Title',    value: this.employee()?.jobTitle },
    { label: 'Date Joined',  value: this.employee()?.dateOfJoining },
    { label: 'Date of Birth',value: this.employee()?.dateOfBirth },
    { label: 'Last Login',   value: this.employee()?.lastLoginAt ? new Date(this.employee()!.lastLoginAt!).toLocaleDateString() : null },
  ];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    public authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.http.get<UserDetail>(`${environment.apiUrl}/users/${id}`).subscribe({
      next: u => { this.employee.set(u); this.loading.set(false); this.loadTasks(id); this.loadAttendance(id); },
      error: () => this.loading.set(false)
    });
  }

  loadTasks(userId: string): void {
    this.http.get<any>(`${environment.apiUrl}/tasks?assigneeId=${userId}&size=20`).subscribe({
      next: r => this.tasks.set(r.content ?? []), error: () => {}
    });
  }

  loadAttendance(userId: string): void {
    this.http.get<any>(`${environment.apiUrl}/attendance/user/${userId}?start=2024-01-01&end=2099-12-31`).subscribe({
      next: r => this.attendance.set(Array.isArray(r) ? r.slice(0, 20) : []), error: () => {}
    });
  }

  toggleStatus(): void {
    const u = this.employee();
    if (!u) return;
    this.http.patch(`${environment.apiUrl}/users/${u.id}/toggle-status`, {}).subscribe({
      next: () => { this.employee.update(e => e ? { ...e, active: !e.active } : e); this.snackBar.open('Status updated', '', { duration: 2000 }); }
    });
  }

  forceLogout(): void {
    const u = this.employee();
    if (!u) return;
    this.http.delete(`${environment.apiUrl}/admin/sessions/user/${u.id}`).subscribe({
      next: () => this.snackBar.open('Force logout done', '', { duration: 2000 })
    });
  }

  roleChip(r: string): string {
    const m: Record<string,string> = {SUPER_ADMIN:'bg-rose-100 text-rose-700',HR_ADMIN:'bg-purple-100 text-purple-700',PROJECT_MANAGER:'bg-blue-100 text-blue-700',TEAM_LEAD:'bg-indigo-100 text-indigo-700',EMPLOYEE:'bg-green-100 text-green-700',INTERN:'bg-amber-100 text-amber-700'};
    return m[r] ?? 'bg-slate-100 text-slate-600';
  }
  dot(s: string): string { const m: Record<string,string>={PENDING:'bg-slate-400',IN_PROGRESS:'bg-blue-500',COMPLETED:'bg-green-500',REJECTED:'bg-red-500'}; return m[s]??'bg-slate-300'; }
  pChip(p: string): string { const m: Record<string,string>={LOW:'bg-slate-100 text-slate-600',MEDIUM:'bg-blue-100 text-blue-700',HIGH:'bg-orange-100 text-orange-700',CRITICAL:'bg-red-100 text-red-700'}; return m[p]??'bg-slate-100 text-slate-600'; }
  attDot(s: string): string { return s==='PRESENT'?'bg-green-400':s==='ABSENT'?'bg-red-400':s==='LATE'?'bg-yellow-400':'bg-slate-300'; }
  attChip(s: string): string { const m: Record<string,string>={PRESENT:'bg-green-100 text-green-700',ABSENT:'bg-red-100 text-red-700',LATE:'bg-yellow-100 text-yellow-700',HALF_DAY:'bg-orange-100 text-orange-700'}; return m[s]??'bg-slate-100 text-slate-600'; }
  fmtDate(d: string): string { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
}
