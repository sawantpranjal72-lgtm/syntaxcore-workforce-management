import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
export const TASK_ROUTES: Routes = [
  { path: '',         loadComponent: () => import('./task-list/task-list.component').then(m => m.TaskListComponent) },
  { path: 'my-tasks', loadComponent: () => import('./my-tasks/my-tasks.component').then(m => m.MyTasksComponent) },
  {
    path: 'approvals',
    canActivate: [roleGuard],
    data: { roles: ['SUPER_ADMIN','ADMINISTRATOR','PROJECT_MANAGER','HR_MANAGER'] },
    loadComponent: () => import('./task-approval/task-approval.component').then(m => m.TaskApprovalComponent)
  },
  { path: 'new',      loadComponent: () => import('./task-form/task-form.component').then(m => m.TaskFormComponent) },
  { path: ':id',      loadComponent: () => import('./task-detail/task-detail.component').then(m => m.TaskDetailComponent) },
  { path: ':id/edit', loadComponent: () => import('./task-form/task-form.component').then(m => m.TaskFormComponent) },
];
