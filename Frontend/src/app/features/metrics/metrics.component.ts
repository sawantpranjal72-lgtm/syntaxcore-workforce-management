import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UserSummary, Attendance, Task } from '../../core/models';

interface EmployeeMetric {
  user: UserSummary;
  // Attendance
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalWorkingDays: number;
  attendanceRate: number;
  avgHoursPerDay: number;
  // Tasks
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
  inProgressTasks: number;
}

@Component({
  selector: 'app-metrics',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressBarModule,
    MatProgressSpinnerModule, MatTabsModule, MatTooltipModule, MatSelectModule,
    MatFormFieldModule, MatInputModule],
  template: `
<div class="p-4 sm:p-6 max-w-7xl mx-auto">

  <!-- Header -->
  <div class="flex items-start justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Team Metrics</h1>
      <p class="text-slate-500 text-sm mt-0.5">Attendance and task completion — individual view per employee</p>
    </div>
    <div class="flex items-center gap-2 text-xs text-slate-400">
      <mat-icon class="text-sm">info_outline</mat-icon>
      Last 30 days
    </div>
  </div>

  <!-- Filters -->
  <div class="flex flex-wrap gap-3 mb-5">
    <div class="flex items-center gap-2 px-4 py-2.5 rounded-xl border flex-1 min-w-52"
         style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
      <mat-icon class="text-slate-400 text-sm">search</mat-icon>
      <input [(ngModel)]="search" placeholder="Search employee..."
             class="flex-1 bg-transparent text-sm outline-none text-slate-700 dark:text-slate-300 placeholder-slate-400">
    </div>
    <select [(ngModel)]="sortBy" (ngModelChange)="sortMetrics()"
            class="px-4 py-2.5 rounded-xl border text-sm outline-none"
            style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0);color:var(--text-primary)">
      <option value="name">Sort: Name</option>
      <option value="attendance">Sort: Attendance %</option>
      <option value="completion">Sort: Task Completion %</option>
      <option value="tasks">Sort: Total Tasks</option>
    </select>
  </div>

  @if (loading()) {
    <div class="flex justify-center py-20"><mat-spinner diameter="40"></mat-spinner></div>
  } @else {
    <!-- Summary stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      @for (s of summaryStats(); track s.label) {
        <div class="rounded-2xl border p-4" style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center" [ngClass]="s.bg">
              <mat-icon class="text-sm" [ngClass]="s.color">{{s.icon}}</mat-icon>
            </div>
            <p class="text-xs text-slate-400 font-medium">{{s.label}}</p>
          </div>
          <p class="text-2xl font-bold text-slate-900 dark:text-white">{{s.value}}</p>
        </div>
      }
    </div>

    <!-- Tabs: Attendance / Tasks / Combined -->
    <mat-tab-group animationDuration="200ms">

      <!-- ── ATTENDANCE TAB ── -->
      <mat-tab label="Attendance">
        <div class="space-y-3 pt-4">
          @for (m of filteredMetrics(); track m.user.id) {
            <div class="rounded-2xl border p-5" style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
              <div class="flex items-start gap-4">
                <!-- Avatar -->
                <div class="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                     [style.background]="avatarBg(m.user.fullName)">
                  {{m.user.firstName[0]}}{{m.user.lastName[0]}}
                </div>
                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <p class="font-semibold text-slate-900 dark:text-white">{{m.user.fullName}}</p>
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="m.attendanceRate >= 90 ? 'bg-green-100 text-green-700' :
                                     m.attendanceRate >= 75 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'">
                      {{m.attendanceRate.toFixed(1)}}%
                    </span>
                    <span class="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {{m.user.role?.replace('_',' ')}}
                    </span>
                  </div>
                  <p class="text-xs text-slate-400 mb-3">{{m.user.departmentName ?? 'No Department'}} · {{m.user.jobTitle ?? '—'}}</p>
                  <!-- Progress bar -->
                  <mat-progress-bar mode="determinate" [value]="m.attendanceRate"
                                    [color]="m.attendanceRate >= 90 ? 'primary' : 'warn'" class="mb-3 rounded-full"></mat-progress-bar>
                  <!-- Stats grid -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div class="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <p class="text-lg font-bold text-green-700">{{m.presentDays}}</p>
                      <p class="text-xs text-green-600">Present</p>
                    </div>
                    <div class="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <p class="text-lg font-bold text-red-600">{{m.absentDays}}</p>
                      <p class="text-xs text-red-500">Absent</p>
                    </div>
                    <div class="text-center p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                      <p class="text-lg font-bold text-yellow-600">{{m.lateDays}}</p>
                      <p class="text-xs text-yellow-500">Late</p>
                    </div>
                    <div class="text-center p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                      <p class="text-lg font-bold text-indigo-600">{{m.avgHoursPerDay.toFixed(1)}}h</p>
                      <p class="text-xs text-indigo-500">Avg/Day</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </mat-tab>

      <!-- ── TASK COMPLETION TAB ── -->
      <mat-tab label="Task Completion">
        <div class="space-y-3 pt-4">
          @for (m of filteredMetrics(); track m.user.id) {
            <div class="rounded-2xl border p-5" style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
              <div class="flex items-start gap-4">
                <div class="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                     [style.background]="avatarBg(m.user.fullName)">
                  {{m.user.firstName[0]}}{{m.user.lastName[0]}}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <p class="font-semibold text-slate-900 dark:text-white">{{m.user.fullName}}</p>
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="m.completionRate >= 80 ? 'bg-green-100 text-green-700' :
                                     m.completionRate >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'">
                      {{m.completionRate.toFixed(1)}}% done
                    </span>
                    @if (m.overdueTasks > 0) {
                      <span class="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600">
                        {{m.overdueTasks}} overdue
                      </span>
                    }
                  </div>
                  <p class="text-xs text-slate-400 mb-3">{{m.totalTasks}} tasks assigned · {{m.user.departmentName ?? 'No dept'}}</p>
                  <mat-progress-bar mode="determinate" [value]="m.completionRate"
                                    [color]="m.completionRate >= 80 ? 'primary' : 'warn'" class="mb-3 rounded-full"></mat-progress-bar>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div class="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <p class="text-lg font-bold text-blue-700">{{m.inProgressTasks}}</p>
                      <p class="text-xs text-blue-500">In Progress</p>
                    </div>
                    <div class="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <p class="text-lg font-bold text-green-700">{{m.completedTasks}}</p>
                      <p class="text-xs text-green-500">Completed</p>
                    </div>
                    <div class="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                      <p class="text-lg font-bold text-amber-600">{{m.pendingTasks}}</p>
                      <p class="text-xs text-amber-500">Pending</p>
                    </div>
                    <div class="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <p class="text-lg font-bold text-red-600">{{m.overdueTasks}}</p>
                      <p class="text-xs text-red-500">Overdue</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </mat-tab>

      <!-- ── COMBINED TABLE TAB ── -->
      <mat-tab label="Overview Table">
        <div class="pt-4 overflow-x-auto rounded-2xl border" style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b" style="border-color:var(--border-color,#e2e8f0)">
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Employee</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Attendance</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Present</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Tasks</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Completed</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Completion%</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Overdue</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              @for (m of filteredMetrics(); track m.user.id) {
                <tr class="border-b hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    style="border-color:var(--border-color,#e2e8f0)">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                           [style.background]="avatarBg(m.user.fullName)">
                        {{m.user.firstName[0]}}{{m.user.lastName[0]}}
                      </div>
                      <div>
                        <p class="font-medium text-slate-900 dark:text-white">{{m.user.fullName}}</p>
                        <p class="text-xs text-slate-400">{{m.user.jobTitle ?? m.user.role?.replace('_',' ')}}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="font-semibold" [ngClass]="m.attendanceRate >= 90 ? 'text-green-600' : m.attendanceRate >= 75 ? 'text-yellow-600' : 'text-red-500'">
                      {{m.attendanceRate.toFixed(0)}}%
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center text-slate-600 dark:text-slate-300">{{m.presentDays}} / {{m.totalWorkingDays}}</td>
                  <td class="px-4 py-3 text-center text-slate-600 dark:text-slate-300">{{m.totalTasks}}</td>
                  <td class="px-4 py-3 text-center text-green-600 font-medium">{{m.completedTasks}}</td>
                  <td class="px-4 py-3 text-center">
                    <span class="font-semibold" [ngClass]="m.completionRate >= 80 ? 'text-green-600' : m.completionRate >= 50 ? 'text-yellow-600' : 'text-red-500'">
                      {{m.completionRate.toFixed(0)}}%
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    @if (m.overdueTasks > 0) {
                      <span class="text-red-500 font-semibold">{{m.overdueTasks}}</span>
                    } @else {
                      <span class="text-green-500">0</span>
                    }
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                          [ngClass]="overallStatus(m)">
                      {{overallStatusLabel(m)}}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          @if (!filteredMetrics().length) {
            <div class="text-center py-12 text-slate-400 text-sm">No employees found</div>
          }
        </div>
      </mat-tab>
    </mat-tab-group>
  }
</div>
  `,
  styles: [`:host{display:block}`]
})
export class MetricsComponent implements OnInit {
  loading = signal(true);
  metrics = signal<EmployeeMetric[]>([]);
  search  = '';
  sortBy  = 'name';

  filteredMetrics = computed(() => {
    const q = this.search.toLowerCase();
    return this.metrics().filter(m =>
      !q || m.user.fullName.toLowerCase().includes(q) ||
      m.user.email.toLowerCase().includes(q) ||
      (m.user.departmentName ?? '').toLowerCase().includes(q)
    );
  });

  summaryStats = computed(() => {
    const ms = this.metrics();
    if (!ms.length) return [];
    const avgAtt = ms.reduce((a, m) => a + m.attendanceRate, 0) / ms.length;
    const avgComp = ms.reduce((a, m) => a + m.completionRate, 0) / ms.length;
    const totalOverdue = ms.reduce((a, m) => a + m.overdueTasks, 0);
    return [
      { label:'Total Employees', value: ms.length, icon:'people', color:'text-blue-600', bg:'bg-blue-50' },
      { label:'Avg Attendance', value: avgAtt.toFixed(1)+'%', icon:'schedule', color:'text-green-600', bg:'bg-green-50' },
      { label:'Avg Task Completion', value: avgComp.toFixed(1)+'%', icon:'task_alt', color:'text-violet-600', bg:'bg-violet-50' },
      { label:'Total Overdue Tasks', value: totalOverdue, icon:'warning_amber', color:'text-red-500', bg:'bg-red-50' },
    ];
  });

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.loadMetrics(); }

  loadMetrics(): void {
    this.loading.set(true);
    // Load all users, then their attendance and tasks
    this.http.get<any>(`${environment.apiUrl}/users?size=200`).subscribe({
      next: res => {
        const users: UserSummary[] = res.content ?? [];
        const today = new Date();
        const from  = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const to    = today.toISOString().split('T')[0];

        // For each user build metrics from available data
        const metricsData: EmployeeMetric[] = users.map(u => this.buildMockMetric(u));
        this.metrics.set(metricsData);
        this.loading.set(false);

        // Try to enrich with real data
        this.enrichMetrics(users, from, to);
      },
      error: () => this.loading.set(false)
    });
  }

  buildMockMetric(user: UserSummary): EmployeeMetric {
    const workingDays = 22;
    return {
      user, presentDays: 0, absentDays: workingDays, lateDays: 0,
      totalWorkingDays: workingDays, attendanceRate: 0, avgHoursPerDay: 0,
      totalTasks: 0, completedTasks: 0, pendingTasks: 0, overdueTasks: 0,
      completionRate: 0, inProgressTasks: 0
    };
  }

  enrichMetrics(users: UserSummary[], from: string, to: string): void {
    users.forEach(user => {
      // Get attendance
      this.http.get<any>(`${environment.apiUrl}/attendance/user/${user.id}?start=${from}&end=${to}`).subscribe({
        next: (att: Attendance[]) => {
          const present = att.filter(a => a.status === 'PRESENT').length;
          const late    = att.filter(a => a.status === 'LATE').length;
          const absent  = att.filter(a => a.status === 'ABSENT').length;
          const avgH    = att.filter(a => a.totalHours).reduce((s, a) => s + (a.totalHours ?? 0), 0) / (present + late || 1);
          const rate    = ((present + late) / 22) * 100;
          this.metrics.update(ms => ms.map(m => m.user.id === user.id ? {
            ...m, presentDays: present, absentDays: absent, lateDays: late,
            attendanceRate: Math.min(rate, 100), avgHoursPerDay: avgH
          } : m));
        },
        error: () => {}
      });

      // Get tasks
      this.http.get<any>(`${environment.apiUrl}/tasks?assigneeId=${user.id}&size=200`).subscribe({
        next: (data: any) => {
          const tasks: Task[] = data.content ?? [];
          const completed    = tasks.filter(t => t.status === 'COMPLETED').length;
          const pending      = tasks.filter(t => t.status === 'PENDING').length;
          const inProgress   = tasks.filter(t => t.status === 'IN_PROGRESS').length;
          const now          = new Date();
          const overdue      = tasks.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== 'COMPLETED').length;
          const compRate     = tasks.length ? (completed / tasks.length) * 100 : 0;
          this.metrics.update(ms => ms.map(m => m.user.id === user.id ? {
            ...m, totalTasks: tasks.length, completedTasks: completed, pendingTasks: pending,
            inProgressTasks: inProgress, overdueTasks: overdue, completionRate: compRate
          } : m));
        },
        error: () => {}
      });
    });
  }

  sortMetrics(): void {
    this.metrics.update(ms => [...ms].sort((a, b) => {
      switch(this.sortBy) {
        case 'attendance': return b.attendanceRate - a.attendanceRate;
        case 'completion': return b.completionRate - a.completionRate;
        case 'tasks':      return b.totalTasks - a.totalTasks;
        default:           return a.user.fullName.localeCompare(b.user.fullName);
      }
    }));
  }

  avatarBg(name: string): string {
    const colors = ['#3b82f6','#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#14b8a6'];
    return colors[name.charCodeAt(0) % colors.length];
  }

  overallStatus(m: EmployeeMetric): string {
    if (m.attendanceRate >= 90 && m.completionRate >= 80) return 'bg-green-100 text-green-700';
    if (m.attendanceRate >= 75 && m.completionRate >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-600';
  }

  overallStatusLabel(m: EmployeeMetric): string {
    if (m.attendanceRate >= 90 && m.completionRate >= 80) return 'Excellent';
    if (m.attendanceRate >= 75 && m.completionRate >= 50) return 'Average';
    return 'Needs Attention';
  }
}
