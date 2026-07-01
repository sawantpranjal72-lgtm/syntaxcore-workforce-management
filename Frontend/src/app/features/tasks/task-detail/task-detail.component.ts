import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { TaskService } from '../../../core/services/task.service';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { Task, TaskStatus, UserSummary } from '../../../core/models';
import { environment } from '../../../../environments/environment';

interface UserTaskStatus {
  user: UserSummary;
  status: TaskStatus;
  submittedAt?: string;
  comment?: string;
  reviewFeedback?: string;
}

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule, MatButtonModule,
    MatSelectModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule,
    MatChipsModule, MatDialogModule],
  template: `
<div class="p-4 sm:p-6 max-w-4xl mx-auto">

  @if (loading()) {
    <div class="flex justify-center py-20"><mat-spinner diameter="40"></mat-spinner></div>
  } @else if (task()) {
    <!-- Header -->
    <div class="flex items-start gap-3 mb-6">
      <a routerLink="/tasks" mat-icon-button class="flex-shrink-0 mt-0.5">
        <mat-icon>arrow_back</mat-icon>
      </a>
      <div class="flex-1 min-w-0">
        <h1 class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight">
          {{task()!.title}}
        </h1>
        <div class="flex flex-wrap items-center gap-2 mt-2">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" [ngClass]="sChip(task()!.status)">
            {{fmtStatus(task()!.status)}}
          </span>
          <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" [ngClass]="pChip(task()!.priority)">
            {{task()!.priority}}
          </span>
          @if (task()!.projectName) {
            <span class="text-xs text-slate-400 flex items-center gap-1">
              <mat-icon class="text-xs">folder_open</mat-icon>{{task()!.projectName}}
            </span>
          }
          @if (isOverdue()) {
            <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
              <mat-icon class="text-xs">warning</mat-icon>Overdue
            </span>
          }
        </div>
      </div>
      @if (canEdit()) {
        <a [routerLink]="['/tasks', task()!.id, 'edit']" mat-stroked-button class="flex-shrink-0">
          <mat-icon>edit</mat-icon> Edit
        </a>
      }
    </div>

    <div class="grid lg:grid-cols-3 gap-6">
      <!-- Main content -->
      <div class="lg:col-span-2 space-y-5">

        @if (task()!.description) {
          <div class="rounded-2xl border p-5"
               style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
            <h3 class="font-semibold text-slate-900 dark:text-white mb-3">Description</h3>
            <p class="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {{task()!.description}}
            </p>
          </div>
        }

        <!-- ── MY ACTION PANEL (for assignees) ── -->
        @if (isAssignee()) {
          <div class="rounded-2xl border-2 p-5"
               style="background:var(--card-bg,#fff); border-color:#6366f1">
            <h3 class="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <mat-icon style="color:#6366f1">person_pin</mat-icon>
              Your Task Actions
            </h3>
            <p class="text-xs text-slate-400 mb-4">Your personal progress on this task</p>

            <!-- Status flow buttons for assignee -->
            <div class="flex flex-wrap gap-2 mb-4">
              @if (myStatus() === 'PENDING') {
                <button (click)="startTask()"
                        [disabled]="updatingStatus()"
                        class="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                        style="background:linear-gradient(135deg,#6366f1,#4f46e5)">
                  <mat-icon class="text-sm">play_arrow</mat-icon>
                  Start Working
                </button>
              }
              @if (myStatus() === 'IN_PROGRESS') {
                <button (click)="showSubmitPanel.set(true)"
                        class="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all hover:opacity-90"
                        style="background:linear-gradient(135deg,#f59e0b,#d97706)">
                  <mat-icon class="text-sm">upload</mat-icon>
                  Submit for Review
                </button>
              }
              @if (myStatus() === 'REJECTED') {
                <button (click)="startTask()"
                        [disabled]="updatingStatus()"
                        class="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                        style="background:linear-gradient(135deg,#ef4444,#dc2626)">
                  <mat-icon class="text-sm">refresh</mat-icon>
                  Rework & Resubmit
                </button>
              }
            </div>

            <!-- Submit for Review Form -->
            @if (showSubmitPanel()) {
              <div class="rounded-xl p-4 mb-3" style="background:#fffbeb;border:1px solid #fcd34d">
                <h4 class="text-sm font-semibold text-amber-800 mb-3">📤 Submit Work for Review</h4>
                <div class="space-y-3">
                  <textarea [(ngModel)]="submitComment" rows="3"
                            placeholder="Describe what you've done, any notes for reviewer..."
                            class="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
                            style="border-color:#fcd34d;background:#fff"></textarea>
                  <input [(ngModel)]="submitGithubLink" type="url"
                         placeholder="GitHub link (optional)"
                         class="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                         style="border-color:#e2e8f0">
                  <input [(ngModel)]="submitLiveDemoLink" type="url"
                         placeholder="Live demo link (optional)"
                         class="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                         style="border-color:#e2e8f0">
                  <input [(ngModel)]="submitScreenshotUrl" type="url"
                         placeholder="Screenshot URL (optional)"
                         class="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                         style="border-color:#e2e8f0">
                  <div class="flex gap-2">
                    <button (click)="submitForReview()"
                            [disabled]="!submitComment.trim() || submitting()"
                            class="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50"
                            style="background:linear-gradient(135deg,#f59e0b,#d97706)">
                      @if (submitting()) { <mat-spinner diameter="16"></mat-spinner> }
                      @else { <mat-icon class="text-sm">send</mat-icon> }
                      Submit
                    </button>
                    <button (click)="showSubmitPanel.set(false)"
                            class="px-4 py-2 rounded-xl text-sm font-medium border text-slate-600">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- ── MANAGER REVIEW PANEL ── -->
        @if (canApprove() && task()!.status === 'UNDER_REVIEW' && (task()!.assignees?.length ?? 0) <= 1) {
          <div class="rounded-2xl border-2 p-5"
               style="background:var(--card-bg,#fff); border-color:#f59e0b">
            <h3 class="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <mat-icon style="color:#f59e0b">rate_review</mat-icon>
              Review Submission
            </h3>
            <p class="text-xs text-slate-400 mb-4">Review the submitted work and approve or reject</p>
            <div class="space-y-3">
              <textarea [(ngModel)]="reviewFeedback" rows="3"
                        placeholder="Provide feedback to the assignee..."
                        class="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
                        style="border-color:#e2e8f0;background:var(--input-bg,#f8fafc)"></textarea>
              <div class="flex gap-2">
                <button (click)="approveTask()"
                        [disabled]="updatingStatus()"
                        class="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50"
                        style="background:linear-gradient(135deg,#10b981,#059669)">
                  <mat-icon class="text-sm">check_circle</mat-icon>
                  Approve & Complete
                </button>
                <button (click)="rejectTask()"
                        [disabled]="updatingStatus()"
                        class="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50"
                        style="background:linear-gradient(135deg,#ef4444,#dc2626)">
                  <mat-icon class="text-sm">cancel</mat-icon>
                  Reject & Return
                </button>
              </div>
            </div>
          </div>
        }

        <!-- ── MULTI-USER COMPLETION STATUS ── -->
        @if ((task()!.assignees?.length ?? 0) > 0) {
          <div class="rounded-2xl border p-5"
               style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
            <h3 class="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <mat-icon style="color:#6366f1">group</mat-icon>
              Per-User Completion
              <span class="ml-auto text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                {{completedCount()}} / {{task()!.assignees!.length}} done
              </span>
            </h3>
            <div class="space-y-3">
              @for (user of task()!.assignees!; track user.id) {
                <div class="flex items-center gap-3 p-3 rounded-xl transition-colors"
                     style="background:var(--hover-bg,rgba(0,0,0,0.02));border:1px solid var(--border-color,#e2e8f0)">
                  <!-- Avatar -->
                  <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                       [style.background]="avatarColor(user.fullName)">
                    {{user.fullName.charAt(0)}}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-slate-800 dark:text-white">{{user.fullName}}</p>
                    <p class="text-xs text-slate-400">{{user.role.replace('_',' ')}}</p>
                    @if (getUserReviewFeedback(user.id) && getUserStatus(user.id) === 'REJECTED') {
                      <p class="text-xs text-red-600 mt-1"><strong>Feedback:</strong> {{getUserReviewFeedback(user.id)}}</p>
                    }
                  </div>
                  <!-- Individual status -->
                  <span class="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
                        [ngClass]="sChip(getUserStatus(user.id))">
                    {{fmtStatus(getUserStatus(user.id))}}
                  </span>
                  <!-- Per-submission approve/reject, manager only -->
                  @if (canApprove() && getUserStatus(user.id) === 'UNDER_REVIEW' && getUserSubmissionId(user.id)) {
                    <div class="flex gap-1.5 flex-shrink-0">
                      <button (click)="approveSubmission(user.id)"
                              [disabled]="reviewingUserId() === user.id"
                              class="w-8 h-8 rounded-lg flex items-center justify-center text-white disabled:opacity-50"
                              style="background:#10b981" title="Approve">
                        <mat-icon class="text-sm">check</mat-icon>
                      </button>
                      <button (click)="openRejectFor(user.id)"
                              [disabled]="reviewingUserId() === user.id"
                              class="w-8 h-8 rounded-lg flex items-center justify-center text-white disabled:opacity-50"
                              style="background:#ef4444" title="Reject">
                        <mat-icon class="text-sm">close</mat-icon>
                      </button>
                    </div>
                  }
                </div>
                @if (rejectingUserId() === user.id) {
                  <div class="rounded-xl p-3 -mt-1" style="background:#fef2f2;border:1px solid #fecaca">
                    <textarea [(ngModel)]="rejectFeedback" rows="2"
                              placeholder="Explain what needs to be fixed..."
                              class="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none mb-2"
                              style="border-color:#fecaca;background:#fff"></textarea>
                    <div class="flex gap-2">
                      <button (click)="rejectSubmission(user.id)"
                              [disabled]="!rejectFeedback.trim() || reviewingUserId() === user.id"
                              class="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                              style="background:#dc2626">
                        Confirm Reject
                      </button>
                      <button (click)="rejectingUserId.set(null); rejectFeedback=''"
                              class="px-3 py-1.5 rounded-lg text-xs font-medium border text-slate-600">
                        Cancel
                      </button>
                    </div>
                  </div>
                }
              }
            </div>
            <!-- Progress bar -->
            <div class="mt-4">
              <div class="flex justify-between text-xs text-slate-500 mb-1">
                <span>Overall Completion</span>
                <span>{{completionPct()}}%</span>
              </div>
              <div class="w-full h-2 rounded-full" style="background:#e2e8f0">
                <div class="h-2 rounded-full transition-all duration-500"
                     style="background:linear-gradient(90deg,#10b981,#059669)"
                     [style.width]="completionPct() + '%'"></div>
              </div>
            </div>
          </div>
        }

        <!-- Subtasks -->
        @if (task()!.subtasks?.length) {
          <div class="rounded-2xl border p-5"
               style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
            <h3 class="font-semibold text-slate-900 dark:text-white mb-3">
              Subtasks ({{task()!.completedSubtaskCount}}/{{task()!.subtaskCount}})
            </h3>
            <div class="space-y-2">
              @for (sub of task()!.subtasks; track sub.id) {
                <div class="flex items-center gap-3 p-2 rounded-lg"
                     style="background:var(--hover-bg,rgba(0,0,0,0.03))">
                  <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" [ngClass]="dot(sub.status)"></div>
                  <span class="text-sm text-slate-700 dark:text-slate-300 flex-1">{{sub.title}}</span>
                  <span class="text-xs text-slate-400">{{fmtStatus(sub.status)}}</span>
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Sidebar details -->
      <div class="space-y-4">
        <div class="rounded-2xl border p-5"
             style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
          <h3 class="font-semibold text-slate-900 dark:text-white mb-4">Details</h3>
          <dl class="space-y-3">
            <!-- Assignees -->
            @if ((task()!.assignees?.length ?? 0) > 0) {
              <div>
                <dt class="text-xs text-slate-400 mb-1">Assignees</dt>
                <dd class="space-y-1">
                  @for (u of task()!.assignees!; track u.id) {
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                           [style.background]="avatarColor(u.fullName)">
                        {{u.fullName.charAt(0)}}
                      </div>
                      <span class="text-sm text-slate-700 dark:text-slate-300">{{u.fullName}}</span>
                    </div>
                  }
                </dd>
              </div>
            } @else if (task()!.assignee) {
              <div>
                <dt class="text-xs text-slate-400 mb-1">Assignee</dt>
                <dd class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
                       style="background:linear-gradient(135deg,#6366f1,#4f46e5)">
                    {{task()!.assignee!.firstName[0]}}
                  </div>
                  <span class="text-sm text-slate-700 dark:text-slate-300">{{task()!.assignee!.fullName}}</span>
                </dd>
              </div>
            }

            @if (task()!.reporter) {
              <div>
                <dt class="text-xs text-slate-400 mb-1">Reporter</dt>
                <dd class="text-sm text-slate-700 dark:text-slate-300">{{task()!.reporter!.fullName}}</dd>
              </div>
            }
            @if (task()!.deadline) {
              <div>
                <dt class="text-xs text-slate-400 mb-1">Deadline</dt>
                <dd class="text-sm flex items-center gap-1" [class.text-red-600]="isOverdue()"
                    [class.text-slate-700]="!isOverdue()">
                  <mat-icon class="text-xs">event</mat-icon>
                  {{fmtDate(task()!.deadline!)}}
                </dd>
              </div>
            }
            @if (task()!.estimatedHours) {
              <div>
                <dt class="text-xs text-slate-400 mb-1">Estimated</dt>
                <dd class="text-sm text-slate-700 dark:text-slate-300">{{task()!.estimatedHours}}h</dd>
              </div>
            }
            @if (task()!.storyPoints) {
              <div>
                <dt class="text-xs text-slate-400 mb-1">Story Points</dt>
                <dd class="text-sm text-slate-700 dark:text-slate-300">{{task()!.storyPoints}} pts</dd>
              </div>
            }
            @if (task()!.labels?.length) {
              <div>
                <dt class="text-xs text-slate-400 mb-2">Labels</dt>
                <dd class="flex flex-wrap gap-1">
                  @for (l of task()!.labels; track l) {
                    <span class="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-100">{{l}}</span>
                  }
                </dd>
              </div>
            }
          </dl>
        </div>

        <!-- Task status timeline -->
        <div class="rounded-2xl border p-5"
             style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
          <h3 class="font-semibold text-slate-900 dark:text-white mb-4 text-sm">Status Timeline</h3>
          <div class="space-y-3">
            @for (step of statusFlow; track step.status; let i = $index) {
              <div class="flex items-center gap-3">
                <div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                     [ngClass]="stepClass(step.status)">
                  @if (isPast(step.status)) { <mat-icon class="text-xs">check</mat-icon> }
                  @else if (isCurrent(step.status)) { <span>●</span> }
                  @else { <span>{{i+1}}</span> }
                </div>
                <div class="flex-1">
                  <p class="text-xs font-medium" [ngClass]="isCurrent(step.status) ? 'text-indigo-700' : 'text-slate-600 dark:text-slate-400'">
                    {{step.label}}
                  </p>
                  <p class="text-[10px] text-slate-400">{{step.desc}}</p>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  }
</div>
  `,
  styles: [`:host{display:block}`]
})
export class TaskDetailComponent implements OnInit {
  task           = signal<Task | null>(null);
  loading        = signal(true);
  updatingStatus = signal(false);
  submitting     = signal(false);
  showSubmitPanel = signal(false);
  submitComment   = '';
  submitScreenshotUrl = '';
  submitGithubLink = '';
  submitLiveDemoLink = '';
  reviewFeedback  = '';

  // Per-row review state for multi-assignee tasks
  reviewingUserId = signal<string | null>(null);
  rejectingUserId = signal<string | null>(null);
  rejectFeedback  = '';

  // Per-user status map (userId -> status) - loaded from submissions
  userStatusMap = signal<Record<string, { status: TaskStatus; submissionId?: string; reviewFeedback?: string }>>({});

  completedCount = computed(() => {
    const task = this.task();
    if (!task?.assignees?.length) return 0;
    return task.assignees.filter(u => this.getUserStatus(u.id) === 'COMPLETED').length;
  });

  completionPct = computed(() => {
    const total = this.task()?.assignees?.length ?? 0;
    if (!total) return 0;
    return Math.round((this.completedCount() / total) * 100);
  });

  isAssignee = computed(() => {
    const me = this.authService.currentUser();
    if (!me) return false;
    const t = this.task();
    if (!t) return false;
    const ids = (t.assignees ?? []).map(a => a.id);
    if (t.assignee) ids.push(t.assignee.id);
    return ids.includes(me.id);
  });

  /** This viewer's own status on the task — drives their personal action
   * buttons (Start/Submit/Rework). Prefers task().myStatus which the backend
   * populates on getMyTasks/startWork responses, then falls back to
   * userStatusMap (populated by the separate /user-statuses endpoint used
   * by the per-row panel). Never uses the shared task.status on
   * multi-assignee tasks since that reflects the aggregate state, not
   * this specific viewer's own progress. */
  myStatus = computed((): TaskStatus => {
    const t = this.task();
    if (!t) return 'PENDING';
    const isMulti = (t.assignees?.length ?? 0) > 0;
    // Prefer the per-viewer myStatus the backend bakes into the response
    // (populated on getMyTasks, startWork, submitForReview responses).
    if (isMulti && t.myStatus) {
      return t.myStatus as TaskStatus;
    }
    // When opening a task directly via URL (not via My Tasks), myStatus
    // may be absent — fall back to the userStatusMap which is loaded
    // separately by loadUserStatuses().
    if (isMulti) {
      const me = this.authService.currentUser();
      if (me) return this.getUserStatus(me.id);
    }
    return t.status;
  });

  canApprove = computed(() => {
    return this.authService.isManager();
  });

  canEdit = computed(() => {
    return this.authService.isManager();
  });

  statusFlow = [
    { status: 'PENDING' as TaskStatus,      label: 'Pending',      desc: 'Task created, awaiting start' },
    { status: 'IN_PROGRESS' as TaskStatus,  label: 'In Progress',  desc: 'Assignee is working on it' },
    { status: 'UNDER_REVIEW' as TaskStatus, label: 'Under Review', desc: 'Submitted, awaiting approval' },
    { status: 'COMPLETED' as TaskStatus,    label: 'Completed',    desc: 'Approved by reviewer' },
  ];

  statusOrder: Record<string, number> = { PENDING:0, IN_PROGRESS:1, UNDER_REVIEW:2, COMPLETED:3, REJECTED:-1, CANCELLED:-1 };

  constructor(
    private route: ActivatedRoute,
    private taskService: TaskService,
    private authService: AuthService,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.taskService.getTask(id).subscribe({
      next: t => { this.task.set(t); this.loading.set(false); this.loadUserStatuses(id); },
      error: () => this.loading.set(false)
    });
  }

  loadUserStatuses(taskId: string): void {
    this.http.get<any[]>(`${environment.apiUrl}/tasks/${taskId}/user-statuses`).subscribe({
      next: (data) => {
        const map: Record<string, { status: TaskStatus; submissionId?: string; reviewFeedback?: string }> = {};
        data.forEach(d => { map[d.userId] = { status: d.status, submissionId: d.submissionId, reviewFeedback: d.reviewFeedback }; });
        this.userStatusMap.set(map);
        // Also patch task().myStatus so the myStatus computed signal reflects
        // the freshly loaded per-user status without waiting for a full task refetch.
        const me = this.authService.currentUser();
        if (me && map[me.id]) {
          this.task.update(t => t ? { ...t, myStatus: map[me.id].status as TaskStatus } : t);
        }
      },
      error: () => {
        // Fallback: all assignees show parent task status
        const t = this.task();
        if (t?.assignees) {
          const map: Record<string, { status: TaskStatus }> = {};
          t.assignees.forEach(u => { map[u.id] = { status: t.status }; });
          this.userStatusMap.set(map);
        }
      }
    });
  }

  getUserStatus(userId: string): TaskStatus {
    return this.userStatusMap()[userId]?.status ?? this.task()?.status ?? 'PENDING';
  }

  getUserSubmissionId(userId: string): string | undefined {
    return this.userStatusMap()[userId]?.submissionId;
  }

  getUserReviewFeedback(userId: string): string | undefined {
    return this.userStatusMap()[userId]?.reviewFeedback;
  }

  startTask(): void {
    const t = this.task();
    if (!t) return;
    this.updatingStatus.set(true);
    this.taskService.startWork(t.id).subscribe({
      next: updated => {
        this.task.set(updated);
        this.loadUserStatuses(t.id);
        this.updatingStatus.set(false);
        this.snackBar.open('Task started! Good luck!', '', {duration:2500});
      },
      error: () => this.updatingStatus.set(false)
    });
  }

  submitForReview(): void {
    const t = this.task();
    if (!t || !this.submitComment.trim()) return;
    this.submitting.set(true);
    // The backend's /submit endpoint already records this person's own
    // submission and updates the task's overall status appropriately
    // (immediately for single-assignee tasks; only once every assignee has
    // a resolved outcome for multi-assignee tasks). Forcing the shared
    // status to UNDER_REVIEW here afterward would incorrectly overwrite
    // that — e.g. it would re-open a task another assignee already had
    // approved. Re-fetch the task instead of guessing at its new status.
    this.http.post(`${environment.apiUrl}/tasks/${t.id}/submit`, {
      description: this.submitComment,
      submissionFileUrl: this.submitScreenshotUrl || null,
      githubLink: this.submitGithubLink || null,
      liveDemoLink: this.submitLiveDemoLink || null
    }).subscribe({
      next: () => {
        this.taskService.getTask(t.id).subscribe({
          next: updated => {
            this.task.set(updated);
            this.loadUserStatuses(t.id);
            this.showSubmitPanel.set(false);
            this.submitComment = '';
            this.submitScreenshotUrl = '';
            this.submitGithubLink = '';
            this.submitLiveDemoLink = '';
            this.submitting.set(false);
            this.snackBar.open('Submitted for review!', '', {duration:3000, panelClass:['success-snackbar']});
          },
          error: () => this.submitting.set(false)
        });
      },
      error: err => {
        this.submitting.set(false);
        this.snackBar.open(err?.error?.message ?? 'Failed to submit for review', '', {duration:3000});
      }
    });
  }

  /** Approve a specific assignee's submission, independent of any other
   * assignee's progress on the same task. */
  approveSubmission(userId: string): void {
    const t = this.task();
    const submissionId = this.getUserSubmissionId(userId);
    if (!t || !submissionId) return;
    this.reviewingUserId.set(userId);
    this.http.patch(`${environment.apiUrl}/tasks/${t.id}/submissions/${submissionId}/review`,
      { decision: 'APPROVED', feedback: 'Approved.' }).subscribe({
      next: (updated: any) => {
        this.task.set(updated);
        this.loadUserStatuses(t.id);
        this.reviewingUserId.set(null);
        this.snackBar.open('Submission approved!', '', {duration:3000, panelClass:['success-snackbar']});
      },
      error: err => {
        this.reviewingUserId.set(null);
        this.snackBar.open(err?.error?.message ?? 'Failed to approve', '', {duration:3000});
      }
    });
  }

  openRejectFor(userId: string): void {
    this.rejectingUserId.set(userId);
    this.rejectFeedback = '';
  }

  /** Reject a specific assignee's submission, independent of any other
   * assignee's progress on the same task. */
  rejectSubmission(userId: string): void {
    const t = this.task();
    const submissionId = this.getUserSubmissionId(userId);
    if (!t || !submissionId || !this.rejectFeedback.trim()) return;
    this.reviewingUserId.set(userId);
    this.http.patch(`${environment.apiUrl}/tasks/${t.id}/submissions/${submissionId}/review`,
      { decision: 'REJECTED', feedback: this.rejectFeedback.trim() }).subscribe({
      next: (updated: any) => {
        this.task.set(updated);
        this.loadUserStatuses(t.id);
        this.reviewingUserId.set(null);
        this.rejectingUserId.set(null);
        this.rejectFeedback = '';
        this.snackBar.open('Submission rejected. Assignee will be notified.', '', {duration:3000});
      },
      error: err => {
        this.reviewingUserId.set(null);
        this.snackBar.open(err?.error?.message ?? 'Failed to reject', '', {duration:3000});
      }
    });
  }

  approveTask(): void {
    const t = this.task();
    if (!t) return;
    this.updatingStatus.set(true);
    this.taskService.updateStatus(t.id, 'COMPLETED').subscribe({
      next: updated => {
        this.task.set(updated);
        this.updatingStatus.set(false);
        this.snackBar.open('Task approved and marked complete!', '', {duration:3000, panelClass:['success-snackbar']});
      },
      error: () => this.updatingStatus.set(false)
    });
  }

  rejectTask(): void {
    const t = this.task();
    if (!t) return;
    this.updatingStatus.set(true);
    this.taskService.updateStatus(t.id, 'REJECTED').subscribe({
      next: updated => {
        this.task.set(updated);
        this.updatingStatus.set(false);
        this.snackBar.open('Task rejected. Assignee will be notified.', '', {duration:3000});
      },
      error: () => this.updatingStatus.set(false)
    });
  }

  isPast(status: TaskStatus): boolean {
    const cur = this.statusOrder[this.task()?.status ?? 'PENDING'];
    const s = this.statusOrder[status];
    return cur > s && s >= 0;
  }

  isCurrent(status: TaskStatus): boolean {
    return this.task()?.status === status;
  }

  stepClass(status: TaskStatus): string {
    if (this.isCurrent(status)) return 'bg-indigo-600 text-white';
    if (this.isPast(status)) return 'bg-green-500 text-white';
    return 'bg-slate-100 text-slate-400';
  }

  isOverdue(): boolean {
    const t = this.task();
    return !!(t?.deadline && new Date(t.deadline) < new Date() && t.status !== 'COMPLETED');
  }

  fmtStatus(s: string): string {
    return s.replace(/_/g,' ');
  }

  fmtDate(d: string): string {
    return new Date(d).toLocaleString('en-IN', { timeZone:'Asia/Kolkata', day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }

  avatarColor(name: string): string {
    const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  dot(s: string): string { const m: Record<string,string>={PENDING:'bg-slate-400',IN_PROGRESS:'bg-blue-500',UNDER_REVIEW:'bg-yellow-500',COMPLETED:'bg-green-500',REJECTED:'bg-red-500'}; return m[s]??'bg-slate-300'; }
  pChip(p: string): string { const m: Record<string,string>={LOW:'bg-slate-100 text-slate-600',MEDIUM:'bg-blue-100 text-blue-700',HIGH:'bg-orange-100 text-orange-700',CRITICAL:'bg-red-100 text-red-700',URGENT:'bg-rose-100 text-rose-700'}; return m[p]??'bg-slate-100 text-slate-600'; }
  sChip(s: string): string { const m: Record<string,string>={PENDING:'bg-slate-100 text-slate-600',IN_PROGRESS:'bg-blue-100 text-blue-700',UNDER_REVIEW:'bg-yellow-100 text-yellow-700',COMPLETED:'bg-green-100 text-green-700',REJECTED:'bg-red-100 text-red-700',REOPENED:'bg-purple-100 text-purple-700',CANCELLED:'bg-gray-100 text-gray-500'}; return m[s]??'bg-slate-100 text-slate-600'; }
}
