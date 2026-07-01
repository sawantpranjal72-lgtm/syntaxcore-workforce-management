import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MenuDefinition {
  key: string;
  label: string;
  icon: string;
}

export interface FeatureFlagConfig {
  key: string;
  enabled: boolean;
}

export interface AccessControlSettings {
  menuAccess: Record<string, string[]>;
  featureFlags: Record<string, boolean>;
  examPermissions?: Record<string, ExamRolePermission>;
}

export interface ExamRolePermission {
  /** Can create, edit, delete, and publish exams */
  canManage: boolean;
  /** Can take/attempt exams */
  canTake: boolean;
}

@Injectable({ providedIn: 'root' })
export class AccessControlService {
  private readonly MENU_KEY = 'sc_menu_access';
  private readonly FEATURE_KEY = 'sc_feature_flags';
  private readonly EXAM_PERMS_KEY = 'sc_exam_permissions';
  private readonly API = environment.apiUrl;
  private loaded = false;
  private loading$?: Observable<AccessControlSettings>;

  readonly allMenus: MenuDefinition[] = [
    { key: 'dashboard',        label: 'Dashboard',         icon: 'dashboard' },
    { key: 'analytics',        label: 'Analytics',         icon: 'bar_chart' },
    { key: 'ai',               label: 'AI Assistant',      icon: 'auto_awesome' },
    { key: 'my-tasks',         label: 'My Tasks',          icon: 'task_alt' },
    { key: 'task-approvals',   label: 'Task Approvals',    icon: 'approval' },
    { key: 'all-tasks',        label: 'All Tasks',         icon: 'format_list_bulleted' },
    { key: 'projects',         label: 'Projects',          icon: 'folder_open' },
    { key: 'employees',        label: 'Employees',         icon: 'people_outline' },
    { key: 'attendance',       label: 'Attendance',        icon: 'schedule' },
    { key: 'daily-report',     label: 'Daily Attendance',  icon: 'fact_check' },
    { key: 'working-schedule', label: 'Working Schedule',  icon: 'tune' },
    { key: 'leaves',           label: 'Leave Requests',    icon: 'event_busy' },
    { key: 'metrics',          label: 'Team Metrics',      icon: 'leaderboard' },
    { key: 'chat',             label: 'Chat',              icon: 'chat_bubble_outline' },
    { key: 'notifications',    label: 'Notifications',     icon: 'notifications_none' },
    { key: 'admin',            label: 'Super Admin',       icon: 'shield' },
    { key: 'departments',      label: 'Departments',       icon: 'business' },
    { key: 'reports',          label: 'Reports',           icon: 'assessment' },
    { key: 'exams',            label: 'Exam Portal',       icon: 'quiz' },
    { key: 'leave-email-config', label: 'Leave Email Config', icon: 'mark_email_read' },
  ];

  readonly defaultMenuAccessMap: Record<string, string[]> = {
    SUPER_ADMIN:     ['dashboard','analytics','ai','my-tasks','task-approvals','all-tasks','projects','employees','attendance','daily-report','working-schedule','leaves','metrics','chat','notifications','admin','departments','reports','exams','leave-email-config'],
    ADMINISTRATOR:   ['dashboard','analytics','ai','my-tasks','task-approvals','all-tasks','projects','employees','attendance','daily-report','working-schedule','leaves','metrics','chat','notifications','departments','reports','exams','leave-email-config'],
    PROJECT_MANAGER: ['dashboard','analytics','ai','my-tasks','task-approvals','all-tasks','projects','employees','attendance','daily-report','leaves','metrics','chat','notifications','exams'],
    HR_MANAGER:      ['dashboard','analytics','ai','my-tasks','task-approvals','all-tasks','projects','employees','attendance','daily-report','working-schedule','leaves','metrics','chat','notifications','departments','reports','exams','leave-email-config'],
    EMPLOYEE:        ['dashboard','ai','my-tasks','all-tasks','projects','attendance','leaves','chat','notifications','exams'],
    INTERN:          ['dashboard','ai','my-tasks','all-tasks','attendance','chat','notifications','exams'],
    STUDENT:         ['dashboard','attendance','notifications','exams'],
  };

  private readonly menuFeatureMap: Record<string, string> = {
    analytics: 'analytics',
    ai: 'ai',
    attendance: 'attendance',
    leaves: 'leave_mgmt',
    chat: 'chat',
    reports: 'reports',
  };

  /**
   * Default exam permissions per role. Super Admin can override these via the
   * Admin panel — SUPER_ADMIN always retains canManage regardless of overrides.
   */
  readonly defaultExamPermissions: Record<string, ExamRolePermission> = {
    SUPER_ADMIN:     { canManage: true,  canTake: true },
    ADMINISTRATOR:   { canManage: true,  canTake: true },
    PROJECT_MANAGER: { canManage: true,  canTake: true },
    HR_MANAGER:      { canManage: true,  canTake: true },
    EMPLOYEE:        { canManage: false, canTake: true },
    INTERN:          { canManage: false, canTake: true },
    STUDENT:         { canManage: false, canTake: true },
  };

  menuAccess = signal<Record<string, string[]>>(this.readMenuAccess());
  featureFlags = signal<Record<string, boolean>>(this.readFeatureFlags());
  examPermissions = signal<Record<string, ExamRolePermission>>(this.readExamPermissions());

  constructor(private http: HttpClient) {
    window.addEventListener('storage', event => {
      if (event.key === this.MENU_KEY) this.menuAccess.set(this.readMenuAccess());
      if (event.key === this.FEATURE_KEY) this.featureFlags.set(this.readFeatureFlags());
    });
  }

  isMenuAllowed(role: string, menuKey?: string): boolean {
    if (!menuKey) return true;
    if (menuKey === 'dashboard') return true;
    if (role === 'SUPER_ADMIN' && menuKey === 'admin') return true;

    const access = this.menuAccess();
    const savedMenus = access[role];

    // The backend (/api/v1/access-control) is the single source of truth.
    // It always returns a complete, correct per-role menu list: full
    // defaults when nothing has been customized, or the exact saved list
    // once an admin has saved changes (including intentional removals).
    // We must NOT merge in local defaults here — doing so previously made
    // it impossible to ever remove a default module from a role, since any
    // menu missing from savedMenus (whether removed on purpose or just new)
    // was silently added back. Only fall back to local defaults if the
    // settings haven't loaded for this role at all yet.
    const allowedMenus = savedMenus ?? this.defaultMenuAccessMap[role] ?? [];

    return allowedMenus.includes(menuKey) && this.isFeatureEnabledForMenu(menuKey);
  }

  isFeatureEnabled(featureKey: string): boolean {
    return this.featureFlags()[featureKey] ?? true;
  }

  isFeatureEnabledForMenu(menuKey: string): boolean {
    const featureKey = this.menuFeatureMap[menuKey];
    return featureKey ? this.isFeatureEnabled(featureKey) : true;
  }

  /** Can this role create, edit, delete, and publish exams? Super Admin always can. */
  canManageExams(role: string | undefined | null): boolean {
    if (!role) return false;
    if (role === 'SUPER_ADMIN') return true;
    const perms = this.examPermissions();
    return perms[role]?.canManage ?? this.defaultExamPermissions[role]?.canManage ?? false;
  }

  /** Can this role take/attempt exams? */
  canTakeExams(role: string | undefined | null): boolean {
    if (!role) return false;
    const perms = this.examPermissions();
    return perms[role]?.canTake ?? this.defaultExamPermissions[role]?.canTake ?? true;
  }

  setExamPermissions(config: Record<string, ExamRolePermission>): Observable<AccessControlSettings> {
    return this.http.put<AccessControlSettings>(`${this.API}/admin/access-control/exam-permissions`, { examPermissions: config }).pipe(
      tap(settings => this.applySettings(settings)),
      catchError(() => {
        // Offline/demo fallback: persist locally so the toggle still works without backend
        localStorage.setItem(this.EXAM_PERMS_KEY, JSON.stringify(config));
        this.examPermissions.set(config);
        return of(this.currentSettings());
      })
    );
  }

  loadSettings(): Observable<AccessControlSettings> {
    if (!this.loading$) {
      this.loading$ = this.http.get<AccessControlSettings>(`${this.API}/access-control`).pipe(
        tap(settings => this.applySettings(settings)),
        catchError(() => {
          this.loaded = true;
          return of(this.currentSettings());
        }),
        shareReplay(1)
      );
    }
    return this.loading$;
  }

  ensureLoaded(): Observable<void> {
    return this.loaded
      ? of(void 0)
      : this.loadSettings().pipe(map(() => void 0), catchError(() => of(void 0)));
  }

  setMenuAccess(config: Record<string, string[]>): Observable<AccessControlSettings> {
    return this.http.put<AccessControlSettings>(`${this.API}/admin/access-control/menu-access`, { menuAccess: config }).pipe(
      tap(settings => this.applySettings(settings))
    );
  }

  setFeatureFlags(config: Record<string, boolean>): Observable<AccessControlSettings> {
    return this.http.put<AccessControlSettings>(`${this.API}/admin/access-control/feature-flags`, { featureFlags: config }).pipe(
      tap(settings => this.applySettings(settings))
    );
  }

  menuKeyFromUrl(url: string): string {
    const path = url.split('?')[0];
    if (path === '/' || path.startsWith('/dashboard')) return 'dashboard';
    if (path.startsWith('/analytics')) return 'analytics';
    if (path.startsWith('/ai-assistant')) return 'ai';
    if (path === '/tasks/my-tasks' || path.startsWith('/tasks/my-tasks/')) return 'my-tasks';
    if (path === '/tasks/approvals' || path.startsWith('/tasks/approvals')) return 'task-approvals';
    if (path.startsWith('/tasks')) return 'all-tasks';
    if (path.startsWith('/projects')) return 'projects';
    if (path.startsWith('/employees')) return 'employees';
    if (path.startsWith('/attendance/daily-report')) return 'daily-report';
    if (path.startsWith('/attendance')) return 'attendance';
    if (path.startsWith('/leaves')) return 'leaves';
    if (path.startsWith('/metrics')) return 'metrics';
    if (path.startsWith('/chat')) return 'chat';
    if (path.startsWith('/notifications')) return 'notifications';
    if (path.startsWith('/admin/leave-email-config')) return 'leave-email-config';
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/departments')) return 'departments';
    if (path.startsWith('/reports')) return 'reports';
    if (path.startsWith('/exams')) return 'exams';
    return '';
  }

  private readMenuAccess(): Record<string, string[]> {
    try {
      const raw = localStorage.getItem(this.MENU_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private readFeatureFlags(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem(this.FEATURE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private readExamPermissions(): Record<string, ExamRolePermission> {
    try {
      const raw = localStorage.getItem(this.EXAM_PERMS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private applySettings(settings: AccessControlSettings): void {
    const menuAccess = settings.menuAccess ?? {};
    const featureFlags = settings.featureFlags ?? {};
    const examPermissions = settings.examPermissions ?? this.examPermissions();
    localStorage.setItem(this.MENU_KEY, JSON.stringify(menuAccess));
    localStorage.setItem(this.FEATURE_KEY, JSON.stringify(featureFlags));
    localStorage.setItem(this.EXAM_PERMS_KEY, JSON.stringify(examPermissions));
    this.menuAccess.set(menuAccess);
    this.featureFlags.set(featureFlags);
    this.examPermissions.set(examPermissions);
    this.loaded = true;
  }

  private currentSettings(): AccessControlSettings {
    return {
      menuAccess: this.menuAccess(),
      featureFlags: this.featureFlags(),
      examPermissions: this.examPermissions()
    };
  }
}
