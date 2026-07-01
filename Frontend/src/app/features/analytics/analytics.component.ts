import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HttpClient } from '@angular/common/http';
import { DashboardAnalytics } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatProgressBarModule],
  template: `
<div class="p-4 sm:p-6 max-w-7xl mx-auto">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
    <p class="text-slate-500 text-sm mt-0.5">System-wide performance metrics</p>
  </div>

  @if (loading()) {
    <div class="flex justify-center py-20"><mat-spinner diameter="40"></mat-spinner></div>
  } @else if (data()) {
    <!-- KPI row -->
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      @for (kpi of kpis(); track kpi.label) {
        <div class="rounded-2xl border p-4"
             style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center" [ngClass]="kpi.bg">
              <mat-icon class="text-base" [ngClass]="kpi.color">{{kpi.icon}}</mat-icon>
            </div>
          </div>
          <p class="text-2xl font-bold text-slate-900 dark:text-white">{{kpi.value}}</p>
          <p class="text-xs text-slate-400 mt-0.5">{{kpi.label}}</p>
        </div>
      }
    </div>

    <div class="grid lg:grid-cols-2 gap-6 mb-6">
      <!-- Task distribution -->
      <div class="rounded-2xl border p-5"
           style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
        <h3 class="font-semibold text-slate-900 dark:text-white mb-4">Task Distribution</h3>
        <div class="space-y-3">
          @for (item of data()!.taskStatusDistribution; track item.name) {
            <div>
              <div class="flex justify-between text-sm mb-1">
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full" [style.background]="item['color']"></div>
                  <span class="text-slate-600 dark:text-slate-300">{{item.name}}</span>
                </div>
                <span class="font-semibold text-slate-900 dark:text-white">{{item.value}}</span>
              </div>
              <mat-progress-bar mode="determinate"
                [value]="totalTasks() ? (item.value / totalTasks() * 100) : 0"
                class="rounded-full h-2">
              </mat-progress-bar>
            </div>
          }
        </div>
      </div>

      <!-- Weekly activity -->
      <div class="rounded-2xl border p-5"
           style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
        <h3 class="font-semibold text-slate-900 dark:text-white mb-4">Weekly Task Activity</h3>
        <div class="flex items-end gap-2 h-36">
          @for (day of data()!.weeklyTaskActivity; track day.date) {
            <div class="flex-1 flex flex-col items-center gap-1">
              <span class="text-xs text-slate-400">{{day.tasks}}</span>
              <div class="w-full rounded-t-md transition-all duration-500 min-h-1"
                   style="background:linear-gradient(180deg,#0e4da4,#1a2f6b)"
                   [style.height.%]="maxWeekly() ? (day.tasks / maxWeekly() * 100) : 0">
              </div>
              <span class="text-xs text-slate-400">{{day.day}}</span>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Project status + recent activity -->
    <div class="grid lg:grid-cols-2 gap-6">
      <div class="rounded-2xl border p-5"
           style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
        <h3 class="font-semibold text-slate-900 dark:text-white mb-4">Project Status</h3>
        <div class="space-y-3">
          @for (item of data()!.projectStatusDistribution; track item.name) {
            @if (item.value > 0) {
              <div class="flex items-center justify-between p-3 rounded-xl"
                   style="background:var(--hover-bg,rgba(0,0,0,0.03))">
                <span class="text-sm text-slate-600 dark:text-slate-300">{{item.name}}</span>
                <span class="text-sm font-bold text-slate-900 dark:text-white">{{item.value}}</span>
              </div>
            }
          }
        </div>
      </div>

      <div class="rounded-2xl border p-5"
           style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
        <h3 class="font-semibold text-slate-900 dark:text-white mb-4">Recent Activity</h3>
        <div class="space-y-3">
          @for (log of data()!.recentActivities?.slice(0,6); track log.id) {
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                   style="background:rgba(14,77,164,0.1)">
                <mat-icon class="text-sm text-blue-600">{{actIcon(log.action)}}</mat-icon>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                  <span class="font-medium">{{log.user?.firstName ?? 'System'}}</span>
                  — {{log.description ?? log.action}}
                </p>
                <p class="text-xs text-slate-400">{{timeAgo(log.createdAt)}}</p>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  }
</div>
  `,
  styles: [`:host{display:block}`]
})
export class AnalyticsComponent implements OnInit {
  data    = signal<DashboardAnalytics | null>(null);
  loading = signal(true);

  totalTasks  = () => this.data()?.totalTasks ?? 1;
  maxWeekly   = () => Math.max(...(this.data()?.weeklyTaskActivity?.map(d => d.tasks) ?? [1])) || 1;

  kpis = () => {
    const d = this.data();
    if (!d) return [];
    return [
      { label: 'Active Employees', value: d.activeEmployees,  icon: 'people',         color: 'text-blue-600',   bg: 'bg-blue-50' },
      { label: 'Active Projects',  value: d.activeProjects,   icon: 'folder_open',    color: 'text-violet-600', bg: 'bg-violet-50' },
      { label: 'Pending Tasks',    value: d.pendingTasks,     icon: 'pending_actions', color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: 'Overdue Tasks',    value: d.overdueTasks,     icon: 'warning_amber',  color: 'text-red-600',    bg: 'bg-red-50' },
      { label: "Today's Check-ins",value: d.todayCheckIns,    icon: 'login',          color: 'text-green-600',  bg: 'bg-green-50' },
    ];
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<DashboardAnalytics>(`${environment.apiUrl}/analytics/dashboard`).subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  actIcon(action: string): string {
    const m: Record<string,string> = {
      TASK_CREATED:'add_task', TASK_UPDATED:'edit', STATUS_CHANGED:'swap_horiz', TASK_COMPLETED:'check_circle'
    };
    return m[action] ?? 'info';
  }

  timeAgo(d?: string): string {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff/60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    return Math.floor(m/60) + 'h ago';
  }
}
