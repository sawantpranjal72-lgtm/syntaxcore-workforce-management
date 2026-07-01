import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface Submission {
  id: string;
  taskId: string;
  taskTitle: string;
  taskPriority: string;
  taskDescription?: string;
  submittedBy: { id: string; fullName: string; role: string; email?: string; };
  description: string;           // submission notes/comment
  submissionFileUrl?: string;    // screenshot URL
  githubLink?: string;           // GitHub repo / PR link
  liveDemoLink?: string;         // live demo / deployed URL
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewFeedback?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

@Component({
  selector: 'app-task-approval',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule, MatProgressSpinnerModule],
  template: `
<div class="p-4 sm:p-6 max-w-5xl mx-auto fade-in">

  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div>
      <h1 style="font-size:1.5rem;font-weight:700;color:var(--text-primary);letter-spacing:-.025em">
        Task Approvals
      </h1>
      <p style="font-size:13px;color:var(--text-muted);margin-top:3px">
        Review and approve task submissions from your team
      </p>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      @if (pendingCount() > 0) {
        <div class="sc-badge badge-under-review" style="font-size:12px;padding:5px 12px">
          <mat-icon style="font-size:14px">pending_actions</mat-icon>
          {{pendingCount()}} pending
        </div>
      }
      <button class="sc-btn sc-btn-secondary sc-btn-sm" (click)="load()">
        <mat-icon style="font-size:16px">refresh</mat-icon> Refresh
      </button>
    </div>
  </div>

  <!-- Filter bar -->
  <div class="sc-filter-bar">
    <div class="sc-filter-search" style="flex:1;max-width:280px">
      <mat-icon>search</mat-icon>
      <input [(ngModel)]="searchQ" placeholder="Search tasks or submitters…" (input)="applyFilter()">
    </div>
    <div class="sc-filter-item">
      <span class="sc-filter-label">Status</span>
      <select class="sc-filter-select" [(ngModel)]="filterStatus" (change)="applyFilter()">
        <option value="PENDING">Pending Review</option>
        <option value="">All</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
      </select>
    </div>
    <div class="sc-filter-item">
      <span class="sc-filter-label">Priority</span>
      <select class="sc-filter-select" [(ngModel)]="filterPriority" (change)="applyFilter()">
        <option value="">All Priorities</option>
        <option value="CRITICAL">Critical</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </select>
    </div>
  </div>

  @if (loading()) {
    <div style="display:flex;justify-content:center;padding:80px">
      <mat-spinner diameter="40"></mat-spinner>
    </div>
  } @else if (!filtered().length) {
    <div class="sc-card" style="padding:64px 24px;text-align:center">
      <mat-icon style="font-size:52px;color:var(--neutral-200);display:block;margin:0 auto 16px">task_alt</mat-icon>
      <p style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:6px">
        @if (filterStatus === 'PENDING') { No pending submissions } @else { No submissions found }
      </p>
      <p style="font-size:13px;color:var(--text-muted)">
        @if (filterStatus === 'PENDING') { Your team hasn't submitted any tasks for review yet }
        @else { Try adjusting filters }
      </p>
    </div>
  } @else {
    <div style="display:flex;flex-direction:column;gap:16px">
      @for (sub of filtered(); track sub.id) {
        <div class="sc-card" style="overflow:visible">

          <!-- Card header -->
          <div style="padding:18px 20px 14px;border-bottom:1px solid var(--border-color)">
            <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
              <!-- Submitter avatar -->
              <div class="sc-avatar sc-avatar-lg flex-shrink-0"
                   [style.background]="avatarGrad(sub.submittedBy.fullName)">
                {{sub.submittedBy.fullName.charAt(0)}}
              </div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:4px">
                  <span style="font-size:15px;font-weight:700;color:var(--text-primary)" class="line-clamp-1">
                    {{sub.taskTitle}}
                  </span>
                  <span class="sc-badge" [class]="pBadge(sub.taskPriority)">{{sub.taskPriority}}</span>
                  <span class="sc-badge" [class]="sBadge(sub.status)">
                    @if (sub.status==='PENDING')  { ⏳ Pending Review }
                    @if (sub.status==='APPROVED') { ✅ Approved }
                    @if (sub.status==='REJECTED') { ❌ Rejected }
                  </span>
                </div>
                <p style="font-size:13px;color:var(--text-muted)">
                  Submitted by
                  <strong style="color:var(--text-primary)">{{sub.submittedBy.fullName}}</strong>
                  <span style="font-size:12px"> · {{sub.submittedBy.role.replace('_',' ')}}</span>
                  · {{fmtDate(sub.submittedAt)}}
                </p>
              </div>
              <!-- Quick link to task -->
              <a [routerLink]="['/tasks', sub.taskId]"
                 class="sc-btn sc-btn-secondary sc-btn-sm flex-shrink-0" style="text-decoration:none">
                <mat-icon style="font-size:15px">open_in_new</mat-icon>
                View Task
              </a>
            </div>
          </div>

          <!-- Submission Details -->
          <div style="padding:16px 20px">

            <!-- ── Submission Comment ── -->
            @if (sub.description && sub.description !== 'Task submitted for review.') {
              <div style="margin-bottom:14px">
                <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:8px;display:flex;align-items:center;gap:5px">
                  <mat-icon style="font-size:14px">comment</mat-icon>
                  Submission Notes
                </p>
                <div style="background:var(--hover-bg);border:1px solid var(--border-color);border-radius:10px;padding:14px 16px">
                  <p style="font-size:14px;color:var(--text-primary);line-height:1.65;white-space:pre-wrap">{{sub.description}}</p>
                </div>
              </div>
            }

            <!-- ── GitHub Link ── -->
            @if (sub.githubLink) {
              <div style="margin-bottom:12px">
                <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:8px;display:flex;align-items:center;gap:5px">
                  <mat-icon style="font-size:14px">code</mat-icon>
                  GitHub Repository / PR
                </p>
                <a [href]="sub.githubLink" target="_blank" rel="noopener"
                   style="display:flex;align-items:center;gap:8px;padding:11px 14px;border:1px solid var(--border-color);border-radius:10px;background:var(--hover-bg);text-decoration:none;color:var(--text-primary);transition:border-color .15s"
                   onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='var(--border-color)'">
                  <mat-icon style="font-size:18px;color:#6366f1;flex-shrink:0">link</mat-icon>
                  <span style="font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{sub.githubLink}}</span>
                  <mat-icon style="font-size:14px;color:var(--text-muted);flex-shrink:0">open_in_new</mat-icon>
                </a>
              </div>
            }

            <!-- ── Live Demo Link ── -->
            @if (sub.liveDemoLink) {
              <div style="margin-bottom:12px">
                <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:8px;display:flex;align-items:center;gap:5px">
                  <mat-icon style="font-size:14px">rocket_launch</mat-icon>
                  Live Demo
                </p>
                <a [href]="sub.liveDemoLink" target="_blank" rel="noopener"
                   style="display:flex;align-items:center;gap:8px;padding:11px 14px;border:1px solid var(--border-color);border-radius:10px;background:var(--hover-bg);text-decoration:none;color:var(--text-primary);transition:border-color .15s"
                   onmouseover="this.style.borderColor='#10b981'" onmouseout="this.style.borderColor='var(--border-color)'">
                  <mat-icon style="font-size:18px;color:#10b981;flex-shrink:0">link</mat-icon>
                  <span style="font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{sub.liveDemoLink}}</span>
                  <mat-icon style="font-size:14px;color:var(--text-muted);flex-shrink:0">open_in_new</mat-icon>
                </a>
              </div>
            }

            <!-- ── Screenshot / Attachment ── -->
            @if (sub.submissionFileUrl) {
              <div style="margin-bottom:14px">
                <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:8px;display:flex;align-items:center;gap:5px">
                  <mat-icon style="font-size:14px">image</mat-icon>
                  Submitted Screenshot / Attachment
                </p>
                <!-- Try to render as image; fallback to link -->
                <div style="border:1px solid var(--border-color);border-radius:10px;overflow:hidden;background:#f8fafc">
                  <img [src]="sub.submissionFileUrl" alt="Screenshot"
                       style="max-width:100%;max-height:320px;object-fit:contain;display:block"
                       (error)="imgError($event, sub.submissionFileUrl)">
                  <div style="padding:10px 14px;border-top:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between">
                    <span style="font-size:12px;color:var(--text-muted)" class="line-clamp-1">
                      {{sub.submissionFileUrl}}
                    </span>
                    <a [href]="sub.submissionFileUrl" target="_blank"
                       class="sc-btn sc-btn-secondary sc-btn-sm" style="text-decoration:none;flex-shrink:0;margin-left:10px">
                      <mat-icon style="font-size:14px">download</mat-icon>
                      Open
                    </a>
                  </div>
                </div>
              </div>
            }

            <!-- ── No submission details placeholder ── -->
            @if ((!sub.description || sub.description === 'Task submitted for review.')
                 && !sub.submissionFileUrl && !sub.githubLink && !sub.liveDemoLink) {
              <div style="padding:12px 16px;background:var(--hover-bg);border-radius:10px;border:1px solid var(--border-color);margin-bottom:14px">
                <p style="font-size:13px;color:var(--text-muted);display:flex;align-items:center;gap:6px">
                  <mat-icon style="font-size:16px">info_outline</mat-icon>
                    No submission notes or screenshots were attached.
                  </p>
                </div>
              }

            <!-- ── Previous review feedback ── -->
            @if (sub.reviewFeedback && sub.status !== 'PENDING') {
              <div style="margin-bottom:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px">
                <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#92400e;margin-bottom:6px;display:flex;align-items:center;gap:5px">
                  <mat-icon style="font-size:14px">rate_review</mat-icon>
                  Reviewer Feedback
                  @if (sub.reviewedBy) { · {{sub.reviewedBy}} }
                  @if (sub.reviewedAt) { · {{fmtDate(sub.reviewedAt)}} }
                </p>
                <p style="font-size:13px;color:#78350f;line-height:1.5">{{sub.reviewFeedback}}</p>
              </div>
            }

            <!-- ── Review Actions (PENDING only) ── -->
            @if (sub.status === 'PENDING') {
              @if (expandedId() !== sub.id) {
                <div style="display:flex;gap:10px;flex-wrap:wrap;padding-top:4px">
                  <button (click)="quickApprove(sub)" class="sc-btn sc-btn-success">
                    <mat-icon style="font-size:18px">check_circle</mat-icon>
                    Approve Submission
                  </button>
                  <button (click)="expandedId.set(sub.id); feedbackMap[sub.id]='';" class="sc-btn sc-btn-warning">
                    <mat-icon style="font-size:18px">rate_review</mat-icon>
                    Request Changes / Reject
                  </button>
                </div>
              } @else {
                <!-- Reject panel -->
                <div style="background:#fff1f2;border:1.5px solid #fecdd3;border-radius:12px;padding:16px;margin-top:4px">
                  <p style="font-size:13px;font-weight:700;color:#be123c;margin-bottom:10px;display:flex;align-items:center;gap:6px">
                    <mat-icon style="font-size:16px">rate_review</mat-icon>
                    Rejection / Change Request Feedback
                    <span style="font-weight:400;color:#e11d48"> *</span>
                  </p>
                  <textarea class="sc-textarea" [(ngModel)]="feedbackMap[sub.id]"
                            placeholder="Describe what needs to be fixed or improved. This message will be sent to the employee…"
                            rows="3" style="border-color:#fecdd3;background:#fff;margin-bottom:12px"></textarea>
                  <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <button (click)="reject(sub)"
                            [disabled]="!feedbackMap[sub.id]?.trim()"
                            class="sc-btn sc-btn-danger" style="disabled:opacity:.5">
                      <mat-icon style="font-size:18px">cancel</mat-icon>
                      Reject & Notify
                    </button>
                    <button (click)="quickApprove(sub)" class="sc-btn sc-btn-success">
                      <mat-icon style="font-size:18px">check_circle</mat-icon>
                      Approve Instead
                    </button>
                    <button (click)="expandedId.set(null)" class="sc-btn sc-btn-secondary">
                      Cancel
                    </button>
                  </div>
                </div>
              }
            }
          </div>

        </div>
      }
    </div>

    <p style="text-align:center;margin-top:20px;font-size:13px;color:var(--text-muted)">
      Showing {{filtered().length}} submission{{filtered().length!==1?'s':''}}
    </p>
  }
</div>
  `,
  styles: [`:host{display:block}`]
})
export class TaskApprovalComponent implements OnInit {
  loading    = signal(true);
  allSubs    = signal<Submission[]>([]);
  filtered   = signal<Submission[]>([]);
  expandedId = signal<string | null>(null);
  feedbackMap: Record<string, string> = {};

  searchQ        = '';
  filterStatus   = 'PENDING';
  filterPriority = '';

  pendingCount = computed(() => this.allSubs().filter(s => s.status === 'PENDING').length);

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    public authService: AuthService
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    // Primary: dedicated submissions endpoint
    this.http.get<Submission[]>(`${environment.apiUrl}/tasks/submissions/pending`).subscribe({
      next: s => { this.allSubs.set(s); this.applyFilter(); this.loading.set(false); },
      error: () => {
        // Fallback: load UNDER_REVIEW tasks and build submission objects
        this.http.get<any>(`${environment.apiUrl}/tasks?status=UNDER_REVIEW&size=100`).subscribe({
          next: r => {
            const tasks: any[] = r.content ?? r ?? [];
            const subs: Submission[] = tasks.map((t: any) => ({
              id: t.id + '_sub',
              taskId: t.id,
              taskTitle: t.title,
              taskDescription: t.description,
              taskPriority: t.priority ?? 'MEDIUM',
              submittedBy: t.assignee
                ? { id: t.assignee.id, fullName: t.assignee.fullName ?? (t.assignee.firstName + ' ' + t.assignee.lastName), role: t.assignee.role ?? 'EMPLOYEE' }
                : { id: '', fullName: 'Unknown User', role: 'EMPLOYEE' },
              description: '',    // No submission notes from task fallback
              submissionFileUrl: undefined,
              status: 'PENDING',
              submittedAt: t.updatedAt ?? t.createdAt,
            }));
            this.allSubs.set(subs);
            this.applyFilter();
            this.loading.set(false);
          },
          error: () => { this.loading.set(false); }
        });
      }
    });
  }

  applyFilter(): void {
    let list = [...this.allSubs()];
    if (this.filterStatus)   list = list.filter(s => s.status === this.filterStatus);
    if (this.filterPriority) list = list.filter(s => s.taskPriority === this.filterPriority);
    if (this.searchQ.trim()) {
      const q = this.searchQ.toLowerCase();
      list = list.filter(s =>
        s.taskTitle.toLowerCase().includes(q) ||
        s.submittedBy.fullName.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (b.status === 'PENDING' && a.status !== 'PENDING') return 1;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
    this.filtered.set(list);
  }

  quickApprove(sub: Submission): void {
    this.http.patch(`${environment.apiUrl}/tasks/${sub.taskId}/submissions/${sub.id}/review`, { decision: 'APPROVED', feedback: 'Approved.' }).subscribe({
      next: () => {
        this.snackBar.open(`Task approved for ${sub.submittedBy.fullName}!`, '✓', { duration: 3000, panelClass: ['success-snackbar'] });
        this.allSubs.update(s => s.map(x => x.id === sub.id ? { ...x, status: 'APPROVED' } : x));
        this.expandedId.set(null);
        this.applyFilter();
      },
      error: err => this.snackBar.open(err?.error?.message ?? 'Approval failed', '', { duration: 3000 })
    });
  }

  reject(sub: Submission): void {
    const fb = this.feedbackMap[sub.id]?.trim();
    if (!fb) return;
    this.http.patch(`${environment.apiUrl}/tasks/${sub.taskId}/submissions/${sub.id}/review`, { decision: 'REJECTED', feedback: fb }).subscribe({
      next: () => {
        this.snackBar.open(`Task rejected. ${sub.submittedBy.fullName} has been notified.`, '', { duration: 3500 });
        this.allSubs.update(s => s.map(x => x.id === sub.id ? { ...x, status: 'REJECTED', reviewFeedback: fb } : x));
        this.expandedId.set(null);
        this.applyFilter();
      },
      error: err => this.snackBar.open(err?.error?.message ?? 'Rejection failed', '', { duration: 3000 })
    });
  }

  imgError(event: any, url: string): void {
    // If image fails to load, replace with a link-only view
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  fmtDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  avatarGrad(name: string): string {
    const g = ['linear-gradient(135deg,#6366f1,#4f46e5)','linear-gradient(135deg,#8b5cf6,#7c3aed)','linear-gradient(135deg,#ec4899,#db2777)','linear-gradient(135deg,#f59e0b,#d97706)','linear-gradient(135deg,#10b981,#059669)','linear-gradient(135deg,#3b82f6,#2563eb)','linear-gradient(135deg,#ef4444,#dc2626)','linear-gradient(135deg,#14b8a6,#0d9488)'];
    let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return g[Math.abs(h) % g.length];
  }

  pBadge(p: string): string { const m: Record<string,string>={LOW:'badge-low',MEDIUM:'badge-medium',HIGH:'badge-high',CRITICAL:'badge-critical',URGENT:'badge-urgent'}; return m[p]??'badge-low'; }
  sBadge(s: string): string { const m: Record<string,string>={PENDING:'badge-under-review',APPROVED:'badge-completed',REJECTED:'badge-rejected'}; return m[s]??'badge-pending'; }
}
