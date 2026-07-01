import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';

const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];

@Component({
  selector: 'app-working-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
<div class="p-4 sm:p-6 max-w-2xl mx-auto">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
      <mat-icon style="color:#6366f1">schedule</mat-icon>
      Working Schedule Settings
    </h1>
    <p class="text-slate-500 text-sm mt-1">Configure working days and hours for attendance reports.</p>
  </div>

  @if (loading()) {
    <div class="flex justify-center py-10"><mat-spinner diameter="36"></mat-spinner></div>
  } @else {
    <div class="rounded-2xl border p-6 space-y-6"
         style="background:var(--card-bg,#fff);border-color:var(--border-color,#e2e8f0)">

      <div>
        <h3 class="font-semibold text-slate-900 dark:text-white mb-3">Working Days</h3>
        <div class="flex flex-wrap gap-2">
          @for (day of allDays; track day) {
            <button (click)="toggleDay(day)"
                    class="px-3 py-2 rounded-xl text-sm font-medium border transition-all"
                    [class.bg-indigo-600]="isDaySelected(day)"
                    [class.text-white]="isDaySelected(day)"
                    [class.border-indigo-600]="isDaySelected(day)"
                    [class.text-slate-600]="!isDaySelected(day)"
                    [class.border-slate-300]="!isDaySelected(day)">
              {{day.slice(0,3)}}
            </button>
          }
        </div>
        <p class="text-xs text-slate-400 mt-2">{{selectedDays().length}} day(s)/week</p>
      </div>

      <div class="grid sm:grid-cols-2 gap-5">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Start Time (IST)</label>
          <input type="time" [(ngModel)]="schedule.workStartTime"
                 class="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                 style="border-color:#d1d5db">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">End Time (IST)</label>
          <input type="time" [(ngModel)]="schedule.workEndTime"
                 class="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                 style="border-color:#d1d5db">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Hours/Day</label>
          <input type="number" [(ngModel)]="schedule.workingHoursPerDay" min="1" max="24" step="0.5"
                 class="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                 style="border-color:#d1d5db">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-2">Late Grace (minutes)</label>
          <input type="number" [(ngModel)]="schedule.graceMinutes" min="0" max="60"
                 class="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                 style="border-color:#d1d5db">
        </div>
      </div>

      <div class="rounded-xl p-4" style="background:#f0f9ff;border:1px solid #bae6fd">
        <p class="text-sm font-semibold text-blue-800 mb-1">Schedule Summary</p>
        <p class="text-xs text-blue-700">
          {{selectedDays().join(', ')}} &bull;
          {{schedule.workStartTime}}–{{schedule.workEndTime}} IST &bull;
          {{(selectedDays().length * schedule.workingHoursPerDay).toFixed(1)}}h/week
        </p>
      </div>

      @if (error()) {
        <p class="text-sm text-red-600">{{error()}}</p>
      }

      <div class="flex gap-3">
        <button (click)="save()" [disabled]="saving()"
                class="px-5 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
                style="background:linear-gradient(135deg,#6366f1,#4f46e5)">
          @if (saving()) { Saving... } @else { Save Schedule }
        </button>
      </div>
    </div>
  }
</div>
  `,
  styles: [':host{display:block}']
})
export class WorkingScheduleComponent implements OnInit {
  allDays = DAYS;
  loading = signal(true);
  saving  = signal(false);
  error   = signal('');
  schedule: any = { workingDays:'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY', workStartTime:'09:00', workEndTime:'18:00', workingHoursPerDay:8.0, graceMinutes:15 };
  selectedDays = signal<string[]>(['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY']);

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/attendance/working-schedule`).subscribe({
      next: s => {
        this.schedule = { ...s };
        this.selectedDays.set(s.workingDays ? s.workingDays.split(',') : ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY']);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  isDaySelected(day: string): boolean { return this.selectedDays().includes(day); }
  toggleDay(day: string): void {
    const cur = [...this.selectedDays()];
    const idx = cur.indexOf(day);
    if (idx >= 0) cur.splice(idx, 1); else cur.push(day);
    this.selectedDays.set(cur);
  }

  save(): void {
    if (!this.selectedDays().length) { this.error.set('Select at least one day.'); return; }
    this.saving.set(true); this.error.set('');
    const payload = { ...this.schedule, workingDays: DAYS.filter(d => this.selectedDays().includes(d)).join(',') };
    this.http.put<any>(`${environment.apiUrl}/attendance/working-schedule`, payload).subscribe({
      next: () => { this.saving.set(false); this.snackBar.open('Schedule saved!', '✓', { duration:3000 }); },
      error: err => { this.error.set(err?.error?.message ?? 'Save failed'); this.saving.set(false); }
    });
  }
}
