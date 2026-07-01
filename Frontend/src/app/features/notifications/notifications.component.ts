import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '../../core/services/notification.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { Notification } from '../../core/models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  template: `
<div class="p-4 sm:p-6 max-w-3xl mx-auto fade-in">

  <!-- Header -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 style="font-size:1.5rem;font-weight:700;color:var(--text-primary);letter-spacing:-.025em">Notifications</h1>
      <p style="font-size:13px;color:var(--text-muted);margin-top:3px">
        {{notificationService.unreadCount()}} unread notification{{notificationService.unreadCount()!==1?'s':''}}
      </p>
    </div>
    @if (notificationService.unreadCount() > 0) {
      <button class="sc-btn sc-btn-secondary sc-btn-sm" (click)="markAllRead()">
        <mat-icon style="font-size:16px">done_all</mat-icon> Mark all read
      </button>
    }
  </div>

  <!-- Filters -->
  <div class="sc-filter-bar mb-4">
    <div class="sc-filter-item">
      <span class="sc-filter-label">Filter</span>
      <select class="sc-filter-select" [(ngModel)]="filterRead" (change)="applyFilter()">
        <option value="">All</option>
        <option value="unread">Unread</option>
        <option value="read">Read</option>
      </select>
    </div>
    <div class="sc-filter-item">
      <span class="sc-filter-label">Type</span>
      <select class="sc-filter-select" [(ngModel)]="filterType" (change)="applyFilter()">
        <option value="">All Types</option>
        <option value="TASK">Tasks</option>
        <option value="LEAVE">Leaves</option>
        <option value="PROJECT">Projects</option>
        <option value="MESSAGE">Messages</option>
        <option value="SYSTEM">System</option>
      </select>
    </div>
    @if (filterRead || filterType) {
      <button class="sc-btn sc-btn-ghost sc-btn-sm" (click)="filterRead='';filterType='';applyFilter()">
        <mat-icon style="font-size:16px">close</mat-icon> Clear
      </button>
    }
  </div>

  <div class="sc-card" style="padding:0;overflow:hidden">
    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:60px"><mat-spinner diameter="32"></mat-spinner></div>
    } @else if (!filtered().length) {
      <div style="text-align:center;padding:64px 24px">
        <mat-icon style="font-size:48px;color:var(--neutral-200);display:block;margin:0 auto 14px">notifications_none</mat-icon>
        <p style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:6px">
          @if (filterRead || filterType) { No notifications match } @else { You're all caught up! }
        </p>
        <p style="font-size:13px;color:var(--text-muted)">New notifications will appear here</p>
      </div>
    } @else {
      @for (n of filtered(); track n.id; let last = $last) {
        <div (click)="handleClick(n)" class="notif-row"
             [class.notif-unread]="!n.read"
             [class.notif-read]="n.read"
             [style.border-bottom]="!last ? '1px solid var(--border-color)' : 'none'">

          <!-- Icon -->
          <div class="notif-icon" [class]="iconBg(n.type)">
            <mat-icon [class]="iconColor(n.type)" style="font-size:18px">{{icon(n.type)}}</mat-icon>
          </div>

          <!-- Content -->
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:3px">
              <p style="font-size:14px;font-weight:600;color:var(--text-primary);line-height:1.35">{{n.title}}</p>
              <span style="font-size:11px;color:var(--text-muted);white-space:nowrap;flex-shrink:0;margin-top:2px">
                {{timeAgo(n.createdAt)}}
              </span>
            </div>
            <p style="font-size:13px;color:var(--text-secondary);line-height:1.45">{{n.message}}</p>

            <!-- Clickable link hint -->
            @if (getRoute(n)) {
              <p style="font-size:12px;color:var(--brand-600);margin-top:5px;display:flex;align-items:center;gap:4px;font-weight:500">
                <mat-icon style="font-size:13px">open_in_new</mat-icon>
                {{routeLabel(n)}}
              </p>
            }
          </div>

          <!-- Unread dot + mark read button -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0">
            @if (!n.read) {
              <div style="width:9px;height:9px;border-radius:50%;background:#3b82f6;flex-shrink:0"></div>
              <button (click)="$event.stopPropagation();markRead(n)"
                      style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--text-muted);padding:2px 4px"
                      title="Mark as read">
                <mat-icon style="font-size:14px">check</mat-icon>
              </button>
            }
          </div>
        </div>
      }
    }
  </div>

  <!-- Pagination -->
  @if (notifications().length >= 50) {
    <div style="text-align:center;margin-top:16px">
      <button class="sc-btn sc-btn-secondary sc-btn-sm" (click)="loadMore()">
        Load more
      </button>
    </div>
  }
</div>
  `,
  styles: [`
    :host { display: block; }
    .notif-row {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 16px 20px; cursor: pointer;
      transition: background .1s ease;
    }
    .notif-row:hover { background: var(--hover-bg); }
    .notif-unread { background: #eff6ff; }
    .notif-read {}
    .notif-icon {
      width: 38px; height: 38px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .notif-icon-task    { background: #e0e7ff; }
    .notif-icon-success { background: #dcfce7; }
    .notif-icon-danger  { background: #fee2e2; }
    .notif-icon-warn    { background: #fef3c7; }
    .notif-icon-info    { background: #dbeafe; }
    .notif-icon-default { background: #f3f4f6; }
  `]
})
export class NotificationsComponent implements OnInit {
  notifications = signal<Notification[]>([]);
  filtered      = signal<Notification[]>([]);
  loading       = signal(false);
  page          = 0;
  filterRead    = '';
  filterType    = '';

  constructor(
    public notificationService: NotificationService,
    private wsService: WebSocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.wsService.notification$.subscribe((n: Notification) => {
      this.notifications.update(prev => [n, ...prev]);
      this.applyFilter();
    });
  }

  loadNotifications(): void {
    this.loading.set(true);
    this.notificationService.getNotifications(0, 50).subscribe({
      next: r => { this.notifications.set(r.content); this.applyFilter(); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  loadMore(): void {
    this.page++;
    this.notificationService.getNotifications(this.page, 50).subscribe({
      next: r => { this.notifications.update(n => [...n, ...r.content]); this.applyFilter(); }
    });
  }

  applyFilter(): void {
    let list = [...this.notifications()];
    if (this.filterRead === 'unread') list = list.filter(n => !n.read);
    if (this.filterRead === 'read')   list = list.filter(n => n.read);
    if (this.filterType) {
      list = list.filter(n => this.getCategory(n.type) === this.filterType);
    }
    this.filtered.set(list);
  }

  /** Navigate to the relevant module when notification clicked */
  handleClick(n: Notification): void {
    if (!n.read) {
      n.read = true;
      this.notificationService.markAsRead(n.id).subscribe();
      this.notificationService.unreadCount.update(c => Math.max(0, c - 1));
    }
    const route = this.getRoute(n);
    if (route) this.router.navigate(route);
  }

  /** Determine navigation route from notification type + entityId/entityType */
  getRoute(n: Notification): any[] | null {
    const id = n.entityId;
    const type = n.entityType ?? n.type;

    // Task notifications
    if (['TASK_ASSIGNED','TASK_UPDATED','TASK_COMPLETED','TASK_APPROVED','TASK_REJECTED',
         'TASK_DEADLINE_REMINDER','TASK_SUBMITTED'].includes(n.type)) {
      return id ? ['/tasks', id] : ['/tasks'];
    }
    // Leave notifications
    if (['LEAVE_APPROVED','LEAVE_REJECTED','LEAVE_REQUEST','LEAVE_UPDATED'].includes(n.type)) {
      return ['/leaves'];
    }
    // Project notifications
    if (['PROJECT_UPDATE','PROJECT_ASSIGNED','PROJECT_COMPLETED'].includes(n.type)) {
      return id ? ['/projects', id] : ['/projects'];
    }
    // Message / Chat
    if (['MESSAGE_RECEIVED','MENTION'].includes(n.type)) {
      return ['/chat'];
    }
    // Comment
    if (n.type === 'COMMENT_ADDED') {
      return id && n.entityType === 'TASK' ? ['/tasks', id] : null;
    }
    // Announcement / System
    if (['ANNOUNCEMENT','SYSTEM_ALERT'].includes(n.type)) {
      return ['/dashboard'];
    }
    // Attendance
    if (n.type?.includes('ATTENDANCE')) return ['/attendance'];
    // Fallback: try entityType
    if (type === 'TASK' && id)    return ['/tasks', id];
    if (type === 'PROJECT' && id) return ['/projects', id];
    if (type === 'LEAVE')         return ['/leaves'];
    return null;
  }

  routeLabel(n: Notification): string {
    if (n.type?.startsWith('TASK'))       return 'View task →';
    if (n.type?.startsWith('LEAVE'))      return 'View leave requests →';
    if (n.type?.startsWith('PROJECT'))    return 'View project →';
    if (n.type?.includes('MESSAGE'))      return 'Open chat →';
    if (n.type?.includes('ATTENDANCE'))   return 'View attendance →';
    return 'View →';
  }

  getCategory(type: string): string {
    if (type?.startsWith('TASK'))     return 'TASK';
    if (type?.startsWith('LEAVE'))    return 'LEAVE';
    if (type?.startsWith('PROJECT'))  return 'PROJECT';
    if (['MESSAGE_RECEIVED','MENTION','COMMENT_ADDED'].includes(type)) return 'MESSAGE';
    return 'SYSTEM';
  }

  markRead(n: Notification): void {
    if (n.read) return;
    n.read = true;
    this.notificationService.markAsRead(n.id).subscribe();
    this.notificationService.unreadCount.update(c => Math.max(0, c - 1));
    this.applyFilter();
  }

  markAllRead(): void {
    const prev = this.notifications().map(n => ({ ...n }));
    const prevCount = this.notificationService.unreadCount();
    this.notifications.update(ns => ns.map(n => ({ ...n, read: true })));
    this.notificationService.unreadCount.set(0);
    this.applyFilter();
    this.notificationService.markAllAsRead().subscribe({
      error: () => {
        // Roll back the optimistic update if the backend call failed
        this.notifications.set(prev);
        this.notificationService.unreadCount.set(prevCount);
        this.applyFilter();
      }
    });
  }

  icon(type: string): string {
    const m: Record<string, string> = {
      TASK_ASSIGNED:'assignment_ind', TASK_UPDATED:'edit_note', TASK_COMPLETED:'task_alt',
      TASK_APPROVED:'verified', TASK_REJECTED:'cancel', TASK_DEADLINE_REMINDER:'alarm',
      TASK_SUBMITTED:'upload_file',
      LEAVE_APPROVED:'event_available', LEAVE_REJECTED:'event_busy', LEAVE_REQUEST:'calendar_today',
      COMMENT_ADDED:'chat_bubble_outline', MENTION:'alternate_email',
      PROJECT_UPDATE:'folder_open', PROJECT_ASSIGNED:'workspaces', PROJECT_COMPLETED:'done_all',
      MESSAGE_RECEIVED:'mail_outline', SYSTEM_ALERT:'warning_amber',
      ANNOUNCEMENT:'campaign'
    };
    return m[type] ?? 'notifications';
  }

  iconBg(type: string): string {
    const cat = this.getCategory(type);
    if (cat === 'TASK') {
      if (['TASK_COMPLETED','TASK_APPROVED'].includes(type)) return 'notif-icon notif-icon-success';
      if (['TASK_REJECTED'].includes(type))                  return 'notif-icon notif-icon-danger';
      if (['TASK_DEADLINE_REMINDER'].includes(type))         return 'notif-icon notif-icon-warn';
      return 'notif-icon notif-icon-task';
    }
    if (cat === 'LEAVE') {
      if (type === 'LEAVE_APPROVED') return 'notif-icon notif-icon-success';
      if (type === 'LEAVE_REJECTED') return 'notif-icon notif-icon-danger';
      return 'notif-icon notif-icon-warn';
    }
    if (cat === 'MESSAGE') return 'notif-icon notif-icon-info';
    if (type === 'SYSTEM_ALERT') return 'notif-icon notif-icon-warn';
    return 'notif-icon notif-icon-default';
  }

  iconColor(type: string): string {
    if (['TASK_COMPLETED','TASK_APPROVED','LEAVE_APPROVED'].includes(type)) return 'text-green-600';
    if (['TASK_REJECTED','LEAVE_REJECTED'].includes(type)) return 'text-red-600';
    if (['TASK_DEADLINE_REMINDER','SYSTEM_ALERT'].includes(type)) return 'text-amber-600';
    if (['MESSAGE_RECEIVED','MENTION'].includes(type)) return 'text-blue-600';
    return 'text-indigo-600';
  }

  timeAgo(date?: string): string {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)  return `${days}d ago`;
    return new Date(date).toLocaleDateString('en-IN', { timeZone:'Asia/Kolkata', day:'numeric', month:'short' });
  }
}
