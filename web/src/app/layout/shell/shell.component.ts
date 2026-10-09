import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="app-layout">
      <!-- Desktop Side Navigation -->
      <aside class="desktop-sidebar no-print">
        <div class="sidebar-brand">
          <div class="brand-logo">₹</div>
          <div class="brand-info">
            <span class="brand-title">Hisaab</span>
            <span class="brand-tagline">Wealth & Cashflow</span>
          </div>
        </div>

        <nav class="side-nav">
          <div class="nav-section-label">OVERVIEW</div>
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="7" height="9" x="3" y="3" rx="1"/>
              <rect width="7" height="5" x="14" y="3" rx="1"/>
              <rect width="7" height="9" x="14" y="12" rx="1"/>
              <rect width="7" height="5" x="3" y="16" rx="1"/>
            </svg>
            <span>Dashboard</span>
          </a>

          <div class="nav-section-label">LEDGERS & ASSETS</div>
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
            <span>EPFO Passbook</span>
          </a>

          <a routerLink="/investments" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
            <span>Investments</span>
          </a>

          <div class="nav-section-label">TOOLS & EXPORTS</div>
          <a routerLink="/reports" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span>Reports & PDF</span>
          </a>

          <a routerLink="/data-transfer" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Data Transfer</span>
          </a>

          <a routerLink="/settings" routerLinkActive="active" class="nav-item">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>Settings</span>
          </a>
        </nav>

        <!-- User profile widget at bottom of sidebar -->
        <div class="sidebar-user">
          @if (authService.isAuthenticated()) {
            <div class="user-chip" routerLink="/profile">
              <div class="user-avatar-sm">
                {{ (authService.currentUser()?.fullName || 'U')[0].toUpperCase() }}
              </div>
              <div class="user-details">
                <span class="user-name">{{ authService.currentUser()?.fullName || 'User' }}</span>
                <span class="user-email">{{ authService.currentUser()?.email }}</span>
              </div>
            </div>
            <button
              type="button"
              class="btn-logout"
              (click)="authService.logout()"
              title="Sign Out"
              aria-label="Sign Out">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          } @else {
            <a routerLink="/auth/login" class="btn-signin-full">Sign In</a>
          }
        </div>
      </aside>

      <!-- Main Shell Area -->
      <div class="main-wrapper">
        <header class="app-header no-print">
          <div class="header-left">
            <button
              type="button"
              class="mobile-menu-trigger"
              (click)="toggleMobileMenu()"
              aria-label="Toggle navigation menu">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>

            <div class="header-brand-mobile">
              <div class="brand-logo sm">₹</div>
              <span class="mobile-app-name">Hisaab</span>
            </div>

            <div class="desktop-status-pill">
              <span class="status-dot"></span>
              <span>All Systems Operational</span>
            </div>
          </div>

          <div class="header-right">
            <!-- Theme Toggle Button -->
            <button
              type="button"
              class="btn-icon btn-theme"
              (click)="themeService.toggleTheme()"
              [attr.aria-label]="themeService.isDarkMode() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
              title="Toggle Theme">
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

            <!-- Quick Data Transfer Link on Desktop -->
            <a routerLink="/data-transfer" class="btn-import-quick desktop-only">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Import / Export</span>
            </a>

            <!-- User Avatar or Sign In -->
            @if (authService.isAuthenticated()) {
              <a routerLink="/profile" class="header-avatar" title="View Profile">
                <span>{{ (authService.currentUser()?.fullName || 'U')[0].toUpperCase() }}</span>
              </a>
            } @else {
              <a routerLink="/auth/login" class="btn-signin-nav">Sign In</a>
            }
          </div>
        </header>

        <!-- Routed Main Content -->
        <main class="page-content">
          <router-outlet />
        </main>
      </div>

      <!-- Mobile Drawer / Flyout Navigation Menu -->
      @if (isMobileMenuOpen()) {
        <div class="mobile-drawer-overlay no-print" (click)="closeMobileMenu()">
          <div class="mobile-drawer-panel" (click)="$event.stopPropagation()">
            <div class="drawer-header">
              <div class="drawer-brand">
                <div class="brand-logo sm">₹</div>
                <div>
                  <span class="drawer-title">Hisaab</span>
                  <span class="drawer-sub">Finance Menu</span>
                </div>
              </div>
              <button
                type="button"
                class="btn-close-drawer"
                (click)="closeMobileMenu()"
                aria-label="Close Menu">
                ✕
              </button>
            </div>

            <nav class="drawer-nav">
              <a routerLink="/dashboard" (click)="closeMobileMenu()" class="drawer-link">
                <span>📊 Dashboard</span>
              </a>
              <a routerLink="/transactions" (click)="closeMobileMenu()" class="drawer-link">
                <span>💸 Income & Expenses</span>
              </a>
              <a routerLink="/loans" (click)="closeMobileMenu()" class="drawer-link">
                <span>🤝 Loans (Given / Taken)</span>
              </a>
              <a routerLink="/epfo" (click)="closeMobileMenu()" class="drawer-link">
                <span>🏦 EPFO Passbook</span>
              </a>
              <a routerLink="/investments" (click)="closeMobileMenu()" class="drawer-link">
                <span>📈 Investments & Holdings</span>
              </a>
              <a routerLink="/reports" (click)="closeMobileMenu()" class="drawer-link">
                <span>📑 Reports & PDF Export</span>
              </a>
              <a routerLink="/data-transfer" (click)="closeMobileMenu()" class="drawer-link">
                <span>📥 Data Import & Export</span>
              </a>
              <a routerLink="/settings" (click)="closeMobileMenu()" class="drawer-link">
                <span>⚙️ System Settings</span>
              </a>
              <a routerLink="/profile" (click)="closeMobileMenu()" class="drawer-link">
                <span>👤 My Profile</span>
              </a>
            </nav>

            <div class="drawer-footer">
              @if (authService.isAuthenticated()) {
                <button type="button" class="btn-drawer-logout" (click)="authService.logout(); closeMobileMenu()">
                  Sign Out
                </button>
              } @else {
                <a routerLink="/auth/login" (click)="closeMobileMenu()" class="btn-drawer-login">
                  Sign In
                </a>
              }
            </div>
          </div>
        </div>
      }

      <!-- Mobile Bottom Navigation Bar (Viewport < 768px) -->
      <nav class="bottom-nav no-print">
        <a routerLink="/dashboard" routerLinkActive="active" class="bottom-nav-item">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="7" height="9" x="3" y="3" rx="1"/>
            <rect width="7" height="5" x="14" y="3" rx="1"/>
            <rect width="7" height="9" x="14" y="12" rx="1"/>
            <rect width="7" height="5" x="3" y="16" rx="1"/>
          </svg>
          <span>Dashboard</span>
        </a>

        <a routerLink="/transactions" routerLinkActive="active" class="bottom-nav-item">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span>Txns</span>
        </a>

        <a routerLink="/loans" routerLinkActive="active" class="bottom-nav-item">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
            <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
            <path d="M7 21h10M12 3v18"/>
          </svg>
          <span>Loans</span>
        </a>

        <a routerLink="/epfo" routerLinkActive="active" class="bottom-nav-item">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M7 7h10M7 12h10M7 17h6"/>
          </svg>
          <span>EPFO</span>
        </a>

        <button type="button" class="bottom-nav-item btn-more" (click)="toggleMobileMenu()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"/>
            <circle cx="19" cy="12" r="1"/>
            <circle cx="5" cy="12" r="1"/>
          </svg>
          <span>More</span>
        </button>
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
      width: 250px;
      background: var(--color-bg-card);
      border-right: 1px solid var(--color-border);
      flex-direction: column;
      position: sticky;
      top: 0;
      height: 100vh;
      padding: 1.25rem 0.875rem;
      z-index: 30;

      @media (min-width: 900px) {
        display: flex;
      }
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.625rem 1.25rem;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 1rem;
    }

    .brand-logo {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #4f46e5, #6366f1);
      color: #ffffff;
      font-weight: 800;
      font-size: 1.2rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgb(79 70 229 / 0.25);

      &.sm {
        width: 32px;
        height: 32px;
        font-size: 1rem;
      }
    }

    .brand-info {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--color-text-main);
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .brand-tagline {
      font-size: 0.72rem;
      font-weight: 500;
      color: var(--color-text-muted);
    }

    .side-nav {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
      overflow-y: auto;
    }

    .nav-section-label {
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--color-text-subtle);
      letter-spacing: 0.08em;
      padding: 0.75rem 0.75rem 0.35rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.875rem;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 600;
      min-height: 40px;
      transition: all 0.15s ease;

      &:hover {
        background: var(--color-bg-subtle);
        color: var(--color-text-main);
      }

      &.active {
        background: var(--color-primary-light, #eef2ff);
        color: var(--color-primary);

        .nav-icon {
          stroke: var(--color-primary);
        }
      }
    }

    [data-theme='dark'] .nav-item.active {
      background: #1e1b4b;
      color: #818cf8;

      .nav-icon {
        stroke: #818cf8;
      }
    }

    .nav-icon {
      width: 18px;
      height: 18px;
      stroke: var(--color-text-muted);
      transition: stroke 0.15s ease;
      flex-shrink: 0;
    }

    .sidebar-user {
      padding-top: 0.75rem;
      border-top: 1px solid var(--color-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .user-chip {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      text-decoration: none;
      flex: 1;
      min-width: 0;
      cursor: pointer;
      padding: 0.35rem;
      border-radius: var(--radius-md);
      transition: background-color 0.15s ease;

      &:hover {
        background: var(--color-bg-subtle);
      }
    }

    .user-avatar-sm {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--color-primary);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .user-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-email {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn-logout {
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      width: 34px;
      height: 34px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;

      &:hover {
        background: var(--color-expense-bg);
        color: var(--color-expense);
      }
    }

    .btn-signin-full {
      width: 100%;
      min-height: var(--min-touch-target);
      background: var(--color-primary);
      color: #ffffff;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }

    /* Main Area Layout */
    .main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding-bottom: 70px; /* Mobile bottom bar clearance */

      @media (min-width: 900px) {
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
      z-index: 20;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .mobile-menu-trigger {
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: var(--color-text-main);
      width: 38px;
      height: 38px;
      cursor: pointer;
      border-radius: var(--radius-sm);

      @media (min-width: 900px) {
        display: none;
      }
    }

    .header-brand-mobile {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      @media (min-width: 900px) {
        display: none;
      }
    }

    .mobile-app-name {
      font-weight: 800;
      font-size: 1.15rem;
      color: var(--color-text-main);
      letter-spacing: -0.02em;
    }

    .desktop-status-pill {
      display: none;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-muted);
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-full);

      @media (min-width: 900px) {
        display: inline-flex;
      }
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #16a34a;
      box-shadow: 0 0 6px #16a34a;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-theme {
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      color: var(--color-text-main);
      cursor: pointer;
      width: 38px;
      height: 38px;
      border-radius: var(--radius-md);
      transition: all 0.15s ease;

      &:hover {
        background: var(--color-bg-hover);
      }
    }

    .btn-import-quick {
      display: none;
      align-items: center;
      gap: 0.4rem;
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      color: var(--color-text-main);
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;

      &:hover {
        background: var(--color-primary-light, #eef2ff);
        color: var(--color-primary);
        border-color: var(--color-primary);
      }

      @media (min-width: 900px) {
        display: inline-flex;
      }
    }

    .header-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #4f46e5, #6366f1);
      color: #ffffff;
      font-weight: 700;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.15);
    }

    .btn-signin-nav {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.4rem 0.85rem;
      background: var(--color-primary);
      color: #ffffff;
      border-radius: var(--radius-md);
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      min-height: 36px;
    }

    .page-content {
      flex: 1;
      padding: 1.25rem 1rem;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;

      @media (min-width: 768px) {
        padding: 1.5rem;
      }
    }

    /* Mobile Drawer */
    .mobile-drawer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 100;
      display: flex;
      animation: fadeIn 0.15s ease-out;
    }

    .mobile-drawer-panel {
      width: 280px;
      max-width: 85%;
      height: 100%;
      background: var(--color-bg-card);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      animation: slideIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .drawer-header {
      padding: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--color-border);
    }

    .drawer-brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .drawer-title {
      font-weight: 800;
      font-size: 1.1rem;
      display: block;
      line-height: 1.2;
    }

    .drawer-sub {
      font-size: 0.72rem;
      color: var(--color-text-muted);
    }

    .btn-close-drawer {
      background: transparent;
      border: none;
      font-size: 1.25rem;
      color: var(--color-text-muted);
      cursor: pointer;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
    }

    .drawer-nav {
      flex: 1;
      overflow-y: auto;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .drawer-link {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--color-text-main);
      text-decoration: none;
      border-radius: var(--radius-md);
      min-height: 44px;

      &:hover, &:active {
        background: var(--color-bg-subtle);
        color: var(--color-primary);
      }
    }

    .drawer-footer {
      padding: 1rem;
      border-top: 1px solid var(--color-border);
    }

    .btn-drawer-logout {
      width: 100%;
      min-height: 44px;
      background: var(--color-expense-bg);
      color: var(--color-expense);
      border: 1px solid var(--color-expense-border);
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .btn-drawer-login {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 44px;
      background: var(--color-primary);
      color: #ffffff;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.875rem;
      text-decoration: none;
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
      padding: 0.25rem 0.25rem calc(0.25rem + env(safe-area-inset-bottom, 0px));
      z-index: 50;

      @media (min-width: 900px) {
        display: none;
      }
    }

    .bottom-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.2rem;
      min-width: 48px;
      min-height: 48px;
      color: var(--color-text-muted);
      text-decoration: none;
      font-size: 0.6875rem;
      font-weight: 600;
      flex: 1;
      background: transparent;
      border: none;
      cursor: pointer;

      svg {
        stroke: var(--color-text-muted);
        transition: stroke 0.15s ease;
      }

      &.active {
        color: var(--color-primary);

        svg {
          stroke: var(--color-primary);
        }
      }
    }

    @keyframes slideIn {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
  `]
})
export class ShellComponent {
  readonly themeService = inject(ThemeService);
  readonly authService = inject(AuthService);
  readonly isMobileMenuOpen = signal<boolean>(false);

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}
