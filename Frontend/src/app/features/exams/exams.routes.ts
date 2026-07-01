import { Routes } from '@angular/router';
import { examManageGuard } from '../../core/guards/role.guard';

export const EXAMS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./exam-list/exam-list.component').then(m => m.ExamListComponent) },
  {
    path: 'new',
    canActivate: [examManageGuard],
    loadComponent: () => import('./exam-form/exam-form.component').then(m => m.ExamFormComponent)
  },
  { path: ':id/take', loadComponent: () => import('./exam-take/exam-take.component').then(m => m.ExamTakeComponent) },
  {
    path: ':id/edit',
    canActivate: [examManageGuard],
    loadComponent: () => import('./exam-form/exam-form.component').then(m => m.ExamFormComponent)
  },
  {
    path: ':id/results',
    canActivate: [examManageGuard],
    loadComponent: () => import('./exam-results/exam-results.component').then(m => m.ExamResultsComponent)
  },
  {
    path: ':id/attempts/:attemptId',
    canActivate: [examManageGuard],
    loadComponent: () => import('./exam-grade/exam-grade.component').then(m => m.ExamGradeComponent)
  },
];
