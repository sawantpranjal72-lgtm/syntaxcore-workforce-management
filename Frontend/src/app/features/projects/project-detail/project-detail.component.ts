import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { ProjectService } from '../../../core/services/project.service';
import { TaskService } from '../../../core/services/task.service';
import { AuthService } from '../../../core/services/auth.service';
import { Project, Task, UserSummary, ROLE_LABELS } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule, MatButtonModule,
    MatTabsModule, MatProgressBarModule, MatProgressSpinnerModule],
  template: `
<div class="p-4 sm:p-6 max-w-7xl mx-auto">
  @if (loading()) {
    <div class="flex justify-center py-20"><mat-spinner diameter="40"></mat-spinner></div>
  } @else if (project()) {

    <!-- Header -->
    <div class="flex items-start gap-4 mb-6">
      <a routerLink="/projects" class="w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5
                                       hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
         style="border-color:var(--border-color,#e2e8f0)">
        <mat-icon style="font-size:20px;color:var(--text-muted)">arrow_back</mat-icon>
      </a>
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
             [style.background]="project()!.avatarColor ?? '#3b82f6'">
          {{project()!.name[0]}}
        </div>
        <div class="flex-1 min-w-0">
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">{{project()!.name}}</h1>
          <div class="flex flex-wrap items-center gap-2 mt-1">
            <span class="text-xs px-2.5 py-0.5 rounded-full font-medium" [ngClass]="statusChip(project()!.status)">
              {{project()!.status.replace('_',' ')}}
            </span>
            <span class="text-xs px-2.5 py-0.5 rounded-full font-medium" [ngClass]="priorityChip(project()!.priority)">
              {{project()!.priority}}
            </span>
            @if (project()!.code) {
              <span class="text-xs font-mono text-slate-400">{{project()!.code}}</span>
            }
          </div>
        </div>
      </div>
      <div class="flex gap-2 flex-shrink-0">
        @if (canManage()) {
          <button (click)="showNewTask.set(true)"
                  class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all"
                  style="background:linear-gradient(135deg,#3b82f6,#2563eb)">
            <mat-icon class="text-base">add</mat-icon> New Task
          </button>
          <a [routerLink]="['/projects/edit', project()!.id]"
             class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
             style="border-color:var(--border-color,#e2e8f0);color:var(--text-primary)">
            <mat-icon class="text-base">edit</mat-icon> Edit
          </a>
        }
      </div>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      @for (stat of stats(); track stat.label) {
        <div class="rounded-2xl border p-4" style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
          <div class="flex items-center gap-2 mb-2">
            <mat-icon class="text-sm" [ngClass]="stat.color">{{stat.icon}}</mat-icon>
            <p class="text-xs text-slate-400 font-medium">{{stat.label}}</p>
          </div>
          <p class="text-2xl font-bold text-slate-900 dark:text-white">{{stat.value}}</p>
        </div>
      }
    </div>

    <!-- Progress -->
    <div class="rounded-2xl border p-5 mb-6" style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
      <div class="flex justify-between items-center mb-2">
        <span class="font-semibold text-slate-900 dark:text-white text-sm">Project Progress</span>
        <span class="text-lg font-bold" style="color:#3b82f6">{{(project()!.completionPercentage ?? 0).toFixed(1)}}%</span>
      </div>
      <mat-progress-bar mode="determinate" [value]="project()!.completionPercentage ?? 0"
                        class="rounded-full" style="height:10px"></mat-progress-bar>
      <div class="flex justify-between text-xs text-slate-400 mt-2">
        <span>{{project()!.completedTasks ?? 0}} completed</span>
        @if (project()!.endDate) { <span>Deadline: {{formatDate(project()!.endDate)}}</span> }
        <span>{{project()!.totalTasks ?? 0}} total</span>
      </div>
    </div>

    <!-- New Task inline form -->
    @if (showNewTask()) {
      <div class="rounded-2xl border p-5 mb-4" style="background:#f0fdf4;border-color:#86efac">
        <h3 class="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <mat-icon class="text-green-500">add_task</mat-icon> Create Task for this Project
        </h3>
        <div class="space-y-3">
          <input [(ngModel)]="newTaskTitle" placeholder="Task title *"
                 class="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                 style="border-color:#86efac;background:#fff">
          <textarea [(ngModel)]="newTaskDesc" placeholder="Description (optional)" rows="2"
                    class="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
                    style="border-color:#86efac;background:#fff"></textarea>
          <div class="grid sm:grid-cols-3 gap-3">
            <select [(ngModel)]="newTaskPriority"
                    class="px-4 py-3 rounded-xl border text-sm outline-none"
                    style="border-color:#86efac;background:#fff">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <input [(ngModel)]="newTaskDeadline" type="datetime-local"
                   class="px-4 py-3 rounded-xl border text-sm outline-none"
                   style="border-color:#86efac;background:#fff">
            <select [(ngModel)]="newTaskAssignee"
                    class="px-4 py-3 rounded-xl border text-sm outline-none"
                    style="border-color:#86efac;background:#fff">
              <option value="">Unassigned</option>
              @for (m of project()!.members; track m.id) {
                <option [value]="m.id">{{m.fullName}}</option>
              }
            </select>
          </div>
          <div class="flex gap-2">
            <button (click)="createTask()" [disabled]="!newTaskTitle.trim() || creatingTask()"
                    class="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
                    style="background:#22c55e">
              @if (creatingTask()) { <mat-spinner diameter="16"></mat-spinner> } @else { <mat-icon class="text-base">add</mat-icon> }
              Create Task
            </button>
            <button (click)="showNewTask.set(false)"
                    class="px-5 py-2.5 rounded-xl text-sm font-medium border"
                    style="border-color:#86efac;color:#16a34a">
              Cancel
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Tabs: Tasks / Members / Details -->
    <div class="rounded-2xl border overflow-hidden" style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
      <mat-tab-group animationDuration="200ms">

        <!-- ── TASKS TAB ── -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="mr-1.5 text-base">task_alt</mat-icon>
            Tasks ({{tasks().length}})
          </ng-template>
          <div class="p-4">
            <!-- Filter bar -->
            <div class="flex flex-wrap gap-2 mb-4">
              @for (s of taskStatuses; track s.value) {
                <button (click)="taskFilter.set(s.value)"
                        class="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                        [class]="taskFilter() === s.value ? s.activeClass : 'border-slate-200 text-slate-500 hover:border-slate-300'">
                  {{s.label}} ({{taskCount(s.value)}})
                </button>
              }
            </div>
            <!-- Task list -->
            <div class="space-y-2">
              @for (task of filteredTasks(); track task.id) {
                <a [routerLink]="['/tasks', task.id]"
                   class="flex items-center gap-3 p-4 rounded-xl border hover:shadow-sm transition-all group"
                   style="border-color:var(--border-color,#e2e8f0)">
                  <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" [ngClass]="statusDot(task.status)"></div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium group-hover:text-blue-600 transition-colors truncate"
                       style="color:var(--text-primary)">{{task.title}}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                      @if (task.deadline) {
                        <span class="text-xs" [class]="isOverdue(task) ? 'text-red-500 font-medium' : 'text-slate-400'">
                          {{isOverdue(task) ? '⚠ Overdue' : 'Due'}} {{formatDate(task.deadline)}}
                        </span>
                      }
                      @if (task.estimatedHours) {
                        <span class="text-xs text-slate-400">{{task.estimatedHours}}h</span>
                      }
                    </div>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    @if (task.assignee) {
                      <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                           [style.background]="avatarBg(task.assignee.fullName)"
                           [title]="task.assignee.fullName">
                        {{task.assignee.firstName[0]}}
                      </div>
                    }
                    <span class="text-xs px-2.5 py-0.5 rounded-full font-medium" [ngClass]="priorityChip(task.priority)">
                      {{task.priority}}
                    </span>
                    <span class="text-xs px-2.5 py-0.5 rounded-full" [ngClass]="statusChipSmall(task.status)">
                      {{formatEnum(task.status)}}
                    </span>
                  </div>
                </a>
              }
              @if (!filteredTasks().length) {
                <div class="text-center py-12">
                  <mat-icon class="text-4xl text-slate-200 mb-2">task_alt</mat-icon>
                  <p class="text-slate-400 text-sm">No tasks in this category</p>
                  @if (canManage()) {
                    <button (click)="showNewTask.set(true)"
                            class="mt-3 px-4 py-2 rounded-xl text-sm text-white"
                            style="background:#3b82f6">Add Task</button>
                  }
                </div>
              }
            </div>
          </div>
        </mat-tab>

        <!-- ── MEMBERS TAB ── -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="mr-1.5 text-base">group</mat-icon>
            Members ({{project()!.members?.length ?? 0}})
          </ng-template>
          <div class="p-4 space-y-2">
            <!-- Manager -->
            @if (project()!.manager) {
              <div class="flex items-center gap-3 p-4 rounded-xl border"
                   style="background:#eff6ff;border-color:#bfdbfe">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                     [style.background]="avatarBg(project()!.manager.fullName)">
                  {{project()!.manager.firstName[0]}}{{project()!.manager.lastName[0]}}
                </div>
                <div class="flex-1">
                  <p class="font-semibold text-slate-900 dark:text-white text-sm">{{project()!.manager.fullName}}</p>
                  <p class="text-xs text-blue-500">Project Manager · {{userSubtitle(project()!.manager)}}</p>
                </div>
                <span class="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">Manager</span>
              </div>
            }
            @for (member of project()!.members; track member.id) {
              <div class="flex items-center gap-3 p-4 rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                   style="border-color:var(--border-color,#e2e8f0)">
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                     [style.background]="avatarBg(member.fullName)">
                  {{member.firstName[0]}}{{member.lastName[0]}}
                </div>
                <div class="flex-1">
                  <p class="font-medium text-slate-900 dark:text-white text-sm">{{member.fullName}}</p>
                  <p class="text-xs text-slate-400">{{userSubtitle(member)}}
                    @if (member.departmentName) { · {{member.departmentName}} }
                  </p>
                </div>
                <span class="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {{roleLabel(member.role)}}
                </span>
              </div>
            }
          </div>
        </mat-tab>

        <!-- ── DETAILS TAB ── -->
        <mat-tab label="Details">
          <div class="p-5 grid sm:grid-cols-2 gap-6" style="background:var(--card-bg,#fff)">
            <div>
              <h3 class="font-semibold text-slate-900 dark:text-white mb-4">Project Info</h3>
              <dl class="space-y-3">
                @for (f of detailFields(); track f.label) {
                  <div class="flex items-start gap-3">
                    <mat-icon class="text-slate-400 text-base mt-0.5 flex-shrink-0">{{f.icon}}</mat-icon>
                    <div>
                      <dt class="text-xs text-slate-400">{{f.label}}</dt>
                      <dd class="text-sm text-slate-700 dark:text-slate-300 break-all">{{f.value || '—'}}</dd>
                    </div>
                  </div>
                }
              </dl>
            </div>
            @if (project()!.description) {
              <div>
                <h3 class="font-semibold text-slate-900 dark:text-white mb-4">Description</h3>
                <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{{project()!.description}}</p>
              </div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  }
</div>
  `,
  styles: [`:host{display:block}`]
})
export class ProjectDetailComponent implements OnInit {
  loading      = signal(true);
  project      = signal<Project | null>(null);
  tasks        = signal<Task[]>([]);
  taskFilter   = signal('ALL');
  showNewTask  = signal(false);
  creatingTask = signal(false);

  newTaskTitle    = '';
  newTaskDesc     = '';
  newTaskPriority = 'MEDIUM';
  newTaskDeadline = '';
  newTaskAssignee = '';

  taskStatuses = [
    { value:'ALL',         label:'All',         activeClass:'bg-slate-900 text-white border-slate-900' },
    { value:'PENDING',     label:'Pending',      activeClass:'bg-amber-500 text-white border-amber-500' },
    { value:'IN_PROGRESS', label:'In Progress',  activeClass:'bg-blue-500 text-white border-blue-500' },
    { value:'UNDER_REVIEW',label:'Review',       activeClass:'bg-yellow-500 text-white border-yellow-500' },
    { value:'COMPLETED',   label:'Completed',    activeClass:'bg-green-500 text-white border-green-500' },
  ];

  filteredTasks = computed(() => {
    const f = this.taskFilter();
    return f === 'ALL' ? this.tasks() : this.tasks().filter(t => t.status === f);
  });

  taskCount(status: string): number {
    return status === 'ALL' ? this.tasks().length : this.tasks().filter(t => t.status === status).length;
  }

  stats = computed(() => {
    const p = this.project();
    if (!p) return [];
    return [
      { label:'Total Tasks',  value: p.totalTasks ?? 0,  icon:'task_alt',   color:'text-blue-500' },
      { label:'Completed',    value: p.completedTasks ?? 0,icon:'check_circle',color:'text-green-500' },
      { label:'Members',      value: p.members?.length ?? 0,icon:'group',   color:'text-violet-500' },
      { label:'Sprints',      value: p.totalSprints ?? 0, icon:'sprint',     color:'text-amber-500' },
    ];
  });

  detailFields = computed(() => {
    const p = this.project();
    if (!p) return [];
    return [
      { icon:'event',       label:'Start Date',    value: this.formatDate(p.startDate) },
      { icon:'event_busy',  label:'End Date',      value: this.formatDate(p.endDate) },
      { icon:'currency_rupee',label:'Budget',      value: p.budget ? `₹${p.budget.toLocaleString('en-IN')}` : null },
      { icon:'code',        label:'Tech Stack',    value: p.techStack },
      { icon:'link',        label:'Repository',    value: p.repositoryUrl },
      { icon:'schedule',    label:'Created',       value: this.formatDate(p.createdAt) },
    ];
  });

  canManage = computed(() => this.authService.isManager());

  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectService,
    private taskService: TaskService,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.projectService.getProject(id).subscribe({
      next: p => { this.project.set(p); this.loading.set(false); this.loadTasks(id); },
      error: () => this.loading.set(false)
    });
  }

  loadTasks(projectId: string): void {
    this.http.get<any>(`${environment.apiUrl}/tasks?projectId=${projectId}&size=200`).subscribe({
      next: r => this.tasks.set(r.content ?? []),
      error: () => {}
    });
  }

  createTask(): void {
    if (!this.newTaskTitle.trim()) return;
    this.creatingTask.set(true);
    const body: any = {
      title: this.newTaskTitle.trim(),
      description: this.newTaskDesc,
      priority: this.newTaskPriority,
      projectId: this.project()!.id,
      status: 'PENDING'
    };
    if (this.newTaskDeadline) body.deadline = this.newTaskDeadline;
    if (this.newTaskAssignee) body.assigneeId = this.newTaskAssignee;

    this.taskService.createTask(body).subscribe({
      next: task => {
        this.tasks.update(ts => [task, ...ts]);
        this.snackBar.open('Task created!', '', { duration: 2500 });
        this.newTaskTitle = ''; this.newTaskDesc = ''; this.newTaskDeadline = ''; this.newTaskAssignee = '';
        this.showNewTask.set(false); this.creatingTask.set(false);
        // Update project task count
        this.project.update(p => p ? { ...p, totalTasks: (p.totalTasks ?? 0) + 1, pendingTasks: (p.pendingTasks ?? 0) + 1 } : p);
      },
      error: err => {
        this.snackBar.open(err?.error?.message ?? 'Failed to create task', 'Close', { duration: 3000 });
        this.creatingTask.set(false);
      }
    });
  }

  isOverdue(task: Task): boolean {
    return !!task.deadline && new Date(task.deadline) < new Date() && task.status !== 'COMPLETED';
  }
  avatarBg(name: string): string {
    const colors = ['#3b82f6','#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#14b8a6'];
    return colors[(name?.charCodeAt(0) ?? 0) % colors.length];
  }
  formatDate(d?: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  }
  formatEnum(value?: string): string {
    return value ? value.replace(/_/g, ' ') : '';
  }
  roleLabel(role?: string): string {
    return role ? (ROLE_LABELS[role] ?? this.formatEnum(role)) : '';
  }
  userSubtitle(user: UserSummary): string {
    return user.jobTitle ?? this.roleLabel(user.role);
  }
  statusDot(s: string): string {
    return { PENDING:'bg-amber-400', IN_PROGRESS:'bg-blue-500', COMPLETED:'bg-green-500', REJECTED:'bg-red-500', UNDER_REVIEW:'bg-yellow-500', CANCELLED:'bg-slate-400' }[s] ?? 'bg-slate-300';
  }
  statusChip(s: string): string {
    return { PLANNING:'bg-slate-100 text-slate-600', ACTIVE:'bg-green-100 text-green-700', ON_HOLD:'bg-yellow-100 text-yellow-700', COMPLETED:'bg-blue-100 text-blue-700', CANCELLED:'bg-red-100 text-red-500', ARCHIVED:'bg-gray-100 text-gray-500' }[s] ?? 'bg-slate-100 text-slate-500';
  }
  statusChipSmall(s: string): string {
    return { PENDING:'bg-amber-100 text-amber-700', IN_PROGRESS:'bg-blue-100 text-blue-700', COMPLETED:'bg-green-100 text-green-700', REJECTED:'bg-red-100 text-red-600', UNDER_REVIEW:'bg-yellow-100 text-yellow-700', CANCELLED:'bg-slate-100 text-slate-500' }[s] ?? 'bg-slate-100 text-slate-500';
  }
  priorityChip(p: string): string {
    return { LOW:'bg-slate-100 text-slate-600', MEDIUM:'bg-blue-100 text-blue-700', HIGH:'bg-orange-100 text-orange-700', CRITICAL:'bg-red-100 text-red-600', URGENT:'bg-rose-100 text-rose-600' }[p] ?? 'bg-slate-100 text-slate-600';
  }
}
