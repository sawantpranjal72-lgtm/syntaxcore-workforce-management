import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-leaves',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatChipsModule, MatProgressSpinnerModule, MatTabsModule,
    MatDatepickerModule, MatNativeDateModule],
  template: `
<div class="p-4 sm:p-6 max-w-5xl mx-auto">

  <!-- Header -->
  <div class="flex items-start justify-between mb-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Leave Management</h1>
      <p class="text-slate-500 text-sm mt-0.5">Apply and track leave requests</p>
    </div>
    <button mat-flat-button color="primary" (click)="showForm.set(!showForm())">
      <mat-icon>{{showForm() ? 'close' : 'add'}}</mat-icon>
      {{showForm() ? 'Cancel' : 'Apply Leave'}}
    </button>
  </div>

  <!-- Apply leave form -->
  @if (showForm()) {
    <div class="rounded-2xl border p-5 mb-6 animate-fade-in"
         style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
      <h3 class="font-semibold text-slate-900 dark:text-white mb-4">New Leave Request</h3>
      <form [formGroup]="leaveForm" (ngSubmit)="submitLeave()" class="space-y-4">
        <div class="grid sm:grid-cols-2 gap-4">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Leave Type</mat-label>
            <mat-select formControlName="leaveType">
              @for (t of leaveTypes; track t.value) {
                <mat-option [value]="t.value">{{t.label}}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Half Day?</mat-label>
            <mat-select formControlName="halfDay">
              <mat-option [value]="false">Full Day</mat-option>
              <mat-option [value]="true">Half Day</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Start Date</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate" readonly>
            <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>End Date</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate" [min]="leaveForm.get('startDate')?.value" readonly>
            <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Reason</mat-label>
          <textarea matInput formControlName="reason" rows="3"
                    placeholder="Please provide a reason for your leave request..."></textarea>
          @if (leaveForm.get('reason')?.invalid && leaveForm.get('reason')?.touched) {
            <mat-error>Reason is required</mat-error>
          }
        </mat-form-field>
        <div class="flex gap-3">
          <button mat-flat-button color="primary" type="submit" [disabled]="leaveForm.invalid || submitting()">
            @if (submitting()) { <mat-spinner diameter="18" class="inline mr-2"></mat-spinner> }
            Submit Request
          </button>
          <button mat-stroked-button type="button" (click)="showForm.set(false)">Cancel</button>
        </div>
      </form>
    </div>
  }

  <!-- Tabs -->
  <mat-tab-group animationDuration="200ms">

    <!-- My Leaves -->
    <mat-tab label="My Requests">
      <div class="pt-4 space-y-3">
        @if (loading()) {
          <div class="flex justify-center py-10"><mat-spinner diameter="32"></mat-spinner></div>
        }
        @for (leave of myLeaves(); track leave.id) {
          <div class="rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4"
               style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" [ngClass]="typeChip(leave.leaveType)">
                  {{leave.leaveType?.replace('_',' ')}}
                </span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-medium" [ngClass]="statusChip(leave.status)">
                  {{leave.status}}
                </span>
              </div>
              <p class="text-sm font-medium text-slate-900 dark:text-white mt-1">
                {{formatDate(leave.startDate)}}
                @if (leave.startDate !== leave.endDate) { — {{formatDate(leave.endDate)}} }
                <span class="text-slate-400 font-normal"> ({{leave.totalDays}} day{{leave.totalDays > 1 ? 's' : ''}})</span>
              </p>
              <p class="text-xs text-slate-400 mt-0.5 truncate">{{leave.reason}}</p>
              @if (leave.reviewComment) {
                <p class="text-xs text-indigo-600 mt-1">
                  <mat-icon class="text-xs align-middle">comment</mat-icon>
                  {{leave.reviewComment}}
                </p>
              }
            </div>
            @if (leave.status === 'PENDING') {
              <button mat-stroked-button color="warn" (click)="cancelLeave(leave.id)" class="flex-shrink-0">
                Cancel
              </button>
            }
          </div>
        }
        @if (!myLeaves().length && !loading()) {
          <div class="text-center py-12">
            <mat-icon class="text-5xl text-slate-200 mb-3">event_busy</mat-icon>
            <p class="text-slate-400">No leave requests yet</p>
          </div>
        }
      </div>
    </mat-tab>

    <!-- All Leaves (HR/Admin/PM) -->
    @if (isManager()) {
      <mat-tab label="All Requests">
        <div class="pt-4">
          <!-- Filter bar for manager view -->
          <div class="sc-filter-bar mb-4">
            <div class="sc-filter-item">
              <span class="sc-filter-label">Status</span>
              <select class="sc-filter-select" [(ngModel)]="filterLeaveStatus" (change)="filterAllLeaves()">
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div class="sc-filter-item">
              <span class="sc-filter-label">Type</span>
              <select class="sc-filter-select" [(ngModel)]="filterLeaveType" (change)="filterAllLeaves()">
                <option value="">All Types</option>
                @for (lt of leaveTypes; track lt.value) { <option [value]="lt.value">{{lt.label}}</option> }
              </select>
            </div>
            <div class="sc-filter-search" style="flex:1;max-width:220px">
              <mat-icon>search</mat-icon>
              <input [(ngModel)]="leaveSearchQ" placeholder="Search employee…" (input)="filterAllLeaves()">
            </div>
            @if (pendingLeaveCount() > 0) {
              <span class="sc-badge badge-under-review" style="margin-left:auto">
                {{pendingLeaveCount()}} awaiting review
              </span>
            }
          </div>

          <div style="display:flex;flex-direction:column;gap:10px">
            @for (leave of filteredAllLeaves(); track leave.id) {
              <div class="sc-card" style="padding:18px 20px">
                <div class="flex flex-col sm:flex-row sm:items-start gap-4">
                  <!-- Employee avatar + info -->
                  <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
                    <div class="sc-avatar sc-avatar-lg" style="flex-shrink:0;background:linear-gradient(135deg,#6366f1,#4f46e5)">
                      {{initials(leave.userName)}}
                    </div>
                    <div style="min-width:0">
                      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:4px">
                        <span style="font-size:15px;font-weight:700;color:var(--text-primary)">
                          {{leave.userName ?? 'Unknown Employee'}}
                        </span>
                        @if (leave.userRole) {
                          <span style="font-size:11px;color:var(--text-muted);font-weight:500">
                            {{leave.userRole}}
                          </span>
                        }
                        @if (leave.userEmployeeId) {
                          <span style="font-size:11px;color:var(--text-muted)">· {{leave.userEmployeeId}}</span>
                        }
                      </div>
                      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:6px">
                        <span class="sc-badge" [class]="typeChip2(leave.leaveType)">
                          {{leave.leaveType?.replace('_',' ')}}
                        </span>
                        <span class="sc-badge" [class]="statusChip2(leave.status)">{{leave.status}}</span>
                        @if (leave.halfDay) { <span class="sc-badge badge-low">Half Day</span> }
                      </div>
                      <p style="font-size:13px;color:var(--text-secondary)">
                        <mat-icon style="font-size:14px;vertical-align:middle">date_range</mat-icon>
                        {{formatDate(leave.startDate)}} — {{formatDate(leave.endDate)}}
                        <strong>({{leave.totalDays}} day{{leave.totalDays > 1 ? 's' : ''}})</strong>
                      </p>
                      @if (leave.reason) {
                        <p style="font-size:12px;color:var(--text-muted);margin-top:4px;font-style:italic">
                          "{{leave.reason}}"
                        </p>
                      }
                    </div>
                  </div>

                  <!-- Actions -->
                  <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;flex-shrink:0">
                    @if (leave.status === 'PENDING') {
                      <button class="sc-btn sc-btn-success sc-btn-sm" (click)="openApproveDialog(leave)">
                        <mat-icon style="font-size:16px">check_circle</mat-icon> Approve
                      </button>
                      <button class="sc-btn sc-btn-danger sc-btn-sm" (click)="openRejectDialog(leave)">
                        <mat-icon style="font-size:16px">cancel</mat-icon> Reject
                      </button>
                    } @else {
                      <p style="font-size:12px;color:var(--text-muted);text-align:right">
                        {{leave.status}} on<br>{{formatDate(leave.updatedAt ?? leave.createdAt)}}
                      </p>
                      @if (leave.reviewComment) {
                        <p style="font-size:12px;color:var(--text-muted);font-style:italic;max-width:200px;text-align:right">
                          "{{leave.reviewComment}}"
                        </p>
                      }
                    }
                  </div>
                </div>
              </div>
            }
            @if (!filteredAllLeaves().length) {
              <div class="sc-card" style="padding:48px 24px;text-align:center">
                <mat-icon style="font-size:40px;color:var(--neutral-200);display:block;margin:0 auto 12px">event_busy</mat-icon>
                <p style="color:var(--text-muted);font-size:14px">No leave requests found</p>
              </div>
            }
          </div>
        </div>
      </mat-tab>
    }

  <!-- Approve Confirmation Dialog -->
  @if (approveDialog()) {
    <div class="sc-modal-overlay" (click)="approveDialog.set(null)">
      <div class="sc-modal" style="max-width:460px" (click)="$event.stopPropagation()">
        <div class="sc-modal-header">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:40px;height:40px;border-radius:10px;background:#dcfce7;display:flex;align-items:center;justify-content:center">
              <mat-icon style="color:#16a34a">check_circle</mat-icon>
            </div>
            <div>
              <h3 style="font-size:16px;font-weight:700;color:var(--text-primary)">Approve Leave Request</h3>
              <p style="font-size:12px;color:var(--text-muted)">Confirm approval for employee</p>
            </div>
          </div>
          <button (click)="approveDialog.set(null)" style="background:none;border:none;cursor:pointer;color:var(--text-muted)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <div class="sc-modal-body">
          <!-- Employee summary -->
          <div style="background:var(--info-bg);border:1px solid var(--info-border);border-radius:12px;padding:16px;margin-bottom:16px">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="sc-avatar sc-avatar-lg" style="background:linear-gradient(135deg,#6366f1,#4f46e5);flex-shrink:0">
                {{initials(approveDialog()!.userName)}}
              </div>
              <div>
                <p style="font-size:15px;font-weight:700;color:var(--brand-800)">
                  {{approveDialog()!.userName ?? 'Unknown Employee'}}
                </p>
                <p style="font-size:12px;color:var(--brand-600)">
                  {{approveDialog()!.leaveType?.replace('_',' ')}} Leave ·
                  {{formatDate(approveDialog()!.startDate)}} – {{formatDate(approveDialog()!.endDate)}} ·
                  {{approveDialog()!.totalDays}} day(s)
                </p>
                @if (approveDialog()!.reason) {
                  <p style="font-size:12px;color:var(--brand-700);margin-top:4px;font-style:italic">"{{approveDialog()!.reason}}"</p>
                }
              </div>
            </div>
          </div>
          <div class="sc-field">
            <label class="sc-label">Approval Comment (optional)</label>
            <textarea class="sc-textarea" [(ngModel)]="approveComment" rows="2"
                      placeholder="Add a note for the employee…" style="min-height:72px"></textarea>
          </div>
        </div>
        <div class="sc-modal-footer">
          <button class="sc-btn sc-btn-secondary" (click)="approveDialog.set(null)">Cancel</button>
          <button class="sc-btn sc-btn-success" (click)="confirmApprove()" [disabled]="actionLoading()">
            <mat-icon style="font-size:18px">check_circle</mat-icon>
            Approve Leave
          </button>
        </div>
      </div>
    </div>
  }

  <!-- Reject Dialog -->
  @if (rejectDialog()) {
    <div class="sc-modal-overlay" (click)="rejectDialog.set(null)">
      <div class="sc-modal" style="max-width:460px" (click)="$event.stopPropagation()">
        <div class="sc-modal-header">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:40px;height:40px;border-radius:10px;background:#fee2e2;display:flex;align-items:center;justify-content:center">
              <mat-icon style="color:#dc2626">cancel</mat-icon>
            </div>
            <div>
              <h3 style="font-size:16px;font-weight:700;color:var(--text-primary)">Reject Leave Request</h3>
              <p style="font-size:12px;color:var(--text-muted)">
                {{rejectDialog()!.userName ?? 'Unknown Employee'}}
              </p>
            </div>
          </div>
          <button (click)="rejectDialog.set(null)" style="background:none;border:none;cursor:pointer;color:var(--text-muted)">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        <div class="sc-modal-body">
          <div class="sc-alert sc-alert-warning" style="margin-bottom:14px">
            <mat-icon>info_outline</mat-icon>
            <span>Rejecting will notify <strong>{{firstNameOf(rejectDialog()!.userName)}}</strong> via notification and email.</span>
          </div>
          <div class="sc-field">
            <label class="sc-label">Rejection Reason <span class="req">*</span></label>
            <textarea class="sc-textarea" [(ngModel)]="rejectComment" rows="3"
                      placeholder="Explain why the leave request is being rejected…"></textarea>
            @if (!rejectComment.trim() && rejectAttempted) {
              <p class="sc-error"><mat-icon style="font-size:14px">error_outline</mat-icon>Please provide a reason</p>
            }
          </div>
        </div>
        <div class="sc-modal-footer">
          <button class="sc-btn sc-btn-secondary" (click)="rejectDialog.set(null);rejectAttempted=false">Cancel</button>
          <button class="sc-btn sc-btn-danger" (click)="confirmReject()" [disabled]="actionLoading()">
            <mat-icon style="font-size:18px">cancel</mat-icon>
            Reject Leave
          </button>
        </div>
      </div>
    </div>
  }
  </mat-tab-group>
</div>
  `,
  styles: [`:host{display:block} mat-form-field{width:100%}`]
})
export class LeavesComponent implements OnInit {
  myLeaves   = signal<any[]>([]);
  allLeaves  = signal<any[]>([]);
  filteredAll= signal<any[]>([]);
  loading    = signal(false);
  submitting = signal(false);
  showForm   = signal(false);
  actionLoading = signal(false);
  leaveForm: FormGroup;

  // Filter state
  filterLeaveStatus = 'PENDING';
  filterLeaveType   = '';
  leaveSearchQ      = '';

  // Dialog state
  approveDialog = signal<any>(null);
  rejectDialog  = signal<any>(null);
  approveComment = '';
  rejectComment  = '';
  rejectAttempted = false;

  isManager = () => this.authService.isManager();

  pendingLeaveCount = () => this.allLeaves().filter(l => l.status === 'PENDING').length;
  filteredAllLeaves = () => this.filteredAll();

  leaveTypes = [
    { value: 'SICK',       label: 'Sick Leave' },
    { value: 'CASUAL',     label: 'Casual Leave' },
    { value: 'ANNUAL',     label: 'Annual Leave' },
    { value: 'MATERNITY',  label: 'Maternity Leave' },
    { value: 'PATERNITY',  label: 'Paternity Leave' },
    { value: 'UNPAID',     label: 'Unpaid Leave' },
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.leaveForm = this.fb.group({
      leaveType: ['CASUAL', Validators.required],
      startDate: ['', Validators.required],
      endDate:   ['', Validators.required],
      reason:    ['', [Validators.required, Validators.minLength(10)]],
      halfDay:   [false]
    });
  }

  ngOnInit(): void {
    this.loadMyLeaves();
    if (this.isManager()) this.loadAllLeaves();
  }

  loadMyLeaves(): void {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/leaves/my?size=20`).subscribe({
      next: r => { this.myLeaves.set(r.content ?? []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  loadAllLeaves(): void {
    this.http.get<any>(`${environment.apiUrl}/leaves?size=100`).subscribe({
      next: r => { this.allLeaves.set(r.content ?? []); this.filterAllLeaves(); },
      error: () => {}
    });
  }

  filterAllLeaves(): void {
    let list = [...this.allLeaves()];
    if (this.filterLeaveStatus) list = list.filter(l => l.status === this.filterLeaveStatus);
    if (this.filterLeaveType)   list = list.filter(l => l.leaveType === this.filterLeaveType);
    if (this.leaveSearchQ.trim()) {
      const q = this.leaveSearchQ.toLowerCase();
      list = list.filter(l => {
        const name = (l.userName ?? '').toLowerCase();
        return name.includes(q);
      });
    }
    // Sort: PENDING first, then newest
    list.sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (b.status === 'PENDING' && a.status !== 'PENDING') return 1;
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });
    this.filteredAll.set(list);
  }

  submitLeave(): void {
    if (this.leaveForm.invalid) { this.leaveForm.markAllAsTouched(); return; }
    const start = this.leaveForm.value.startDate as Date | string;
    const end = this.leaveForm.value.endDate as Date | string;
    if (new Date(end).getTime() < new Date(start).getTime()) {
      this.snackBar.open('End date cannot be before start date', 'Close', { duration: 2500 });
      return;
    }
    this.submitting.set(true);
    const body = {
      ...this.leaveForm.value,
      startDate: this.formatDateForApi(start),
      endDate: this.formatDateForApi(end),
      halfDay: String(this.leaveForm.value.halfDay)
    };
    this.http.post<any>(`${environment.apiUrl}/leaves`, body).subscribe({
      next: r => {
        this.myLeaves.update(l => [r, ...l]);
        this.showForm.set(false);
        this.leaveForm.reset({ leaveType: 'CASUAL', startDate: '', endDate: '', reason: '', halfDay: false });
        this.submitting.set(false);
        this.snackBar.open('Leave request submitted!', '', { duration: 2500, panelClass: ['success-snackbar'] });
      },
      error: err => {
        this.snackBar.open(err?.error?.message ?? 'Failed to submit', 'Close', { duration: 3000 });
        this.submitting.set(false);
      }
    });
  }

  cancelLeave(id: string): void {
    this.http.patch(`${environment.apiUrl}/leaves/${id}/cancel`, {}).subscribe({
      next: () => { this.loadMyLeaves(); this.snackBar.open('Leave cancelled', '', { duration: 2000 }); }
    });
  }

  openApproveDialog(leave: any): void {
    this.approveDialog.set(leave);
    this.approveComment = '';
  }

  openRejectDialog(leave: any): void {
    this.rejectDialog.set(leave);
    this.rejectComment = '';
    this.rejectAttempted = false;
  }

  confirmApprove(): void {
    const leave = this.approveDialog();
    if (!leave) return;
    this.actionLoading.set(true);
    this.http.patch(`${environment.apiUrl}/leaves/${leave.id}/approve`, { comment: this.approveComment }).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.approveDialog.set(null);
        this.loadAllLeaves();
        this.snackBar.open(
          `Leave approved for ${leave.userName ?? 'employee'}`,
          '✓', { duration: 3000, panelClass: ['success-snackbar'] }
        );
      },
      error: err => {
        this.actionLoading.set(false);
        this.snackBar.open(err?.error?.message ?? 'Approval failed', '', { duration: 3000 });
      }
    });
  }

  confirmReject(): void {
    const leave = this.rejectDialog();
    if (!leave) return;
    if (!this.rejectComment.trim()) { this.rejectAttempted = true; return; }
    this.actionLoading.set(true);
    this.http.patch(`${environment.apiUrl}/leaves/${leave.id}/reject`, { comment: this.rejectComment }).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.rejectDialog.set(null);
        this.rejectAttempted = false;
        this.loadAllLeaves();
        this.snackBar.open(
          `Leave rejected for ${leave.userName ?? 'employee'}`,
          '', { duration: 3000 }
        );
      },
      error: err => {
        this.actionLoading.set(false);
        this.snackBar.open(err?.error?.message ?? 'Rejection failed', '', { duration: 3000 });
      }
    });
  }

  approveLeave(id: string): void { /* legacy */ }
  rejectLeave(id: string): void { /* legacy */ }

  /** Derives avatar initials (e.g. "Arjun Mehta" → "AM") from the flat
   * userName string returned by LeaveResponse — there is no nested user object. */
  initials(name: string | null | undefined): string {
    if (!name?.trim()) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length === 1
      ? parts[0].charAt(0).toUpperCase()
      : (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /** Returns just the first name from a flat full-name string. */
  firstNameOf(name: string | null | undefined): string {
    if (!name?.trim()) return 'the employee';
    return name.trim().split(/\s+/)[0];
  }

  formatDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  typeChip2(t: string): string {
    const m: Record<string,string> = {
      SICK:'badge-rejected', CASUAL:'badge-in-progress', ANNUAL:'badge-completed',
      MATERNITY:'badge-urgent', PATERNITY:'badge-medium', UNPAID:'badge-cancelled'
    };
    return m[t] ?? 'badge-pending';
  }

  statusChip2(s: string): string {
    const m: Record<string,string> = {
      PENDING:'badge-under-review', APPROVED:'badge-completed',
      REJECTED:'badge-rejected', CANCELLED:'badge-cancelled'
    };
    return m[s] ?? 'badge-pending';
  }

  typeChip(t: string): string {
    const m: Record<string,string> = {
      SICK: 'bg-red-100 text-red-700', CASUAL: 'bg-blue-100 text-blue-700',
      ANNUAL: 'bg-green-100 text-green-700', MATERNITY: 'bg-pink-100 text-pink-700',
      PATERNITY: 'bg-indigo-100 text-indigo-700', UNPAID: 'bg-slate-100 text-slate-700'
    };
    return m[t] ?? 'bg-slate-100 text-slate-600';
  }

  statusChip(s: string): string {
    const m: Record<string,string> = {
      PENDING: 'bg-yellow-100 text-yellow-700', APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700', CANCELLED: 'bg-slate-100 text-slate-600'
    };
    return m[s] ?? 'bg-slate-100 text-slate-600';
  }

  private formatDateForApi(value: Date | string): string {
    if (typeof value === 'string') return value;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
