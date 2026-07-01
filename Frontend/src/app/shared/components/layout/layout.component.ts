import { Component, OnInit, OnDestroy, signal, computed, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationService } from '../../../core/services/notification.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AccessControlService } from '../../../core/services/access-control.service';
import { ROLE_LABELS } from '../../../core/models';

interface NavItem {
  key: string; label: string; icon: string; route: string;
  roles?: string[]; exact?: boolean; badge?: () => number;
}
interface NavGroup { title: string; items: NavItem[]; }

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatIconModule, MatButtonModule,
    MatBadgeModule, MatMenuModule, MatTooltipModule, MatDividerModule
  ],
  template: `
<mat-sidenav-container class="h-screen" [class.dark]="isDark()">

  <!-- ══ SIDEBAR ══ -->
  <mat-sidenav #sidenav [mode]="isMobile() ? 'over' : 'side'" [opened]="sidenavOpen()"
    class="flex flex-col overflow-hidden"
    style="width:260px;background:var(--sidebar-bg);border-right:1px solid var(--border-color)">

    <!-- Logo -->
    <div class="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0"
         style="border-color:var(--border-color)">
      <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
           style="background:linear-gradient(135deg,#3b82f6,#6366f1)">
        <img src="/syntaxcore-logo.jpg" alt="SC" class="w-full h-full object-cover">
      </div>
      <div class="min-w-0">
        <p class="font-bold text-sm truncate" style="color:var(--text-primary)">SyntaxCore</p>
        <p class="text-xs truncate" style="color:var(--text-muted)">Workforce Platform</p>
      </div>
      @if (isMobile()) {
        <button mat-icon-button class="ml-auto" (click)="sidenav.close()" style="color:var(--text-muted)">
          <mat-icon>close</mat-icon>
        </button>
      }
    </div>

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto py-3 px-3 space-y-5">
      @for (group of visibleGroups(); track group.title) {
        <div>
          <p class="px-2 text-xs font-semibold uppercase tracking-wider mb-1.5"
             style="color:var(--text-muted)">{{group.title}}</p>
          @for (item of group.items; track item.route) {
            <a [routerLink]="item.route"
               routerLinkActive="nav-active"
               [routerLinkActiveOptions]="{exact: item.exact ?? false}"
               class="nav-link flex items-center gap-3 px-3 py-2 rounded-xl text-sm mb-0.5 transition-all duration-150 group"
               (click)="isMobile() && sidenav.close()">
              <mat-icon class="flex-shrink-0" style="width:20px;height:20px;font-size:20px;line-height:20px">{{item.icon}}</mat-icon>
              <span class="flex-1 truncate">{{item.label}}</span>
              @if (item.label === 'Notifications' && unreadCount() > 0) {
                <span class="badge-pill">{{unreadCount() > 99 ? '99+' : unreadCount()}}</span>
              }
            </a>
          }
        </div>
      }
    </nav>

    <!-- User card -->
    <div class="border-t px-3 py-3 flex-shrink-0" style="border-color:var(--border-color)">
      <div class="flex items-center gap-1.5 px-2 py-1 mb-2">
        <div class="w-1.5 h-1.5 rounded-full"
             [class]="wsService.connected() ? 'bg-green-400 animate-pulse' : 'bg-red-400'"></div>
        <span class="text-xs" style="color:var(--text-muted)">
          {{wsService.connected() ? 'Connected' : 'Reconnecting...'}}
        </span>
      </div>
      <div [matMenuTriggerFor]="userMenu"
           class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-opacity-80"
           style="background:var(--hover-bg)">
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
             style="background:linear-gradient(135deg,#3b82f6,#6366f1)">
          {{initials()}}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate leading-tight" style="color:var(--text-primary)">{{user()?.fullName}}</p>
          <p class="text-xs truncate leading-tight" style="color:var(--text-muted)">{{roleLabel()}}</p>
        </div>
        <mat-icon class="text-base flex-shrink-0" style="color:var(--text-muted)">unfold_more</mat-icon>
      </div>

      <mat-menu #userMenu="matMenu" xPosition="after" yPosition="above">
        <div class="px-4 py-2 border-b border-slate-100 dark:border-slate-800 pointer-events-none">
          <p class="text-sm font-semibold text-slate-900 dark:text-white">{{user()?.fullName}}</p>
          <p class="text-xs text-slate-400 truncate">{{user()?.email}}</p>
          <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style="background:#eff6ff;color:#3b82f6">{{roleLabel()}}</span>
        </div>
        <a mat-menu-item routerLink="/profile"><mat-icon>person_outline</mat-icon>My Profile</a>
        <a mat-menu-item routerLink="/change-password"><mat-icon>lock_outline</mat-icon>Change Password</a>
        <button mat-menu-item (click)="toggleTheme()">
          <mat-icon>{{isDark() ? 'light_mode' : 'dark_mode'}}</mat-icon>
          <span>{{isDark() ? 'Light Mode' : 'Dark Mode'}}</span>
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="logout()" style="color:#ef4444">
          <mat-icon style="color:#ef4444">logout</mat-icon>
          <span>Sign Out</span>
        </button>
      </mat-menu>
    </div>
  </mat-sidenav>

  <!-- ══ MAIN ══ -->
  <mat-sidenav-content class="flex flex-col" style="background:var(--page-bg)">
    <!-- Topbar -->
    <div class="flex items-center gap-2 px-4 border-b flex-shrink-0"
         style="height:56px;background:var(--card-bg);border-color:var(--border-color)">
      <button mat-icon-button (click)="toggleSidenav(sidenav)" style="color:var(--text-muted)">
        <mat-icon>menu</mat-icon>
      </button>
      <div class="flex-1"></div>
      <!-- Role chip -->
      <span class="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-semibold"
            style="background:#eff6ff;color:#3b82f6">{{roleLabel()}}</span>
      <button mat-icon-button (click)="toggleTheme()" style="color:var(--text-muted)"
              [matTooltip]="isDark() ? 'Light mode' : 'Dark mode'">
        <mat-icon>{{isDark() ? 'light_mode' : 'dark_mode'}}</mat-icon>
      </button>
      <button mat-icon-button routerLink="/notifications" style="color:var(--text-muted)"
              [matBadge]="unreadCount() > 0 ? unreadCount() : null" matBadgeColor="warn" matBadgeSize="small">
        <mat-icon>notifications_none</mat-icon>
      </button>
      <div [matMenuTriggerFor]="topMenu"
           class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer ml-1"
           style="background:linear-gradient(135deg,#3b82f6,#6366f1)">
        {{initials()}}
      </div>
      <mat-menu #topMenu="matMenu">
        <a mat-menu-item routerLink="/profile"><mat-icon>person_outline</mat-icon>Profile</a>
        <button mat-menu-item (click)="logout()"><mat-icon style="color:#ef4444">logout</mat-icon><span style="color:#ef4444">Sign Out</span></button>
      </mat-menu>
    </div>

    <div class="flex-1 overflow-auto"><router-outlet></router-outlet></div>
  </mat-sidenav-content>
</mat-sidenav-container>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    :root {
      --sidebar-bg:#ffffff; --page-bg:#f1f5f9; --card-bg:#ffffff;
      --text-primary:#0f172a; --text-muted:#64748b;
      --border-color:#e2e8f0; --hover-bg:rgba(0,0,0,0.04);
    }
    .dark {
      --sidebar-bg:#0f172a; --page-bg:#020617; --card-bg:#0f172a;
      --text-primary:#f1f5f9; --text-muted:#94a3b8;
      --border-color:#1e293b; --hover-bg:rgba(255,255,255,0.05);
    }
    .nav-link { color: var(--text-muted); }
    .nav-link:hover { background: var(--hover-bg); color: var(--text-primary); }
    .nav-active { background: rgba(59,130,246,0.1) !important; color: #3b82f6 !important; font-weight: 600; }
    .nav-active mat-icon { color: #3b82f6 !important; }
    .dark .nav-active { background: rgba(59,130,246,0.18) !important; color: #60a5fa !important; }
    .dark .nav-active mat-icon { color: #60a5fa !important; }
    .badge-pill { background:#ef4444; color:white; font-size:10px; padding:1px 5px; border-radius:8px; font-weight:700; }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  private subs = new Subscription();
  isDark      = signal(localStorage.getItem('sc_theme') === 'dark');
  isMobile    = signal(window.innerWidth < 768);
  sidenavOpen = signal(window.innerWidth >= 768);

  user     = computed(() => this.authService.currentUser());
  initials = computed(() => {
    const u = this.user();
    return u ? `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() || 'SC' : 'SC';
  });
  roleLabel    = computed(() => ROLE_LABELS[this.user()?.role ?? ''] ?? this.user()?.role ?? '');
  unreadCount  = computed(() => this.notificationService.unreadCount());

  navGroups: NavGroup[] = [
    {
      title: 'Overview',
      items: [
        { key: 'dashboard', label: 'Dashboard',     icon: 'dashboard',           route: '/dashboard', exact: true },
        { key: 'analytics', label: 'Analytics',     icon: 'bar_chart',           route: '/analytics', roles: ['SUPER_ADMIN','ADMINISTRATOR','PROJECT_MANAGER','HR_MANAGER'] },
        { key: 'ai',        label: 'AI Assistant',  icon: 'auto_awesome',        route: '/ai-assistant' },
      ]
    },
    {
      title: 'Work',
      items: [
        { key: 'my-tasks',    label: 'My Tasks',        icon: 'task_alt',          route: '/tasks/my-tasks' },
        { key: 'task-approvals',label: 'Task Approvals',  icon: 'approval',            route: '/tasks/approvals', roles: ['SUPER_ADMIN','ADMINISTRATOR','PROJECT_MANAGER','HR_MANAGER'] },
        { key: 'all-tasks', label: 'All Tasks',     icon: 'format_list_bulleted', route: '/tasks' },
        { key: 'projects',  label: 'Projects',      icon: 'folder_open',         route: '/projects' },
      ]
    },
    {
      title: 'People & HR',
      items: [
        { key: 'employees',  label: 'Employees',      icon: 'people_outline',      route: '/employees', roles: ['SUPER_ADMIN','ADMINISTRATOR','PROJECT_MANAGER','HR_MANAGER'] },
        { key: 'attendance', label: 'Attendance',     icon: 'schedule',            route: '/attendance' },
        { key: 'daily-report', label: 'Daily Attendance', icon: 'fact_check',       route: '/attendance/daily-report', roles: ['SUPER_ADMIN','ADMINISTRATOR','PROJECT_MANAGER','HR_MANAGER'] },
        { key: 'working-schedule', label: 'Working Schedule', icon: 'tune',             route: '/attendance/working-schedule', roles: ['SUPER_ADMIN','ADMINISTRATOR'] },
        { key: 'leaves',     label: 'Leave Requests', icon: 'event_busy',          route: '/leaves' },
        { key: 'metrics',    label: 'Team Metrics',   icon: 'leaderboard',         route: '/metrics', roles: ['SUPER_ADMIN','ADMINISTRATOR','PROJECT_MANAGER','HR_MANAGER'] },
      ]
    },
    {
      title: 'Communication',
      items: [
        { key: 'chat',          label: 'Chat',          icon: 'chat_bubble_outline', route: '/chat' },
        { key: 'notifications', label: 'Notifications', icon: 'notifications_none',  route: '/notifications' },
      ]
    },
    {
      title: 'Learning',
      items: [
        { key: 'exams', label: 'Exam Portal', icon: 'quiz', route: '/exams' },
      ]
    },
    {
      title: 'Administration',
      items: [
        { key: 'admin',       label: 'Super Admin',   icon: 'shield',              route: '/admin',       roles: ['SUPER_ADMIN'] },
        { key: 'departments', label: 'Departments',   icon: 'business',            route: '/departments', roles: ['SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER'] },
        { key: 'reports',     label: 'Reports',       icon: 'assessment',          route: '/reports',     roles: ['SUPER_ADMIN','ADMINISTRATOR','PROJECT_MANAGER','HR_MANAGER'] },
        { key: 'leave-email-config', label: 'Leave Email Recipients', icon: 'mark_email_read', route: '/admin/leave-email-config', roles: ['SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER'] },
      ]
    },
  ];

  visibleGroups = computed(() => {
    const role = this.user()?.role ?? '';
    return this.navGroups
      .map(g => ({ ...g, items: g.items.filter(i =>
        (!i.roles || i.roles.includes(role)) && this.accessControl.isMenuAllowed(role, i.key)
      ) }))
      .filter(g => g.items.length > 0);
  });

  constructor(
    public authService: AuthService,
    public notificationService: NotificationService,
    public wsService: WebSocketService,
    private accessControl: AccessControlService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.applyTheme();
    this.wsService.connect();
    this.notificationService.getUnreadCount().subscribe();
    this.subs.add(this.wsService.notification$.subscribe(() => this.notificationService.incrementUnread()));
    this.startSessionWarning();
  }

  private _sessionWarnTimer: any;

  private startSessionWarning(): void {
    // Warn user 5 minutes before session expires
    const check = () => {
      const expiresIn = this.authService.getTokenExpiresIn();
      if (expiresIn === null) return;
      if (expiresIn > 0 && expiresIn <= 5 * 60 * 1000) {
        const mins = Math.ceil(expiresIn / 60000);
        this.snackBar.open(
          `⚠️ Your session will expire in ${mins} minute${mins !== 1 ? 's' : ''}. Any activity will extend it.`,
          'Dismiss', { duration: 8000, panelClass: ['warning-snackbar'] }
        );
      }
    };
    this._sessionWarnTimer = setInterval(check, 60000);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth < 768);
    if (window.innerWidth >= 768) this.sidenavOpen.set(true);
  }

  toggleSidenav(sidenav: any): void { sidenav.toggle(); }
  toggleTheme(): void {
    this.isDark.update(d => !d);
    localStorage.setItem('sc_theme', this.isDark() ? 'dark' : 'light');
    this.applyTheme();
  }
  applyTheme(): void { document.documentElement.classList.toggle('dark', this.isDark()); }
  logout(): void { this.authService.logout(); }
  ngOnDestroy(): void { this.subs.unsubscribe(); this.wsService.disconnect(); }
}
