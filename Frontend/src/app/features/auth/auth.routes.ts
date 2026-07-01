import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
    title: 'Sign In — SyntaxCore'
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.component').then(m => m.RegisterComponent),
    title: 'Create Account — SyntaxCore'
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    title: 'Forgot Password — SyntaxCore'
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
