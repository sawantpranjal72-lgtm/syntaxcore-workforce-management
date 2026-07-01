import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleChildGuard, roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      { path: 'login',           loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register',        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
      { path: '',                redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    canActivateChild: [roleChildGuard],
    children: [
      { path: '',              redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',     data: { menuKey: 'dashboard' }, loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      // Tasks (no kanban route needed in menu, but keep route for backwards compat)
      { path: 'tasks',         loadChildren: () => import('./features/tasks/task.routes').then(m => m.TASK_ROUTES) },
      // Projects
      { path: 'projects',      data: { menuKey: 'projects' }, loadChildren: () => import('./features/projects/project.routes').then(m => m.PROJECT_ROUTES) },
      // Employees
      {
        path: 'employees',
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN','ADMINISTRATOR','PROJECT_MANAGER','HR_MANAGER'], menuKey: 'employees' },
        loadChildren: () => import('./features/employees/employee.routes').then(m => m.EMPLOYEE_ROUTES)
      },
      // Attendance
      { path: 'attendance',    data: { menuKey: 'attendance' }, loadChildren: () => import('./features/attendance/attendance.routes').then(m => m.ATTENDANCE_ROUTES) },
      // Leaves
      { path: 'leaves',        data: { menuKey: 'leaves' }, loadComponent: () => import('./features/leaves/leaves.component').then(m => m.LeavesComponent) },
      // Chat
      { path: 'chat',          data: { menuKey: 'chat' }, loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent) },
      // Notifications
      { path: 'notifications', data: { menuKey: 'notifications' }, loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent) },
      // Analytics
      {
        path: 'analytics',
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN','ADMINISTRATOR','PROJECT_MANAGER','HR_MANAGER'], menuKey: 'analytics' },
        loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent)
      },
      // Team Metrics - new employee attendance+task view
      {
        path: 'metrics',
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN','ADMINISTRATOR','PROJECT_MANAGER','HR_MANAGER'], menuKey: 'metrics' },
        loadComponent: () => import('./features/metrics/metrics.component').then(m => m.MetricsComponent)
      },
      // AI Assistant
      { path: 'ai-assistant',  data: { menuKey: 'ai' }, loadComponent: () => import('./features/ai-assistant/ai-assistant.component').then(m => m.AiAssistantComponent) },
      // Profile
      { path: 'profile',       loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
      // Change password
      { path: 'change-password', loadComponent: () => import('./features/auth/change-password/change-password.component').then(m => m.ChangePasswordComponent) },
      // Super Admin
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN'], menuKey: 'admin' },
        loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent)
      },
      // Departments
      {
        path: 'departments',
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER'], menuKey: 'departments' },
        loadComponent: () => import('./features/departments/departments.component').then(m => m.DepartmentsComponent)
      },
      // Reports
      {
        path: 'reports',
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN','ADMINISTRATOR','PROJECT_MANAGER','HR_MANAGER'], menuKey: 'reports' },
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent)
      },
      // ── New Enterprise Modules ──────────────────────────────────
      // Exam Portal
      { path: 'exams', data: { menuKey: 'exams' },
        loadChildren: () => import('./features/exams/exams.routes').then(m => m.EXAMS_ROUTES) },
      // Leave Email Config (Admin)
      {
        path: 'admin/leave-email-config',
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN','ADMINISTRATOR','HR_MANAGER'], menuKey: 'leave-email-config' },
        loadComponent: () => import('./features/admin/leave-email-config/leave-email-config.component').then(m => m.LeaveEmailConfigComponent)
      },
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];
