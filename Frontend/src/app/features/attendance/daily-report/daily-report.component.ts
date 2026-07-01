import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface DailyEntry {
  userId:string; fullName:string; role:string; department?:string;
  checkIn?:string; checkOut?:string; totalHours?:number; isRemote?:boolean; status:string;
  checkInLocation?:string; checkInLatitude?:number; checkInLongitude?:number; checkInPhoto?:string;
  checkOutLocation?:string; checkOutLatitude?:number; checkOutLongitude?:number; checkOutPhoto?:string;
}
interface DailyReport {
  date:string; totalEmployees:number; presentCount:number; absentCount:number;
  attendanceRate:number; present:DailyEntry[]; absent:DailyEntry[];
}

@Component({
  selector: 'app-daily-report',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  template: `
<div class="p-4 sm:p-6 max-w-6xl mx-auto fade-in">

  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:24px;flex-wrap:wrap">
    <div>
      <h1 style="font-size:1.5rem;font-weight:700;color:var(--text-primary)">Daily Attendance</h1>
      <p style="font-size:13px;color:var(--text-muted);margin-top:3px">Who is present today — real-time check</p>
    </div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <input type="date" [(ngModel)]="selectedDate" (change)="load()" class="sc-input" style="width:160px;height:38px;font-size:13px">
      <button class="sc-btn sc-btn-secondary sc-btn-sm" (click)="load()"><mat-icon style="font-size:16px">refresh</mat-icon> Refresh</button>
    </div>
  </div>

  @if (loading()) {
    <div style="display:flex;justify-content:center;padding:60px"><mat-spinner diameter="40"></mat-spinner></div>
  } @else if (report()) {

    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px">
      @for (s of summary(); track s.label) {
        <div class="sc-card" style="padding:18px 20px;display:flex;align-items:center;gap:14px">
          <div style="width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0" [style.background]="s.bg">
            <mat-icon style="font-size:22px" [style.color]="s.color">{{s.icon}}</mat-icon>
          </div>
          <div>
            <p style="font-size:26px;font-weight:800;color:var(--text-primary);line-height:1">{{s.value}}</p>
            <p style="font-size:12px;color:var(--text-muted);margin-top:2px">{{s.label}}</p>
          </div>
        </div>
      }
    </div>

    <div class="sc-card" style="padding:16px 20px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <p style="font-size:13px;font-weight:600;color:var(--text-primary)">Overall Attendance Rate</p>
        <p style="font-size:18px;font-weight:800" [style.color]="rateColor(report()!.attendanceRate)">{{report()!.attendanceRate}}%</p>
      </div>
      <div style="height:10px;background:var(--border-color);border-radius:99px;overflow:hidden">
        <div style="height:100%;border-radius:99px;transition:width .6s ease" [style.width]="report()!.attendanceRate + '%'" [style.background]="rateColor(report()!.attendanceRate)"></div>
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin-top:6px">
        {{report()!.presentCount}} present · {{report()!.absentCount}} absent · {{report()!.totalEmployees}} total
      </p>
    </div>

    <div class="sc-filter-bar">
      <div class="sc-filter-search" style="flex:1;max-width:260px">
        <mat-icon>search</mat-icon>
        <input [(ngModel)]="searchQ" placeholder="Search employee name…">
      </div>
      <div class="sc-filter-item">
        <span class="sc-filter-label">View</span>
        <select class="sc-filter-select" [(ngModel)]="viewFilter">
          <option value="all">All Employees</option>
          <option value="present">Present Only</option>
          <option value="absent">Absent Only</option>
          <option value="remote">Remote Only</option>
        </select>
      </div>
      <div class="sc-filter-item">
        <span class="sc-filter-label">Dept</span>
        <select class="sc-filter-select" [(ngModel)]="deptFilter">
          <option value="">All Departments</option>
          @for (d of departments(); track d) { <option [value]="d">{{d}}</option> }
        </select>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <div style="width:10px;height:10px;border-radius:50%;background:#10b981;flex-shrink:0"></div>
          <p style="font-size:13px;font-weight:700;color:var(--text-primary)">Present ({{filteredPresent().length}})</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (e of filteredPresent(); track e.userId) {
            <div class="sc-card" style="padding:12px 14px">
              <div style="display:flex;align-items:center;gap:10px">
                <div class="sc-avatar sc-avatar-md flex-shrink-0" [style.background]="roleGrad(e.role)">{{e.fullName.charAt(0)}}</div>
                <div style="flex:1;min-width:0">
                  <p style="font-size:13px;font-weight:600;color:var(--text-primary)" class="line-clamp-1">{{e.fullName}}</p>
                  <p style="font-size:11px;color:var(--text-muted)">{{e.role.replace('_',' ')}}@if(e.department){ · {{e.department}}}</p>
                  <!-- Location label with map link -->
                  @if (e.checkInLocation || e.checkInLatitude) {
                    <a [href]="mapsUrl(e.checkInLatitude, e.checkInLongitude)" target="_blank" rel="noopener"
                       style="display:inline-flex;align-items:center;gap:3px;font-size:11px;color:#6366f1;text-decoration:none;margin-top:2px">
                      <mat-icon style="font-size:12px">location_on</mat-icon>
                      {{e.checkInLocation || (e.checkInLatitude?.toFixed(4) + ', ' + e.checkInLongitude?.toFixed(4))}}
                    </a>
                  }
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
                  <!-- Check-in photo thumbnail -->
                  @if (e.checkInPhoto) {
                    <img [src]="e.checkInPhoto" [title]="'Check-in photo — ' + e.fullName"
                         (click)="viewPhoto(e.checkInPhoto, e.fullName + ' — Check-in')"
                         style="width:36px;height:36px;border-radius:8px;object-fit:cover;border:2px solid #10b981;cursor:pointer">
                  }
                  <!-- Check-out photo thumbnail -->
                  @if (e.checkOutPhoto) {
                    <img [src]="e.checkOutPhoto" [title]="'Check-out photo — ' + e.fullName"
                         (click)="viewPhoto(e.checkOutPhoto, e.fullName + ' — Check-out')"
                         style="width:36px;height:36px;border-radius:8px;object-fit:cover;border:2px solid #ef4444;cursor:pointer">
                  }
                  <div style="text-align:right">
                    @if (e.isRemote) { <span class="sc-badge badge-in-progress" style="font-size:10px;margin-bottom:3px;display:block">🏠 Remote</span> }
                    <p style="font-size:11px;color:var(--text-muted)">
                      @if (e.checkIn) { {{fmtTime(e.checkIn)}} }@if (e.checkOut) { → {{fmtTime(e.checkOut)}} }
                    </p>
                    @if (e.totalHours) { <p style="font-size:11px;font-weight:600;color:#10b981">{{e.totalHours | number:'1.1-1'}}h</p> }
                  </div>
                </div>
              </div>
            </div>
          }
          @if (!filteredPresent().length) {
            <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;background:var(--hover-bg);border-radius:12px">No present employees match filters</div>
          }
        </div>
      </div>

      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <div style="width:10px;height:10px;border-radius:50%;background:#ef4444;flex-shrink:0"></div>
          <p style="font-size:13px;font-weight:700;color:var(--text-primary)">Absent ({{filteredAbsent().length}})</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (e of filteredAbsent(); track e.userId) {
            <div class="sc-card" style="padding:12px 14px;opacity:.8">
              <div style="display:flex;align-items:center;gap:10px">
                <div class="sc-avatar sc-avatar-md flex-shrink-0" style="background:#e2e8f0"><span style="color:#94a3b8">{{e.fullName.charAt(0)}}</span></div>
                <div style="flex:1;min-width:0">
                  <p style="font-size:13px;font-weight:600;color:var(--text-primary)" class="line-clamp-1">{{e.fullName}}</p>
                  <p style="font-size:11px;color:var(--text-muted)">{{e.role.replace('_',' ')}}@if(e.department){ · {{e.department}}}</p>
                </div>
                <span class="sc-badge badge-rejected" style="font-size:10px;flex-shrink:0">Absent</span>
              </div>
            </div>
          }
          @if (!filteredAbsent().length) {
            <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px;background:var(--hover-bg);border-radius:12px">No absent employees</div>
          }
        </div>
      </div>
    </div>
  }
</div>

<!-- Photo lightbox overlay -->
@if (photoLightbox()) {
  <div (click)="photoLightbox.set(null)"
       style="position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;cursor:pointer">
    <p style="color:#fff;font-size:14px;font-weight:600">{{photoLightbox()!.title}}</p>
    <img [src]="photoLightbox()!.src" style="max-width:90vw;max-height:80vh;border-radius:12px;object-fit:contain">
    <p style="color:rgba(255,255,255,.5);font-size:12px">Click anywhere to close</p>
  </div>
}
  `,
  styles: [':host{display:block}']
})
export class DailyReportComponent implements OnInit {

  photoLightbox = signal<{src:string; title:string} | null>(null);
  report = signal<DailyReport | null>(null);
  loading = signal(true);
  searchQ = '';
  viewFilter = 'all';
  deptFilter = '';
  selectedDate = new Date().toISOString().slice(0,10);

  departments = computed(() => {
    const r = this.report();
    if (!r) return [];
    const all = [...r.present, ...r.absent];
    return [...new Set(all.map(e => e.department).filter(Boolean))] as string[];
  });

  summary = computed(() => {
    const r = this.report();
    if (!r) return [];
    const onSite = r.present.filter(e => !e.isRemote).length;
    const remote = r.present.filter(e => e.isRemote).length;
    return [
      { label:'Present Today',   value:r.presentCount, icon:'how_to_reg',    bg:'#dcfce7', color:'#16a34a' },
      { label:'Absent Today',    value:r.absentCount,  icon:'person_off',    bg:'#fee2e2', color:'#dc2626' },
      { label:'Working On-site', value:onSite,          icon:'location_on',   bg:'#dbeafe', color:'#2563eb' },
      { label:'Working Remotely',value:remote,          icon:'home_work',     bg:'#ede9fe', color:'#6366f1' },
    ];
  });

  filteredPresent = computed(() => {
    const r = this.report();
    if (!r) return [];
    if (this.viewFilter === 'absent') return [];
    let list = r.present;
    if (this.viewFilter === 'remote') list = list.filter(e => e.isRemote);
    if (this.deptFilter) list = list.filter(e => e.department === this.deptFilter);
    if (this.searchQ.trim()) { const q = this.searchQ.toLowerCase(); list = list.filter(e => e.fullName.toLowerCase().includes(q)); }
    return list;
  });

  filteredAbsent = computed(() => {
    const r = this.report();
    if (!r) return [];
    if (this.viewFilter === 'present' || this.viewFilter === 'remote') return [];
    let list = r.absent;
    if (this.deptFilter) list = list.filter(e => e.department === this.deptFilter);
    if (this.searchQ.trim()) { const q = this.searchQ.toLowerCase(); list = list.filter(e => e.fullName.toLowerCase().includes(q)); }
    return list;
  });

  constructor(private http: HttpClient) {}
  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.http.get<DailyReport>(`${environment.apiUrl}/attendance/daily-report?date=${this.selectedDate}`).subscribe({
      next: r => {
        // Filter SUPER_ADMIN from attendance reports — system admins are not
        // employees whose attendance needs tracking for HR purposes.
        const notSuperAdmin = (e: DailyEntry) => e.role !== 'SUPER_ADMIN';
        r.present = (r.present ?? []).filter(notSuperAdmin);
        r.absent  = (r.absent  ?? []).filter(notSuperAdmin);
        r.totalEmployees = r.present.length + r.absent.length;
        r.presentCount   = r.present.length;
        r.absentCount    = r.absent.length;
        this.report.set(r);
        this.loading.set(false);
      },
      error: () => { this.report.set(this.mockReport()); this.loading.set(false); }
    });
  }

  mapsUrl(lat?: number, lng?: number): string {
    if (!lat || !lng) return '#';
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  viewPhoto(src: string, title: string): void {
    this.photoLightbox.set({ src, title });
  }

  fmtTime(t: string): string {
    return new Date('1970-01-01T' + t).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true });
  }
  rateColor(rate: number): string { if (rate >= 85) return '#10b981'; if (rate >= 70) return '#f59e0b'; return '#ef4444'; }

  roleGrad(role: string): string {
    const m: Record<string,string> = {
      SUPER_ADMIN:'linear-gradient(135deg,#dc2626,#991b1b)', ADMINISTRATOR:'linear-gradient(135deg,#7c3aed,#6d28d9)',
      PROJECT_MANAGER:'linear-gradient(135deg,#2563eb,#1d4ed8)', HR_MANAGER:'linear-gradient(135deg,#db2777,#be185d)',
      EMPLOYEE:'linear-gradient(135deg,#6366f1,#4f46e5)', INTERN:'linear-gradient(135deg,#0891b2,#0e7490)',
      STUDENT:'linear-gradient(135deg,#f59e0b,#d97706)',
    };
    return m[role] ?? 'linear-gradient(135deg,#6366f1,#4f46e5)';
  }

  mockReport(): DailyReport {
    return {
      date: this.selectedDate, totalEmployees: 12, presentCount: 9, absentCount: 3, attendanceRate: 75,
      present: [
        {userId:'1',fullName:'Arjun Mehta',role:'EMPLOYEE',department:'Engineering',checkIn:'09:02:00',checkOut:'18:15:00',totalHours:9.2,isRemote:false,status:'PRESENT'},
        {userId:'2',fullName:'Priya Singh',role:'PROJECT_MANAGER',department:'Engineering',checkIn:'08:55:00',checkOut:'17:55:00',totalHours:9.0,isRemote:false,status:'PRESENT'},
        {userId:'3',fullName:'Dev Gupta',role:'EMPLOYEE',department:'Engineering',checkIn:'09:18:00',isRemote:true,status:'PRESENT'},
        {userId:'4',fullName:'Sunita Rao',role:'HR_MANAGER',department:'HR',checkIn:'09:00:00',checkOut:'18:00:00',totalHours:9.0,isRemote:false,status:'PRESENT'},
        {userId:'5',fullName:'Kiran Rao',role:'INTERN',department:'Engineering',checkIn:'09:30:00',checkOut:'17:30:00',totalHours:8.0,isRemote:false,status:'PRESENT'},
        {userId:'6',fullName:'Mita Joshi',role:'EMPLOYEE',department:'Design',checkIn:'10:00:00',isRemote:true,status:'PRESENT'},
        {userId:'7',fullName:'Rahul Sharma',role:'STUDENT',department:'Training',checkIn:'09:10:00',checkOut:'17:10:00',totalHours:8.0,isRemote:false,status:'PRESENT'},
        {userId:'8',fullName:'Ananya Patel',role:'EMPLOYEE',department:'Finance',checkIn:'08:48:00',checkOut:'17:50:00',totalHours:9.0,isRemote:false,status:'PRESENT'},
        {userId:'9',fullName:'Vikram Nair',role:'EMPLOYEE',department:'Sales',checkIn:'09:22:00',checkOut:'18:22:00',totalHours:9.0,isRemote:false,status:'PRESENT'},
      ],
      absent: [
        {userId:'11',fullName:'Meena Nair',role:'ADMINISTRATOR',department:'Operations',status:'ABSENT'},
        {userId:'12',fullName:'Ravi Sharma',role:'EMPLOYEE',department:'Engineering',status:'ABSENT'},
      ]
    };
  }
}
