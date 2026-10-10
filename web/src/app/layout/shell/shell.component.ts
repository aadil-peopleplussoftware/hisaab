import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService, ThemeName, IconStyle, SidebarPosition } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  route: string;
  label: string;
  badge: string;
  emoji: string;
  section: string;
  svgType: string;
}

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Theme' | 'Icon Pack' | 'Sidebar Layout' | 'Settings';
  icon: string;
  action: () => void;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div
      class="app-layout"
      [attr.data-sidebar]="themeService.sidebarPosition()"
      [attr.data-density]="themeService.density()"
    >
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
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item" title="Dashboard">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navDashboard }" />
            <span class="nav-label">Dashboard</span>
          </a>

          <div class="nav-section-label">LEDGERS & ASSETS</div>
          <a routerLink="/transactions" routerLinkActive="active" class="nav-item" title="Transactions">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navTxns }" />
            <span class="nav-label">Transactions</span>
          </a>

          <a routerLink="/loans" routerLinkActive="active" class="nav-item" title="Loans">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navLoans }" />
            <span class="nav-label">Loans</span>
          </a>

          <a routerLink="/epfo" routerLinkActive="active" class="nav-item" title="EPFO Passbook">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navEpfo }" />
            <span class="nav-label">EPFO Passbook</span>
          </a>

          <a routerLink="/investments" routerLinkActive="active" class="nav-item" title="Investments">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navInvestments }" />
            <span class="nav-label">Investments</span>
          </a>

          <div class="nav-section-label">TOOLS & EXPORTS</div>
          <a routerLink="/reports" routerLinkActive="active" class="nav-item" title="Reports & PDF">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navReports }" />
            <span class="nav-label">Reports & PDF</span>
          </a>

          <a routerLink="/data-transfer" routerLinkActive="active" class="nav-item" title="Data Import & Export">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navDataTransfer }" />
            <span class="nav-label">Data Transfer</span>
          </a>

          <a routerLink="/settings" routerLinkActive="active" class="nav-item" title="Settings">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navSettings }" />
            <span class="nav-label">Settings</span>
          </a>
        </nav>

        <!-- User profile widget at bottom of sidebar -->
        <div class="sidebar-user">
          @if (authService.isAuthenticated()) {
            <div class="user-chip" routerLink="/profile" title="View Profile">
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
              aria-label="Sign Out"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
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
              aria-label="Toggle navigation menu"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div class="header-brand-mobile">
              <div class="brand-logo sm">₹</div>
              <span class="mobile-app-name">Hisaab</span>
            </div>

            <!-- Command Palette Quick Search Button (Desktop) -->
            <button
              type="button"
              class="btn-command-palette desktop-only"
              (click)="themeService.toggleCommandPalette()"
              title="Search and run commands (Ctrl+K)"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Quick Search / Jump...</span>
              <kbd class="key-shortcut">Ctrl+K</kbd>
            </button>
          </div>

          <div class="header-right">
            <!-- Privacy Mask Toggle Button (Incognito Eye) -->
            <button
              type="button"
              class="btn-icon btn-privacy"
              [class.active]="themeService.privacyMode()"
              (click)="themeService.togglePrivacy()"
              [title]="themeService.privacyMode() ? 'Privacy Mode ON (Amounts Blurred - Hover to reveal)' : 'Privacy Mode OFF (Click to blur amounts)'"
              aria-label="Toggle Privacy Amount Blur"
            >
              @if (themeService.privacyMode()) {
                <span class="icon-emoji">🙈</span>
              } @else {
                <span class="icon-emoji">👁️</span>
              }
            </button>

            <!-- Studio Customizer Drawer Trigger -->
            <button
              type="button"
              class="btn-customizer-trigger"
              (click)="themeService.toggleCustomizer()"
              title="Open Appearance & Layout Studio"
              aria-label="Appearance Studio"
            >
              <span class="studio-badge">🎨 Studio</span>
            </button>

            <!-- Theme Toggle Button -->
            <button
              type="button"
              class="btn-icon btn-theme"
              (click)="themeService.toggleTheme()"
              [attr.aria-label]="themeService.isDarkMode() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
              title="Quick Toggle Theme"
            >
              @if (themeService.isDarkMode()) {
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              }
            </button>

            <!-- Quick Data Transfer Link on Desktop -->
            <a routerLink="/data-transfer" class="btn-import-quick desktop-only" title="Import / Export Data">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
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

      <!-- Quick Customizer Slide-Over Drawer -->
      @if (themeService.isCustomizerOpen()) {
        <div class="customizer-overlay no-print" (click)="themeService.closeCustomizer()">
          <div class="customizer-drawer" (click)="$event.stopPropagation()">
            <div class="customizer-header">
              <div>
                <h3>🎨 Appearance & Layout Studio</h3>
                <p>Live real-time customizer with instant preview</p>
              </div>
              <button
                type="button"
                class="btn-close-customizer"
                (click)="themeService.closeCustomizer()"
                aria-label="Close Customizer"
              >
                ✕
              </button>
            </div>

            <div class="customizer-body">
              <!-- Section 1: 5 Premium Themes -->
              <div class="studio-section">
                <label class="studio-section-label">Select Theme (5 Styles)</label>
                <div class="theme-cards-grid">
                  @for (t of themeService.availableThemes; track t.id) {
                    <div
                      class="theme-card"
                      [class.active]="themeService.currentTheme() === t.id"
                      (click)="themeService.setTheme(t.id)"
                    >
                      <div class="theme-swatch-row">
                        @for (c of t.previewColors; track c) {
                          <span class="theme-color-chip" [style.background-color]="c"></span>
                        }
                      </div>
                      <div class="theme-card-info">
                        <span class="theme-name">{{ t.name }}</span>
                        <span class="theme-category">{{ t.category | uppercase }}</span>
                      </div>
                      @if (themeService.currentTheme() === t.id) {
                        <span class="active-badge">✓ Active</span>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Section 2: Icon Style Selection -->
              <div class="studio-section">
                <label class="studio-section-label">Navigation Icon Pack (4 Styles)</label>
                <div class="icon-style-grid">
                  @for (ic of themeService.availableIconStyles; track ic.id) {
                    <div
                      class="icon-style-card"
                      [class.active]="themeService.iconStyle() === ic.id"
                      (click)="themeService.setIconStyle(ic.id)"
                    >
                      <span class="icon-sample-tag">{{ ic.sampleIcon }}</span>
                      <span class="icon-style-name">{{ ic.name }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Section 3: Sidebar Position Selection -->
              <div class="studio-section">
                <label class="studio-section-label">Sidebar Position</label>
                <div class="sidebar-pos-grid">
                  @for (sp of themeService.availableSidebarPositions; track sp.id) {
                    <div
                      class="sidebar-pos-card"
                      [class.active]="themeService.sidebarPosition() === sp.id"
                      (click)="themeService.setSidebarPosition(sp.id)"
                    >
                      <span class="pos-icon">{{ sp.icon }}</span>
                      <span class="pos-name">{{ sp.name }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Section 4: Advanced Density & Privacy Switches -->
              <div class="studio-section">
                <label class="studio-section-label">Workflow Enhancements</label>
                <div class="switch-row" (click)="themeService.toggleDensity()">
                  <div>
                    <strong>Compact Data Density</strong>
                    <p>Reduce table row heights and card padding for dense screen room</p>
                  </div>
                  <div class="toggle-pill" [class.on]="themeService.density() === 'compact'">
                    {{ themeService.density() === 'compact' ? 'ON' : 'OFF' }}
                  </div>
                </div>

                <div class="switch-row" (click)="themeService.togglePrivacy()">
                  <div>
                    <strong>Financial Privacy Eye (Blur Amounts)</strong>
                    <p>Masks figures with blur in public; hover any amount to reveal</p>
                  </div>
                  <div class="toggle-pill" [class.on]="themeService.privacyMode()">
                    {{ themeService.privacyMode() ? 'ON' : 'OFF' }}
                  </div>
                </div>
              </div>
            </div>

            <div class="customizer-footer">
              <button type="button" class="btn-primary" (click)="themeService.closeCustomizer()">
                Done & Apply
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Command Palette Modal (Ctrl+K) -->
      @if (themeService.isCommandPaletteOpen()) {
        <div class="command-overlay no-print" (click)="themeService.closeCommandPalette()">
          <div class="command-modal" (click)="$event.stopPropagation()">
            <div class="command-search-row">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                class="command-input"
                placeholder="Type a command or jump to page... (e.g. Loans, Dark, Nord, Privacy)"
                [(ngModel)]="commandQuery"
                (input)="filterCommands()"
                autofocus
              />
              <button type="button" class="btn-close-cmd" (click)="themeService.closeCommandPalette()">
                Esc
              </button>
            </div>

            <div class="command-results-list">
              @if (filteredCommands.length === 0) {
                <div class="command-empty">No matching commands found.</div>
              } @else {
                @for (cmd of filteredCommands; track cmd.id) {
                  <div class="command-item" (click)="executeCommand(cmd)">
                    <span class="cmd-icon">{{ cmd.icon }}</span>
                    <div class="cmd-text">
                      <span class="cmd-title">{{ cmd.title }}</span>
                      <span class="cmd-cat">{{ cmd.category }}</span>
                    </div>
                    <span class="cmd-enter">↵ Jump</span>
                  </div>
                }
              }
            </div>
          </div>
        </div>
      }

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
                aria-label="Close Menu"
              >
                ✕
              </button>
            </div>

            <nav class="drawer-nav">
              <a routerLink="/dashboard" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navDashboard }" />
                <span>Dashboard</span>
              </a>
              <a routerLink="/transactions" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navTxns }" />
                <span>Income & Expenses</span>
              </a>
              <a routerLink="/loans" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navLoans }" />
                <span>Loans (Given / Taken)</span>
              </a>
              <a routerLink="/epfo" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navEpfo }" />
                <span>EPFO Passbook</span>
              </a>
              <a routerLink="/investments" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navInvestments }" />
                <span>Investments & Holdings</span>
              </a>
              <a routerLink="/reports" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navReports }" />
                <span>Reports & PDF Export</span>
              </a>
              <a routerLink="/data-transfer" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navDataTransfer }" />
                <span>Data Import & Export</span>
              </a>
              <a routerLink="/settings" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navSettings }" />
                <span>System Settings</span>
              </a>
              <a routerLink="/profile" (click)="closeMobileMenu()" class="drawer-link">
                <span class="icon-emoji">👤</span>
                <span>My Profile</span>
              </a>
            </nav>

            <div class="drawer-footer">
              @if (authService.isAuthenticated()) {
                <button
                  type="button"
                  class="btn-drawer-logout"
                  (click)="authService.logout(); closeMobileMenu()"
                >
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
          <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navDashboard }" />
          <span>Dashboard</span>
        </a>

        <a routerLink="/transactions" routerLinkActive="active" class="bottom-nav-item">
          <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navTxns }" />
          <span>Txns</span>
        </a>

        <a routerLink="/loans" routerLinkActive="active" class="bottom-nav-item">
          <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navLoans }" />
          <span>Loans</span>
        </a>

        <a routerLink="/epfo" routerLinkActive="active" class="bottom-nav-item">
          <ng-container *ngTemplateOutlet="iconRenderer; context: { item: navEpfo }" />
          <span>EPFO</span>
        </a>

        <button type="button" class="bottom-nav-item btn-more" (click)="toggleMobileMenu()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
          <span>More</span>
        </button>
      </nav>

      <!-- Reusable Icon Renderer Template Supporting 4 Distinct Icon Styles -->
      <ng-template #iconRenderer let-item="item">
        @switch (themeService.iconStyle()) {
          @case ('emoji') {
            <span class="icon-emoji">{{ item.emoji }}</span>
          }
          @case ('classic-badge') {
            <span class="icon-badge">{{ item.badge }}</span>
          }
          @case ('duotone') {
            <span class="icon-duotone-wrap">
              <svg class="nav-icon duotone-icon" viewBox="0 0 24 24" fill="currentColor">
                @switch (item.svgType) {
                  @case ('dashboard') {
                    <rect width="7" height="9" x="3" y="3" rx="1" />
                    <rect width="7" height="5" x="14" y="3" rx="1" />
                    <rect width="7" height="9" x="14" y="12" rx="1" />
                    <rect width="7" height="5" x="3" y="16" rx="1" />
                  }
                  @case ('transactions') {
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  }
                  @case ('loans') {
                    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
                    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
                    <path d="M7 21h10" />
                    <path d="M12 3v18" />
                    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
                  }
                  @case ('epfo') {
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M7 7h10M7 12h10M7 17h6" />
                  }
                  @case ('investments') {
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  }
                  @case ('reports') {
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  }
                  @case ('datatransfer') {
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  }
                  @case ('settings') {
                    <circle cx="12" cy="12" r="3" />
                    <path
                      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                    />
                  }
                }
              </svg>
            </span>
          }
          @default {
            <!-- minimal-svg (GitHub standard stroke) -->
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              @switch (item.svgType) {
                @case ('dashboard') {
                  <rect width="7" height="9" x="3" y="3" rx="1" />
                  <rect width="7" height="5" x="14" y="3" rx="1" />
                  <rect width="7" height="9" x="14" y="12" rx="1" />
                  <rect width="7" height="5" x="3" y="16" rx="1" />
                }
                @case ('transactions') {
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                }
                @case ('loans') {
                  <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
                  <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
                  <path d="M7 21h10" />
                  <path d="M12 3v18" />
                  <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
                }
                @case ('epfo') {
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M7 7h10M7 12h10M7 17h6" />
                }
                @case ('investments') {
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                }
                @case ('reports') {
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                }
                @case ('datatransfer') {
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                }
                @case ('settings') {
                  <circle cx="12" cy="12" r="3" />
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                  />
                }
              }
            </svg>
          }
        }
      </ng-template>
    </div>
  `,
  styles: [
    `
      .app-layout {
        display: flex;
        min-height: 100vh;
        background: var(--color-bg-app);
        transition: flex-direction 0.2s ease;

        /* Sidebar Position: Right */
        &[data-sidebar='right'] {
          flex-direction: row-reverse;

          .desktop-sidebar {
            border-right: none;
            border-left: 1px solid var(--color-border);
          }
        }

        /* Sidebar Position: Top (Horizontal Header Bar) */
        &[data-sidebar='top'] {
          flex-direction: column;

          .desktop-sidebar {
            width: 100%;
            height: auto;
            position: sticky;
            top: 0;
            border-right: none;
            border-bottom: 1px solid var(--color-border);
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            padding: 0.5rem 1.25rem;
            z-index: 40;

            .sidebar-brand {
              border-bottom: none;
              margin-bottom: 0;
              padding: 0;
            }

            .side-nav {
              flex-direction: row;
              flex-wrap: nowrap;
              overflow-x: auto;
              gap: 0.35rem;
              margin: 0 1.5rem;
            }

            .nav-section-label {
              display: none;
            }

            .sidebar-user {
              border-top: none;
              padding-top: 0;
            }
          }
        }

        /* Sidebar Position: Collapsed Mini-Sidebar */
        &[data-sidebar='collapsed'] {
          .desktop-sidebar {
            width: 68px;
            padding: 1rem 0.35rem;
            align-items: center;

            .brand-info,
            .nav-label,
            .nav-section-label,
            .user-details {
              display: none;
            }

            .sidebar-brand {
              padding: 0.5rem 0 1rem;
              justify-content: center;
            }

            .nav-item {
              justify-content: center;
              padding: 0.625rem 0.35rem;
            }

            .user-chip {
              padding: 0;
              justify-content: center;
            }
          }
        }
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
        transition: width 0.15s ease;

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
        background: linear-gradient(135deg, #1f883d, #1a7f37);
        color: #ffffff;
        font-weight: 800;
        font-size: 1.2rem;
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(31, 136, 61, 0.25);

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
        min-height: 38px;
        transition: all 0.12s ease;

        &:hover {
          background: var(--color-bg-subtle);
          color: var(--color-text-main);
        }

        &.active {
          background: var(--color-accent-subtle, rgba(9, 105, 218, 0.12));
          color: var(--color-accent-fg, #0969da);

          .nav-icon {
            stroke: var(--color-accent-fg, #0969da);
          }
        }
      }

      .icon-emoji {
        font-size: 1.15rem;
        line-height: 1;
      }

      .icon-badge {
        font-family: var(--font-family-mono);
        font-size: 0.6875rem;
        font-weight: 700;
        background: rgba(175, 184, 193, 0.2);
        color: var(--color-text-main);
        padding: 2px 4px;
        border-radius: 4px;
        letter-spacing: 0.02em;
      }

      .icon-duotone-wrap {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 4px;
        background: rgba(9, 105, 218, 0.12);
        color: var(--color-accent-fg);

        .duotone-icon {
          width: 14px;
          height: 14px;
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
        padding-bottom: 70px;

        @media (min-width: 900px) {
          padding-bottom: 0;
        }
      }

      .app-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.625rem 1.25rem;
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
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--color-text-main);
      }

      /* Quick Command Palette Button */
      .btn-command-palette {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background-color: var(--color-canvas-subtle);
        border: 1px solid var(--color-border-default);
        color: var(--color-text-muted);
        border-radius: var(--radius-md);
        padding: 4px 10px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.12s ease;

        &:hover {
          border-color: var(--color-accent-fg);
          color: var(--color-text-main);
        }

        .key-shortcut {
          background: rgba(175, 184, 193, 0.2);
          border: 1px solid var(--color-border);
          border-radius: 4px;
          padding: 1px 5px;
          font-family: var(--font-family-mono);
          font-size: 10px;
        }
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }

      .btn-customizer-trigger {
        background: var(--color-canvas-subtle);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        padding: 4px 10px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text-main);
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.12s ease;

        &:hover {
          background: var(--color-btn-hover-bg);
          border-color: var(--color-accent-fg);
        }
      }

      .btn-privacy {
        font-size: 1rem;
        border-radius: var(--radius-md);
        width: 32px;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: 1px solid transparent;
        cursor: pointer;

        &:hover {
          background: var(--color-canvas-subtle);
          border-color: var(--color-border);
        }

        &.active {
          background: var(--color-accent-subtle);
          border-color: var(--color-accent-fg);
        }
      }

      .btn-theme {
        width: 32px;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--radius-md);
        color: var(--color-text-muted);
        cursor: pointer;

        &:hover {
          background: var(--color-canvas-subtle);
          border-color: var(--color-border);
          color: var(--color-text-main);
        }
      }

      .btn-import-quick {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border);
        background: var(--color-canvas-subtle);
        color: var(--color-text-main);
        font-size: 12px;
        font-weight: 500;
        text-decoration: none;
        transition: all 0.12s ease;

        &:hover {
          border-color: var(--color-accent-fg);
        }
      }

      .header-avatar {
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
        text-decoration: none;
      }

      .btn-signin-nav {
        padding: 4px 12px;
        background: var(--color-primary);
        color: #ffffff;
        border-radius: var(--radius-md);
        font-size: 12px;
        font-weight: 600;
        text-decoration: none;
      }

      .desktop-only {
        display: none;
        @media (min-width: 900px) {
          display: inline-flex;
        }
      }

      .page-content {
        flex: 1;
        padding: 1.5rem;
        max-width: 1400px;
        width: 100%;
        margin: 0 auto;
      }

      /* Customizer Drawer Slide-Over */
      .customizer-overlay {
        position: fixed;
        inset: 0;
        background: rgba(31, 35, 40, 0.45);
        backdrop-filter: blur(2px);
        z-index: 100;
        display: flex;
        justify-content: flex-end;
      }

      .customizer-drawer {
        width: 100%;
        max-width: 420px;
        height: 100%;
        background: var(--color-bg-card);
        border-left: 1px solid var(--color-border);
        display: flex;
        flex-direction: column;
        box-shadow: var(--shadow-lg);
        animation: slideInRight 0.2s cubic-bezier(0.33, 1, 0.68, 1);
      }

      @keyframes slideInRight {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(0);
        }
      }

      .customizer-header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: space-between;

        h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--color-text-main);
          margin: 0;
        }
        p {
          font-size: 12px;
          color: var(--color-text-muted);
          margin: 2px 0 0;
        }
      }

      .btn-close-customizer {
        background: transparent;
        border: none;
        font-size: 18px;
        color: var(--color-text-muted);
        cursor: pointer;
        padding: 4px;
        border-radius: var(--radius-sm);

        &:hover {
          color: var(--color-text-main);
        }
      }

      .customizer-body {
        padding: 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 20px;
        flex: 1;
      }

      .studio-section-label {
        display: block;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-text-muted);
        margin-bottom: 10px;
      }

      .theme-cards-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .theme-card {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 10px 12px;
        cursor: pointer;
        background: var(--color-canvas-subtle);
        transition: all 0.12s ease;
        display: flex;
        align-items: center;
        justify-content: space-between;

        &:hover {
          border-color: var(--color-accent-fg);
        }

        &.active {
          border-color: var(--color-primary);
          background: var(--color-bg-card);
          box-shadow: 0 0 0 2px var(--color-primary);
        }
      }

      .theme-swatch-row {
        display: flex;
        gap: 4px;
      }

      .theme-color-chip {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, 0.15);
      }

      .theme-card-info {
        display: flex;
        flex-direction: column;
        margin-left: 8px;
        flex: 1;

        .theme-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text-main);
        }
        .theme-category {
          font-size: 10px;
          color: var(--color-text-muted);
        }
      }

      .active-badge {
        font-size: 11px;
        font-weight: 700;
        color: var(--color-primary);
      }

      .icon-style-grid,
      .sidebar-pos-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .icon-style-card,
      .sidebar-pos-card {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 10px;
        cursor: pointer;
        background: var(--color-canvas-subtle);
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.12s ease;

        &:hover {
          border-color: var(--color-accent-fg);
        }

        &.active {
          border-color: var(--color-primary);
          background: var(--color-bg-card);
          box-shadow: 0 0 0 2px var(--color-primary);
        }

        .icon-sample-tag,
        .pos-icon {
          font-size: 14px;
          font-weight: 700;
        }

        .icon-style-name,
        .pos-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-main);
        }
      }

      .switch-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-canvas-subtle);
        cursor: pointer;
        margin-bottom: 8px;

        strong {
          display: block;
          font-size: 13px;
          color: var(--color-text-main);
        }

        p {
          font-size: 11px;
          color: var(--color-text-muted);
          margin: 2px 0 0;
        }

        .toggle-pill {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(175, 184, 193, 0.3);
          color: var(--color-text-muted);

          &.on {
            background: var(--color-primary);
            color: #ffffff;
          }
        }
      }

      .customizer-footer {
        padding: 14px 20px;
        border-top: 1px solid var(--color-border);
        display: flex;
        justify-content: flex-end;
      }

      /* Command Palette Modal */
      .command-overlay {
        position: fixed;
        inset: 0;
        background: rgba(31, 35, 40, 0.55);
        backdrop-filter: blur(4px);
        z-index: 110;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 15vh;
      }

      .command-modal {
        width: 100%;
        max-width: 580px;
        background: var(--color-bg-card);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        overflow: hidden;
        animation: dropIn 0.15s ease-out;
      }

      @keyframes dropIn {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .command-search-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--color-border);

        svg {
          stroke: var(--color-text-muted);
        }

        .command-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 14px;
          color: var(--color-text-main);
          outline: none;
        }

        .btn-close-cmd {
          background: var(--color-canvas-subtle);
          border: 1px solid var(--color-border);
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 10px;
          font-family: var(--font-family-mono);
          color: var(--color-text-muted);
          cursor: pointer;
        }
      }

      .command-results-list {
        max-height: 340px;
        overflow-y: auto;
        padding: 6px;
      }

      .command-empty {
        padding: 24px;
        text-align: center;
        color: var(--color-text-muted);
        font-size: 13px;
      }

      .command-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: background 0.1s ease;

        &:hover {
          background: var(--color-canvas-subtle);
        }

        .cmd-icon {
          font-size: 16px;
        }

        .cmd-text {
          flex: 1;
          display: flex;
          flex-direction: column;

          .cmd-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--color-text-main);
          }

          .cmd-cat {
            font-size: 10px;
            color: var(--color-text-muted);
          }
        }

        .cmd-enter {
          font-size: 11px;
          color: var(--color-text-muted);
          font-family: var(--font-family-mono);
        }
      }

      /* Mobile Drawer Navigation */
      .mobile-drawer-overlay {
        position: fixed;
        inset: 0;
        background: rgba(31, 35, 40, 0.5);
        z-index: 100;
        display: flex;
      }

      .mobile-drawer-panel {
        width: 280px;
        height: 100%;
        background: var(--color-bg-card);
        border-right: 1px solid var(--color-border);
        display: flex;
        flex-direction: column;
        padding: 1.25rem 1rem;
        animation: slideIn 0.2s cubic-bezier(0.33, 1, 0.68, 1);
      }

      .drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--color-border);
        margin-bottom: 1rem;
      }

      .drawer-brand {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }

      .drawer-title {
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--color-text-main);
        display: block;
      }

      .drawer-sub {
        font-size: 0.7rem;
        color: var(--color-text-muted);
      }

      .btn-close-drawer {
        background: transparent;
        border: none;
        font-size: 1.25rem;
        color: var(--color-text-muted);
        cursor: pointer;
      }

      .drawer-nav {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        flex: 1;
        overflow-y: auto;
      }

      .drawer-link {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.625rem 0.75rem;
        border-radius: var(--radius-md);
        color: var(--color-text-main);
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 600;

        &:hover {
          background: var(--color-bg-subtle);
        }
      }

      .drawer-footer {
        padding-top: 1rem;
        border-top: 1px solid var(--color-border);
      }

      .btn-drawer-logout,
      .btn-drawer-login {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 40px;
        background: var(--color-primary);
        color: #ffffff;
        border: none;
        border-radius: var(--radius-md);
        font-weight: 600;
        font-size: 0.875rem;
        text-decoration: none;
        cursor: pointer;
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
        from {
          transform: translateX(-100%);
        }
        to {
          transform: translateX(0);
        }
      }
    `
  ]
})
export class ShellComponent {
  readonly themeService = inject(ThemeService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isMobileMenuOpen = signal<boolean>(false);
  commandQuery = '';
  filteredCommands: CommandItem[] = [];

  // Nav Item definitions
  readonly navDashboard: NavItem = {
    route: '/dashboard',
    label: 'Dashboard',
    badge: '[DSH]',
    emoji: '📊',
    section: 'OVERVIEW',
    svgType: 'dashboard'
  };

  readonly navTxns: NavItem = {
    route: '/transactions',
    label: 'Transactions',
    badge: '[TXN]',
    emoji: '💸',
    section: 'LEDGERS & ASSETS',
    svgType: 'transactions'
  };

  readonly navLoans: NavItem = {
    route: '/loans',
    label: 'Loans',
    badge: '[LOA]',
    emoji: '🤝',
    section: 'LEDGERS & ASSETS',
    svgType: 'loans'
  };

  readonly navEpfo: NavItem = {
    route: '/epfo',
    label: 'EPFO Passbook',
    badge: '[EPF]',
    emoji: '🏦',
    section: 'LEDGERS & ASSETS',
    svgType: 'epfo'
  };

  readonly navInvestments: NavItem = {
    route: '/investments',
    label: 'Investments',
    badge: '[INV]',
    emoji: '📈',
    section: 'LEDGERS & ASSETS',
    svgType: 'investments'
  };

  readonly navReports: NavItem = {
    route: '/reports',
    label: 'Reports & PDF',
    badge: '[REP]',
    emoji: '📑',
    section: 'TOOLS & EXPORTS',
    svgType: 'reports'
  };

  readonly navDataTransfer: NavItem = {
    route: '/data-transfer',
    label: 'Data Transfer',
    badge: '[DAT]',
    emoji: '📥',
    section: 'TOOLS & EXPORTS',
    svgType: 'datatransfer'
  };

  readonly navSettings: NavItem = {
    route: '/settings',
    label: 'Settings',
    badge: '[SET]',
    emoji: '⚙️',
    section: 'TOOLS & EXPORTS',
    svgType: 'settings'
  };

  // Commands registry
  readonly allCommands: CommandItem[] = [
    {
      id: 'goto-dashboard',
      title: 'Go to Financial Dashboard',
      category: 'Navigation',
      icon: '📊',
      action: () => this.router.navigate(['/dashboard'])
    },
    {
      id: 'goto-transactions',
      title: 'Go to Income & Expenses',
      category: 'Navigation',
      icon: '💸',
      action: () => this.router.navigate(['/transactions'])
    },
    {
      id: 'goto-loans',
      title: 'Go to Loans Given & Taken',
      category: 'Navigation',
      icon: '🤝',
      action: () => this.router.navigate(['/loans'])
    },
    {
      id: 'goto-epfo',
      title: 'Go to EPFO Passbook',
      category: 'Navigation',
      icon: '🏦',
      action: () => this.router.navigate(['/epfo'])
    },
    {
      id: 'goto-investments',
      title: 'Go to Investments Portfolio',
      category: 'Navigation',
      icon: '📈',
      action: () => this.router.navigate(['/investments'])
    },
    {
      id: 'goto-reports',
      title: 'Go to Financial Reports & PDF',
      category: 'Navigation',
      icon: '📑',
      action: () => this.router.navigate(['/reports'])
    },
    {
      id: 'goto-data-transfer',
      title: 'Go to Data Import & Export',
      category: 'Navigation',
      icon: '📥',
      action: () => this.router.navigate(['/data-transfer'])
    },
    {
      id: 'goto-settings',
      title: 'Go to System Settings',
      category: 'Navigation',
      icon: '⚙️',
      action: () => this.router.navigate(['/settings'])
    },
    {
      id: 'theme-light',
      title: 'Switch to GitHub Primer Light',
      category: 'Theme',
      icon: '☀️',
      action: () => this.themeService.setTheme('github-light')
    },
    {
      id: 'theme-dark',
      title: 'Switch to GitHub Primer Dark',
      category: 'Theme',
      icon: '🌙',
      action: () => this.themeService.setTheme('github-dark')
    },
    {
      id: 'theme-nord',
      title: 'Switch to Nordic Arctic Frost',
      category: 'Theme',
      icon: '❄️',
      action: () => this.themeService.setTheme('nord')
    },
    {
      id: 'theme-emerald',
      title: 'Switch to Midnight Emerald Wealth',
      category: 'Theme',
      icon: '💎',
      action: () => this.themeService.setTheme('midnight-emerald')
    },
    {
      id: 'theme-sepia',
      title: 'Switch to Warm Sepia & Paper',
      category: 'Theme',
      icon: '📜',
      action: () => this.themeService.setTheme('sepia-paper')
    },
    {
      id: 'icon-minimal',
      title: 'Icon Pack: Minimal Primer SVG',
      category: 'Icon Pack',
      icon: '◇',
      action: () => this.themeService.setIconStyle('minimal-svg')
    },
    {
      id: 'icon-emoji',
      title: 'Icon Pack: Vibrant Emoji',
      category: 'Icon Pack',
      icon: '📊',
      action: () => this.themeService.setIconStyle('emoji')
    },
    {
      id: 'icon-duotone',
      title: 'Icon Pack: Modern Duotone',
      category: 'Icon Pack',
      icon: '◈',
      action: () => this.themeService.setIconStyle('duotone')
    },
    {
      id: 'icon-badge',
      title: 'Icon Pack: Monospace Badges',
      category: 'Icon Pack',
      icon: '[DSH]',
      action: () => this.themeService.setIconStyle('classic-badge')
    },
    {
      id: 'sidebar-left',
      title: 'Sidebar: Move to Left (Default)',
      category: 'Sidebar Layout',
      icon: '◀',
      action: () => this.themeService.setSidebarPosition('left')
    },
    {
      id: 'sidebar-right',
      title: 'Sidebar: Move to Right',
      category: 'Sidebar Layout',
      icon: '▶',
      action: () => this.themeService.setSidebarPosition('right')
    },
    {
      id: 'sidebar-top',
      title: 'Sidebar: Move to Top Navigation Bar',
      category: 'Sidebar Layout',
      icon: '▲',
      action: () => this.themeService.setSidebarPosition('top')
    },
    {
      id: 'sidebar-collapsed',
      title: 'Sidebar: Compact Mini-Bar Mode',
      category: 'Sidebar Layout',
      icon: '▪',
      action: () => this.themeService.setSidebarPosition('collapsed')
    },
    {
      id: 'privacy-toggle',
      title: 'Toggle Financial Privacy Eye (Mask Amounts)',
      category: 'Settings',
      icon: '👁️',
      action: () => this.themeService.togglePrivacy()
    },
    {
      id: 'density-toggle',
      title: 'Toggle Compact Data Density',
      category: 'Settings',
      icon: '⚡',
      action: () => this.themeService.toggleDensity()
    }
  ];

  constructor() {
    this.filteredCommands = [...this.allCommands];
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent): void {
    // Ctrl+K or Cmd+K
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.themeService.toggleCommandPalette();
      return;
    }

    // Escape closes modals
    if (event.key === 'Escape') {
      this.themeService.closeCommandPalette();
      this.themeService.closeCustomizer();
      this.closeMobileMenu();
      return;
    }

    // Alt+P toggles privacy mask
    if (event.altKey && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      this.themeService.togglePrivacy();
    }
  }

  filterCommands(): void {
    const q = this.commandQuery.trim().toLowerCase();
    if (!q) {
      this.filteredCommands = [...this.allCommands];
      return;
    }
    this.filteredCommands = this.allCommands.filter(
      c => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );
  }

  executeCommand(cmd: CommandItem): void {
    cmd.action();
    this.themeService.closeCommandPalette();
    this.commandQuery = '';
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}
