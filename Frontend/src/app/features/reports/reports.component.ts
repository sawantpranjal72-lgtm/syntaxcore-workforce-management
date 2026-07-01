import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ReportDef {
  type: string; title: string; desc: string;
  icon: string; color: string; bg: string;
}

interface ExportRecord {
  id: number; title: string; format: string; time: string; blob?: Blob; fileName: string;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule,
    MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule],
  template: `
<div class="p-4 sm:p-6 max-w-6xl mx-auto">
  <!-- Header -->
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
    <p class="text-slate-500 text-sm mt-0.5">Generate and download workforce reports as PDF or Excel</p>
  </div>

  <!-- Date range filter -->
  <div class="rounded-2xl border p-5 mb-6"
       style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
    <h3 class="font-semibold text-slate-900 dark:text-white mb-3">Date Range</h3>
    <div class="flex flex-wrap gap-4 items-end">
      <div>
        <label class="block text-xs font-medium text-slate-500 mb-1">From Date</label>
        <mat-form-field appearance="outline" class="report-date-field">
          <input matInput [matDatepicker]="fromPicker" [(ngModel)]="fromDate" readonly>
          <mat-datepicker-toggle matIconSuffix [for]="fromPicker"></mat-datepicker-toggle>
          <mat-datepicker #fromPicker></mat-datepicker>
        </mat-form-field>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-500 mb-1">To Date</label>
        <mat-form-field appearance="outline" class="report-date-field">
          <input matInput [matDatepicker]="toPicker" [(ngModel)]="toDate" [min]="fromDate" readonly>
          <mat-datepicker-toggle matIconSuffix [for]="toPicker"></mat-datepicker-toggle>
          <mat-datepicker #toPicker></mat-datepicker>
        </mat-form-field>
      </div>
      <!-- Quick presets -->
      <div class="flex gap-2">
        @for (p of presets; track p.label) {
          <button (click)="applyPreset(p)"
                  class="px-3 py-2 rounded-xl text-xs font-medium border transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                  style="border-color:var(--border-color,#e2e8f0);color:var(--text-muted)">
            {{p.label}}
          </button>
        }
      </div>
    </div>
  </div>

  <!-- Report cards -->
  <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
    @for (r of reports; track r.type) {
      <div class="rounded-2xl border p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
           style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
        <div class="flex items-start gap-3">
          <div class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" [ngClass]="r.bg">
            <mat-icon [ngClass]="r.color">{{r.icon}}</mat-icon>
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-slate-900 dark:text-white text-sm">{{r.title}}</h3>
            <p class="text-xs text-slate-400 mt-0.5 leading-snug">{{r.desc}}</p>
          </div>
        </div>
        <div class="flex gap-2 mt-auto">
          <!-- PDF -->
          <button (click)="generate(r, 'pdf')"
                  [disabled]="!!generating()[r.type+'_pdf']"
                  class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all hover:opacity-90 disabled:opacity-50"
                  [ngClass]="r.color"
                  style="border-color:currentColor">
            @if (generating()[r.type+'_pdf']) {
              <mat-spinner diameter="14"></mat-spinner>
            } @else {
              <mat-icon class="text-sm">picture_as_pdf</mat-icon>
            }
            PDF
          </button>
          <!-- Excel -->
          <button (click)="generate(r, 'excel')"
                  [disabled]="!!generating()[r.type+'_excel']"
                  class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border-2 border-emerald-500 text-emerald-600 transition-all hover:opacity-90 disabled:opacity-50">
            @if (generating()[r.type+'_excel']) {
              <mat-spinner diameter="14"></mat-spinner>
            } @else {
              <mat-icon class="text-sm">table_chart</mat-icon>
            }
            Excel
          </button>
        </div>
      </div>
    }
  </div>

  <!-- Recent downloads -->
  @if (recentExports().length) {
    <div class="rounded-2xl border overflow-hidden"
         style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">
      <div class="px-5 py-4 border-b flex items-center justify-between"
           style="border-color:var(--border-color,#e2e8f0)">
        <h3 class="font-semibold text-slate-900 dark:text-white">Recent Downloads</h3>
        <button (click)="recentExports.set([])" class="text-xs text-slate-400 hover:text-slate-600">Clear</button>
      </div>
      @for (exp of recentExports(); track exp.id) {
        <div class="flex items-center gap-4 px-5 py-4 border-b last:border-0"
             style="border-color:var(--border-color,#e2e8f0)">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
               [ngClass]="exp.format==='pdf' ? 'bg-red-50' : 'bg-green-50'">
            <mat-icon [ngClass]="exp.format==='pdf' ? 'text-red-500' : 'text-green-600'">
              {{exp.format==='pdf' ? 'picture_as_pdf' : 'table_chart'}}
            </mat-icon>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-slate-900 dark:text-white truncate">{{exp.title}}</p>
            <p class="text-xs text-slate-400">{{exp.time}}</p>
          </div>
          <button (click)="downloadAgain(exp)"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style="background:#eff6ff;color:#3b82f6">
            <mat-icon class="text-sm">download</mat-icon>
            Download
          </button>
        </div>
      }
    </div>
  }
</div>
  `,
  styles: [`:host{display:block}.report-date-field{width:180px}`]
})
export class ReportsComponent {
  fromDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  toDate   = new Date();
  generating = signal<Record<string, boolean>>({});
  recentExports = signal<ExportRecord[]>([]);

  presets = [
    { label: 'This Month',   from: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1), to: () => new Date() },
    { label: 'Last Month',   from: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() - 1, 1); }, to: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 0); } },
    { label: 'Last 7 Days',  from: () => { const d = new Date(); d.setDate(d.getDate() - 7); return d; }, to: () => new Date() },
    { label: 'This Year',    from: () => new Date(new Date().getFullYear(), 0, 1), to: () => new Date() },
  ];

  reports: ReportDef[] = [
    { type:'employees',   title:'Employee Report',      desc:'Complete list with roles, departments, contact and join dates',          icon:'people',          color:'text-blue-600',   bg:'bg-blue-50 dark:bg-blue-900/20' },
    { type:'attendance',  title:'Attendance Report',    desc:'Daily check-in/out logs, working hours and attendance summary',          icon:'schedule',        color:'text-green-600',  bg:'bg-green-50 dark:bg-green-900/20' },
    { type:'tasks',       title:'Task Report',          desc:'Completion rates, status breakdown, overdue analysis and productivity',   icon:'task_alt',        color:'text-violet-600', bg:'bg-violet-50 dark:bg-violet-900/20' },
    { type:'projects',    title:'Project Report',       desc:'Project status, milestones, team assignments and progress overview',      icon:'folder_open',     color:'text-indigo-600', bg:'bg-indigo-50 dark:bg-indigo-900/20' },
    { type:'leaves',      title:'Leave Report',         desc:'Leave utilization by employee, type breakdown and pending approvals',     icon:'event_busy',      color:'text-amber-600',  bg:'bg-amber-50 dark:bg-amber-900/20' },
    { type:'internship',  title:'Internship Report',    desc:'Intern performance metrics, task completion and progress evaluation',     icon:'school',          color:'text-pink-600',   bg:'bg-pink-50 dark:bg-pink-900/20' },
    { type:'payroll',     title:'Payroll Summary',      desc:'Hours worked, overtime and compensation summary per employee',            icon:'payments',        color:'text-teal-600',   bg:'bg-teal-50 dark:bg-teal-900/20' },
    { type:'performance', title:'Performance Report',   desc:'KPIs, completion rates and employee performance scores',                  icon:'leaderboard',     color:'text-orange-600', bg:'bg-orange-50 dark:bg-orange-900/20' },
    { type:'department',  title:'Department Report',    desc:'Department-wise breakdown of headcount, tasks and attendance',            icon:'business',        color:'text-rose-600',   bg:'bg-rose-50 dark:bg-rose-900/20' },
  ];

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  applyPreset(p: { label: string; from: () => Date; to: () => Date }): void {
    this.fromDate = p.from(); this.toDate = p.to();
  }

  generate(report: ReportDef, fmt: string): void {
    const key = `${report.type}_${fmt}`;
    this.generating.update(g => ({ ...g, [key]: true }));

    const from = this.formatDateValue(this.fromDate);
    const to = this.formatDateValue(this.toDate);
    const params = new HttpParams()
      .set('from', from)
      .set('to', to)
      .set('format', fmt);

    const ext = fmt === 'pdf' ? 'pdf' : 'xlsx';
    const mimeType = fmt === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const fileName = `${report.type}-report-${from}-to-${to}.${ext}`;

    // Backend always returns CSV with BOM for Excel compatibility
    const csvFileName = `${report.type}-report-${from}-to-${to}.csv`;
    const csvMime = 'text/csv;charset=utf-8';

    this.http.get(`${environment.apiUrl}/reports/${report.type}`, {
      params,
      responseType: 'blob',
      observe: 'response'
    }).subscribe({
      next: (resp) => {
        this.generating.update(g => ({ ...g, [key]: false }));
        const blob = resp.body as Blob;
        // Use actual content-type from response if available
        const ct = resp.headers.get('content-type') ?? csvMime;
        const dl = resp.headers.get('content-disposition');
        let dlName = csvFileName;
        if (dl) {
          const m = dl.match(/filename="?([^"]+)"?/);
          if (m) dlName = m[1];
        }
        this.triggerDownload(blob, dlName, ct);
        const record: ExportRecord = {
          id: Date.now(),
          title: `${report.title} (CSV)`,
          format: 'csv',
          fileName: dlName,
          time: new Date().toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' }),
          blob
        };
        this.recentExports.update(e => [record, ...e.slice(0, 7)]);
        this.snackBar.open(`${report.title} downloaded successfully!`, '✓', { duration: 3000, panelClass: ['success-snackbar'] });
      },
      error: (err) => {
        this.generating.update(g => ({ ...g, [key]: false }));
        console.error('Report download error:', err);
        // Fallback: generate client-side CSV with a note
        this.generateClientSide(report, fmt, csvFileName, from, to);
      }
    });
  }

  generateClientSide(report: ReportDef, fmt: string, fileName: string, from: string, to: string): void {
    const csv = this.buildCsvContent(report.title, from, to);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const csvName = fileName.replace(/\.(pdf|xlsx)$/, '.csv');
    this.triggerDownload(blob, csvName, 'text/csv');
    const record: ExportRecord = {
      id: Date.now(), title: `${report.title} (CSV)`,
      format: fmt, fileName: csvName,
      time: new Date().toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' }),
      blob
    };
    this.recentExports.update(e => [record, ...e.slice(0, 7)]);
    this.snackBar.open(`${report.title} exported as CSV`, 'OK', { duration: 3000 });
  }

  buildCsvContent(title: string, from: string, to: string): string {
    return [
      `"${title}"`,
      `"Date Range: ${from} to ${to}"`,
      `"Generated: ${new Date().toLocaleString('en-IN')}"`,
      `""`,
      `"Note: Connect to the backend API to get real data in PDF/Excel format."`,
      `"Endpoint: GET /api/v1/reports/{type}?from={from}&to={to}&format={pdf|excel}"`,
    ].join('\n');
  }

  triggerDownload(blob: Blob, fileName: string, mimeType: string): void {
    try {
      // Re-wrap only if mime doesn't match (preserve BOM bytes from backend)
      const finalBlob = blob.type && blob.type.startsWith('text') ? blob : new Blob([blob], { type: mimeType });
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 500);
    } catch (e) {
      console.error('Download failed:', e);
    }
  }

  downloadAgain(exp: ExportRecord): void {
    if (exp.blob) {
      const mt = exp.format === 'pdf' ? 'application/pdf' : 'text/csv';
      this.triggerDownload(exp.blob, exp.fileName, mt);
    }
  }

  private formatDateValue(value: Date): string {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
