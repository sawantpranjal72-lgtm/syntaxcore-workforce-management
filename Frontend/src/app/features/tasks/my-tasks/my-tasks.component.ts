import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaskService } from '../../../core/services/task.service';
import { AuthService } from '../../../core/services/auth.service';
import { Task } from '../../../core/models';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule, MatProgressSpinnerModule],
  template: `
<div class="p-4 sm:p-6 max-w-5xl mx-auto fade-in">

  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 style="font-size:1.5rem;font-weight:700;color:var(--text-primary);letter-spacing:-.025em">My Tasks</h1>
      <p style="font-size:13px;color:var(--text-muted);margin-top:3px">
        {{filtered().length}} task{{filtered().length!==1?'s':''}} assigned to you
        @if (overdueCount() > 0) {
          · <span style="color:#dc2626;font-weight:600">{{overdueCount()}} overdue</span>
        }
      </p>
    </div>
    <a routerLink="/tasks/new" class="sc-btn sc-btn-primary" style="text-decoration:none">
      <mat-icon style="font-size:18px">add_task</mat-icon>
      New Task
    </a>
  </div>

  <!-- Filter bar -->
  <div class="sc-filter-bar">
    <!-- Search -->
    <div class="sc-filter-search" style="flex:1;max-width:260px">
      <mat-icon>search</mat-icon>
      <input [(ngModel)]="searchQ" placeholder="Search tasks…" (input)="filter()">
    </div>

    <!-- Status filter -->
    <div class="sc-filter-item">
      <span class="sc-filter-label">Status</span>
      <select class="sc-filter-select" [(ngModel)]="selStatus" (change)="filter()">
        <option value="">All</option>
        <option value="PENDING">Pending</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="UNDER_REVIEW">Under Review</option>
        <option value="COMPLETED">Completed</option>
        <option value="REJECTED">Rejected</option>
      </select>
    </div>

    <!-- Priority filter -->
    <div class="sc-filter-item">
      <span class="sc-filter-label">Priority</span>
      <select class="sc-filter-select" [(ngModel)]="selPriority" (change)="filter()">
        <option value="">All</option>
        <option value="URGENT">Urgent</option>
        <option value="CRITICAL">Critical</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </select>
    </div>

    <!-- Sort -->
    <div class="sc-filter-item">
      <span class="sc-filter-label">Sort</span>
      <select class="sc-filter-select" [(ngModel)]="sortBy" (change)="filter()">
        <option value="deadline">Deadline</option>
        <option value="priority">Priority</option>
        <option value="status">Status</option>
        <option value="created">Newest</option>
      </select>
    </div>

    <!-- Clear -->
    @if (hasActiveFilter()) {
      <button class="sc-btn sc-btn-ghost sc-btn-sm" (click)="clearFilters()">
        <mat-icon style="font-size:16px">close</mat-icon> Clear
      </button>
    }
  </div>

  <!-- Summary pills -->
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px">
    @for (s of statusSummary(); track s.label) {
      <button class="sc-badge" [class]="s.cls" style="cursor:pointer;border:none"
              (click)="selStatus=s.value;filter()">
        {{s.label}} ({{s.count}})
      </button>
    }
  </div>

  @if (loading()) {
    <div class="flex justify-center py-20"><mat-spinner diameter="36"></mat-spinner></div>
  } @else if (!filtered().length) {
    <div class="sc-card" style="padding:60px 24px;text-align:center">
      <mat-icon style="font-size:52px;color:var(--neutral-200);display:block;margin:0 auto 14px">task_alt</mat-icon>
      <p style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:6px">
        @if (hasActiveFilter()) { No tasks match your filters } @else { No tasks yet }
      </p>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:20px">
        @if (hasActiveFilter()) { Try adjusting your filters } @else { Tasks assigned to you will appear here }
      </p>
      @if (!hasActiveFilter()) {
        <a routerLink="/tasks/new" class="sc-btn sc-btn-primary" style="text-decoration:none">
          Create your first task
        </a>
      }
    </div>
  } @else {
    <!-- Task list -->
    <div style="display:flex;flex-direction:column;gap:10px">
      @for (task of filtered(); track task.id) {
        <a [routerLink]="['/tasks', task.id]" class="sc-card hover-lift" style="text-decoration:none;display:block;padding:16px 20px">
          <div class="flex items-start gap-4">
            <!-- Status dot -->
            <div style="margin-top:3px;flex-shrink:0">
              <div class="status-dot" [class]="dotCls(displayStatus(task))"></div>
            </div>

            <!-- Main content -->
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:5px">
                <p style="font-size:15px;font-weight:600;color:var(--text-primary)" class="line-clamp-1">
                  {{task.title}}
                </p>
                <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                  <span class="sc-badge" [class]="pBadge(task.priority)" style="font-size:11px">{{task.priority}}</span>
                  <span class="sc-badge" [class]="sBadge(displayStatus(task))" style="font-size:11px">{{fmtStatus(displayStatus(task))}}</span>
                </div>
              </div>

              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                @if (task.projectName) {
                  <span style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text-muted)">
                    <mat-icon style="font-size:13px">folder_open</mat-icon>{{task.projectName}}
                  </span>
                }
                @if (task.deadline) {
                  <span style="display:flex;align-items:center;gap:4px;font-size:12px"
                        [style.color]="isOverdue(task) ? '#dc2626' : 'var(--text-muted)'">
                    <mat-icon style="font-size:13px">event</mat-icon>
                    {{fmtDeadline(task.deadline)}}
                    @if (isOverdue(task)) { <span style="font-weight:600">· Overdue</span> }
                  </span>
                }
                @if (task.estimatedHours) {
                  <span style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text-muted)">
                    <mat-icon style="font-size:13px">schedule</mat-icon>{{task.estimatedHours}}h est.
                  </span>
                }
              </div>

              @if (task.myStatus === 'REJECTED' && task.myReviewFeedback) {
                <div style="margin-top:8px;padding:8px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;display:flex;align-items:flex-start;gap:6px">
                  <mat-icon style="font-size:14px;color:#dc2626;flex-shrink:0;margin-top:1px">rate_review</mat-icon>
                  <span style="font-size:12px;color:#991b1b;line-height:1.5"><strong>Feedback:</strong> {{task.myReviewFeedback}}</span>
                </div>
              }
            </div>

            <!-- Arrow -->
            <mat-icon style="color:var(--text-muted);flex-shrink:0;margin-top:2px;font-size:18px">chevron_right</mat-icon>
          </div>

          <!-- Progress bar for in-progress tasks -->
          @if (task.subtaskCount && task.subtaskCount > 0) {
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border-color)">
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:4px">
                <span>Subtasks</span>
                <span>{{task.completedSubtaskCount ?? 0}}/{{task.subtaskCount}}</span>
              </div>
              <div style="height:4px;background:var(--border-color);border-radius:99px;overflow:hidden">
                <div style="height:100%;background:#10b981;border-radius:99px;transition:width .3s"
                     [style.width]="subPct(task)+'%'"></div>
              </div>
            </div>
          }
        </a>
      }
    </div>
  }
</div>
  `,
  styles: [`:host{display:block}
  .status-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
  .dot-pending{background:#94a3b8}
  .dot-progress{background:#3b82f6}
  .dot-review{background:#f59e0b}
  .dot-done{background:#10b981}
  .dot-rejected{background:#ef4444}
  `]
})
export class MyTasksComponent implements OnInit {
  allTasks  = signal<Task[]>([]);
  filtered  = signal<Task[]>([]);
  loading   = signal(true);

  searchQ    = '';
  selStatus  = '';
  selPriority = '';
  sortBy     = 'deadline';

  overdueCount = computed(() =>
    this.allTasks().filter(t => this.isOverdue(t) && this.displayStatus(t) !== 'COMPLETED').length
  );

  hasActiveFilter = computed(() => !!(this.searchQ || this.selStatus || this.selPriority));

  statusSummary = computed(() => {
    const all = this.allTasks();
    return [
      { label:'Pending',      value:'PENDING',      cls:'badge-pending',      count: all.filter(t=>this.displayStatus(t)==='PENDING').length },
      { label:'In Progress',  value:'IN_PROGRESS',  cls:'badge-in-progress',  count: all.filter(t=>this.displayStatus(t)==='IN_PROGRESS').length },
      { label:'Under Review', value:'UNDER_REVIEW', cls:'badge-under-review', count: all.filter(t=>this.displayStatus(t)==='UNDER_REVIEW').length },
      { label:'Completed',    value:'COMPLETED',    cls:'badge-completed',    count: all.filter(t=>this.displayStatus(t)==='COMPLETED').length },
    ].filter(s => s.count > 0);
  });

  private readonly PRIORITY_ORDER: Record<string,number> = { URGENT:5, CRITICAL:4, HIGH:3, MEDIUM:2, LOW:1 };

  constructor(private taskService: TaskService, private snackBar: MatSnackBar, public auth: AuthService) {}

  ngOnInit(): void {
    this.taskService.getMyTasks().subscribe({
      next: t => { this.allTasks.set(t); this.filter(); this.loading.set(false); },
      error: () => { this.allTasks.set([]); this.filtered.set([]); this.loading.set(false); }
    });
  }

  filter(): void {
    let list = [...this.allTasks()];
    if (this.searchQ.trim()) {
      const q = this.searchQ.toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || (t.projectName ?? '').toLowerCase().includes(q));
    }
    if (this.selStatus)   list = list.filter(t => this.displayStatus(t) === this.selStatus);
    if (this.selPriority) list = list.filter(t => t.priority === this.selPriority);

    list.sort((a, b) => {
      switch (this.sortBy) {
        case 'deadline':
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'priority':
          return (this.PRIORITY_ORDER[b.priority] ?? 0) - (this.PRIORITY_ORDER[a.priority] ?? 0);
        case 'status': {
          const order: Record<string,number> = { IN_PROGRESS:0, PENDING:1, UNDER_REVIEW:2, REJECTED:3, COMPLETED:4 };
          return (order[this.displayStatus(a)]??9) - (order[this.displayStatus(b)]??9);
        }
        default: return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      }
    });
    this.filtered.set(list);
  }

  clearFilters(): void { this.searchQ=''; this.selStatus=''; this.selPriority=''; this.sortBy='deadline'; this.filter(); }

  isOverdue(t: Task): boolean {
    return !!(t.deadline && new Date(t.deadline) < new Date() && !['COMPLETED','CANCELLED'].includes(this.displayStatus(t)));
  }

  fmtDeadline(d: string): string {
    return new Date(d).toLocaleDateString('en-IN', { timeZone:'Asia/Kolkata', day:'numeric', month:'short', year:'numeric' });
  }

  /** Always prefer the viewer's own personal status when present — on a
   * multi-assignee task this is what "My Tasks" should actually show,
   * never another assignee's submission/approval outcome. */
  displayStatus(t: Task): string { return t.myStatus ?? t.status; }

  fmtStatus(s: string): string { return s.replace(/_/g,' '); }
  subPct(t: Task): number { return t.subtaskCount ? Math.round(((t.completedSubtaskCount??0)/t.subtaskCount)*100) : 0; }
  dotCls(s: string): string { const m: Record<string,string>={PENDING:'dot-pending',IN_PROGRESS:'dot-progress',UNDER_REVIEW:'dot-review',COMPLETED:'dot-done',REJECTED:'dot-rejected'}; return m[s]??'dot-pending'; }
  pBadge(p: string): string { const m: Record<string,string>={LOW:'badge-low',MEDIUM:'badge-medium',HIGH:'badge-high',CRITICAL:'badge-critical',URGENT:'badge-urgent'}; return m[p]??'badge-low'; }
  sBadge(s: string): string { const m: Record<string,string>={PENDING:'badge-pending',IN_PROGRESS:'badge-in-progress',UNDER_REVIEW:'badge-under-review',COMPLETED:'badge-completed',REJECTED:'badge-rejected'}; return m[s]??'badge-pending'; }
}
