import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () => import('./features/auth/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'transactions',
        canActivate: [authGuard],
        loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent)
      },
      {
        path: 'loans',
        canActivate: [authGuard],
        loadComponent: () => import('./features/loans/loans.component').then(m => m.LoansComponent)
      },
      {
        path: 'loans/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./features/loans/loan-detail/loan-detail.component').then(m => m.LoanDetailComponent)
      },
      {
        path: 'epfo',
        canActivate: [authGuard],
        loadComponent: () => import('./features/epfo/epfo.component').then(m => m.EpfoComponent)
      },
      {
        path: 'investments',
        canActivate: [authGuard],
        loadComponent: () => import('./features/investments/investments.component').then(m => m.InvestmentsComponent)
      },
      {
        path: 'reports',
        canActivate: [authGuard],
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'settings',
        canActivate: [authGuard],
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
