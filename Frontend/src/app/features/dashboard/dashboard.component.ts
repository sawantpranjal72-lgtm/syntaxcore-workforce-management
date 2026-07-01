import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { Task, Project, Notification, ROLE_LABELS } from '../../core/models';
import { environment } from '../../../environments/environment';

interface StatCard { label: string; value: number | string; icon: string; color: string; bg: string; route?: string; change?: string; positive?: boolean; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatProgressBarModule, MatProgressSpinnerModule],
  template: `
<div class="p-4 sm:p-6 max-w-7xl mx-auto">

  <!-- Welcome banner -->
  <div class="rounded-2xl mb-6 overflow-hidden relative"
       style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 50%,#6366f1 100%)">
    <div class="absolute inset-0 opacity-10"
         style="background-image:radial-gradient(#fff 1px,transparent 1px);background-size:24px 24px"></div>
    <div class="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span class="text-blue-200 text-xs font-medium">{{greeting()}}</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold text-white mb-1">{{user()?.fullName}} 👋</h1>
        <p class="text-blue-200 text-sm">
          {{roleLabel()}} ·
          @if (user()?.departmentName) { {{user()?.departmentName}} · }
          {{today()}}
        </p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <a routerLink="/tasks/new"
           class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white border border-white/20 hover:bg-white/10 transition-colors">
          <mat-icon class="text-base">add_task</mat-icon> New Task
        </a>
        <a routerLink="/projects/new"
           class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-blue-900 hover:opacity-90 transition-opacity"
           style="background:#fff">
          <mat-icon class="text-base">add</mat-icon> New Project
        </a>
      </div>
    </div>
  </div>

  <!-- Stats grid -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    @for (s of stats(); track s.label) {
      <a [routerLink]="s.route ?? null"
         class="rounded-2xl border p-5 block hover:shadow-md transition-all group"
         style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
        <div class="flex items-start justify-between mb-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center" [ngClass]="s.bg">
            <mat-icon [ngClass]="s.color">{{s.icon}}</mat-icon>
          </div>
          @if (s.change) {
            <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                  [ngClass]="s.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'">
              {{s.change}}
            </span>
          }
        </div>
        <p class="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{{s.value}}</p>
        <p class="text-xs text-slate-400 mt-0.5">{{s.label}}</p>
      </a>
    }
  </div>

  <div class="grid lg:grid-cols-3 gap-6">

    <!-- My Tasks -->
    <div class="lg:col-span-2 rounded-2xl border overflow-hidden"
         style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
      <div class="flex items-center justify-between px-5 py-4 border-b"
           style="border-color:var(--border-color,#e2e8f0)">
        <div class="flex items-center gap-2">
          <mat-icon class="text-blue-500 text-base">task_alt</mat-icon>
          <h2 class="font-semibold text-slate-900 dark:text-white">My Tasks</h2>
          @if (myTasks().length) {
            <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">{{myTasks().length}}</span>
          }
        </div>
        <a routerLink="/tasks/my-tasks" class="text-xs font-medium" style="color:#3b82f6">View All →</a>
      </div>
      @if (loadingTasks()) {
        <div class="flex justify-center py-8"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (myTasks().length === 0) {
        <div class="flex flex-col items-center py-10 text-center">
          <mat-icon class="text-4xl text-slate-200 mb-2">task_alt</mat-icon>
          <p class="text-slate-400 text-sm">No tasks assigned — great work!</p>
          <a routerLink="/tasks/new" class="mt-3 text-xs text-blue-500 hover:underline">Create a task →</a>
        </div>
      } @else {
        <div class="divide-y" style="border-color:var(--border-color,#e2e8f0)">
          @for (task of myTasks().slice(0,8); track task.id) {
            <a [routerLink]="['/tasks', task.id]"
               class="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
              <div class="w-2 h-2 rounded-full flex-shrink-0" [ngClass]="statusDot(task.status)"></div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium group-hover:text-blue-600 transition-colors truncate"
                   style="color:var(--text-primary)">{{task.title}}</p>
                <div class="flex items-center gap-2 mt-0.5">
                  @if (task.projectName) {
                    <span class="text-xs text-slate-400 truncate">{{task.projectName}}</span>
                    <span class="text-slate-300 text-xs">·</span>
                  }
                  @if (task.deadline) {
                    <span class="text-xs" [class]="isOverdue(task) ? 'text-red-500 font-medium' : 'text-slate-400'">
                      {{isOverdue(task) ? '⚠ ' : ''}}{{formatDate(task.deadline)}}
                    </span>
                  }
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <span class="text-xs px-2 py-0.5 rounded-full hidden sm:inline" [ngClass]="priorityBadge(task.priority)">{{task.priority}}</span>
                <span class="text-xs px-2 py-0.5 rounded-full" [ngClass]="statusBadge(task.status)">
                  {{task.status.replace('_',' ')}}
                </span>
              </div>
            </a>
          }
        </div>
      }
    </div>

    <!-- Right column -->
    <div class="space-y-5">

      <!-- Active Projects -->
      <div class="rounded-2xl border overflow-hidden"
           style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
        <div class="flex items-center justify-between px-5 py-4 border-b"
             style="border-color:var(--border-color,#e2e8f0)">
          <div class="flex items-center gap-2">
            <mat-icon class="text-violet-500 text-base">folder_open</mat-icon>
            <h2 class="font-semibold text-slate-900 dark:text-white">Active Projects</h2>
          </div>
          <a routerLink="/projects" class="text-xs font-medium" style="color:#3b82f6">View All →</a>
        </div>
        @if (activeProjects().length === 0) {
          <div class="text-center py-8 text-slate-400 text-sm">No active projects</div>
        } @else {
          <div class="p-3 space-y-2">
            @for (p of activeProjects().slice(0,4); track p.id) {
              <a [routerLink]="['/projects', p.id]"
                 class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                     [style.background]="p.avatarColor ?? '#3b82f6'">{{p.name[0]}}</div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate group-hover:text-blue-600 transition-colors"
                     style="color:var(--text-primary)">{{p.name}}</p>
                  <mat-progress-bar mode="determinate" [value]="p.completionPercentage ?? 0"
                                    class="mt-1 rounded-full" style="height:4px"></mat-progress-bar>
                </div>
                <span class="text-xs text-slate-400 flex-shrink-0">{{(p.completionPercentage ?? 0).toFixed(0)}}%</span>
              </a>
            }
          </div>
        }
      </div>

      <!-- Recent Notifications -->
      <div class="rounded-2xl border overflow-hidden"
           style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
        <div class="flex items-center justify-between px-5 py-4 border-b"
             style="border-color:var(--border-color,#e2e8f0)">
          <div class="flex items-center gap-2">
            <mat-icon class="text-amber-500 text-base">notifications_none</mat-icon>
            <h2 class="font-semibold text-slate-900 dark:text-white">Notifications</h2>
          </div>
          <a routerLink="/notifications" class="text-xs font-medium" style="color:#3b82f6">View All →</a>
        </div>
        @if (notifications().length === 0) {
          <div class="text-center py-8 text-slate-400 text-sm">All caught up!</div>
        } @else {
          <div class="divide-y" style="border-color:var(--border-color,#e2e8f0)">
            @for (n of notifications().slice(0,5); track n.id) {
              <div class="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                   [class]="!n.read ? 'border-l-2 border-blue-500' : ''">
                <div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                     style="background:#eff6ff">
                  <mat-icon class="text-blue-500 text-sm">{{notifIcon(n.type)}}</mat-icon>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium truncate" style="color:var(--text-primary)">{{n.title}}</p>
                  <p class="text-xs text-slate-400 mt-0.5">{{n.createdAt | date:'shortTime'}}</p>
                </div>
                @if (!n.read) { <div class="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5"></div> }
              </div>
            }
          </div>
        }
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`:host{display:block}`]
})
export class DashboardComponent implements OnInit {
  myTasks       = signal<Task[]>([]);
  activeProjects= signal<Project[]>([]);
  notifications = signal<Notification[]>([]);
  loadingTasks  = signal(true);

  user      = computed(() => this.authService.currentUser());
  roleLabel = computed(() => ROLE_LABELS[this.user()?.role ?? ''] ?? this.user()?.role ?? '');

  stats = signal<StatCard[]>([]);

  greeting(): string {
    // Use IST timezone for greeting
    const h = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }
  today(): string {
    return new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  }

  constructor(private http: HttpClient, public authService: AuthService) {}

  ngOnInit(): void {
    this.loadMyTasks();
    this.loadProjects();
    this.loadNotifications();
    this.loadStats();
  }

  loadMyTasks(): void {
    this.loadingTasks.set(true);
    this.http.get<any>(`${environment.apiUrl}/tasks/my-tasks`).subscribe({
      next: r => { this.myTasks.set(Array.isArray(r) ? r : (r.content ?? [])); this.loadingTasks.set(false); },
      error: () => this.loadingTasks.set(false)
    });
  }

  loadProjects(): void {
    this.http.get<any>(`${environment.apiUrl}/projects?status=ACTIVE&size=10`).subscribe({
      next: r => this.activeProjects.set(r.content ?? []),
      error: () => {}
    });
  }

  loadNotifications(): void {
    this.http.get<any>(`${environment.apiUrl}/notifications?size=10`).subscribe({
      next: r => this.notifications.set(r.content ?? []),
      error: () => {}
    });
  }

  loadStats(): void {
    this.http.get<any>(`${environment.apiUrl}/dashboard/analytics`).subscribe({
      next: (a: any) => this.stats.set([
        { label:'My Tasks',        value: a.pendingTasks    ?? this.myTasks().filter(t => t.status !== 'COMPLETED').length, icon:'task_alt',     color:'text-blue-600',   bg:'bg-blue-50',   route:'/tasks/my-tasks' },
        { label:'Projects',        value: a.totalProjects   ?? 0, icon:'folder_open',  color:'text-violet-600', bg:'bg-violet-50', route:'/projects' },
        { label:'Team Members',    value: a.totalEmployees  ?? 0, icon:'group',        color:'text-green-600',  bg:'bg-green-50',  route:'/employees' },
        { label:'Overdue Tasks',   value: a.overdueTasks    ?? 0, icon:'warning_amber',color:'text-red-500',    bg:'bg-red-50',    route:'/tasks' },
      ]),
      error: () => this.stats.set([
        { label:'My Tasks',        value: this.myTasks().length, icon:'task_alt',     color:'text-blue-600',   bg:'bg-blue-50',   route:'/tasks/my-tasks' },
        { label:'Projects',        value: this.activeProjects().length, icon:'folder_open', color:'text-violet-600', bg:'bg-violet-50', route:'/projects' },
        { label:'Notifications',   value: this.notifications().filter(n => !n.read).length, icon:'notifications_none',color:'text-amber-600', bg:'bg-amber-50', route:'/notifications' },
        { label:'Pending Actions', value: 0, icon:'pending_actions', color:'text-red-500', bg:'bg-red-50', route:'/tasks' },
      ])
    });
  }

  isOverdue(t: Task): boolean { return !!t.deadline && new Date(t.deadline) < new Date() && t.status !== 'COMPLETED'; }
  formatDate(d?: string): string { return d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : ''; }

  statusDot(s: string): string {
    return { PENDING:'bg-amber-400', IN_PROGRESS:'bg-blue-500', COMPLETED:'bg-green-500', REJECTED:'bg-red-500', UNDER_REVIEW:'bg-yellow-400', CANCELLED:'bg-slate-400' }[s] ?? 'bg-slate-300';
  }
  statusBadge(s: string): string {
    return { PENDING:'bg-amber-100 text-amber-700', IN_PROGRESS:'bg-blue-100 text-blue-700', COMPLETED:'bg-green-100 text-green-700', UNDER_REVIEW:'bg-yellow-100 text-yellow-700', REJECTED:'bg-red-100 text-red-600', CANCELLED:'bg-slate-100 text-slate-500' }[s] ?? 'bg-slate-100 text-slate-600';
  }
  priorityBadge(p: string): string {
    return { LOW:'bg-slate-100 text-slate-600', MEDIUM:'bg-blue-100 text-blue-700', HIGH:'bg-orange-100 text-orange-700', CRITICAL:'bg-red-100 text-red-600', URGENT:'bg-rose-100 text-rose-600' }[p] ?? 'bg-slate-100 text-slate-600';
  }
  notifIcon(type: string): string {
    if (!type) return 'notifications';
    if (type.includes('TASK'))    return 'task_alt';
    if (type.includes('LEAVE'))   return 'event_busy';
    if (type.includes('PROJECT')) return 'folder_open';
    if (type.includes('MESSAGE')) return 'chat_bubble_outline';
    return 'notifications';
  }
}
