import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { authGuard } from './core/guards/auth.guard';
import { roleRightsGuard } from './core/guards/role-rights.guard';

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
    path: 'auth/reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
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
        path: 'access-denied',
        loadComponent: () => import('./features/error/access-denied.component').then(m => m.AccessDeniedComponent)
      },
      {
        path: 'analytics',
        canActivate: [authGuard, roleRightsGuard],
        data: { module: 'Reports' },
        loadComponent: () => import('./features/analytics/kpi-dashboard.component').then(m => m.KpiDashboardComponent)
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () => import('./features/auth/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'transactions',
        canActivate: [authGuard, roleRightsGuard],
        data: { module: 'Transactions' },
        loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent)
      },
      {
        path: 'loans',
        canActivate: [authGuard, roleRightsGuard],
        data: { module: 'Loans' },
        loadComponent: () => import('./features/loans/loans.component').then(m => m.LoansComponent)
      },
      {
        path: 'loans/:id',
        canActivate: [authGuard, roleRightsGuard],
        data: { module: 'Loans' },
        loadComponent: () => import('./features/loans/loan-detail/loan-detail.component').then(m => m.LoanDetailComponent)
      },
      {
        path: 'goals',
        canActivate: [authGuard, roleRightsGuard],
        data: { module: 'Goals' },
        loadComponent: () => import('./features/goals/goals.component').then(m => m.GoalsComponent)
      },
      {
        path: 'goals/:id',
        canActivate: [authGuard, roleRightsGuard],
        data: { module: 'Goals' },
        loadComponent: () => import('./features/goals/goal-detail/goal-detail.component').then(m => m.GoalDetailComponent)
      },
      {
        path: 'epfo',
        canActivate: [authGuard, roleRightsGuard],
        data: { module: 'Epfo' },
        loadComponent: () => import('./features/epfo/epfo.component').then(m => m.EpfoComponent)
      },
      {
        path: 'investments',
        canActivate: [authGuard, roleRightsGuard],
        data: { module: 'Investments' },
        loadComponent: () => import('./features/investments/investments.component').then(m => m.InvestmentsComponent)
      },
      {
        path: 'investments/:id',
        canActivate: [authGuard, roleRightsGuard],
        data: { module: 'Investments' },
        loadComponent: () => import('./features/investments/holding-detail/holding-detail.component').then(m => m.HoldingDetailComponent)
      },
      {
        path: 'market-ai',
        canActivate: [authGuard, roleRightsGuard],
        data: { module: 'Investments' },
        loadComponent: () => import('./features/market-ai/market-ai.component').then(m => m.MarketAiComponent)
      },
      {
        path: 'business',
        canActivate: [authGuard, roleRightsGuard],
        data: { module: 'Business' },
        loadComponent: () => import('./features/business/business.component').then(m => m.BusinessComponent)
      },
      {
        path: 'reports',
        canActivate: [authGuard, roleRightsGuard],
        data: { module: 'Reports' },
        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent)
      },
      {
        path: 'data-transfer',
        canActivate: [authGuard],
        loadComponent: () => import('./features/data-transfer/data-transfer.component').then(m => m.DataTransferComponent)
      },
      {
        path: 'recycle-bin',
        canActivate: [authGuard],
        loadComponent: () => import('./features/recycle-bin/recycle-bin.component').then(m => m.RecycleBinComponent)
      },
      {
        path: 'settings',
        canActivate: [authGuard, roleRightsGuard],
        data: { module: 'Settings' },
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
