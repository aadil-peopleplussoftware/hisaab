import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService, ThemeName, IconStyle, SidebarPosition, DisplayCurrency } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { TransactionsService } from '../../features/transactions/services/transactions.service';
import { Category, CreateTransactionPayload, TransactionType } from '../../features/transactions/models/transaction.model';
import { RecycleBinService } from '../../features/recycle-bin/services/recycle-bin.service';

interface NavItem {
  route: string;
  label: string;
  section: string;
  svgType: string;
}

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Theme' | 'Icon Pack' | 'Sidebar Layout' | 'Settings';
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
          <div class="brand-logo">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="#0b57d0"/>
              <path d="M12 6v12M16 9h-5.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H8" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="brand-info">
            <span class="brand-title">Hisaab</span>
            <span class="brand-tagline">Personal Finance</span>
          </div>
        </div>

        <nav class="side-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item" title="Dashboard">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'dashboard' }" />
            <span class="nav-label">Dashboard</span>
          </a>

          <a routerLink="/analytics" routerLinkActive="active" class="nav-item" title="KPI Analytics">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'analytics' }" />
            <span class="nav-label">KPI Analytics</span>
          </a>

          <a routerLink="/transactions" routerLinkActive="active" class="nav-item" title="Transactions">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'transactions' }" />
            <span class="nav-label">Transactions</span>
          </a>

          <a routerLink="/business" routerLinkActive="active" class="nav-item" title="Business">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'business' }" />
            <span class="nav-label">Business</span>
          </a>

          <a routerLink="/loans" routerLinkActive="active" class="nav-item" title="Loans">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'loans' }" />
            <span class="nav-label">Loans</span>
          </a>

          <a routerLink="/investments" routerLinkActive="active" class="nav-item" title="Investments">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'investments' }" />
            <span class="nav-label">Investments</span>
          </a>

          <a routerLink="/epfo" routerLinkActive="active" class="nav-item" title="EPFO Passbook">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'epfo' }" />
            <span class="nav-label">EPFO Passbook</span>
          </a>

          <a routerLink="/reports" routerLinkActive="active" class="nav-item" title="Reports">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'reports' }" />
            <span class="nav-label">Reports</span>
          </a>

          <a routerLink="/data-transfer" routerLinkActive="active" class="nav-item" title="Data Transfer">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'datatransfer' }" />
            <span class="nav-label">Data Transfer</span>
          </a>

          <a routerLink="/recycle-bin" routerLinkActive="active" class="nav-item" title="Recycle Bin">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'recyclebin' }" />
            <span class="nav-label">Recycle Bin</span>
            @if (recycleBinService.moduleCounts().all > 0) {
              <span class="nav-badge-pill">{{ recycleBinService.moduleCounts().all }}</span>
            }
          </a>

          <div class="sidebar-divider-line"></div>

          <a routerLink="/settings" routerLinkActive="active" class="nav-item" title="Settings">
            <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'settings' }" />
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
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
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
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div class="header-brand-mobile">
              <div class="brand-logo sm">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
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
              <span>Quick Search or Jump...</span>
              <kbd class="key-shortcut">Ctrl+K</kbd>
            </button>

            <!-- Quick Add Global Button -->
            <button
              type="button"
              class="btn-quick-add desktop-only"
              (click)="themeService.openQuickAdd()"
              title="Record transaction or entry from anywhere (Press 'c')"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add Entry</span>
            </button>
          </div>

          <div class="header-right">
            <!-- Multi-Currency Display Pill -->
            <div class="currency-selector-pill" title="Toggle display currency">
              <span class="currency-symbol">{{ getCurrencySymbol() }}</span>
              <select
                class="currency-select"
                [value]="themeService.displayCurrency()"
                (change)="onCurrencyChange($event)"
              >
                @for (c of themeService.availableCurrencies; track c.code) {
                  <option [value]="c.code">{{ c.code }} ({{ c.symbol }})</option>
                }
              </select>
            </div>

            <!-- Financial Privacy Eye Mask Toggle -->
            <button
              type="button"
              class="btn-icon btn-header-tool"
              [class.active]="themeService.privacyMode()"
              (click)="themeService.togglePrivacy()"
              [title]="themeService.privacyMode() ? 'Privacy Mode Active (Amounts Blurred - Hover to reveal)' : 'Privacy Mode Inactive (Click to mask amounts)'"
              aria-label="Toggle Privacy Mask"
            >
              @if (themeService.privacyMode()) {
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              }
            </button>

            <!-- Keyboard Shortcuts Cheat Sheet Button -->
            <button
              type="button"
              class="btn-icon btn-header-tool desktop-only"
              (click)="themeService.toggleShortcuts()"
              title="Keyboard Shortcuts Cheat Sheet (Press '?')"
              aria-label="Keyboard Shortcuts"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>

            <!-- Studio Customizer Drawer Trigger -->
            <button
              type="button"
              class="btn-customizer-trigger"
              (click)="themeService.toggleCustomizer()"
              title="Open Appearance & Layout Studio"
              aria-label="Appearance Studio"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z" />
              </svg>
              <span>Studio</span>
            </button>

            <!-- Theme Toggle Button -->
            <button
              type="button"
              class="btn-icon btn-header-tool"
              (click)="themeService.toggleTheme()"
              [attr.aria-label]="themeService.isDarkMode() ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
              title="Quick Toggle Theme"
            >
              @if (themeService.isDarkMode()) {
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              }
            </button>

            <!-- Quick Data Transfer Link on Desktop -->
            <!-- Google Play Console Notifications Button (Screenshot Exact) -->
            <button
              type="button"
              class="btn-notifications-pill"
              (click)="themeService.toggleShortcuts()"
              title="Notifications & Alerts"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span>Notifications</span>
            </button>

            <!-- User Avatar or Sign In -->
            @if (authService.isAuthenticated()) {
              <a routerLink="/profile" class="header-avatar google-avatar" title="Developer Account">
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
              <div class="header-title-wrap">
                <div class="title-with-icon">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="4" />
                    <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
                    <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
                    <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
                    <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
                  </svg>
                  <h3>Appearance & Layout Studio</h3>
                </div>
                <p>Live customizer with real-time reactive tokens</p>
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
                <label class="studio-section-label">Color Themes (5 Styles)</label>
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

              <!-- Section 2: Professional SVG Icon Style Selection -->
              <div class="studio-section">
                <label class="studio-section-label">Vector Icon System (4 Styles)</label>
                <div class="icon-style-grid">
                  @for (ic of themeService.availableIconStyles; track ic.id) {
                    <div
                      class="icon-style-card"
                      [class.active]="themeService.iconStyle() === ic.id"
                      (click)="themeService.setIconStyle(ic.id)"
                    >
                      <span class="icon-badge-pill">{{ ic.badge }}</span>
                      <div class="icon-meta-col">
                        <span class="icon-style-name">{{ ic.name }}</span>
                        <span class="icon-style-desc">{{ ic.description }}</span>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Section 3: Sidebar Position Selection -->
              <div class="studio-section">
                <label class="studio-section-label">Sidebar Position & Layout</label>
                <div class="sidebar-pos-grid">
                  @for (sp of themeService.availableSidebarPositions; track sp.id) {
                    <div
                      class="sidebar-pos-card"
                      [class.active]="themeService.sidebarPosition() === sp.id"
                      (click)="themeService.setSidebarPosition(sp.id)"
                    >
                      <span class="pos-badge-pill">{{ sp.badge }}</span>
                      <div class="pos-meta-col">
                        <span class="pos-name">{{ sp.name }}</span>
                        <span class="pos-desc">{{ sp.description }}</span>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Section 4: Advanced Density, Privacy, and Haptic Sound -->
              <div class="studio-section">
                <label class="studio-section-label">Workflow & Sensory Enhancements</label>
                <div class="switch-row" (click)="themeService.toggleDensity()">
                  <div>
                    <strong>Compact Data Density</strong>
                    <p>Tighter table rows and padding for viewing more data</p>
                  </div>
                  <div class="toggle-pill" [class.on]="themeService.density() === 'compact'">
                    {{ themeService.density() === 'compact' ? 'ON' : 'OFF' }}
                  </div>
                </div>

                <div class="switch-row" (click)="themeService.togglePrivacy()">
                  <div>
                    <strong>Financial Privacy Eye (Blur Amounts)</strong>
                    <p>Masks balances in public; hover over any amount to reveal</p>
                  </div>
                  <div class="toggle-pill" [class.on]="themeService.privacyMode()">
                    {{ themeService.privacyMode() ? 'ON' : 'OFF' }}
                  </div>
                </div>

                <div class="switch-row" (click)="themeService.toggleSoundEffects()">
                  <div>
                    <strong>Haptic Audio Feedback (Web Audio API)</strong>
                    <p>Subtle click and confirmation chimes on interactions</p>
                  </div>
                  <div class="toggle-pill" [class.on]="themeService.soundEffects()">
                    {{ themeService.soundEffects() ? 'ON' : 'OFF' }}
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

      <!-- Keyboard Shortcuts Cheat Sheet Modal ('?') -->
      @if (themeService.isShortcutsOpen()) {
        <div class="command-overlay no-print" (click)="themeService.closeShortcuts()">
          <div class="shortcuts-modal" (click)="$event.stopPropagation()">
            <div class="shortcuts-header">
              <div class="shortcuts-title-row">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="18" height="12" x="3" y="6" rx="2" />
                  <line x1="7" y1="10" x2="7" y2="10.01" />
                  <line x1="12" y1="10" x2="12" y2="10.01" />
                  <line x1="17" y1="10" x2="17" y2="10.01" />
                  <line x1="7" y1="14" x2="17" y2="14" />
                </svg>
                <h3>Keyboard Shortcuts</h3>
              </div>
              <button type="button" class="btn-close-cmd" (click)="themeService.closeShortcuts()">
                Esc
              </button>
            </div>

            <div class="shortcuts-body">
              <div class="shortcuts-grid">
                <div class="shortcuts-col">
                  <h4 class="shortcuts-category">Navigation (Press 'g' then key)</h4>
                  <div class="shortcut-item"><span>Dashboard</span><kbd>g d</kbd></div>
                  <div class="shortcut-item"><span>KPI Analytics</span><kbd>g a</kbd></div>
                  <div class="shortcut-item"><span>Transactions</span><kbd>g t</kbd></div>
                  <div class="shortcut-item"><span>Loans</span><kbd>g l</kbd></div>
                  <div class="shortcut-item"><span>EPFO Passbook</span><kbd>g e</kbd></div>
                  <div class="shortcut-item"><span>Investments</span><kbd>g i</kbd></div>
                  <div class="shortcut-item"><span>Reports</span><kbd>g r</kbd></div>
                  <div class="shortcut-item"><span>Settings</span><kbd>g s</kbd></div>
                </div>

                <div class="shortcuts-col">
                  <h4 class="shortcuts-category">Actions & Studio</h4>
                  <div class="shortcut-item"><span>Command Palette</span><kbd>Ctrl+K</kbd></div>
                  <div class="shortcut-item"><span>Quick Add Entry</span><kbd>c / n</kbd></div>
                  <div class="shortcut-item"><span>Privacy Eye Mask</span><kbd>Alt+P</kbd></div>
                  <div class="shortcut-item"><span>Toggle Light/Dark</span><kbd>Alt+T</kbd></div>
                  <div class="shortcut-item"><span>Compact Density</span><kbd>Alt+D</kbd></div>
                  <div class="shortcut-item"><span>Shortcuts Help</span><kbd>?</kbd></div>
                  <div class="shortcut-item"><span>Close Modal</span><kbd>Esc</kbd></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Global Quick Add Action Modal ('c' or '+ Add Entry') -->
      @if (themeService.isQuickAddOpen()) {
        <div class="command-overlay no-print" (click)="themeService.closeQuickAdd()">
          <div class="quick-add-modal" (click)="$event.stopPropagation()">
            <div class="quick-add-header">
              <div class="quick-add-title-group">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <h3>Quick Add Financial Entry</h3>
              </div>
              <button type="button" class="btn-close-cmd" (click)="themeService.closeQuickAdd()">
                Esc
              </button>
            </div>

            <!-- Quick Add Form -->
            <form (ngSubmit)="submitQuickTransaction()" class="quick-add-form">
              <div class="type-segmented-control">
                <button
                  type="button"
                  class="seg-btn"
                  [class.active]="quickTxnType === 2"
                  (click)="quickTxnType = 2"
                >
                  Expense Outflow
                </button>
                <button
                  type="button"
                  class="seg-btn"
                  [class.active]="quickTxnType === 1"
                  (click)="quickTxnType = 1"
                >
                  Income Inflow
                </button>
              </div>

              <div class="form-group">
                <label>Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  class="form-control amount-input"
                  placeholder="0.00"
                  [(ngModel)]="quickAmount"
                  name="amount"
                  required
                  autofocus
                />
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label>Category</label>
                  <select
                    class="form-control"
                    [(ngModel)]="quickCategoryId"
                    name="category"
                    required
                  >
                    @for (cat of quickCategories; track cat.id) {
                      <option [value]="cat.id">{{ cat.name }}</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    class="form-control"
                    [(ngModel)]="quickDate"
                    name="date"
                    required
                  />
                </div>
              </div>

              <div class="form-group">
                <label>Note / Description (Optional)</label>
                <input
                  type="text"
                  class="form-control"
                  placeholder="e.g. Swiggy lunch, Freelance retainer, Shell petrol"
                  [(ngModel)]="quickNote"
                  name="note"
                />
              </div>

              @if (quickAddMessage()) {
                <div class="quick-add-alert" [class.error]="isQuickAddError()">
                  {{ quickAddMessage() }}
                </div>
              }

              <div class="modal-footer">
                <button type="button" class="btn" (click)="themeService.closeQuickAdd()">
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn-primary"
                  [disabled]="isQuickSubmitting() || !quickAmount || quickAmount <= 0"
                >
                  {{ isQuickSubmitting() ? 'Recording...' : 'Record Entry' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Command Palette Modal (Ctrl+K) -->
      @if (themeService.isCommandPaletteOpen()) {
        <div class="command-overlay no-print" (click)="themeService.closeCommandPalette()">
          <div class="command-modal" (click)="$event.stopPropagation()">
            <div class="command-search-row">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                class="command-input"
                placeholder="Search commands, navigate, or switch themes..."
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
                <div class="brand-logo sm">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
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
                <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'dashboard' }" />
                <span>Dashboard</span>
              </a>
              <a routerLink="/analytics" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'analytics' }" />
                <span>KPI Analytics</span>
              </a>
              <a routerLink="/transactions" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'transactions' }" />
                <span>Income & Expenses</span>
              </a>
              <a routerLink="/loans" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'loans' }" />
                <span>Loans</span>
              </a>
              <a routerLink="/epfo" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'epfo' }" />
                <span>EPFO Passbook</span>
              </a>
              <a routerLink="/investments" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'investments' }" />
                <span>Investments</span>
              </a>
              <a routerLink="/business" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'business' }" />
                <span>Business & Ventures</span>
              </a>
              <a routerLink="/reports" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'reports' }" />
                <span>Reports & PDF</span>
              </a>
              <a routerLink="/data-transfer" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'datatransfer' }" />
                <span>Data Transfer</span>
              </a>
              <a routerLink="/recycle-bin" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'recyclebin' }" />
                <span>Recycle Bin</span>
                @if (recycleBinService.moduleCounts().all > 0) {
                  <span class="nav-badge-pill">{{ recycleBinService.moduleCounts().all }}</span>
                }
              </a>
              <a routerLink="/settings" (click)="closeMobileMenu()" class="drawer-link">
                <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'settings' }" />
                <span>Settings</span>
              </a>
              <a routerLink="/profile" (click)="closeMobileMenu()" class="drawer-link">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
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
          <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'dashboard' }" />
          <span>Dashboard</span>
        </a>

        <a routerLink="/transactions" routerLinkActive="active" class="bottom-nav-item">
          <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'transactions' }" />
          <span>Txns</span>
        </a>

        <a routerLink="/loans" routerLinkActive="active" class="bottom-nav-item">
          <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'loans' }" />
          <span>Loans</span>
        </a>

        <a routerLink="/epfo" routerLinkActive="active" class="bottom-nav-item">
          <ng-container *ngTemplateOutlet="iconRenderer; context: { type: 'epfo' }" />
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

      <!-- Reusable Icon Renderer Template Supporting 4 Distinct Vector Icon Styles -->
      <ng-template #iconRenderer let-type="type">
        @switch (themeService.iconStyle()) {
          @case ('filled') {
            <!-- Solid Geometric Silhouette -->
            <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
              @switch (type) {
                @case ('dashboard') {
                  <path d="M3 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4zm10 0a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V4zm0 8a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-8zM3 16a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4z" />
                }
                @case ('analytics') {
                  <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                }
                @case ('transactions') {
                  <path d="M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5zm2 3h16V6H4v2zm0 4v7h16v-7H4z" />
                }
                @case ('loans') {
                  <path d="M12 2a1 1 0 0 1 1 1v1.07A7.002 7.002 0 0 1 19 11v1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2.14A7.003 7.003 0 0 1 13 20.93V22a1 1 0 1 1-2 0v-1.07A7.002 7.002 0 0 1 5 16H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h2v-1a7.002 7.002 0 0 1 6-6.93V3a1 1 0 0 1 1-1zm0 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" />
                }
                @case ('epfo') {
                  <path d="M12 2L2 7v2h20V7L12 2zM4 11v7h3v-7H4zm6 0v7h4v-7h-4zm7 0v7h3v-7h-3zM2 20v2h20v-2H2z" />
                }
                @case ('investments') {
                  <path d="M3 3a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm18 4l-7 7-4-4-5 5-1.4-1.4 6.4-6.4 4 4 5.6-5.6H17V5h5v5h-1V7z" />
                }
                @case ('business') {
                  <path d="M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-10-2h4v2h-4V4zm10 16H4V8h16v12z" />
                }
                @case ('reports') {
                  <path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z" />
                }
                @case ('datatransfer') {
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                }
                @case ('recyclebin') {
                  <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H3v2h2l1.2 13.2A2 2 0 0 0 8.2 23h7.6a2 2 0 0 0 2-1.8L19 8h2V6h-5zm-6-2h4v2h-4V4zm6 17H8l-1.1-13h10.2L16 21z" />
                }
                @case ('settings') {
                  <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.94 3a8.97 8.97 0 0 0-.46-1.74l2.1-1.63-2-3.46-2.52 1a8.96 8.96 0 0 0-1.52-.88L16.2 1.6h-4l-.44 2.69c-.54.24-1.05.54-1.52.88l-2.52-1-2 3.46 2.1 1.63A8.97 8.97 0 0 0 7.36 11l-2.69.44v4l2.69.44c.12.6.28 1.18.46 1.74l-2.1 1.63 2 3.46 2.52-1c.47.34.98.64 1.52.88l.44 2.69h4l.44-2.69c.54-.24 1.05-.54 1.52-.88l2.52 1 2-3.46-2.1-1.63c.18-.56.34-1.14.46-1.74l2.69-.44v-4l-2.69-.44z" />
                }
              }
            </svg>
          }
          @case ('duotone') {
            <!-- Modern Layered Duotone -->
            <span class="icon-duotone-box">
              <svg class="nav-icon duotone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                @switch (type) {
                  @case ('dashboard') {
                    <rect width="7" height="9" x="3" y="3" rx="1" fill="currentColor" fill-opacity="0.25" />
                    <rect width="7" height="5" x="14" y="3" rx="1" />
                    <rect width="7" height="9" x="14" y="12" rx="1" fill="currentColor" fill-opacity="0.25" />
                    <rect width="7" height="5" x="3" y="16" rx="1" />
                  }
                  @case ('analytics') {
                    <rect width="18" height="18" x="3" y="3" rx="2" fill="currentColor" fill-opacity="0.2" />
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  }
                  @case ('transactions') {
                    <rect width="20" height="14" x="2" y="5" rx="2" fill="currentColor" fill-opacity="0.2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                    <line x1="6" y1="15" x2="10" y2="15" />
                  }
                  @case ('loans') {
                    <circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.2" />
                    <path d="M12 7v10M9 9h6" />
                  }
                  @case ('epfo') {
                    <rect width="18" height="18" x="3" y="3" rx="2" fill="currentColor" fill-opacity="0.2" />
                    <path d="M7 8h10M7 12h10M7 16h6" />
                  }
                  @case ('investments') {
                    <polygon points="22 7 13.5 15.5 8.5 10.5 2 17 2 22 22 22" fill="currentColor" fill-opacity="0.2" stroke="none" />
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  }
                  @case ('business') {
                    <rect width="20" height="14" x="2" y="7" rx="2" fill="currentColor" fill-opacity="0.2" />
                    <path d="M16 7V4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
                    <line x1="12" y1="12" x2="12" y2="15" />
                    <line x1="2" y1="11" x2="22" y2="11" />
                  }
                  @case ('reports') {
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" fill-opacity="0.2" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  }
                  @case ('datatransfer') {
                    <rect width="18" height="18" x="3" y="3" rx="2" fill="currentColor" fill-opacity="0.18" />
                    <path d="M12 7v10M8 11l4-4 4 4" />
                  }
                  @case ('recyclebin') {
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" fill="currentColor" fill-opacity="0.2" />
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  }
                  @case ('settings') {
                    <circle cx="12" cy="12" r="8" fill="currentColor" fill-opacity="0.2" />
                    <circle cx="12" cy="12" r="3" />
                  }
                }
              </svg>
            </span>
          }
          @case ('monoline') {
            <!-- Minimal Hairline 1.25px -->
            <svg class="nav-icon monoline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25">
              @switch (type) {
                @case ('dashboard') {
                  <rect width="7" height="9" x="3" y="3" rx="0.5" />
                  <rect width="7" height="5" x="14" y="3" rx="0.5" />
                  <rect width="7" height="9" x="14" y="12" rx="0.5" />
                  <rect width="7" height="5" x="3" y="16" rx="0.5" />
                }
                @case ('analytics') {
                  <rect width="18" height="18" x="3" y="3" rx="1" />
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                }
                @case ('transactions') {
                  <rect width="20" height="14" x="2" y="5" rx="1.5" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                  <line x1="6" y1="14" x2="9" y2="14" />
                }
                @case ('loans') {
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="9" y1="10" x2="15" y2="10" />
                }
                @case ('epfo') {
                  <rect width="18" height="18" x="3" y="3" rx="1" />
                  <path d="M7 8h10M7 12h10M7 16h6" />
                }
                @case ('investments') {
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                }
                @case ('business') {
                  <rect width="20" height="14" x="2" y="7" rx="1.5" />
                  <path d="M16 7V4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
                  <line x1="12" y1="12" x2="12" y2="15" />
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
                @case ('recyclebin') {
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                }
                @case ('settings') {
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                }
              }
            </svg>
          }
          @default {
            <!-- linear (1.75px precision outline vector - Linear / Stripe default) -->
            <svg class="nav-icon linear-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              @switch (type) {
                @case ('dashboard') {
                  <rect width="7" height="9" x="3" y="3" rx="1" />
                  <rect width="7" height="5" x="14" y="3" rx="1" />
                  <rect width="7" height="9" x="14" y="12" rx="1" />
                  <rect width="7" height="5" x="3" y="16" rx="1" />
                }
                @case ('analytics') {
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
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
                @case ('business') {
                  <rect width="20" height="14" x="2" y="7" rx="2" />
                  <path d="M16 7V4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
                  <line x1="12" y1="12" x2="12" y2="15" />
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
                @case ('recyclebin') {
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                }
                @case ('settings') {
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06-.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

      /* Desktop Sidebar (Theme-Reactive Google Play Console Style) */
      .desktop-sidebar {
        display: none;
        width: 256px;
        background: var(--color-sidebar-bg, var(--color-bg-card));
        border-right: 1px solid var(--color-sidebar-border, var(--color-border));
        flex-direction: column;
        position: sticky;
        top: 0;
        height: 100vh;
        padding: 1rem 0;
        z-index: 30;
        transition: width 0.15s ease, background-color 0.2s ease, border-color 0.2s ease;

        @media (min-width: 900px) {
          display: flex;
        }
      }

      .sidebar-brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.25rem 1.25rem 1rem 1.5rem;
        border-bottom: 1px solid var(--color-sidebar-border, var(--color-border-subtle));
        margin-bottom: 0.75rem;
      }

      .brand-logo {
        width: 34px;
        height: 34px;
        background: transparent;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;

        &.sm {
          width: 26px;
          height: 26px;
        }
      }

      .brand-info {
        display: flex;
        flex-direction: column;
      }

      .brand-title {
        font-size: 1.15rem;
        font-weight: 500;
        font-family: var(--font-family-google);
        color: var(--color-text-main);
        letter-spacing: -0.015em;
        line-height: 1.2;
      }

      .brand-tagline {
        font-size: 0.72rem;
        font-weight: 400;
        color: var(--color-text-muted);
      }

      .side-nav {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        overflow-y: auto;
      }

      .sidebar-divider-line {
        height: 1px;
        background: var(--color-sidebar-border, var(--color-border));
        margin: 10px 16px;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0 16px 0 24px;
        height: 42px;
        border-radius: 0 24px 24px 0;
        margin-right: 12px;
        color: var(--color-text-secondary);
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        font-family: var(--font-family-google);
        transition: all 0.15s ease;

        &:hover {
          background: var(--color-nav-hover-bg, var(--color-bg-hover));
          color: var(--color-nav-hover-fg, var(--color-text-main));

          .nav-icon {
            color: var(--color-nav-hover-fg, var(--color-text-main));
          }
        }

        &.active {
          background: var(--color-nav-active-bg);
          color: var(--color-nav-active-fg);
          font-weight: 500;

          .nav-icon {
            color: var(--color-nav-active-icon);
            stroke: var(--color-nav-active-icon);
          }
        }

        .nav-badge-pill {
          margin-left: auto;
          font-size: 0.6875rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: 9999px;
          background: var(--color-notif-bg);
          color: var(--color-notif-fg);
          line-height: 1;
        }
      }

      .nav-icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        color: var(--color-text-muted);
        transition: all 0.12s ease;
      }

      .icon-duotone-box {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 4px;
        background: rgba(9, 105, 218, 0.08);
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
        padding: 5px 12px;
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

      /* Quick Add Button in Header */
      .btn-quick-add {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background-color: var(--color-primary);
        color: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: var(--radius-md);
        padding: 5px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.12s ease;

        &:hover {
          background-color: var(--color-primary-hover);
        }
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .currency-selector-pill {
        display: inline-flex;
        align-items: center;
        background: var(--color-canvas-subtle);
        border: 1px solid var(--color-border-default);
        border-radius: var(--radius-md);
        padding: 2px 6px;
        font-size: 12px;
        color: var(--color-text-main);

        .currency-symbol {
          font-family: var(--font-family-mono);
          font-weight: 700;
          color: var(--color-accent-fg);
          margin-right: 4px;
        }

        .currency-select {
          border: none;
          background: transparent;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-main);
          outline: none;
          cursor: pointer;
        }
      }

      .btn-header-tool {
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
        transition: all 0.12s ease;

        &:hover {
          background: var(--color-canvas-subtle);
          border-color: var(--color-border);
          color: var(--color-text-main);
        }

        &.active {
          background: var(--color-accent-subtle);
          border-color: var(--color-accent-fg);
          color: var(--color-accent-fg);
        }
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
        gap: 6px;
        transition: all 0.12s ease;

        svg {
          color: var(--color-accent-fg);
        }

        &:hover {
          background: var(--color-btn-hover-bg);
          border-color: var(--color-accent-fg);
        }
      }

      .btn-notifications-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        background: #fce8e6;
        color: #c5221f;
        border: none;
        border-radius: 9999px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;

        svg {
          color: #c5221f;
        }

        &:hover {
          background: #fad2cf;
        }
      }

      .header-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #0b57d0;
        color: #ffffff;
        font-weight: 500;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
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
        max-width: 440px;
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

        .title-with-icon {
          display: flex;
          align-items: center;
          gap: 8px;

          svg {
            color: var(--color-accent-fg);
          }

          h3 {
            font-size: 15px;
            font-weight: 700;
            color: var(--color-text-main);
            margin: 0;
          }
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
        font-size: 16px;
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
        margin-left: 10px;
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
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .icon-style-card,
      .sidebar-pos-card {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: 10px 12px;
        cursor: pointer;
        background: var(--color-canvas-subtle);
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.12s ease;

        &:hover {
          border-color: var(--color-accent-fg);
        }

        &.active {
          border-color: var(--color-primary);
          background: var(--color-bg-card);
          box-shadow: 0 0 0 2px var(--color-primary);
        }

        .icon-badge-pill,
        .pos-badge-pill {
          font-family: var(--font-family-mono);
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(175, 184, 193, 0.25);
          color: var(--color-text-main);
        }

        .icon-meta-col,
        .pos-meta-col {
          display: flex;
          flex-direction: column;

          .icon-style-name,
          .pos-name {
            font-size: 13px;
            font-weight: 600;
            color: var(--color-text-main);
          }
          .icon-style-desc,
          .pos-desc {
            font-size: 11px;
            color: var(--color-text-muted);
          }
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

      /* Command & Dialog Modals */
      .command-overlay {
        position: fixed;
        inset: 0;
        background: rgba(31, 35, 40, 0.55);
        backdrop-filter: blur(4px);
        z-index: 110;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 12vh;
      }

      .command-modal,
      .shortcuts-modal,
      .quick-add-modal {
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
          color: var(--color-text-muted);
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

      /* Keyboard Shortcuts Modal Styles */
      .shortcuts-header,
      .quick-add-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid var(--color-border);

        .shortcuts-title-row,
        .quick-add-title-group {
          display: flex;
          align-items: center;
          gap: 8px;

          svg {
            color: var(--color-accent-fg);
          }

          h3 {
            font-size: 15px;
            font-weight: 700;
            color: var(--color-text-main);
            margin: 0;
          }
        }
      }

      .shortcuts-body {
        padding: 18px;
        max-height: 400px;
        overflow-y: auto;
      }

      .shortcuts-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }

      .shortcuts-category {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--color-text-muted);
        letter-spacing: 0.05em;
        margin-bottom: 12px;
      }

      .shortcut-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 13px;
        color: var(--color-text-main);

        kbd {
          background: var(--color-canvas-subtle);
          border: 1px solid var(--color-border);
          border-radius: 4px;
          padding: 2px 6px;
          font-family: var(--font-family-mono);
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-muted);
        }
      }

      /* Quick Add Form Styles */
      .quick-add-form {
        padding: 18px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .type-segmented-control {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px;
        background: var(--color-canvas-subtle);
        padding: 4px;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border);

        .seg-btn {
          border: none;
          background: transparent;
          padding: 6px;
          font-size: 12px;
          font-weight: 600;
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all 0.12s ease;

          &.active {
            background: var(--color-bg-card);
            color: var(--color-text-main);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          }
        }
      }

      .amount-input {
        font-size: 18px !important;
        font-weight: 700 !important;
        font-family: var(--font-family-mono) !important;
      }

      .form-row-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .quick-add-alert {
        padding: 8px 12px;
        border-radius: var(--radius-sm);
        font-size: 12px;
        background: var(--color-income-bg);
        color: var(--color-income);
        border: 1px solid var(--color-income-border);

        &.error {
          background: var(--color-expense-bg);
          color: var(--color-expense);
          border-color: var(--color-expense-border);
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
        background: var(--color-sidebar-bg, var(--color-bg-card));
        border-right: 1px solid var(--color-sidebar-border, var(--color-border));
        display: flex;
        flex-direction: column;
        padding: 1.25rem 1rem;
        animation: slideIn 0.2s cubic-bezier(0.33, 1, 0.68, 1);
        transition: background-color 0.2s ease, border-color 0.2s ease;
      }

      .drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--color-sidebar-border, var(--color-border));
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
        color: var(--color-text-secondary);
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.15s ease;

        &:hover {
          background: var(--color-nav-hover-bg, var(--color-bg-hover));
          color: var(--color-text-main);
        }

        &.active {
          background: var(--color-nav-active-bg);
          color: var(--color-nav-active-fg);
          font-weight: 600;
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
export class ShellComponent implements OnInit {
  readonly themeService = inject(ThemeService);
  readonly authService = inject(AuthService);
  readonly recycleBinService = inject(RecycleBinService);
  private readonly transactionsService = inject(TransactionsService);
  private readonly router = inject(Router);

  readonly isMobileMenuOpen = signal<boolean>(false);
  commandQuery = '';
  filteredCommands: CommandItem[] = [];

  // Quick Add State
  quickTxnType: TransactionType = 2; // 2 = Expense, 1 = Income
  quickAmount: number | null = null;
  quickCategoryId = '';
  quickDate = new Date().toISOString().substring(0, 10);
  quickNote = '';
  quickCategories: Category[] = [];
  readonly isQuickSubmitting = signal<boolean>(false);
  readonly quickAddMessage = signal<string | null>(null);
  readonly isQuickAddError = signal<boolean>(false);

  // Key navigation state machine
  private gKeyPressed = false;
  private gKeyTimeout: any = null;

  // Commands registry
  readonly allCommands: CommandItem[] = [
    {
      id: 'goto-dashboard',
      title: 'Go to Financial Dashboard',
      category: 'Navigation',
      action: () => this.router.navigate(['/dashboard'])
    },
    {
      id: 'goto-analytics',
      title: 'Go to KPI Analytics & Diagnostics',
      category: 'Navigation',
      action: () => this.router.navigate(['/analytics'])
    },
    {
      id: 'goto-transactions',
      title: 'Go to Income & Expenses',
      category: 'Navigation',
      action: () => this.router.navigate(['/transactions'])
    },
    {
      id: 'goto-loans',
      title: 'Go to Loans Given & Taken',
      category: 'Navigation',
      action: () => this.router.navigate(['/loans'])
    },
    {
      id: 'goto-epfo',
      title: 'Go to EPFO Passbook',
      category: 'Navigation',
      action: () => this.router.navigate(['/epfo'])
    },
    {
      id: 'goto-investments',
      title: 'Go to Investments Portfolio',
      category: 'Navigation',
      action: () => this.router.navigate(['/investments'])
    },
    {
      id: 'goto-business',
      title: 'Go to Business & Ventures',
      category: 'Navigation',
      action: () => this.router.navigate(['/business'])
    },
    {
      id: 'goto-reports',
      title: 'Go to Financial Reports & PDF',
      category: 'Navigation',
      action: () => this.router.navigate(['/reports'])
    },
    {
      id: 'goto-data-transfer',
      title: 'Go to Data Import & Export',
      category: 'Navigation',
      action: () => this.router.navigate(['/data-transfer'])
    },
    {
      id: 'goto-recycle-bin',
      title: 'Go to Recycle Bin (Trash)',
      category: 'Navigation',
      action: () => this.router.navigate(['/recycle-bin'])
    },
    {
      id: 'goto-settings',
      title: 'Go to System Settings',
      category: 'Navigation',
      action: () => this.router.navigate(['/settings'])
    },
    {
      id: 'theme-light',
      title: 'Switch to GitHub Primer Light',
      category: 'Theme',
      action: () => this.themeService.setTheme('github-light')
    },
    {
      id: 'theme-dark',
      title: 'Switch to GitHub Primer Dark',
      category: 'Theme',
      action: () => this.themeService.setTheme('github-dark')
    },
    {
      id: 'theme-nord',
      title: 'Switch to Nordic Arctic Frost',
      category: 'Theme',
      action: () => this.themeService.setTheme('nord')
    },
    {
      id: 'theme-emerald',
      title: 'Switch to Midnight Emerald Wealth',
      category: 'Theme',
      action: () => this.themeService.setTheme('midnight-emerald')
    },
    {
      id: 'theme-sepia',
      title: 'Switch to Warm Sepia & Paper',
      category: 'Theme',
      action: () => this.themeService.setTheme('sepia-paper')
    },
    {
      id: 'icon-linear',
      title: 'Icon Pack: Linear Precision Stroke',
      category: 'Icon Pack',
      action: () => this.themeService.setIconStyle('linear')
    },
    {
      id: 'icon-filled',
      title: 'Icon Pack: Solid Geometric Silhouette',
      category: 'Icon Pack',
      action: () => this.themeService.setIconStyle('filled')
    },
    {
      id: 'icon-duotone',
      title: 'Icon Pack: Modern Duotone Depth',
      category: 'Icon Pack',
      action: () => this.themeService.setIconStyle('duotone')
    },
    {
      id: 'icon-monoline',
      title: 'Icon Pack: Minimal Monoline Hairline',
      category: 'Icon Pack',
      action: () => this.themeService.setIconStyle('monoline')
    },
    {
      id: 'sidebar-left',
      title: 'Sidebar: Move to Left (Default)',
      category: 'Sidebar Layout',
      action: () => this.themeService.setSidebarPosition('left')
    },
    {
      id: 'sidebar-right',
      title: 'Sidebar: Move to Right',
      category: 'Sidebar Layout',
      action: () => this.themeService.setSidebarPosition('right')
    },
    {
      id: 'sidebar-top',
      title: 'Sidebar: Move to Top Navigation Bar',
      category: 'Sidebar Layout',
      action: () => this.themeService.setSidebarPosition('top')
    },
    {
      id: 'sidebar-collapsed',
      title: 'Sidebar: Compact Mini-Bar Mode',
      category: 'Sidebar Layout',
      action: () => this.themeService.setSidebarPosition('collapsed')
    },
    {
      id: 'privacy-toggle',
      title: 'Toggle Financial Privacy Eye (Mask Amounts)',
      category: 'Settings',
      action: () => this.themeService.togglePrivacy()
    },
    {
      id: 'density-toggle',
      title: 'Toggle Compact Data Density',
      category: 'Settings',
      action: () => this.themeService.toggleDensity()
    }
  ];

  constructor() {
    this.filteredCommands = [...this.allCommands];
  }

  ngOnInit(): void {
    this.loadCategoriesForQuickAdd();
  }

  private loadCategoriesForQuickAdd(): void {
    this.transactionsService.getCategories().subscribe({
      next: (cats) => {
        this.quickCategories = cats;
        if (cats.length > 0) {
          this.quickCategoryId = cats[0].id;
        }
      },
      error: () => {}
    });
  }

  getCurrencySymbol(): string {
    const code = this.themeService.displayCurrency();
    const curr = this.themeService.availableCurrencies.find(c => c.code === code);
    return curr?.symbol || '₹';
  }

  onCurrencyChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as DisplayCurrency;
    this.themeService.setDisplayCurrency(val);
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcuts(event: KeyboardEvent): void {
    // If active element is an input, textarea, or select, don't trigger single-key navigation
    const target = event.target as HTMLElement | null;
    const isEditing = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

    // Ctrl+K or Cmd+K
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.themeService.toggleCommandPalette();
      return;
    }

    // Escape closes all dialogs
    if (event.key === 'Escape') {
      this.themeService.closeCommandPalette();
      this.themeService.closeCustomizer();
      this.themeService.closeShortcuts();
      this.themeService.closeQuickAdd();
      this.closeMobileMenu();
      return;
    }

    // Alt+P toggles privacy mask
    if (event.altKey && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      this.themeService.togglePrivacy();
      return;
    }

    // Alt+T cycles themes
    if (event.altKey && event.key.toLowerCase() === 't') {
      event.preventDefault();
      this.themeService.toggleTheme();
      return;
    }

    // Alt+D toggles density
    if (event.altKey && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      this.themeService.toggleDensity();
      return;
    }

    if (isEditing) return;

    // '?' opens shortcuts modal
    if (event.key === '?' || (event.shiftKey && event.key === '/')) {
      event.preventDefault();
      this.themeService.toggleShortcuts();
      return;
    }

    // 'c' or 'n' opens Quick Add
    if (event.key === 'c' || event.key === 'n') {
      event.preventDefault();
      this.themeService.openQuickAdd();
      return;
    }

    // 'g' key sequence for two-key navigation (GitHub style)
    if (event.key.toLowerCase() === 'g') {
      this.gKeyPressed = true;
      clearTimeout(this.gKeyTimeout);
      this.gKeyTimeout = setTimeout(() => {
        this.gKeyPressed = false;
      }, 1000);
      return;
    }

    if (this.gKeyPressed) {
      this.gKeyPressed = false;
      clearTimeout(this.gKeyTimeout);
      switch (event.key.toLowerCase()) {
        case 'd':
          this.router.navigate(['/dashboard']);
          break;
        case 'a':
          this.router.navigate(['/analytics']);
          break;
        case 't':
          this.router.navigate(['/transactions']);
          break;
        case 'l':
          this.router.navigate(['/loans']);
          break;
        case 'e':
          this.router.navigate(['/epfo']);
          break;
        case 'i':
          this.router.navigate(['/investments']);
          break;
        case 'b':
          this.router.navigate(['/business']);
          break;
        case 'r':
          this.router.navigate(['/reports']);
          break;
        case 's':
          this.router.navigate(['/settings']);
          break;
      }
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

  submitQuickTransaction(): void {
    if (!this.quickAmount || this.quickAmount <= 0) return;
    if (!this.quickCategoryId) return;

    this.isQuickSubmitting.set(true);
    this.quickAddMessage.set(null);

    const payload: CreateTransactionPayload = {
      amount: this.quickAmount,
      type: this.quickTxnType,
      categoryId: this.quickCategoryId,
      transactionDate: this.quickDate,
      note: this.quickNote.trim() || undefined
    };

    this.transactionsService.createTransaction(payload).subscribe({
      next: () => {
        this.isQuickSubmitting.set(false);
        this.isQuickAddError.set(false);
        this.quickAddMessage.set('Entry recorded successfully!');
        this.themeService.playChimeSound();
        setTimeout(() => {
          this.themeService.closeQuickAdd();
          this.quickAmount = null;
          this.quickNote = '';
          this.quickAddMessage.set(null);
        }, 800);
      },
      error: (err) => {
        this.isQuickSubmitting.set(false);
        this.isQuickAddError.set(true);
        this.quickAddMessage.set(err.error?.message || 'Failed to record entry. Please try again.');
      }
    });
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}
