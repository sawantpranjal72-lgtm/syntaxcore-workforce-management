import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TaskService } from '../../../core/services/task.service';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { Project, UserSummary, Task, ROLE_HIERARCHY } from '../../../core/models';
import { environment } from '../../../../environments/environment';
import { TaskRequest, TaskStatus } from '../../../core/models/index';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSelectModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
<div class="p-4 sm:p-6 max-w-2xl mx-auto fade-in">
  <!-- Page header -->
  <div class="flex items-center gap-3 mb-6">
    <a routerLink="/tasks" class="sc-btn sc-btn-secondary sc-btn-icon sc-btn-sm" style="text-decoration:none;flex-shrink:0">
      <mat-icon>arrow_back</mat-icon>
    </a>
    <div>
      <h1 style="font-size:1.35rem;font-weight:700;color:var(--text-primary);letter-spacing:-.02em">
        {{isEdit() ? 'Edit Task' : 'Create New Task'}}
      </h1>
      <p style="font-size:13px;color:var(--text-muted);margin-top:2px">
        {{isEdit() ? 'Update task details and assignees' : 'Fill in details and assign to your team'}}
      </p>
    </div>
  </div>

  <div class="sc-card" style="padding:0">
    <form [formGroup]="form" (ngSubmit)="submit()">

      <!-- Section: Basic Info -->
      <div style="padding:24px;border-bottom:1px solid var(--border-color)">
        <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:18px">
          Task Details
        </p>
        <div class="flex flex-col gap-4">
          <!-- Title -->
          <div class="sc-field">
            <label class="sc-label">Task Title <span class="req">*</span></label>
            <input formControlName="title" type="text" class="sc-input"
                   placeholder="e.g. Implement user authentication module">
            @if (form.get('title')?.invalid && form.get('title')?.touched) {
              <p class="sc-error"><mat-icon style="font-size:14px">error_outline</mat-icon>Title is required</p>
            }
          </div>

          <!-- Description -->
          <div class="sc-field">
            <label class="sc-label">Description</label>
            <textarea formControlName="description" class="sc-textarea" rows="3"
                      placeholder="Describe what needs to be done, acceptance criteria, references…"></textarea>
          </div>

          <div class="grid sm:grid-cols-2 gap-4">
            <!-- Priority -->
            <div class="sc-field">
              <label class="sc-label">Priority</label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-select formControlName="priority">
                  <mat-option value="LOW">🟢 Low</mat-option>
                  <mat-option value="MEDIUM">🔵 Medium</mat-option>
                  <mat-option value="HIGH">🟠 High</mat-option>
                  <mat-option value="CRITICAL">🔴 Critical</mat-option>
                  <mat-option value="URGENT">🚨 Urgent</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Project -->
            <div class="sc-field">
              <label class="sc-label">Project</label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-select formControlName="projectId">
                  <mat-option value="">No Project</mat-option>
                  @for (p of projects(); track p.id) {
                    <mat-option [value]="p.id">{{p.name}}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Assignment -->
      <div style="padding:24px;border-bottom:1px solid var(--border-color)">
        <div class="flex items-center justify-between mb-4">
          <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted)">
            Assignment
          </p>
          <!-- Assign to self toggle -->
          <button type="button" (click)="toggleSelfAssign()" class="sc-btn sc-btn-sm"
                  [class.sc-btn-primary]="selfAssigned()" [class.sc-btn-secondary]="!selfAssigned()"
                  matTooltip="{{selfAssigned() ? 'Remove yourself from task' : 'Add yourself as assignee'}}">
            <mat-icon style="font-size:16px">{{selfAssigned() ? 'person_remove' : 'person_add'}}</mat-icon>
            {{selfAssigned() ? 'Assigned to Self' : 'Assign to Self'}}
          </button>
        </div>

        <!-- Self-assign badge -->
        @if (selfAssigned()) {
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:14px">
            <div class="sc-avatar sc-avatar-sm" style="background:linear-gradient(135deg,#3b82f6,#2563eb)">
              {{me()?.firstName?.charAt(0) ?? 'Y'}}
            </div>
            <div>
              <p style="font-size:13px;font-weight:600;color:#1d4ed8">{{me()?.fullName}} <span style="font-weight:400;color:#3b82f6">(You)</span></p>
              <p style="font-size:12px;color:#2563eb">Will work on this task yourself</p>
            </div>
            <mat-icon style="margin-left:auto;color:#93c5fd;font-size:16px">verified</mat-icon>
          </div>
        }

        <!-- Multi-assignee -->
        <div class="sc-field">
          <label class="sc-label">Also assign to team members</label>
          <mat-form-field appearance="outline" class="w-full">
            <mat-select formControlName="assigneeIds" multiple placeholder="Select team members…">
              @for (u of assignableUsers(); track u.id) {
                <mat-option [value]="u.id">
                  <div style="display:flex;align-items:center;gap:10px">
                    <span class="sc-avatar sc-avatar-sm" [style.background]="avatarColor(u.fullName)">{{u.fullName.charAt(0)}}</span>
                    <span>{{u.fullName}} <span style="font-size:12px;color:var(--text-muted)">({{u.role.replace('_',' ')}})</span></span>
                  </div>
                </mat-option>
              }
            </mat-select>
            <mat-hint>Role restriction: you can only assign to same or lower roles</mat-hint>
          </mat-form-field>
        </div>

        <!-- Assignee chips preview -->
        @if (allAssigneeIds().length > 0) {
          <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px">
            @for (u of allSelectedUsers(); track u.id) {
              <div style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px 5px 6px;background:var(--brand-50);border:1px solid var(--brand-200);border-radius:99px">
                <span class="sc-avatar sc-avatar-sm" style="width:22px;height:22px;font-size:10px" [style.background]="avatarColor(u.fullName)">{{u.fullName.charAt(0)}}</span>
                <span style="font-size:12px;font-weight:600;color:var(--brand-700)">{{u.fullName}}</span>
              </div>
            }
          </div>
        }
      </div>

      <!-- Section: Schedule -->
      <div style="padding:24px;border-bottom:1px solid var(--border-color)">
        <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:18px">
          Schedule & Estimation
        </p>
        <div class="grid sm:grid-cols-2 gap-4">
          <div class="sc-field">
            <label class="sc-label">Deadline (IST)</label>
            <input formControlName="deadline" type="datetime-local" class="sc-input">
            <p class="sc-hint">Asia/Kolkata timezone</p>
          </div>
          <div class="sc-field">
            <label class="sc-label">Estimated Hours</label>
            <input formControlName="estimatedHours" type="number" min="0.5" step="0.5" class="sc-input" placeholder="e.g. 4">
          </div>
          <div class="sc-field">
            <label class="sc-label">Story Points</label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-select formControlName="storyPoints">
                <mat-option [value]="null">— None —</mat-option>
                @for (sp of [1,2,3,5,8,13,21]; track sp) {
                  <mat-option [value]="sp">{{sp}} pts</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
          <div class="sc-field">
            <label class="sc-label">Labels</label>
            <input formControlName="labelsStr" type="text" class="sc-input" placeholder="frontend, bug, api">
            <p class="sc-hint">Comma-separated tags</p>
          </div>
        </div>
      </div>

      <!-- Status Flow Info -->
      <div style="padding:18px 24px;background:var(--info-bg);border-bottom:1px solid var(--border-color)">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
          <mat-icon style="font-size:16px;color:var(--brand-600)">info_outline</mat-icon>
          <p style="font-size:12px;font-weight:700;color:var(--brand-700)">Task Status Workflow</p>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          @for (step of statusSteps; track step.label; let last = $last) {
            <span class="sc-badge" [class]="step.cls" style="font-size:11px">{{step.label}}</span>
            @if (!last) { <mat-icon style="font-size:14px;color:var(--text-muted)">arrow_forward</mat-icon> }
          }
        </div>
        <p style="font-size:12px;color:var(--brand-700);margin-top:8px">
          Assignees start → submit with screenshot/notes → manager reviews → approved or returned
        </p>
      </div>

      <!-- Error -->
      @if (error()) {
        <div style="padding:0 24px">
          <div class="sc-alert sc-alert-error" style="margin-top:16px">
            <mat-icon>error_outline</mat-icon><span>{{error()}}</span>
          </div>
        </div>
      }

      <!-- Footer actions -->
      <div style="padding:20px 24px;display:flex;gap:10px;flex-wrap:wrap">
        <button type="submit" class="sc-btn sc-btn-primary" [disabled]="form.invalid || saving()">
          @if (saving()) { <mat-spinner diameter="16"></mat-spinner> }
          @else { <mat-icon style="font-size:18px">{{isEdit() ? 'save' : 'add_task'}}</mat-icon> }
          {{isEdit() ? 'Save Changes' : 'Create Task'}}
        </button>
        <a routerLink="/tasks" class="sc-btn sc-btn-secondary" style="text-decoration:none">Cancel</a>
      </div>
    </form>
  </div>
</div>
  `,
  styles: [`:host{display:block} mat-form-field{width:100%}`]
})
export class TaskFormComponent implements OnInit {
  form: FormGroup;
  saving   = signal(false);
  error    = signal('');
  isEdit   = signal(false);
  projects = signal<Project[]>([]);
  allUsers = signal<UserSummary[]>([]);
  taskId   = signal<string | null>(null);
  selfAssigned = signal(false);

  me = computed(() => this.authService.currentUser());

  statusSteps = [
    { label: 'Pending', cls: 'badge-pending' },
    { label: 'In Progress', cls: 'badge-in-progress' },
    { label: 'Under Review', cls: 'badge-under-review' },
    { label: 'Completed', cls: 'badge-completed' },
  ];

  assignableUsers = computed(() => {
    const cur = this.me();
    if (!cur) return [];
    const myLvl = ROLE_HIERARCHY[cur.role] ?? 0;
    if (myLvl >= 80) return this.allUsers();
    return this.allUsers().filter(u => u.id !== cur.id && (ROLE_HIERARCHY[u.role] ?? 0) <= myLvl);
  });

  // Merge self + form assignees into one list
  allAssigneeIds = computed((): string[] => {
    const formIds: string[] = this.form?.get('assigneeIds')?.value ?? [];
    const selfId = this.selfAssigned() && this.me()?.id ? [this.me()!.id] : [];
    return [...new Set([...selfId, ...formIds])];
  });

  allSelectedUsers = computed(() => {
    const ids = this.allAssigneeIds();
    const users: UserSummary[] = [];
    if (this.selfAssigned() && this.me()) {
      users.push(this.me() as UserSummary);
    }
    this.allUsers().forEach(u => {
      if (ids.includes(u.id) && !users.find(x => x.id === u.id)) users.push(u);
    });
    return users;
  });

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService,
    private projectService: ProjectService,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      title:          ['', [Validators.required, Validators.maxLength(300)]],
      description:    [''],
      priority:       ['MEDIUM'],
      projectId:      [''],
      assigneeIds:    [[]],
      deadline:       [''],
      estimatedHours: [null],
      storyPoints:    [null],
      labelsStr:      [''],
    });
  }

  ngOnInit(): void {
    this.projectService.getMyProjects().subscribe({ next: p => this.projects.set(p), error: () => {} });
    this.http.get<any>(`${environment.apiUrl}/users/assignable`).subscribe({
      next: r => this.allUsers.set(Array.isArray(r) ? r : r.content ?? []),
      error: () => { this.http.get<any>(`${environment.apiUrl}/users?size=200`).subscribe({ next: r2 => this.allUsers.set(r2.content ?? []), error: () => {} }); }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id && this.route.snapshot.url.some(s => s.path === 'edit')) {
      this.isEdit.set(true); this.taskId.set(id);
      this.taskService.getTask(id).subscribe({
        next: (t: Task) => {
          const meId = this.me()?.id;
          const assigneeIds = (t.assignees ?? []).map((a: any) => a.id);
          if (t.assignee && !assigneeIds.includes(t.assignee.id)) assigneeIds.push(t.assignee.id);
          // Check if self-assigned
          if (meId && assigneeIds.includes(meId)) {
            this.selfAssigned.set(true);
          }
          this.form.patchValue({
            title: t.title, description: t.description, priority: t.priority,
            projectId: t.projectId ?? '',
            assigneeIds: assigneeIds.filter((id: string) => id !== meId),
            deadline: t.deadline ? t.deadline.slice(0,16) : '',
            estimatedHours: t.estimatedHours, storyPoints: t.storyPoints,
            labelsStr: (t.labels ?? []).join(', ')
          });
        }
      });
    }
  }

  toggleSelfAssign(): void { this.selfAssigned.update(v => !v); }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.error.set('');
    const val = this.form.value;
    const formIds = (this.form.get('assigneeIds')?.value as string[]) ?? [];

    const selfId =
      this.selfAssigned() && this.me()?.id
        ? [this.me()!.id]
        : [];

    const assigneeIds = [...new Set([...selfId, ...formIds])];

    const labels = val.labelsStr ? val.labelsStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const req: TaskRequest = {
      title: val.title, description: val.description, priority: val.priority,
      // Only set an initial status when creating a new task. On edit, omitting
      // this field entirely lets the backend leave the task's current status
      // untouched — previously this was hardcoded to 'PENDING' on every save,
      // which silently reset IN_PROGRESS/UNDER_REVIEW/COMPLETED tasks back to
      // PENDING any time someone edited the title, deadline, or assignees.
      ...(this.isEdit() ? {} : { status: 'PENDING' as const }),
      projectId: val.projectId || undefined,
      assigneeId: assigneeIds[0] || undefined,
      assigneeIds,
      deadline: val.deadline ? new Date(val.deadline).toISOString() : undefined,
      estimatedHours: val.estimatedHours || undefined,
      storyPoints: val.storyPoints || undefined,
      labels,


    };

    const obs = this.isEdit()
      ? this.taskService.updateTask(this.taskId()!, req)
      : this.taskService.createTask(req);

    obs.subscribe({
      next: t => {
        const count = assigneeIds.length;
        this.snackBar.open(
          `Task ${this.isEdit() ? 'updated' : 'created'} & assigned to ${count} person${count !== 1 ? 's' : ''}!`,
          '✓', { duration: 3500, panelClass: ['success-snackbar'] }
        );
        this.router.navigate(['/tasks', t.id]);
      },
      error: err => { this.error.set(err?.error?.message ?? 'Failed to save task'); this.saving.set(false); }
    });
  }

  avatarColor(name: string): string {
    const c = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];
    let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return c[Math.abs(h) % c.length];
  }
}
