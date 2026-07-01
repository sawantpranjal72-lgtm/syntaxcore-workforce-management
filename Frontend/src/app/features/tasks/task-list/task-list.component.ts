import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { TaskService } from '../../../core/services/task.service';
import { Task, TaskStatus, Priority, PagedResponse } from '../../../core/models';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatSelectModule, MatInputModule, MatFormFieldModule, MatMenuModule,
    MatPaginatorModule, MatProgressSpinnerModule
  ],
  template: `
<div class="p-4 sm:p-6 max-w-7xl mx-auto">

  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Tasks</h1>
      <p class="text-slate-500 text-sm mt-0.5">{{totalElements()}} tasks total</p>
    </div>
    <div style="display:flex;gap:8px">
      <a routerLink="/tasks/new" class="sc-btn sc-btn-primary" style="text-decoration:none">
        <mat-icon style="font-size:18px">add_task</mat-icon> New Task
      </a>
    </div>
  </div>

  <!-- Filters -->
  <div class="sc-filter-bar">
    <div class="sc-filter-search" style="flex:1;max-width:280px">
      <mat-icon>search</mat-icon>
      <input [(ngModel)]="searchText" (ngModelChange)="onSearchChange($event)" placeholder="Search by title or project…">
    </div>
    <div class="sc-filter-item">
      <span class="sc-filter-label">Status</span>
      <select class="sc-filter-select" [(ngModel)]="selectedStatus" (change)="loadTasks()">
        <option value="">All Statuses</option>
        @for (s of statuses; track s.value) { <option [value]="s.value">{{s.label}}</option> }
      </select>
    </div>
    <div class="sc-filter-item">
      <span class="sc-filter-label">Priority</span>
      <select class="sc-filter-select" [(ngModel)]="selectedPriority" (change)="loadTasks()">
        <option value="">All Priorities</option>
        @for (p of priorities; track p.value) { <option [value]="p.value">{{p.label}}</option> }
      </select>
    </div>
    @if (selectedStatus || selectedPriority || searchText) {
      <button class="sc-btn sc-btn-ghost sc-btn-sm" (click)="clearFilters()">
        <mat-icon style="font-size:16px">close</mat-icon> Clear
      </button>
    }
  </div>

  <!-- Table -->
  <div class="rounded-2xl border overflow-x-auto"
       style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0);">
    @if (loading()) {
      <div class="flex justify-center items-center py-16">
        <mat-spinner diameter="36"></mat-spinner>
      </div>
    } @else {
      <table mat-table [dataSource]="tasks()" class="w-full">

        <!-- Title column -->
        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Task</th>
          <td mat-cell *matCellDef="let task">
            <a [routerLink]="['/tasks', task.id]" class="group block py-1">
              <p class="text-sm font-medium text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-1">
                {{task.title}}
              </p>
              @if (task.projectName) {
                <p class="text-xs text-slate-400 mt-0.5">{{task.projectName}}</p>
              }
            </a>
          </td>
        </ng-container>

        <!-- Status column -->
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
          <td mat-cell *matCellDef="let task">
            <span class="px-2.5 py-1 rounded-full text-xs font-medium" [ngClass]="statusClass(task.status)">
              {{task.status.replace('_',' ')}}
            </span>
          </td>
        </ng-container>

        <!-- Priority column -->
        <ng-container matColumnDef="priority">
          <th mat-header-cell *matHeaderCellDef class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
          <td mat-cell *matCellDef="let task">
            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full" [ngClass]="priorityDot(task.priority)"></div>
              <span class="text-sm">{{task.priority}}</span>
            </div>
          </td>
        </ng-container>

        <!-- Assignee column -->
        <ng-container matColumnDef="assignee">
          <th mat-header-cell *matHeaderCellDef class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Assignee</th>
          <td mat-cell *matCellDef="let task">
            @if (task.assignee) {
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium"
                     style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">
                  {{task.assignee.firstName[0]}}{{task.assignee.lastName[0]}}
                </div>
                <span class="text-sm text-slate-700 dark:text-slate-300">{{task.assignee.firstName}}</span>
              </div>
            } @else {
              <span class="text-slate-400 text-sm">Unassigned</span>
            }
          </td>
        </ng-container>

        <!-- Deadline column -->
        <ng-container matColumnDef="deadline">
          <th mat-header-cell *matHeaderCellDef class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Deadline</th>
          <td mat-cell *matCellDef="let task">
            @if (task.deadline) {
              <span class="text-sm" [class]="isOverdue(task) ? 'text-red-500 font-medium' : 'text-slate-600 dark:text-slate-400'">
                {{formatDate(task.deadline)}}
                @if (isOverdue(task)) { <mat-icon class="text-xs align-middle">warning</mat-icon> }
              </span>
            } @else {
              <span class="text-slate-400">—</span>
            }
          </td>
        </ng-container>

        <!-- Actions column -->
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let task">
            <button mat-icon-button [matMenuTriggerFor]="taskMenu" (click)="$event.stopPropagation()">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #taskMenu>
              <a mat-menu-item [routerLink]="['/tasks', task.id]"><mat-icon>visibility</mat-icon>View</a>
              <a mat-menu-item [routerLink]="['/tasks', task.id, 'edit']"><mat-icon>edit</mat-icon>Edit</a>
              <button mat-menu-item (click)="deleteTask(task.id)" class="text-red-500">
                <mat-icon color="warn">delete</mat-icon>Delete
              </button>
            </mat-menu>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns" class="bg-slate-50 dark:bg-slate-800/50"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"
            class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800">
        </tr>
      </table>

      @if (!tasks().length) {
        <div class="text-center py-16">
          <mat-icon class="text-5xl text-slate-300 mb-3">task_alt</mat-icon>
          <p class="text-slate-500">No tasks found</p>
          <button mat-flat-button color="primary" routerLink="/tasks/new" class="mt-3">Create your first task</button>
        </div>
      }
    }

    <mat-paginator
      [length]="totalElements()"
      [pageSize]="pageSize"
      [pageSizeOptions]="[10, 20, 50]"
      (page)="onPageChange($event)"
      class="border-t border-slate-100 dark:border-slate-800">
    </mat-paginator>
  </div>
</div>
  `,
  styles: [`:host{display:block} mat-form-field{margin-bottom:-1.25em}`]
})
export class TaskListComponent implements OnInit {
  displayedColumns = ['title','status','priority','assignee','deadline','actions'];
  tasks        = signal<Task[]>([]);
  loading      = signal(false);
  totalElements= signal(0);
  pageSize     = 20;
  currentPage  = 0;
  searchText   = '';
  selectedStatus   = '';
  selectedPriority = '';
  private search$ = new Subject<string>();

  statuses = [
    { value: 'PENDING',       label: 'Pending' },
    { value: 'IN_PROGRESS',   label: 'In Progress' },
    { value: 'UNDER_REVIEW',  label: 'Under Review' },
    { value: 'COMPLETED',     label: 'Completed' },
    { value: 'REJECTED',      label: 'Rejected' },
    { value: 'REOPENED',      label: 'Reopened' },
  ];
  priorities = [
    { value: 'LOW', label: 'Low' }, { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' }, { value: 'CRITICAL', label: 'Critical' }, { value: 'URGENT', label: 'Urgent' }
  ];

  constructor(private taskService: TaskService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadTasks();
    this.search$.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => this.loadTasks());
  }

  loadTasks(): void {
    this.loading.set(true);
    this.taskService.getAllTasks({
      search: this.searchText || undefined,
      status: (this.selectedStatus as TaskStatus) || undefined,
      priority: (this.selectedPriority as Priority) || undefined,
      page: this.currentPage,
      size: this.pageSize
    }).subscribe({
      next: (r: PagedResponse<Task>) => {
        this.tasks.set(r.content);
        this.totalElements.set(r.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearchChange(v: string): void { this.search$.next(v); }
  onPageChange(e: PageEvent): void { this.currentPage = e.pageIndex; this.pageSize = e.pageSize; this.loadTasks(); }
  clearFilters(): void { this.searchText = ''; this.selectedStatus = ''; this.selectedPriority = ''; this.loadTasks(); }

  deleteTask(id: string): void {
    if (!confirm('Delete this task?')) return;
    this.taskService.deleteTask(id).subscribe({
      next: () => { this.snackBar.open('Task deleted', '', { duration: 2000 }); this.loadTasks(); },
      error: () => {}
    });
  }

  isOverdue(task: Task): boolean {
    return !!task.deadline && new Date(task.deadline) < new Date() && task.status !== 'COMPLETED';
  }

  formatDate(d?: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  statusClass(status: string): string {
    const m: Record<string, string> = {
      PENDING: 'bg-slate-100 text-slate-700', IN_PROGRESS: 'bg-blue-100 text-blue-700',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-700', COMPLETED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700', REOPENED: 'bg-orange-100 text-orange-700'
    };
    return m[status] ?? 'bg-slate-100 text-slate-600';
  }

  priorityDot(p: string): string {
    const m: Record<string, string> = {
      LOW: 'bg-slate-400', MEDIUM: 'bg-blue-500', HIGH: 'bg-orange-500', CRITICAL: 'bg-red-500', URGENT: 'bg-rose-600'
    };
    return m[p] ?? 'bg-slate-400';
  }
}
