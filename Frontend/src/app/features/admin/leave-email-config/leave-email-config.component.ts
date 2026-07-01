import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface EmailRecipient {
  id: string; email: string; displayName: string; active: boolean;
  leaveTypes?: string; addedBy?: { fullName: string }; createdAt: string;
}

@Component({
  selector: 'app-leave-email-config',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  template: `
<div class="p-4 sm:p-6 max-w-3xl mx-auto fade-in">

  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:24px;flex-wrap:wrap">
    <div>
      <h1 style="font-size:1.5rem;font-weight:700;color:var(--text-primary)">Leave Email Notifications</h1>
      <p style="font-size:13px;color:var(--text-muted);margin-top:3px">
        Configure who receives email notifications when employees raise leave requests
      </p>
    </div>
    <button class="sc-btn sc-btn-primary" (click)="showAdd.set(!showAdd())">
      <mat-icon style="font-size:18px">{{showAdd() ? 'close' : 'add'}}</mat-icon>
      {{showAdd() ? 'Cancel' : 'Add Recipient'}}
    </button>
  </div>

  <div class="sc-alert sc-alert-info" style="margin-bottom:20px">
    <mat-icon>info_outline</mat-icon>
    <div>
      <p style="font-weight:600;margin-bottom:2px">How it works</p>
      <p>When any employee submits a leave request, an email is automatically sent to all <strong>active</strong> recipients listed here. You can restrict notifications per leave type. The employee also receives a decision email when their request is approved or rejected.</p>
    </div>
  </div>

  @if (showAdd()) {
    <div class="sc-card fade-in" style="padding:20px;margin-bottom:20px">
      <p style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:16px">Add Email Recipient</p>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="sc-field">
            <label class="sc-label">Email Address <span style="color:#dc2626">*</span></label>
            <div class="sc-input-group">
              <mat-icon class="sc-input-icon">alternate_email</mat-icon>
              <input [(ngModel)]="newEmail" type="email" class="sc-input" placeholder="manager@company.com">
            </div>
          </div>
          <div class="sc-field">
            <label class="sc-label">Display Name</label>
            <input [(ngModel)]="newDisplayName" type="text" class="sc-input" placeholder="e.g. HR Manager, Team Lead">
          </div>
        </div>
        <div class="sc-field">
          <label class="sc-label">Notify for Leave Types</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
            @for (lt of leaveTypes; track lt.value) {
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 12px;border-radius:8px;border:1.5px solid"
                     [style.border-color]="selectedTypes.includes(lt.value) ? 'var(--brand-600)' : 'var(--border-color)'"
                     [style.background]="selectedTypes.includes(lt.value) ? 'var(--brand-50)' : 'var(--card-bg)'">
                <input type="checkbox" [checked]="selectedTypes.includes(lt.value)" (change)="toggleType(lt.value)"
                       style="width:14px;height:14px;accent-color:var(--brand-600)">
                <span style="font-size:13px;font-weight:500"
                      [style.color]="selectedTypes.includes(lt.value) ? 'var(--brand-700)' : 'var(--text-secondary)'">
                  {{lt.label}}
                </span>
              </label>
            }
          </div>
          <p class="sc-hint">Leave unchecked to receive notifications for ALL leave types</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="sc-btn sc-btn-primary" (click)="addRecipient()" [disabled]="!newEmail.trim() || saving()">
            @if (saving()) { <mat-spinner diameter="16"></mat-spinner> } @else { <mat-icon style="font-size:18px">add</mat-icon> }
            Add Recipient
          </button>
          <button class="sc-btn sc-btn-secondary" (click)="showAdd.set(false)">Cancel</button>
        </div>
        @if (addError()) {
          <div class="sc-alert sc-alert-error"><mat-icon>error_outline</mat-icon><span>{{addError()}}</span></div>
        }
      </div>
    </div>
  }

  @if (loading()) {
    <div style="display:flex;justify-content:center;padding:48px"><mat-spinner diameter="36"></mat-spinner></div>
  } @else if (!recipients().length) {
    <div class="sc-card" style="padding:56px 24px;text-align:center">
      <mat-icon style="font-size:48px;color:var(--neutral-200);display:block;margin:0 auto 14px">email</mat-icon>
      <p style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:6px">No recipients configured</p>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">Add email addresses to receive leave request notifications</p>
      <button class="sc-btn sc-btn-primary sc-btn-sm" (click)="showAdd.set(true)">
        <mat-icon style="font-size:16px">add</mat-icon> Add First Recipient
      </button>
    </div>
  } @else {
    <div class="sc-card" style="padding:0;overflow:hidden">
      <div style="padding:12px 20px;background:var(--page-bg);border-bottom:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between">
        <p style="font-size:13px;font-weight:700;color:var(--text-primary)">
          {{recipients().length}} recipient{{recipients().length!==1?'s':''}} configured
        </p>
        <p style="font-size:12px;color:var(--text-muted)">
          {{activeCount()}} active · {{recipients().length - activeCount()}} disabled
        </p>
      </div>

      @for (r of recipients(); track r.id; let last=$last) {
        <div style="display:flex;align-items:center;gap:14px;padding:14px 20px"
             [style.border-bottom]="!last ? '1px solid var(--border-color)' : 'none'"
             [style.opacity]="r.active ? '1' : '0.55'">

          <div style="width:42px;height:42px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center"
               [style.background]="r.active ? 'var(--brand-50)' : 'var(--hover-bg)'">
            <mat-icon [style.color]="r.active ? 'var(--brand-600)' : 'var(--text-muted)'" style="font-size:20px">
              {{r.active ? 'mark_email_read' : 'email_off'}}
            </mat-icon>
          </div>

          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px">
              <p style="font-size:14px;font-weight:700;color:var(--text-primary)">{{r.displayName}}</p>
              @if (r.active) { <span class="sc-badge badge-completed" style="font-size:10px">Active</span> }
              @else { <span class="sc-badge badge-cancelled" style="font-size:10px">Disabled</span> }
              @if (r.leaveTypes) {
                @for (lt of r.leaveTypes.split(','); track lt) {
                  <span class="sc-badge badge-in-progress" style="font-size:10px">{{lt.trim()}}</span>
                }
              } @else {
                <span class="sc-badge badge-pending" style="font-size:10px">All Types</span>
              }
            </div>
            <p style="font-size:12px;color:var(--text-muted)">{{r.email}}</p>
            @if (r.addedBy) {
              <p style="font-size:11px;color:var(--text-muted);margin-top:2px">Added by {{r.addedBy.fullName}} · {{fmtDate(r.createdAt)}}</p>
            }
          </div>

          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="sc-btn sc-btn-sm" [class.sc-btn-secondary]="r.active" [class.sc-btn-success]="!r.active"
                    (click)="toggleRecipient(r)" [title]="r.active ? 'Disable' : 'Enable'">
              <mat-icon style="font-size:15px">{{r.active ? 'pause' : 'play_arrow'}}</mat-icon>
              {{r.active ? 'Disable' : 'Enable'}}
            </button>
            <button class="sc-btn sc-btn-secondary sc-btn-icon sc-btn-sm" (click)="deleteRecipient(r)" title="Remove recipient">
              <mat-icon style="font-size:15px;color:#dc2626">delete_outline</mat-icon>
            </button>
          </div>
        </div>
      }
    </div>
  }

  <div style="margin-top:20px;padding:16px 18px;background:var(--hover-bg);border-radius:12px;border:1px solid var(--border-color)">
    <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted);margin-bottom:8px">
      Email Template Preview
    </p>
    <p style="font-size:13px;color:var(--text-secondary);line-height:1.6">
      <strong>Subject:</strong> [SyntaxCore WMS] Leave Request — John Doe (Sick Leave, 2 days)<br>
      <strong>Body:</strong> Includes employee name, email, leave type, date range, total days, reason, and a link to review in the system.
    </p>
    <p style="font-size:12px;color:var(--text-muted);margin-top:8px">
      Configure email credentials in <code style="background:var(--border-color);padding:1px 5px;border-radius:4px">.env</code> — see <strong>EMAIL_SETUP.md</strong> for Gmail/SendGrid/SES setup.
    </p>
  </div>
</div>
  `,
  styles: [':host{display:block}']
})
export class LeaveEmailConfigComponent implements OnInit {
  recipients   = signal<EmailRecipient[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  showAdd      = signal(false);
  addError     = signal('');
  newEmail        = '';
  newDisplayName  = '';
  selectedTypes: string[] = [];

  activeCount = () => this.recipients().filter(r => r.active).length;

  leaveTypes = [
    { value: 'SICK',       label: 'Sick' },
    { value: 'CASUAL',     label: 'Casual' },
    { value: 'ANNUAL',     label: 'Annual' },
    { value: 'MATERNITY',  label: 'Maternity' },
    { value: 'PATERNITY',  label: 'Paternity' },
    { value: 'UNPAID',     label: 'Unpaid' },
    { value: 'COMPENSATORY', label: 'Compensatory' },
  ];

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<EmailRecipient[]>(`${environment.apiUrl}/leave-email-config`).subscribe({
      next: r => { this.recipients.set(r); this.loading.set(false); },
      error: () => { this.recipients.set([]); this.loading.set(false); }
    });
  }

  toggleType(type: string): void {
    const idx = this.selectedTypes.indexOf(type);
    if (idx >= 0) this.selectedTypes.splice(idx, 1);
    else this.selectedTypes.push(type);
  }

  addRecipient(): void {
    this.addError.set('');
    if (!this.newEmail.trim()) { this.addError.set('Email is required'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newEmail.trim())) { this.addError.set('Enter a valid email address'); return; }

    this.saving.set(true);
    const payload = {
      email:        this.newEmail.trim().toLowerCase(),
      displayName:  this.newDisplayName.trim() || this.newEmail.trim(),
      leaveTypes:   this.selectedTypes.length > 0 ? this.selectedTypes.join(',') : null,
    };

    this.http.post<EmailRecipient>(`${environment.apiUrl}/leave-email-config`, payload).subscribe({
      next: r => {
        this.recipients.update(list => [r, ...list]);
        this.newEmail = ''; this.newDisplayName = ''; this.selectedTypes = [];
        this.showAdd.set(false); this.saving.set(false);
        this.snackBar.open(`${r.email} added as leave notification recipient!`, '✓', {
          duration: 3000, panelClass: ['success-snackbar']
        });
      },
      error: err => {
        this.addError.set(err?.error?.message ?? 'Failed to add recipient. Please try again.');
        this.saving.set(false);
      }
    });
  }

  toggleRecipient(r: EmailRecipient): void {
    this.http.patch<EmailRecipient>(`${environment.apiUrl}/leave-email-config/${r.id}/toggle`, {}).subscribe({
      next: updated => {
        this.recipients.update(list => list.map(x => x.id === r.id ? updated : x));
        this.snackBar.open(`${r.email} ${updated.active ? 'enabled' : 'disabled'} successfully`, '✓', { duration: 2500 });
      },
      error: () => this.snackBar.open('Failed to update', '', { duration: 2000 })
    });
  }

  deleteRecipient(r: EmailRecipient): void {
    if (!confirm(`Remove ${r.email} from leave notifications?`)) return;
    this.http.delete(`${environment.apiUrl}/leave-email-config/${r.id}`).subscribe({
      next: () => {
        this.recipients.update(list => list.filter(x => x.id !== r.id));
        this.snackBar.open(`${r.email} removed`, '', { duration: 2500 });
      },
      error: () => this.snackBar.open('Failed to remove', '', { duration: 2000 })
    });
  }

  fmtDate(d: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
  }
}
