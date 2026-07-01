import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { AccessControlService } from '../../../core/services/access-control.service';
import { environment } from '../../../../environments/environment';

interface Exam { id:string; title:string; subject?:string; totalMarks:number; passingMarks:number; durationMinutes:number; status:string; startTime?:string; questionCount:number; createdBy?:{fullName:string}; myAttempt?:{score?:number;status:string}; }

@Component({
  selector: 'app-exam-list', standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule, MatProgressSpinnerModule],
  template: `
<div class="p-4 sm:p-6 max-w-5xl mx-auto fade-in">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:24px;flex-wrap:wrap">
    <div>
      <h1 style="font-size:1.5rem;font-weight:700;color:var(--text-primary)">Exam Portal</h1>
      <p style="font-size:13px;color:var(--text-muted);margin-top:3px">Assessments, tests and evaluations</p>
    </div>
    @if (canManage()) {
      <a routerLink="/exams/new" class="sc-btn sc-btn-primary" style="text-decoration:none">
        <mat-icon style="font-size:18px">add</mat-icon> Create Exam
      </a>
    }
  </div>

  <div class="sc-filter-bar">
    <div class="sc-filter-search" style="flex:1;max-width:260px">
      <mat-icon>search</mat-icon>
      <input [(ngModel)]="q" placeholder="Search exams…" (input)="apply()">
    </div>
    <div class="sc-filter-item">
      <span class="sc-filter-label">Status</span>
      <select class="sc-filter-select" [(ngModel)]="fs" (change)="apply()">
        <option value="">All</option>
        <option value="PUBLISHED">Upcoming</option>
        <option value="ACTIVE">Live Now</option>
        <option value="COMPLETED">Completed</option>
        @if (canManage()) { <option value="DRAFT">Draft</option> }
      </select>
    </div>
  </div>

  @if (loading()) { <div style="display:flex;justify-content:center;padding:60px"><mat-spinner diameter="36"></mat-spinner></div>
  } @else if (!filtered().length) {
    <div class="sc-card" style="padding:56px 24px;text-align:center">
      <mat-icon style="font-size:52px;color:var(--neutral-200);display:block;margin:0 auto 14px">quiz</mat-icon>
      <p style="font-size:15px;font-weight:600;color:var(--text-primary)">No exams found</p>
      <p style="font-size:13px;color:var(--text-muted)">{{canManage() ? 'Create your first exam' : 'No exams scheduled for you yet'}}</p>
    </div>
  } @else {
    <div style="display:flex;flex-direction:column;gap:12px">
      @for (e of filtered(); track e.id) {
        <div class="sc-card hover-lift" style="padding:0;overflow:hidden">
          <div style="height:4px" [style.background]="sColor(e.status)"></div>
          <div style="padding:18px 20px">
            <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
              <div style="width:50px;height:50px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0" [style.background]="sBg(e.status)">
                <mat-icon [style.color]="sColor(e.status)" style="font-size:24px">{{sIcon(e.status)}}</mat-icon>
              </div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
                  <p style="font-size:15px;font-weight:700;color:var(--text-primary)">{{e.title}}</p>
                  <span class="sc-badge" [class]="sBadge(e.status)" style="font-size:11px">{{e.status==='ACTIVE'?'🔴 Live':e.status}}</span>
                  @if (e.subject) { <span style="font-size:12px;color:var(--text-muted)">· {{e.subject}}</span> }
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:4px">
                  <span style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:3px"><mat-icon style="font-size:13px">timer</mat-icon>{{e.durationMinutes}}m</span>
                  <span style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:3px"><mat-icon style="font-size:13px">quiz</mat-icon>{{e.questionCount}} Qs</span>
                  <span style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:3px"><mat-icon style="font-size:13px">star</mat-icon>{{e.totalMarks}} marks (pass: {{e.passingMarks}})</span>
                </div>
                @if (e.myAttempt?.score != null) {
                  <div style="margin-top:8px;display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px"
                       [style.background]="e.myAttempt!.score! >= e.passingMarks ? '#dcfce7' : '#fee2e2'">
                    <mat-icon style="font-size:14px" [style.color]="e.myAttempt!.score! >= e.passingMarks ? '#16a34a' : '#dc2626'">{{e.myAttempt!.score! >= e.passingMarks ? 'check_circle' : 'cancel'}}</mat-icon>
                    <span style="font-size:12px;font-weight:700" [style.color]="e.myAttempt!.score! >= e.passingMarks ? '#15803d' : '#b91c1c'">
                      Score: {{e.myAttempt!.score}}/{{e.totalMarks}} · {{e.myAttempt!.score! >= e.passingMarks ? 'PASSED' : 'FAILED'}}
                    </span>
                  </div>
                }
              </div>
              <div style="display:flex;gap:8px;flex-shrink:0;align-items:flex-start">
                @if (canManage()) {
                  <a [routerLink]="['/exams', e.id, 'results']" class="sc-btn sc-btn-secondary sc-btn-sm" style="text-decoration:none">
                    <mat-icon style="font-size:15px">assessment</mat-icon> Results
                  </a>
                  <a [routerLink]="['/exams', e.id, 'edit']" class="sc-btn sc-btn-secondary sc-btn-icon sc-btn-sm" style="text-decoration:none"><mat-icon style="font-size:16px">edit</mat-icon></a>
                  <button class="sc-btn sc-btn-secondary sc-btn-icon sc-btn-sm" (click)="deleteExam(e)" title="Delete exam"><mat-icon style="font-size:16px;color:#dc2626">delete_outline</mat-icon></button>
                }
                @if (canTake(e)) {
                  <a [routerLink]="['/exams', e.id, 'take']" class="sc-btn sc-btn-primary" style="text-decoration:none">
                    <mat-icon style="font-size:18px">play_arrow</mat-icon> Start
                  </a>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  }
</div>
  `,
  styles: [':host{display:block}']
})
export class ExamListComponent implements OnInit {
  all = signal<Exam[]>([]); filtered = signal<Exam[]>([]); loading = signal(true);
  q = ''; fs = '';

  constructor(private http: HttpClient, public auth: AuthService, private accessControl: AccessControlService, private snackBar: MatSnackBar) {}

  canManage(): boolean { return this.accessControl.canManageExams(this.auth.currentUser()?.role); }

  deleteExam(e: Exam): void {
    if (!confirm(`Delete "${e.title}"? This cannot be undone.`)) return;
    this.http.delete(`${environment.apiUrl}/exams/${e.id}`).subscribe({
      next: () => {
        this.all.update(list => list.filter(x => x.id !== e.id));
        this.apply();
        this.snackBar.open('Exam deleted', '✓', { duration: 2500, panelClass: ['success-snackbar'] });
      },
      error: err => {
        const msg = err?.status === 403 ? 'You do not have permission to delete exams' : 'Failed to delete exam';
        this.snackBar.open(msg, '', { duration: 3000, panelClass: ['error-snackbar'] });
      }
    });
  }
  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<Exam[]>(`${environment.apiUrl}/exams`).subscribe({
      next: e => { this.all.set(e); this.apply(); this.loading.set(false); },
      error: () => { this.all.set(this.mock()); this.apply(); this.loading.set(false); }
    });
  }

  apply(): void {
    let list = [...this.all()];
    if (this.fs) list = list.filter(e => e.status === this.fs);
    if (this.q.trim()) { const q=this.q.toLowerCase(); list=list.filter(e=>e.title.toLowerCase().includes(q)||(e.subject??'').toLowerCase().includes(q)); }
    const o: Record<string,number> = {ACTIVE:0,PUBLISHED:1,COMPLETED:2,DRAFT:3};
    list.sort((a,b)=>(o[a.status]??9)-(o[b.status]??9));
    this.filtered.set(list);
  }

  canTake(e: Exam): boolean {
    return this.accessControl.canTakeExams(this.auth.currentUser()?.role)
      && (e.status==='ACTIVE'||e.status==='PUBLISHED')
      && e.myAttempt?.status!=='SUBMITTED';
  }

  sColor(s: string): string { const m:Record<string,string>={DRAFT:'#94a3b8',PUBLISHED:'#6366f1',ACTIVE:'#ef4444',COMPLETED:'#10b981'}; return m[s]??'#94a3b8'; }
  sBg(s: string): string { const m:Record<string,string>={DRAFT:'#f1f5f9',PUBLISHED:'#ede9fe',ACTIVE:'#fee2e2',COMPLETED:'#dcfce7'}; return m[s]??'#f1f5f9'; }
  sBadge(s: string): string { const m:Record<string,string>={DRAFT:'badge-cancelled',PUBLISHED:'badge-in-progress',ACTIVE:'badge-rejected',COMPLETED:'badge-completed'}; return m[s]??'badge-pending'; }
  sIcon(s: string): string { const m:Record<string,string>={DRAFT:'edit_note',PUBLISHED:'event',ACTIVE:'radio_button_checked',COMPLETED:'check_circle'}; return m[s]??'quiz'; }

  mock(): Exam[] {
    return [
      {id:'1',title:'JavaScript Fundamentals',subject:'JavaScript',totalMarks:20,passingMarks:10,durationMinutes:45,status:'ACTIVE',questionCount:5,createdBy:{fullName:'Tech Lead'}},
      {id:'2',title:'Company Policy Quiz Q2',subject:'HR Policy',totalMarks:30,passingMarks:20,durationMinutes:20,status:'PUBLISHED',questionCount:15,createdBy:{fullName:'HR Manager'}},
      {id:'3',title:'React & Angular Assessment',subject:'Frontend',totalMarks:100,passingMarks:60,durationMinutes:90,status:'COMPLETED',questionCount:40,createdBy:{fullName:'CTO'},myAttempt:{score:78,status:'SUBMITTED'}},
    ];
  }
}
