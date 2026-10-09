import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { MonthPickerComponent } from '../../shared/components/month-picker/month-picker.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, MonthPickerComponent],
  template: `
    <div class="app-layout">
      <!-- Desktop Side Navigation -->
      <aside class="desktop-sidebar no-print">
        <div class="brand">
          <div class="brand-logo">₹</div>
          <div class="brand-text">
            <h2>Hisaab</h2>
            <span>Finance Tracker</span>
          </div>
        </div>

        <nav class="side-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="7" height="9" x="3" y="3" rx="1"/>
              <rect width="7" height="5" x="14" y="3" rx="1"/>
              <rect width="7" height="9" x="14" y="12" rx="1"/>
              <rect width="7" height="5" x="3" y="16" rx="1"/>
            </svg>
            <span>Dashboard</span>
          </a>

          <a routerLink="/transactions" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <span>Transactions</span>
          </a>

          <a routerLink="/loans" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
              <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
              <path d="M7 21h10"/>
              <path d="M12 3v18"/>
              <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
            </svg>
            <span>Loans</span>
          </a>

          <a routerLink="/epfo" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="18" height="18" x="3" y="3" rx="2"/>
              <path d="M7 7h10M7 12h10M7 17h6"/>
            </svg>
            <span>EPFO</span>
          </a>

          <a routerLink="/investments" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
            <span>Investments</span>
          </a>

          <a routerLink="/reports" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span>Reports</span>
          </a>

          <a routerLink="/settings" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>Settings</span>
          </a>
        </nav>
      </aside>

      <!-- Main Shell Area -->
      <div class="main-wrapper">
        <header class="app-header no-print">
          <div class="mobile-brand">
            <div class="brand-logo sm">₹</div>
            <h1>Hisaab</h1>
          </div>

          <div class="header-center">
            <app-month-picker />
          </div>

          <div class="header-actions">
            <button type="button" class="btn-theme-toggle" (click)="themeService.toggleTheme()" [attr.aria-label]="themeService.isDarkMode() ? 'Switch to Light Mode' : 'Switch to Dark Mode'">
              @if (themeService.isDarkMode()) {
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              }
            </button>

            @if (authService.isAuthenticated()) {
              <a routerLink="/profile" class="user-avatar" title="View Profile">
                <span>{{ (authService.currentUser()?.fullName || 'User')[0].toUpperCase() }}</span>
              </a>
            } @else {
              <a routerLink="/auth/login" class="btn-signin">
                Sign In
              </a>
            }
          </div>
        </header>

        <!-- Routed Page Content -->
        <main class="page-content">
          <router-outlet />
        </main>
      </div>

      <!-- Mobile Bottom Navigation (Viewport < 768px) -->
      <nav class="bottom-nav no-print">
        <a routerLink="/dashboard" routerLinkActive="active" class="bottom-nav-item">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="7" height="9" x="3" y="3" rx="1"/>
            <rect width="7" height="5" x="14" y="3" rx="1"/>
            <rect width="7" height="9" x="14" y="12" rx="1"/>
            <rect width="7" height="5" x="3" y="16" rx="1"/>
          </svg>
          <span>Dashboard</span>
        </a>

        <a routerLink="/transactions" routerLinkActive="active" class="bottom-nav-item">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span>Txns</span>
        </a>

        <a routerLink="/loans" routerLinkActive="active" class="bottom-nav-item">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
            <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
            <path d="M7 21h10M12 3v18"/>
          </svg>
          <span>Loans</span>
        </a>

        <a routerLink="/epfo" routerLinkActive="active" class="bottom-nav-item">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M7 7h10M7 12h10M7 17h6"/>
          </svg>
          <span>EPFO</span>
        </a>

        <a routerLink="/investments" routerLinkActive="active" class="bottom-nav-item">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
          <span>Invest</span>
        </a>
      </nav>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      min-height: 100vh;
      background: var(--color-bg-app);
    }

    /* Desktop Sidebar */
    .desktop-sidebar {
      display: none;
      width: 260px;
      background: var(--color-bg-card);
      border-right: 1px solid var(--color-border);
      flex-direction: column;
      position: sticky;
      top: 0;
      height: 100vh;
      padding: 1.5rem 1rem;
      z-index: 20;

      @media (min-width: 768px) {
        display: flex;
      }
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 1.5rem;
    }

    .brand-logo {
      width: 40px;
      height: 40px;
      background: var(--color-primary);
      color: #ffffff;
      font-weight: 700;
      font-size: 1.25rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;

      &.sm {
        width: 32px;
        height: 32px;
        font-size: 1rem;
      }
    }

    .brand-text h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text-main);
      line-height: 1.2;
    }

    .brand-text span {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .side-nav {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      color: var(--color-text-muted);
      text-decoration: none;
      font-weight: 500;
      min-height: var(--min-touch-target);
      transition: all 0.15s ease;

      &:hover {
        background: var(--color-bg-subtle);
        color: var(--color-text-main);
      }

      &.active {
        background: var(--color-primary);
        color: #ffffff;

        .nav-icon {
          stroke: #ffffff;
        }
      }
    }

    .nav-icon {
      width: 20px;
      height: 20px;
      stroke: currentColor;
    }

    /* Main Area */
    .main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding-bottom: 72px; /* Space for mobile bottom bar */

      @media (min-width: 768px) {
        padding-bottom: 0;
      }
    }

    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 1.25rem;
      background: var(--color-bg-card);
      border-bottom: 1px solid var(--color-border);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .mobile-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      h1 {
        font-size: 1.2rem;
        font-weight: 700;
      }

      @media (min-width: 768px) {
        display: none;
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-theme-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--min-touch-target);
      height: var(--min-touch-target);
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      color: var(--color-text-main);
      cursor: pointer;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--color-primary);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .page-content {
      flex: 1;
      padding: 1.25rem;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
    }

    /* Mobile Bottom Navigation */
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--color-bg-card);
      border-top: 1px solid var(--color-border);
      display: flex;
      justify-content: space-around;
      align-items: center;
      padding: 0.35rem 0.5rem calc(0.35rem + env(safe-area-inset-bottom, 0px));
      z-index: 50;

      @media (min-width: 768px) {
        display: none;
      }
    }

    .bottom-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.2rem;
      min-width: var(--min-touch-target);
      min-height: var(--min-touch-target);
      color: var(--color-text-muted);
      text-decoration: none;
      font-size: 0.7rem;
      font-weight: 500;
      flex: 1;

      &.active {
        color: var(--color-primary);

        svg {
          stroke: var(--color-primary);
        }
      }
    }

    .btn-signin {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.4rem 0.85rem;
      background: var(--color-primary);
      color: #ffffff;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
      min-height: calc(var(--min-touch-target) - 8px);
      transition: background-color 0.15s ease;

      &:hover {
        background: var(--color-primary-hover);
      }
    }
  `]
})
export class ShellComponent {
  readonly themeService = inject(ThemeService);
  readonly authService = inject(AuthService);
}

