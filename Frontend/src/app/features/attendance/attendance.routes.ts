import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

export const ATTENDANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./attendance.component').then(m => m.AttendanceComponent)
  },
  {
    path: 'working-schedule',
    canActivate: [roleGuard],
    data: { roles: ['SUPER_ADMIN', 'ADMINISTRATOR'] },
    loadComponent: () => import('./working-schedule/working-schedule.component').then(m => m.WorkingScheduleComponent)
  },
  {
    path: 'daily-report',
    canActivate: [roleGuard],
    data: { roles: ['SUPER_ADMIN', 'ADMINISTRATOR', 'PROJECT_MANAGER', 'HR_MANAGER'], menuKey: 'daily-report' },
    loadComponent: () => import('./daily-report/daily-report.component').then(m => m.DailyReportComponent)
  }
];
