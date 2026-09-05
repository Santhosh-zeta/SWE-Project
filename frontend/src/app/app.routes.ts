import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(c => c.LoginComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register.component').then(c => c.RegisterComponent) },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(c => c.DashboardComponent) },
      { path: 'expenses', loadComponent: () => import('./features/expenses/expenses.component').then(c => c.ExpensesComponent) },
      { path: 'categories', loadComponent: () => import('./features/categories/categories.component').then(c => c.CategoriesComponent) },
      { path: 'analytics', loadComponent: () => import('./features/analytics/analytics.component').then(c => c.AnalyticsComponent) },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(c => c.SettingsComponent) }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
