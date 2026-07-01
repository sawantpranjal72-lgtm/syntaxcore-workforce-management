import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { Attendance } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatChipsModule, MatProgressSpinnerModule],
  template: `
<div class="p-4 sm:p-6 max-w-5xl mx-auto">

  <!-- Header -->
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Attendance</h1>
    <p class="text-slate-500 text-sm mt-0.5">Track your daily work hours</p>
  </div>

  <!-- Today's card -->
  <div class="rounded-2xl border p-6 mb-6 relative overflow-hidden"
       style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
    <div class="absolute top-0 right-0 w-48 h-48 rounded-full opacity-5"
         style="background:linear-gradient(135deg,#6366f1,#8b5cf6); transform:translate(30%,-30%)"></div>

    <div class="flex flex-col md:flex-row md:items-center gap-6">

      <!-- Clock + date -->
      <div class="text-center md:text-left">
        <p class="text-5xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">{{clock()}}</p>
        <p class="text-slate-400 text-sm mt-1">{{today()}}</p>
      </div>

      <!-- Status -->
      <div class="flex-1">
        @if (todayRecord()) {
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
              <mat-icon class="text-green-600 mb-1">login</mat-icon>
              <p class="text-xs text-slate-400 mb-0.5">Check In</p>
              <p class="font-semibold text-slate-900 dark:text-white text-sm">
                {{formatTime(todayRecord()!.checkIn)}}
              </p>
            </div>
            <div class="text-center p-3 rounded-xl" [class]="todayRecord()!.checkOut ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-800'">
              <mat-icon [class]="todayRecord()!.checkOut ? 'text-red-500' : 'text-slate-300'">logout</mat-icon>
              <p class="text-xs text-slate-400 mb-0.5">Check Out</p>
              <p class="font-semibold text-slate-900 dark:text-white text-sm">
                {{todayRecord()!.checkOut ? formatTime(todayRecord()!.checkOut) : '—'}}
              </p>
            </div>
            <div class="text-center p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
              <mat-icon class="text-indigo-600 mb-1">schedule</mat-icon>
              <p class="text-xs text-slate-400 mb-0.5">Duration</p>
              <p class="font-semibold text-slate-900 dark:text-white text-sm">
                {{todayRecord()!.totalHours ? (todayRecord()!.totalHours! | number:'1.1-1') + 'h' : elapsed()}}
              </p>
            </div>
          </div>
        } @else {
          <div class="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
            <mat-icon class="text-slate-400">info_outline</mat-icon>
            <p class="text-sm text-slate-500">You haven't checked in yet today</p>
          </div>
        }
      </div>

      <!-- Camera capture panel (shown before check-in/check-out confirm) -->
      @if (showCamera()) {
        <div style="margin-bottom:16px;border:1px solid var(--border-color,#e2e8f0);border-radius:14px;overflow:hidden;background:#000">
          <div style="position:relative">
            <video #videoEl autoplay playsinline muted
                   style="width:100%;max-height:220px;object-fit:cover;display:block"></video>
            <canvas #canvasEl style="display:none"></canvas>
          </div>
          <div style="padding:12px;display:flex;align-items:center;gap:10px;background:var(--card-bg,#fff)">
            @if (capturedPhoto()) {
              <img [src]="capturedPhoto()!" style="width:52px;height:52px;border-radius:8px;object-fit:cover;border:2px solid #10b981">
              <div style="flex:1">
                <p style="font-size:12px;font-weight:600;color:#10b981;margin:0">Photo captured ✓</p>
                <p style="font-size:11px;color:var(--text-muted);margin:0">{{locationLabel() || 'Getting location…'}}</p>
              </div>
              <button class="sc-btn sc-btn-sm sc-btn-secondary" (click)="retakePhoto()">Retake</button>
              <button class="sc-btn sc-btn-sm sc-btn-primary" (click)="confirmAction()">
                {{pendingAction() === 'in' ? 'Check In' : 'Check Out'}}
              </button>
            } @else {
              <div style="flex:1">
                <p style="font-size:12px;color:var(--text-muted);margin:0">{{locationLabel() || 'Getting location…'}}</p>
              </div>
              <button class="sc-btn sc-btn-sm sc-btn-secondary" (click)="cancelCamera()">Cancel</button>
              <button class="sc-btn sc-btn-sm sc-btn-primary" (click)="capturePhoto()">
                <mat-icon style="font-size:16px">camera_alt</mat-icon> Capture
              </button>
            }
          </div>
        </div>
      }

      <!-- Action buttons -->
      <div class="flex flex-col gap-3">
        @if (!todayRecord() || !todayRecord()!.checkIn) {
          <button mat-flat-button color="primary" class="h-12 px-6 font-medium"
                  (click)="startCheckIn()" [disabled]="actionLoading() || showCamera()">
            @if (actionLoading()) { <mat-spinner diameter="18"></mat-spinner> }
            @else { <mat-icon>login</mat-icon> }
            Check In
          </button>
        } @else if (!todayRecord()!.checkOut) {
          <button mat-flat-button class="h-12 px-6 font-medium bg-red-500 text-white hover:bg-red-600"
                  (click)="startCheckOut()" [disabled]="actionLoading() || showCamera()">
            @if (actionLoading()) { <mat-spinner diameter="18"></mat-spinner> }
            @else { <mat-icon>logout</mat-icon> }
            Check Out
          </button>
        } @else {
          <div class="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20">
            <mat-icon class="text-green-600">check_circle</mat-icon>
            <span class="text-sm font-medium text-green-700">Done for today!</span>
          </div>
        }

        <label class="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
          <input type="checkbox" [(ngModel)]="isRemote" class="rounded"> Remote work
        </label>
      </div>
    </div>
  </div>

  <!-- Attendance history -->
  <div class="rounded-2xl border overflow-hidden"
       style="background:var(--card-bg,#fff); border-color:var(--border-color,#e2e8f0)">
    <div class="px-5 py-4 border-b flex items-center justify-between"
         style="border-color:var(--border-color,#e2e8f0)">
      <h3 class="font-semibold text-slate-900 dark:text-white">Attendance History</h3>
      <span class="text-xs text-slate-400">Last 30 days</span>
    </div>

    @for (record of history(); track record.id) {
      <div class="flex items-center gap-4 px-5 py-4 border-b last:border-0"
           style="border-color:var(--border-color,#e2e8f0)">

        <div class="w-2 h-2 rounded-full flex-shrink-0"
             [ngClass]="statusDot(record.status)"></div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-slate-900 dark:text-white">{{formatDate(record.date)}}</p>
          <p class="text-xs text-slate-400">
            {{record.checkIn ? formatTime(record.checkIn) : 'No check-in'}}
            @if (record.checkOut) { — {{formatTime(record.checkOut)}} }
          </p>
        </div>

        <span class="text-xs px-2.5 py-1 rounded-full font-medium" [ngClass]="statusChip(record.status)">
          {{record.status}}
        </span>

        @if (record.totalHours) {
          <div class="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300 hidden sm:flex">
            <mat-icon class="text-sm text-slate-400">schedule</mat-icon>
            {{record.totalHours | number:'1.1-1'}}h
          </div>
        }

        @if (record.remote) {
          <span class="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 hidden sm:block">Remote</span>
        }
      </div>
    }

    @if (!history().length) {
      <div class="text-center py-12">
        <mat-icon class="text-4xl text-slate-200 mb-2">event_busy</mat-icon>
        <p class="text-slate-400 text-sm">No attendance records yet</p>
      </div>
    }
  </div>
</div>
  `,
  styles: [`:host{display:block}`]
})
export class AttendanceComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;

  todayRecord  = signal<Attendance | null>(null);
  history      = signal<Attendance[]>([]);
  clock        = signal('');
  elapsed      = signal('0h 0m');
  actionLoading= signal(false);
  isRemote     = false;
  private timerSub?: Subscription;

  // Camera + GPS state
  showCamera    = signal(false);
  capturedPhoto = signal<string | null>(null);
  pendingAction = signal<'in' | 'out' | null>(null);
  locationLabel = signal<string>('Getting location…');
  gpsCoords     = signal<{lat: number; lng: number} | null>(null);
  private stream: MediaStream | null = null;

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.startClock();
    this.loadToday();
    this.loadHistory();
  }

  startClock(): void {
    this.updateClock();
    this.timerSub = interval(1000).subscribe(() => {
      this.updateClock();
      this.updateElapsed();
    });
  }

  updateClock(): void {
    this.clock.set(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }

  updateElapsed(): void {
    const r = this.todayRecord();
    if (r?.checkIn && !r.checkOut) {
      const diff = Date.now() - new Date(r.checkIn).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      this.elapsed.set(`${h}h ${m}m`);
    }
  }

  today(): string {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  loadToday(): void {
    this.http.get<Attendance>(`${environment.apiUrl}/attendance/today`).subscribe({
      next: r => { this.todayRecord.set(r); this.updateElapsed(); },
      error: () => this.todayRecord.set(null)
    });
  }

  loadHistory(): void {
    this.http.get<any>(`${environment.apiUrl}/attendance/history?size=30`).subscribe({
      next: r => this.history.set(r.content ?? []),
      error: () => {}
    });
  }

  // ── Camera + GPS helpers ─────────────────────────────────

  private getGPS(): Promise<{lat: number; lng: number} | null> {
    return new Promise(resolve => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        ()  => resolve(null),
        { timeout: 8000, enableHighAccuracy: true }
      );
    });
  }

  private async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`
      );
      const data = await res.json();
      const a = data.address ?? {};
      return [a.suburb ?? a.neighbourhood, a.city ?? a.town ?? a.village, a.state_district ?? a.state]
        .filter(Boolean).join(', ') || data.display_name?.split(',').slice(0,3).join(',').trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  private async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      // Wait a tick for ViewChild to be in DOM
      setTimeout(() => {
        if (this.videoEl?.nativeElement) {
          this.videoEl.nativeElement.srcObject = this.stream;
        }
      }, 100);
    } catch {
      this.snackBar.open('Camera access denied — proceeding without photo.', '', { duration: 3000 });
    }
  }

  private stopCamera(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  capturePhoto(): void {
    const video  = this.videoEl?.nativeElement;
    const canvas = this.canvasEl?.nativeElement;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth  || 320;
    canvas.height = video.videoHeight || 240;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    this.capturedPhoto.set(canvas.toDataURL('image/jpeg', 0.7));
    this.stopCamera();
  }

  retakePhoto(): void {
    this.capturedPhoto.set(null);
    this.startCamera();
  }

  cancelCamera(): void {
    this.stopCamera();
    this.showCamera.set(false);
    this.capturedPhoto.set(null);
    this.pendingAction.set(null);
  }

  async startCheckIn(): Promise<void> {
    this.pendingAction.set('in');
    this.capturedPhoto.set(null);
    this.locationLabel.set('Getting location…');
    this.showCamera.set(true);
    // Get GPS in parallel with camera startup
    const coords = await this.getGPS();
    this.gpsCoords.set(coords);
    if (coords) {
      const label = await this.reverseGeocode(coords.lat, coords.lng);
      this.locationLabel.set(label);
    } else {
      this.locationLabel.set('Location unavailable');
    }
    await this.startCamera();
  }

  async startCheckOut(): Promise<void> {
    this.pendingAction.set('out');
    this.capturedPhoto.set(null);
    this.locationLabel.set('Getting location…');
    this.showCamera.set(true);
    const coords = await this.getGPS();
    this.gpsCoords.set(coords);
    if (coords) {
      const label = await this.reverseGeocode(coords.lat, coords.lng);
      this.locationLabel.set(label);
    } else {
      this.locationLabel.set('Location unavailable');
    }
    await this.startCamera();
  }

  confirmAction(): void {
    if (this.pendingAction() === 'in') this.checkIn();
    else                               this.checkOut();
  }

  checkIn(): void {
    const coords = this.gpsCoords();
    const label  = this.locationLabel();
    this.actionLoading.set(true);
    this.showCamera.set(false);
    this.http.post<Attendance>(`${environment.apiUrl}/attendance/check-in`, {
      location:  label || 'Office',
      remote:    this.isRemote,
      latitude:  coords?.lat  ?? null,
      longitude: coords?.lng  ?? null,
      photo:     this.capturedPhoto() ?? null
    }).subscribe({
      next: r => {
        this.todayRecord.set(r);
        this.actionLoading.set(false);
        this.capturedPhoto.set(null);
        this.snackBar.open('Checked in successfully!', '', { duration: 2500, panelClass: ['success-snackbar'] });
        this.loadHistory();
      },
      error: err => {
        this.snackBar.open(err?.error?.message ?? 'Check-in failed', 'Close', { duration: 3000 });
        this.actionLoading.set(false);
      }
    });
  }

  checkOut(): void {
    const coords = this.gpsCoords();
    const label  = this.locationLabel();
    this.actionLoading.set(true);
    this.showCamera.set(false);
    this.http.post<Attendance>(`${environment.apiUrl}/attendance/check-out`, {
      location:  label || null,
      latitude:  coords?.lat  ?? null,
      longitude: coords?.lng  ?? null,
      photo:     this.capturedPhoto() ?? null
    }).subscribe({
      next: r => {
        this.todayRecord.set(r);
        this.actionLoading.set(false);
        this.capturedPhoto.set(null);
        this.snackBar.open('Checked out. Have a great evening!', '', { duration: 2500 });
        this.loadHistory();
      },
      error: err => {
        this.snackBar.open(err?.error?.message ?? 'Check-out failed', 'Close', { duration: 3000 });
        this.actionLoading.set(false);
      }
    });
  }

  formatTime(t?: string): string {
    if (!t) return '—';
    return new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  statusDot(s: string): string {
    return s === 'PRESENT' ? 'bg-green-400' : s === 'ABSENT' ? 'bg-red-400' : s === 'LATE' ? 'bg-yellow-400' : 'bg-slate-300';
  }

  statusChip(s: string): string {
    const m: Record<string,string> = {
      PRESENT: 'bg-green-100 text-green-700', ABSENT: 'bg-red-100 text-red-700',
      LATE: 'bg-yellow-100 text-yellow-700', HALF_DAY: 'bg-orange-100 text-orange-700',
      LEAVE: 'bg-blue-100 text-blue-700'
    };
    return m[s] ?? 'bg-slate-100 text-slate-600';
  }

  ngOnDestroy(): void { this.timerSub?.unsubscribe(); this.stopCamera(); }
}
