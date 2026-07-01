import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CdkDragDrop, CdkDropList, CdkDrag, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../core/services/task.service';
import { ProjectService } from '../../../core/services/project.service';
import { Task, TaskStatus, Project } from '../../../core/models';

interface KanbanColumn {
  id: TaskStatus;
  label: string;
  icon: string;
  color: string;
  headerBg: string;
  tasks: Task[];
}

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    CdkDropList, CdkDrag,
    MatIconModule, MatButtonModule, MatSelectModule,
    MatFormFieldModule, MatChipsModule, MatProgressSpinnerModule
  ],
  template: `
<div class="p-3 sm:p-6 h-full flex flex-col">

  <!-- Header -->
  <div class="flex items-center justify-between mb-5 flex-shrink-0">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Kanban Board</h1>
      <p class="text-slate-500 text-sm mt-0.5">Drag & drop tasks across columns</p>
    </div>
    <div class="flex items-center gap-3">
      <mat-form-field appearance="outline" style="width:220px; margin-bottom:-1.25em">
        <mat-label>Filter by Project</mat-label>
        <mat-select [(ngModel)]="selectedProjectId" (ngModelChange)="loadBoard()">
          <mat-option value="">All Projects</mat-option>
          @for (p of projects(); track p.id) {
            <mat-option [value]="p.id">{{p.name}}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <button mat-flat-button color="primary" routerLink="/tasks/new">
        <mat-icon>add</mat-icon> Add Task
      </button>
    </div>
  </div>

  @if (loading()) {
    <div class="flex justify-center items-center flex-1">
      <mat-spinner diameter="40"></mat-spinner>
    </div>
  } @else {
    <!-- Board -->
    <div class="flex gap-4 overflow-x-auto flex-1 pb-4" style="min-height:0">
      @for (col of columns; track col.id) {
        <div class="flex-shrink-0 w-64 sm:w-72 flex flex-col rounded-2xl"
             style="background:var(--column-bg,#f8fafc)">

          <!-- Column header -->
          <div class="flex items-center gap-2 px-4 py-3 rounded-t-2xl" [ngClass]="col.headerBg">
            <mat-icon class="text-base" [ngClass]="col.color">{{col.icon}}</mat-icon>
            <span class="font-semibold text-sm">{{col.label}}</span>
            <span class="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-white/60 text-slate-600">
              {{col.tasks.length}}
            </span>
          </div>

          <!-- Drop zone -->
          <div cdkDropList
               [id]="col.id"
               [cdkDropListData]="col.tasks"
               [cdkDropListConnectedTo]="connectedLists"
               (cdkDropListDropped)="onDrop($event, col.id)"
               class="flex-1 p-2 space-y-2 overflow-y-auto min-h-24">

            @for (task of col.tasks; track task.id) {
              <div cdkDrag [cdkDragData]="task"
                   class="task-card rounded-xl p-3 border cursor-grab active:cursor-grabbing shadow-sm
                          hover:shadow-md transition-all duration-200 group"
                   style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">

                <!-- Priority indicator -->
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full" [ngClass]="priorityDot(task.priority)"></div>
                    <span class="text-xs text-slate-400">{{task.priority}}</span>
                  </div>
                  <a [routerLink]="['/tasks', task.id]"
                     class="opacity-0 group-hover:opacity-100 transition-opacity">
                    <mat-icon class="text-sm text-slate-400 hover:text-indigo-600">open_in_new</mat-icon>
                  </a>
                </div>

                <p class="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug mb-2 line-clamp-2">
                  {{task.title}}
                </p>

                @if (task.deadline) {
                  <div class="flex items-center gap-1 text-xs mb-2"
                       [class]="isOverdue(task) ? 'text-red-500' : 'text-slate-400'">
                    <mat-icon class="text-xs leading-none">schedule</mat-icon>
                    {{formatDate(task.deadline)}}
                  </div>
                }

                <!-- Footer -->
                <div class="flex items-center justify-between">
                  @if (task.assignee) {
                    <div class="flex items-center gap-1.5">
                      <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                           style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">
                        {{task.assignee.firstName[0]}}
                      </div>
                      <span class="text-xs text-slate-500">{{task.assignee.firstName}}</span>
                    </div>
                  } @else {
                    <div></div>
                  }
                  @if ((task.commentCount ?? 0) > 0) {
                    <div class="flex items-center gap-0.5 text-xs text-slate-400">
                      <mat-icon class="text-xs">chat_bubble_outline</mat-icon>
                      {{task.commentCount}}
                    </div>
                  }
                </div>

                <!-- Drag placeholder -->
                <div *cdkDragPlaceholder class="rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 h-24"></div>
              </div>
            }

            @if (!col.tasks.length) {
              <div class="flex flex-col items-center justify-center py-8 text-center opacity-40">
                <mat-icon class="text-2xl text-slate-300 mb-1">{{col.icon}}</mat-icon>
                <p class="text-xs text-slate-400">Drop tasks here</p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  }
</div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .cdk-drag-animating { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
    .cdk-drop-list-dragging .task-card:not(.cdk-drag-placeholder) { transition: transform 250ms cubic-bezier(0,0,0.2,1); }
  `]
})
export class KanbanComponent implements OnInit {
  loading          = signal(false);
  projects         = signal<Project[]>([]);
  selectedProjectId = '';

  columns: KanbanColumn[] = [
    { id: 'PENDING',      label: 'Pending',      icon: 'radio_button_unchecked', color: 'text-slate-500', headerBg: 'bg-slate-100 dark:bg-slate-800',   tasks: [] },
    { id: 'IN_PROGRESS',  label: 'In Progress',  icon: 'pending',               color: 'text-blue-600',  headerBg: 'bg-blue-50   dark:bg-blue-900/30',  tasks: [] },
    { id: 'UNDER_REVIEW', label: 'Under Review', icon: 'rate_review',            color: 'text-yellow-600',headerBg: 'bg-yellow-50 dark:bg-yellow-900/30',tasks: [] },
    { id: 'COMPLETED',    label: 'Completed',    icon: 'check_circle',           color: 'text-green-600', headerBg: 'bg-green-50  dark:bg-green-900/30', tasks: [] },
    { id: 'REJECTED',     label: 'Rejected',     icon: 'cancel',                 color: 'text-red-600',   headerBg: 'bg-red-50    dark:bg-red-900/30',   tasks: [] },
  ];

  get connectedLists(): string[] { return this.columns.map(c => c.id); }

  constructor(
    private taskService: TaskService,
    private projectService: ProjectService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.projectService.getMyProjects().subscribe({ next: p => this.projects.set(p), error: () => {} });
    const pid = this.route.snapshot.queryParamMap.get('projectId');
    if (pid) this.selectedProjectId = pid;
    this.loadBoard();
  }

  loadBoard(): void {
    this.loading.set(true);
    this.columns.forEach(c => c.tasks = []);

    const req = this.selectedProjectId
      ? this.taskService.getKanban(this.selectedProjectId)
      : this.taskService.getMyTasks();

    req.subscribe({
      next: tasks => {
        tasks.forEach(task => {
          const col = this.columns.find(c => c.id === task.status);
          if (col) col.tasks.push(task);
          else this.columns[0].tasks.push(task); // Fallback to Pending
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onDrop(event: CdkDragDrop<Task[]>, targetStatus: TaskStatus): void {
    const task: Task = event.item.data;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this.taskService.updateBoardOrder(task.id, targetStatus, event.currentIndex).subscribe();
    } else {
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
      this.taskService.updateStatus(task.id, targetStatus).subscribe();
      this.taskService.updateBoardOrder(task.id, targetStatus, event.currentIndex).subscribe();
    }
  }

  isOverdue(t: Task): boolean {
    return !!t.deadline && new Date(t.deadline) < new Date() && t.status !== 'COMPLETED';
  }

  formatDate(d?: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  priorityDot(p: string): string {
    const m: Record<string, string> = {
      LOW: 'bg-slate-400', MEDIUM: 'bg-blue-500', HIGH: 'bg-orange-500', CRITICAL: 'bg-red-500', URGENT: 'bg-rose-600'
    };
    return m[p] ?? 'bg-slate-400';
  }
}
