import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { SettingsService } from './services/settings.service';
import { AdminUser, AuditLogItem, SystemHealth, UserProfile } from './models/settings.model';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { TransactionsService } from '../transactions/services/transactions.service';
import { Category, TransactionType } from '../transactions/models/transaction.model';
import { HttpClient } from '@angular/common/http';
import { DeletionPermissionsService, DeletionPermissions } from '../../core/services/deletion-permissions.service';
import { RoleRightsService, ModuleRight, RoleSummary, UserRoleAssignment } from '../../core/services/role-rights.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="settings-page">
      <div class="page-header">
        <h1 class="page-title">Settings & Administration</h1>
        <p class="subtitle">System preferences, custom categories, data backup, and enterprise controls</p>
      </div>

      <!-- Navigation Tabs -->
      <div class="settings-nav-tabs">
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'preferences'"
          (click)="setTab('preferences')"
        >
          <svg class="tab-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
          <span>Preferences</span>
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'appearance'"
          (click)="setTab('appearance')"
        >
          <svg class="tab-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a10 10 0 0 0 0 20v-4a6 6 0 0 1 0-12V2Z" />
          </svg>
          <span>Appearance & Studio</span>
        </button>
        @if (roleRightsService.canView('Categories')) {
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab() === 'categories'"
            (click)="setTab('categories')"
          >
            <svg class="tab-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <span>Categories</span>
          </button>
        }
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'export'"
          (click)="setTab('export')"
        >
          <svg class="tab-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Data Backup & Export</span>
        </button>
        @if (roleRightsService.canView('Settings')) {
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab() === 'deletion-rights'"
            (click)="setTab('deletion-rights')"
          >
            <svg class="tab-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            <span>Deletion Controls</span>
          </button>
        }
        @if (isAdmin || roleRightsService.canView('Users')) {
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab() === 'role-rights'"
            (click)="setTab('role-rights')"
          >
            <svg class="tab-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>Role & Rights</span>
          </button>
        }
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'privacy'"
          (click)="setTab('privacy')"
        >
          <svg class="tab-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Privacy & Danger Zone</span>
        </button>
        @if (isAdmin) {
          <button
            type="button"
            class="tab-btn tab-admin"
            [class.active]="activeTab() === 'admin'"
            (click)="setTab('admin')"
          >
            <svg class="tab-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>Admin Console</span>
          </button>
        }
      </div>

      <!-- Notification Alert -->
      @if (alertMessage()) {
        <div class="alert-box" [class.alert-error]="isAlertError()">
          <span>{{ alertMessage() }}</span>
          <button type="button" class="btn-close-alert" (click)="alertMessage.set(null)">✕</button>
        </div>
      }

      <!-- TAB 1: Preferences -->
      @if (activeTab() === 'preferences') {
        <div class="card-section">
          <h3>Display & Regional Preferences</h3>
          <p class="section-desc">Configure your account details and currency format.</p>

          <form (ngSubmit)="savePreferences()" class="form-grid">
            <div class="form-group">
              <label for="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                [(ngModel)]="prefForm.fullName"
                name="fullName"
                class="form-control"
                required
              />
            </div>

            <div class="form-group">
              <label for="email">Email Address</label>
              <input
                id="email"
                type="text"
                [value]="profile()?.email || ''"
                class="form-control"
                disabled
              />
              <span class="field-hint">Email address cannot be changed directly.</span>
            </div>

            <div class="form-group">
              <label for="timezone">Timezone</label>
              <select id="timezone" [(ngModel)]="prefForm.timezone" name="timezone" class="form-control">
                <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST +04:00)</option>
              </select>
            </div>

            <div class="form-group">
              <label for="locale">Currency & Number Formatting</label>
              <select id="locale" [(ngModel)]="prefForm.locale" name="locale" class="form-control">
                <option value="en-IN">Indian Format (₹ 1,25,000.00)</option>
                <option value="en-US">US International ($ 125,000.00)</option>
                <option value="en-GB">British Format (£ 125,000.00)</option>
                <option value="de-DE">European Format (125.000,00 €)</option>
              </select>
            </div>

            <div class="theme-toggle-box">
              <div class="theme-info">
                <strong>Color Theme</strong>
                <span>Current theme: {{ themeService.isDarkMode() ? 'Dark Mode' : 'Light Mode' }}</span>
              </div>
              <button
                type="button"
                class="btn-theme-toggle"
                (click)="themeService.toggleTheme()"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                  @if (themeService.isDarkMode()) {
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  } @else {
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  }
                </svg>
                <span>{{ themeService.isDarkMode() ? 'Switch to Light' : 'Switch to Dark' }}</span>
              </button>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-primary" [disabled]="saving()">
                {{ saving() ? 'Saving...' : 'Save Preferences' }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- TAB: Appearance & Studio -->
      @if (activeTab() === 'appearance') {
        <div class="card-section studio-card-section">
          <div class="card-title-row">
            <div>
              <div class="title-with-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a10 10 0 0 0 0 20v-4a6 6 0 0 1 0-12V2Z" />
                </svg>
                <h3>Appearance & Layout Studio</h3>
                <span class="studio-badge-pill">Enterprise Studio</span>
              </div>
              <p class="section-desc">Personalize your color palettes, typography font stack, vector icon packs, sidebar position, and sensory haptic feedback.</p>
            </div>
          </div>

          <!-- Live Theme Preview Showcase Card -->
          <div class="live-theme-showcase">
            <div class="showcase-header">
              <div class="showcase-title-wrap">
                <span class="showcase-indicator-dot"></span>
                <span class="showcase-label">LIVE THEME SHOWCASE</span>
              </div>
              <div class="showcase-theme-badge">
                <span class="theme-mode-tag" [class.dark-tag]="activeThemeDef().category === 'dark'">
                  {{ activeThemeDef().category === 'dark' ? '🌙 DARK PALETTE' : '☀️ LIGHT PALETTE' }}
                </span>
                <span class="theme-name-tag">{{ activeThemeDef().name }}</span>
              </div>
            </div>

            <div class="showcase-content-grid">
              <!-- Mini Metric Pill / Balance Preview -->
              <div class="showcase-card-preview">
                <span class="mini-label">SAMPLE CASHFLOW</span>
                <div class="mini-balances">
                  <div class="mini-pill income">
                    <span class="arrow">↑</span>
                    <span>+₹45,280.00</span>
                  </div>
                  <div class="mini-pill expense">
                    <span class="arrow">↓</span>
                    <span>-₹12,450.00</span>
                  </div>
                  <div class="mini-pill net">
                    <span>Net: ₹32,830.00</span>
                  </div>
                </div>
              </div>

              <!-- Action Button System Preview -->
              <div class="showcase-card-preview">
                <span class="mini-label">ACTION BUTTON CONTROLS</span>
                <div class="mini-buttons">
                  <button type="button" class="mini-btn-primary" (click)="themeService.playClickSound()">Primary Action</button>
                  <button type="button" class="mini-btn-secondary" (click)="themeService.playClickSound()">Secondary</button>
                  <button type="button" class="mini-btn-danger" (click)="themeService.playDeleteSound()">Delete</button>
                </div>
              </div>

              <!-- Theme Color Spectrum -->
              <div class="showcase-card-preview">
                <span class="mini-label">ACTIVE COLOR SPECTRUM</span>
                <div class="spectrum-swatches">
                  @for (c of activeThemeDef().previewColors; track c) {
                    <div class="spectrum-chip" [style.background-color]="c" [title]="c">
                      <span class="chip-hex">{{ c }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- 10 Themes Grid with Category Filtering -->
          <div class="studio-block">
            <div class="studio-header-with-filter">
              <div>
                <h4 class="studio-subheading">Color Themes ({{ themeService.availableThemes.length }} Themes Available)</h4>
                <p class="studio-subdesc">Select an artisan color palette crafted for financial clarity and reduced eye fatigue.</p>
              </div>
              <div class="theme-filter-pills">
                <button
                  type="button"
                  class="theme-filter-btn"
                  [class.active]="themeCategoryFilter() === 'all'"
                  (click)="themeCategoryFilter.set('all'); themeService.playClickSound()"
                >
                  All ({{ themeService.availableThemes.length }})
                </button>
                <button
                  type="button"
                  class="theme-filter-btn"
                  [class.active]="themeCategoryFilter() === 'light'"
                  (click)="themeCategoryFilter.set('light'); themeService.playClickSound()"
                >
                  ☀️ Light Themes (7)
                </button>
                <button
                  type="button"
                  class="theme-filter-btn"
                  [class.active]="themeCategoryFilter() === 'dark'"
                  (click)="themeCategoryFilter.set('dark'); themeService.playClickSound()"
                >
                  🌙 Dark Themes (3)
                </button>
              </div>
            </div>

            <div class="theme-picker-grid">
              @for (t of filteredThemes(); track t.id) {
                <div
                  class="theme-select-card"
                  [class.active]="themeService.currentTheme() === t.id"
                  (click)="themeService.setTheme(t.id)"
                >
                  <div class="theme-card-top">
                    <span class="theme-category-pill" [class.dark]="t.category === 'dark'">
                      {{ t.category === 'dark' ? '🌙 Dark' : '☀️ Light' }}
                    </span>
                    <div class="theme-swatch-bar">
                      @for (c of t.previewColors; track c) {
                        <span class="swatch-circle" [style.background-color]="c"></span>
                      }
                    </div>
                  </div>
                  <div class="theme-meta">
                    <span class="theme-title">{{ t.name }}</span>
                    <p class="theme-desc">{{ t.description }}</p>
                  </div>
                  <div class="theme-footer">
                    @if (themeService.currentTheme() === t.id) {
                      <span class="active-tag-pill">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Current Theme
                      </span>
                    } @else {
                      <span class="select-hint-text">Click to apply</span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Typography / Font Stack Selection -->
          <div class="studio-block">
            <div class="studio-header-with-filter">
              <div>
                <h4 class="studio-subheading">Dashboard Typography & Font Stack</h4>
                <p class="studio-subdesc">Choose your preferred typeface tailored for financial clarity and numerical precision.</p>
              </div>
            </div>
            <div class="font-picker-grid">
              @for (f of themeService.availableFonts; track f.id) {
                <div
                  class="font-select-card"
                  [class.active]="themeService.fontFamily() === f.id"
                  (click)="themeService.setFontFamily(f.id)"
                >
                  <div class="font-card-header">
                    <span class="font-name">{{ f.name }}</span>
                    @if (themeService.fontFamily() === f.id) {
                      <span class="active-tag-pill">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Active
                      </span>
                    }
                  </div>
                  <p class="font-desc">{{ f.description }}</p>
                  <div class="font-sample-box" [attr.data-font]="f.id">
                    <span class="sample-amount">₹1,45,280.00</span>
                    <span class="sample-sub">The quick brown fox jumps over the lazy dog</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Interface Corner Roundness -->
          <div class="studio-block">
            <div class="studio-header-with-filter">
              <div>
                <h4 class="studio-subheading">Interface Corner Roundness</h4>
                <p class="studio-subdesc">Adjust card, button, and input corner roundness across the entire platform.</p>
              </div>
            </div>
            <div class="radius-picker-grid">
              @for (r of themeService.availableRadii; track r.id) {
                <div
                  class="radius-select-card"
                  [class.active]="themeService.radiusPreset() === r.id"
                  (click)="themeService.setRadiusPreset(r.id)"
                >
                  <div class="radius-visual-box" [attr.data-radius]="r.id">
                    <span class="radius-value-tag">{{ r.samplePx }}</span>
                  </div>
                  <div class="radius-meta">
                    <span class="radius-title">{{ r.name }}</span>
                    <span class="radius-desc">{{ r.description }}</span>
                  </div>
                  @if (themeService.radiusPreset() === r.id) {
                    <span class="active-tag-pill">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Active
                    </span>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Navigation Icon Pack (4 Styles) -->
          <div class="studio-block">
            <div class="studio-header-with-filter">
              <div>
                <h4 class="studio-subheading">Navigation Icon Pack (4 Styles)</h4>
                <p class="studio-subdesc">Fintech vector outline, solid silhouette, modern duotone depth, or hairline precision.</p>
              </div>
            </div>
            <div class="icon-picker-grid">
              @for (ic of themeService.availableIconStyles; track ic.id) {
                <div
                  class="icon-select-card"
                  [class.active]="themeService.iconStyle() === ic.id"
                  (click)="themeService.setIconStyle(ic.id)"
                >
                  <div class="icon-card-header">
                    <div class="icon-preview-tag">
                      @if (ic.id === 'linear') {
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8">
                          <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
                          <rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>
                        </svg>
                      } @else if (ic.id === 'filled') {
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                          <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
                          <rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>
                        </svg>
                      } @else if (ic.id === 'duotone') {
                        <svg viewBox="0 0 24 24" width="24" height="24">
                          <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="1.5"/>
                          <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.9"/>
                          <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="1.5"/>
                          <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.9"/>
                        </svg>
                      } @else {
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.2">
                          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                          <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                        </svg>
                      }
                    </div>
                    <div class="icon-title-wrap">
                      <span class="icon-title">{{ ic.name }}</span>
                      <span class="badge">{{ ic.badge }}</span>
                    </div>
                  </div>
                  <div class="icon-desc-wrap">
                    <p class="icon-desc">{{ ic.description }}</p>
                  </div>
                  <div class="icon-card-footer">
                    @if (themeService.iconStyle() === ic.id) {
                      <span class="active-tag-pill">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Active Style
                      </span>
                    } @else {
                      <span class="select-hint-text">Select style</span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Sidebar Position & Layout (4 Options) -->
          <div class="studio-block">
            <div class="studio-header-with-filter">
              <div>
                <h4 class="studio-subheading">Sidebar Position & Layout (4 Options)</h4>
                <p class="studio-subdesc">Configure your desktop layout: standard left, right-aligned, top navigation, or slim mini-bar.</p>
              </div>
            </div>
            <div class="sidebar-picker-grid">
              @for (sp of themeService.availableSidebarPositions; track sp.id) {
                <div
                  class="sidebar-select-card"
                  [class.active]="themeService.sidebarPosition() === sp.id"
                  (click)="themeService.setSidebarPosition(sp.id)"
                >
                  <div class="sidebar-card-header">
                    <div class="pos-badge">
                      @if (sp.id === 'left') {
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
                        </svg>
                      } @else if (sp.id === 'right') {
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/>
                        </svg>
                      } @else if (sp.id === 'top') {
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
                        </svg>
                      } @else {
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="6" y1="3" x2="6" y2="21"/>
                        </svg>
                      }
                    </div>
                    <div class="sidebar-title-wrap">
                      <span class="pos-title">{{ sp.name }}</span>
                      <span class="badge">{{ sp.badge }}</span>
                    </div>
                  </div>
                  <div class="pos-desc-wrap">
                    <p class="pos-desc">{{ sp.description }}</p>
                  </div>
                  <div class="sidebar-card-footer">
                    @if (themeService.sidebarPosition() === sp.id) {
                      <span class="active-tag-pill">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Active Layout
                      </span>
                    } @else {
                      <span class="select-hint-text">Select layout</span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Multi-Currency Display Preference -->
          <div class="studio-block">
            <div class="studio-header-with-filter">
              <div>
                <h4 class="studio-subheading">Display Currency Conversion (5 Currencies)</h4>
                <p class="studio-subdesc">Auto-converts all transaction values across screens to your chosen viewing currency.</p>
              </div>
            </div>
            <div class="currency-picker-grid">
              @for (c of themeService.availableCurrencies; track c.code) {
                <div
                  class="currency-select-card"
                  [class.active]="themeService.displayCurrency() === c.code"
                  (click)="themeService.setDisplayCurrency(c.code)"
                >
                  <div class="curr-symbol-box">{{ c.symbol }}</div>
                  <div class="curr-meta">
                    <span class="curr-code">{{ c.code }}</span>
                    <span class="curr-name">{{ c.name }}</span>
                  </div>
                  @if (themeService.displayCurrency() === c.code) {
                    <span class="active-tag-pill">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Active
                    </span>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Sensory Audio Feedback & Interactive Soundboard -->
          <div class="studio-block">
            <div class="studio-header-with-filter audio-panel-header">
              <div>
                <div class="audio-header-title-row">
                  <h4 class="studio-subheading">Sensory Audio Feedback & Soundboard</h4>
                  <span class="audio-live-flag" [class.flag-on]="themeService.soundEffects()" [class.flag-off]="!themeService.soundEffects()">
                    <span class="status-pulse-dot"></span>
                    {{ themeService.soundEffects() ? 'AUDIO: ON' : 'AUDIO: OFF' }}
                  </span>
                </div>
                <p class="studio-subdesc">Tasteful Web Audio synthesizer providing immediate tactile haptic feedback without external audio files.</p>
              </div>

              <!-- Explicit ON / OFF Segmented Flag Switch -->
              <div class="audio-flag-switch-group" role="group" aria-label="Audio Feedback Flag Toggle">
                <button
                  type="button"
                  class="audio-flag-btn btn-flag-on"
                  [class.active]="themeService.soundEffects()"
                  (click)="themeService.setSoundEffects(true)"
                  title="Enable audio feedback across all screens">
                  <span class="flag-icon">🔊</span>
                  <span class="flag-label">ON</span>
                </button>
                <button
                  type="button"
                  class="audio-flag-btn btn-flag-off"
                  [class.active]="!themeService.soundEffects()"
                  (click)="themeService.setSoundEffects(false)"
                  title="Mute audio feedback across all screens">
                  <span class="flag-icon">🔇</span>
                  <span class="flag-label">OFF</span>
                </button>
              </div>
            </div>

            <!-- Audio Master Status Banner -->
            <div class="audio-status-banner" [class.banner-active]="themeService.soundEffects()" [class.banner-muted]="!themeService.soundEffects()">
              <div class="status-banner-content">
                <span class="banner-icon">{{ themeService.soundEffects() ? '🔔' : '🔕' }}</span>
                <span class="banner-text">
                  <strong>Status: {{ themeService.soundEffects() ? 'ACTIVE (ON)' : 'MUTED (OFF)' }}</strong> —
                  {{ themeService.soundEffects() ? 'Tactile clicks, modal chimes, and transaction cues will play across all screens.' : 'App sound effects are disabled. You can preview tones below without turning the master flag on.' }}
                </span>
              </div>
              <button
                type="button"
                class="btn-banner-quick-toggle"
                (click)="themeService.toggleSoundEffects()">
                {{ themeService.soundEffects() ? 'Turn Sound OFF' : 'Turn Sound ON' }}
              </button>
            </div>

            <!-- Live Soundboard Test Buttons -->
            <div class="soundboard-grid">
              <div class="sound-card" (click)="testSound('click')">
                <div class="sound-icon-box click">🔊</div>
                <div class="sound-info">
                  <strong>Tactile Click</strong>
                  <span>Micro sine tap for buttons & pills</span>
                </div>
                <button type="button" class="btn-sound-play">Play Click</button>
              </div>

              <div class="sound-card" (click)="testSound('success')">
                <div class="sound-icon-box success">🎵</div>
                <div class="sound-info">
                  <strong>Success Chime</strong>
                  <span>Ascending major triad (C-E-G)</span>
                </div>
                <button type="button" class="btn-sound-play">Play Chime</button>
              </div>

              <div class="sound-card" (click)="testSound('delete')">
                <div class="sound-icon-box delete">🗑️</div>
                <div class="sound-info">
                  <strong>Delete / Caution Tap</strong>
                  <span>Low-frequency descending sweep</span>
                </div>
                <button type="button" class="btn-sound-play">Play Delete</button>
              </div>

              <div class="sound-card" (click)="testSound('nav')">
                <div class="sound-icon-box nav">🚀</div>
                <div class="sound-info">
                  <strong>Route Transition</strong>
                  <span>Soft triangle navigation step</span>
                </div>
                <button type="button" class="btn-sound-play">Play Nav</button>
              </div>
            </div>
          </div>

          <!-- Advanced Accessibility & Density -->
          <div class="studio-block">
            <h4 class="studio-subheading">Workflow & Accessibility Preferences</h4>
            <div class="settings-switch-grid">
              <div class="setting-switch-card" (click)="themeService.toggleDensity()">
                <div class="switch-content">
                  <strong>Compact Data Density</strong>
                  <p>Reduce table row heights and card paddings for maximum screen room.</p>
                </div>
                <div class="toggle-pill" [class.on]="themeService.density() === 'compact'">
                  {{ themeService.density() === 'compact' ? 'COMPACT' : 'NORMAL' }}
                </div>
              </div>

              <div class="setting-switch-card" (click)="themeService.togglePrivacy()">
                <div class="switch-content">
                  <strong>Financial Privacy Eye (Blur Amounts)</strong>
                  <p>Masks all financial figures in public spaces; hover over any value to reveal.</p>
                </div>
                <div class="toggle-pill" [class.on]="themeService.privacyMode()">
                  {{ themeService.privacyMode() ? 'MASKED' : 'VISIBLE' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- TAB 2: Categories -->
      @if (activeTab() === 'categories') {
        <div class="card-section">
          <div class="card-title-row">
            <div>
              <h3>Category Management</h3>
              <p class="section-desc">Manage expense and income categorization</p>
            </div>
            <button type="button" class="btn-primary" (click)="openCategoryModal()">
              + New Category
            </button>
          </div>

          <div class="categories-columns">
            <!-- Expense Categories -->
            <div class="category-group-card">
              <h4>Expense Categories</h4>
              <div class="categories-flow">
                @for (c of expenseCategories(); track c.id) {
                  <span class="cat-chip">
                    <span class="chip-color" [style.background-color]="c.color"></span>
                    <span>{{ c.name }}</span>
                    @if (!c.isSystem) {
                      <button
                        type="button"
                        class="btn-delete-cat"
                        (click)="deleteCategory(c)"
                        title="Delete custom category"
                      >
                        ✕
                      </button>
                    }
                  </span>
                }
              </div>
            </div>

            <!-- Income Categories -->
            <div class="category-group-card">
              <h4>Income Categories</h4>
              <div class="categories-flow">
                @for (c of incomeCategories(); track c.id) {
                  <span class="cat-chip">
                    <span class="chip-color" [style.background-color]="c.color"></span>
                    <span>{{ c.name }}</span>
                    @if (!c.isSystem) {
                      <button
                        type="button"
                        class="btn-delete-cat"
                        (click)="deleteCategory(c)"
                        title="Delete custom category"
                      >
                        ✕
                      </button>
                    }
                  </span>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- TAB 3: Data Backup & Export -->
      @if (activeTab() === 'export') {
        <div class="card-section">
          <h3>Full Account Data Export</h3>
          <p class="section-desc">Download a comprehensive copy of your entire financial database.</p>

          <div class="export-cards-grid">
            <div class="export-option-box">
              <div class="export-icon-box">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <h4>JSON Data Archive</h4>
              <p>Complete JSON dump containing your profile, categories, transactions, loans, EPFO, and investment records.</p>
              <button
                type="button"
                class="btn-outline"
                [disabled]="exporting() === 'json'"
                (click)="downloadJsonBackup()"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>{{ exporting() === 'json' ? 'Exporting...' : 'Download JSON Archive' }}</span>
              </button>
            </div>

            <div class="export-option-box">
              <div class="export-icon-box text-excel">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#10b981" stroke-width="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="8" y1="13" x2="16" y2="13"/>
                  <line x1="8" y1="17" x2="16" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <h4>All-in-One Excel Workbook</h4>
              <p>Multi-tab styled Excel (.xlsx) file with sheets for Overview, Transactions, Loans, EPFO, and Investments.</p>
              <button
                type="button"
                class="btn-outline btn-excel-accent"
                [disabled]="exporting() === 'excel'"
                (click)="downloadExcelBackup()"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>{{ exporting() === 'excel' ? 'Exporting...' : 'Export Master Workbook' }}</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- TAB: Deletion Rights & Permissions -->
      @if (activeTab() === 'deletion-rights') {
        <div class="card-section">
          <div class="card-title-row">
            <div>
              <div class="title-with-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <h3>Module Deletion Controls & Rights</h3>
              </div>
              <p class="section-desc">
                Configure module-level delete permissions. When a module's switch is turned OFF, delete operations are strictly locked across the interface and API to prevent accidental data loss.
              </p>
            </div>
            <div class="quick-header-tools">
              <a routerLink="/recycle-bin" class="btn-recycle-link" title="Open Recycle Bin">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>View Recycle Bin (Trash) →</span>
              </a>
            </div>
          </div>

          <!-- Explanatory Protection Banner -->
          <div class="info-alert-box">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <strong>Multi-Layer Deletion Protection</strong>
              <p>
                When a module's switch is <strong>ON</strong>, deleting items is permitted; deleted items are safely moved to the <strong>Recycle Bin</strong> where they can be restored or permanently purged. When turned <strong>OFF</strong>, deletion buttons are locked and backend API endpoints immediately block deletion attempts.
              </p>
            </div>
          </div>

          <!-- Quick Actions Bar -->
          <div class="perm-quick-actions">
            <button type="button" class="btn-sm-action" (click)="setAllPermissions(true)" [disabled]="deletionPermissionsService.isUpdating()">
              ✓ Allow All Deletions
            </button>
            <button type="button" class="btn-sm-action" (click)="setAllPermissions(false)" [disabled]="deletionPermissionsService.isUpdating()">
              🔒 Lock All Deletions (High Security)
            </button>
            <button type="button" class="btn-sm-action" (click)="reloadDeletionPermissions()" [disabled]="deletionPermissionsService.isUpdating()">
              🔄 Sync From Database
            </button>
          </div>

          <!-- 6 Module Switches Grid -->
          <div class="modules-perm-grid">
            <!-- 1. Transactions -->
            <div class="perm-module-card" [class.allowed]="deletionPerms().transactions" [class.blocked]="!deletionPerms().transactions">
              <div class="perm-card-content">
                <div class="module-icon-wrap icon-tx">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div class="perm-meta">
                  <div class="perm-title-row">
                    <h4>Transactions (Ledgers)</h4>
                    <span class="perm-status-badge" [class.on]="deletionPerms().transactions">
                      {{ deletionPerms().transactions ? 'ALLOWED' : 'BLOCKED' }}
                    </span>
                  </div>
                  <p>Allows deleting individual income inflow and expense outflow records.</p>
                </div>
              </div>
              <div class="toggle-pill" [class.on]="deletionPerms().transactions" (click)="togglePermission('transactions')">
                {{ deletionPerms().transactions ? 'ON' : 'OFF' }}
              </div>
            </div>

            <!-- 2. Categories -->
            <div class="perm-module-card" [class.allowed]="deletionPerms().categories" [class.blocked]="!deletionPerms().categories">
              <div class="perm-card-content">
                <div class="module-icon-wrap icon-cat">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                </div>
                <div class="perm-meta">
                  <div class="perm-title-row">
                    <h4>Categories</h4>
                    <span class="perm-status-badge" [class.on]="deletionPerms().categories">
                      {{ deletionPerms().categories ? 'ALLOWED' : 'BLOCKED' }}
                    </span>
                  </div>
                  <p>Allows deleting user-created custom income and expense categories.</p>
                </div>
              </div>
              <div class="toggle-pill" [class.on]="deletionPerms().categories" (click)="togglePermission('categories')">
                {{ deletionPerms().categories ? 'ON' : 'OFF' }}
              </div>
            </div>

            <!-- 3. Loans -->
            <div class="perm-module-card" [class.allowed]="deletionPerms().loans" [class.blocked]="!deletionPerms().loans">
              <div class="perm-card-content">
                <div class="module-icon-wrap icon-loans">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <div class="perm-meta">
                  <div class="perm-title-row">
                    <h4>Loans & Credit</h4>
                    <span class="perm-status-badge" [class.on]="deletionPerms().loans">
                      {{ deletionPerms().loans ? 'ALLOWED' : 'BLOCKED' }}
                    </span>
                  </div>
                  <p>Allows deleting credit contracts, loan accounts, and repayment logs.</p>
                </div>
              </div>
              <div class="toggle-pill" [class.on]="deletionPerms().loans" (click)="togglePermission('loans')">
                {{ deletionPerms().loans ? 'ON' : 'OFF' }}
              </div>
            </div>

            <!-- 4. EPFO -->
            <div class="perm-module-card" [class.allowed]="deletionPerms().epfo" [class.blocked]="!deletionPerms().epfo">
              <div class="perm-card-content">
                <div class="module-icon-wrap icon-epfo">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
                <div class="perm-meta">
                  <div class="perm-title-row">
                    <h4>EPFO Passbook</h4>
                    <span class="perm-status-badge" [class.on]="deletionPerms().epfo">
                      {{ deletionPerms().epfo ? 'ALLOWED' : 'BLOCKED' }}
                    </span>
                  </div>
                  <p>Allows deleting monthly Provident Fund contribution history.</p>
                </div>
              </div>
              <div class="toggle-pill" [class.on]="deletionPerms().epfo" (click)="togglePermission('epfo')">
                {{ deletionPerms().epfo ? 'ON' : 'OFF' }}
              </div>
            </div>

            <!-- 5. Investments -->
            <div class="perm-module-card" [class.allowed]="deletionPerms().investments" [class.blocked]="!deletionPerms().investments">
              <div class="perm-card-content">
                <div class="module-icon-wrap icon-inv">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    <polyline points="16 7 22 7 22 13" />
                  </svg>
                </div>
                <div class="perm-meta">
                  <div class="perm-title-row">
                    <h4>Investments & Portfolio</h4>
                    <span class="perm-status-badge" [class.on]="deletionPerms().investments">
                      {{ deletionPerms().investments ? 'ALLOWED' : 'BLOCKED' }}
                    </span>
                  </div>
                  <p>Allows deleting investment holdings, equities, mutual funds, and trades.</p>
                </div>
              </div>
              <div class="toggle-pill" [class.on]="deletionPerms().investments" (click)="togglePermission('investments')">
                {{ deletionPerms().investments ? 'ON' : 'OFF' }}
              </div>
            </div>

            <!-- 6. Business -->
            <div class="perm-module-card" [class.allowed]="deletionPerms().business" [class.blocked]="!deletionPerms().business">
              <div class="perm-card-content">
                <div class="module-icon-wrap icon-biz">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <div class="perm-meta">
                  <div class="perm-title-row">
                    <h4>Business & Ventures</h4>
                    <span class="perm-status-badge" [class.on]="deletionPerms().business">
                      {{ deletionPerms().business ? 'ALLOWED' : 'BLOCKED' }}
                    </span>
                  </div>
                  <p>Allows deleting registered business profiles and commercial transaction invoices.</p>
                </div>
              </div>
              <div class="toggle-pill" [class.on]="deletionPerms().business" (click)="togglePermission('business')">
                {{ deletionPerms().business ? 'ON' : 'OFF' }}
              </div>
            </div>

            <!-- 7. Dreams & Goals -->
            <div class="perm-module-card" [class.allowed]="deletionPerms().goals" [class.blocked]="!deletionPerms().goals">
              <div class="perm-card-content">
                <div class="module-icon-wrap" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                </div>
                <div class="perm-info">
                  <div class="perm-title-row">
                    <h4>Dreams & Goals</h4>
                    <span class="perm-status-badge" [class.on]="deletionPerms().goals">
                      {{ deletionPerms().goals ? 'ALLOWED' : 'BLOCKED' }}
                    </span>
                  </div>
                  <p>Allows deleting financial milestone goals and their savings contributions history.</p>
                </div>
              </div>
              <div class="toggle-pill" [class.on]="deletionPerms().goals" (click)="togglePermission('goals')">
                {{ deletionPerms().goals ? 'ON' : 'OFF' }}
              </div>
            </div>
          </div>
        </div>
      }

      <!-- TAB: Role & Rights Matrix -->
      @if (activeTab() === 'role-rights') {
        <div class="card-section role-rights-container">
          <div class="card-title-row">
            <div>
              <div class="title-with-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="title-svg-primary">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <h3>Role & Rights Management</h3>
              </div>
              <p class="section-desc">
                Configure role-based access control (RBAC). Select a role to customize module permissions (View, Create, Edit, Delete, Export) or assign roles to registered users.
              </p>
            </div>
            <div class="quick-header-tools">
              <button type="button" class="btn-create-role" (click)="openCreateRoleModal()">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>+ New Custom Role</span>
              </button>
            </div>
          </div>

          <!-- Sub-view toggle (Permissions Matrix vs User Role Assignment) -->
          <div class="role-subtabs">
            <button
              type="button"
              class="subtab-btn"
              [class.active]="roleRightsSubView() === 'matrix'"
              (click)="roleRightsSubView.set('matrix')"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>Permissions Matrix</span>
            </button>
            <button
              type="button"
              class="subtab-btn"
              [class.active]="roleRightsSubView() === 'users'"
              (click)="roleRightsSubView.set('users')"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>User Role Assignments ({{ userRoleAssignments().length }})</span>
            </button>
          </div>

          @if (roleRightsSubView() === 'matrix') {
            <!-- Role Selector Bar -->
            <div class="role-selector-bar">
              <span class="role-sel-label">Roles:</span>
              <div class="role-pills-list">
                @for (r of rolesList(); track r.name) {
                  <button
                    type="button"
                    class="role-pill-btn"
                    [class.active]="selectedRole() === r.name"
                    (click)="selectRole(r.name)"
                  >
                    <span class="role-name-text">{{ r.name }}</span>
                    <span class="role-badge-count">{{ r.userCount }} users</span>
                    @if (!r.isSystemRole) {
                      <span
                        class="btn-delete-role-icon"
                        title="Delete Role"
                        (click)="$event.stopPropagation(); deleteCustomRole(r.name)"
                      >✕</span>
                    }
                  </button>
                }
              </div>
            </div>

            <!-- Active Role Details Card & Presets -->
            <div class="active-role-card">
              <div class="active-role-info">
                <div class="role-title-line">
                  <h4>Configuring Rights for: <span class="highlight-role">{{ selectedRole() }}</span></h4>
                  @if (selectedRole() === 'Admin') {
                    <span class="system-role-badge">Super Admin</span>
                  }
                </div>
                <p class="role-desc-text">{{ getActiveRoleDescription() }}</p>
              </div>
              <div class="matrix-presets-actions">
                <span class="preset-label">Quick Presets:</span>
                <button type="button" class="btn-preset" (click)="applyRolePreset('all')">✓ Full Access</button>
                <button type="button" class="btn-preset" (click)="applyRolePreset('readonly')">👁️ Read Only</button>
                <button type="button" class="btn-preset" (click)="applyRolePreset('nodelete')">🔒 Lock Deletions</button>
                <button type="button" class="btn-preset" (click)="applyRolePreset('clear')">✕ Clear All</button>
              </div>
            </div>

            <!-- Rights Matrix Table -->
            @if (roleRightsLoading()) {
              <div class="matrix-loading">
                <span class="spinner-sm"></span> Loading permissions matrix...
              </div>
            } @else {
              <div class="table-responsive matrix-table-wrapper">
                <table class="rights-matrix-table">
                  <thead>
                    <tr>
                      <th class="col-module">Module / Feature</th>
                      <th class="col-perm text-center">View (Read)</th>
                      <th class="col-perm text-center">Create (Add)</th>
                      <th class="col-perm text-center">Edit (Update)</th>
                      <th class="col-perm text-center">Delete (Remove)</th>
                      <th class="col-perm text-center">Export (Data)</th>
                      <th class="col-actions text-center">Row Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of roleRightsMatrix(); track row.module; let idx = $index) {
                      <tr [class.row-all-allowed]="isRowAllAllowed(row)" [class.row-none-allowed]="isRowNoneAllowed(row)">
                        <td class="col-module">
                          <div class="module-title-wrap">
                            <div class="module-name-row">
                              <span class="module-icon-pill">{{ getModuleIcon(row.module) }}</span>
                              <span class="module-name">{{ row.displayName }}</span>
                              @if (row.module === 'MarketAi') {
                                <span class="badge-mini-ai">AI Hub</span>
                              }
                              @if (row.module === 'Investments' || row.module === 'MarketAi') {
                                <span class="badge-mini-market">Stocks</span>
                              }
                            </div>
                            <span class="module-hint">{{ row.description }}</span>
                          </div>
                        </td>
                        <td class="col-perm text-center">
                          <label class="custom-toggle">
                            <input
                              type="checkbox"
                              [checked]="row.canView"
                              (change)="toggleRight(idx, 'canView')"
                            />
                            <span class="toggle-slider"></span>
                          </label>
                        </td>
                        <td class="col-perm text-center">
                          <label class="custom-toggle" [class.toggle-disabled]="!row.canView">
                            <input
                              type="checkbox"
                              [checked]="row.canCreate"
                              [disabled]="!row.canView"
                              (change)="toggleRight(idx, 'canCreate')"
                            />
                            <span class="toggle-slider"></span>
                          </label>
                        </td>
                        <td class="col-perm text-center">
                          <label class="custom-toggle" [class.toggle-disabled]="!row.canView">
                            <input
                              type="checkbox"
                              [checked]="row.canEdit"
                              [disabled]="!row.canView"
                              (change)="toggleRight(idx, 'canEdit')"
                            />
                            <span class="toggle-slider"></span>
                          </label>
                        </td>
                        <td class="col-perm text-center">
                          <label class="custom-toggle danger-slider" [class.toggle-disabled]="!row.canView">
                            <input
                              type="checkbox"
                              [checked]="row.canDelete"
                              [disabled]="!row.canView"
                              (change)="toggleRight(idx, 'canDelete')"
                            />
                            <span class="toggle-slider"></span>
                          </label>
                        </td>
                        <td class="col-perm text-center">
                          <label class="custom-toggle" [class.toggle-disabled]="!row.canView">
                            <input
                              type="checkbox"
                              [checked]="row.canExport"
                              [disabled]="!row.canView"
                              (change)="toggleRight(idx, 'canExport')"
                            />
                            <span class="toggle-slider"></span>
                          </label>
                        </td>
                        <td class="col-actions text-center">
                          <button
                            type="button"
                            class="btn-row-toggle"
                            (click)="toggleAllModuleRights(idx)"
                            title="Toggle all rights for this module"
                          >
                            {{ isRowAllAllowed(row) ? 'Clear Row' : 'Allow Row' }}
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Save Bar -->
              <div class="matrix-save-footer">
                <div class="footer-status-text">
                  <span>Modifications to <strong>{{ selectedRole() }}</strong> will take effect for all users assigned to this role.</span>
                </div>
                <button
                  type="button"
                  class="btn-save-rights"
                  [disabled]="roleRightsSaving()"
                  (click)="saveRoleRights()"
                >
                  @if (roleRightsSaving()) {
                    <span class="spinner-sm"></span> Saving Rights...
                  } @else {
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    <span>Save Rights for {{ selectedRole() }}</span>
                  }
                </button>
              </div>
            }
          }

          @if (roleRightsSubView() === 'users') {
            <!-- User Role Assignments Subview -->
            <div class="user-assignments-wrap">
              <div class="table-responsive">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Registered</th>
                      <th>Status</th>
                      <th>Assigned Role</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (u of userRoleAssignments(); track u.userId) {
                      <tr>
                        <td class="bold">{{ u.fullName }}</td>
                        <td>{{ u.email }}</td>
                        <td>{{ u.createdAtUtc | date:'mediumDate' }}</td>
                        <td>
                          <span class="status-pill" [class.active]="u.isActive">
                            {{ u.isActive ? 'Active' : 'Inactive' }}
                          </span>
                        </td>
                        <td>
                          <select
                            class="form-control select-role-dropdown"
                            [ngModel]="u.role"
                            (ngModelChange)="onUserRoleChange(u, $event)"
                          >
                            @for (r of rolesList(); track r.name) {
                              <option [value]="r.name">{{ r.name }}</option>
                            }
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            class="btn-sm-action"
                            (click)="assignRoleToUser(u.userId, u.role)"
                          >
                            Save Role
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      }

      <!-- TAB 4: Privacy & Danger Zone -->
      @if (activeTab() === 'privacy') {
        <div class="card-section danger-zone-card">
          <h3 class="danger-title">Danger Zone: Account Deletion</h3>
          <p class="danger-desc">
            In compliance with data privacy regulations, you can delete your account at any time.
            This action will soft-delete your user record, revoke all active JWT refresh tokens, and queue your data for permanent purge.
          </p>

          <button
            type="button"
            class="btn-danger"
            (click)="openDeleteModal()"
          >
            Delete My Account Permanently
          </button>
        </div>
      }

      <!-- TAB 5: Admin Console -->
      @if (activeTab() === 'admin' && isAdmin) {
        <div class="card-section">
          <div class="admin-subtabs">
            <button
              type="button"
              class="subtab-btn"
              [class.active]="adminView() === 'users'"
              (click)="setAdminView('users')"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>User Accounts ({{ adminUsers().length }})</span>
            </button>
            <button
              type="button"
              class="subtab-btn"
              [class.active]="adminView() === 'audit'"
              (click)="setAdminView('audit')"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>Audit Logs</span>
            </button>
            <button
              type="button"
              class="subtab-btn"
              [class.active]="adminView() === 'health'"
              (click)="setAdminView('health')"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <span>System Health</span>
            </button>
          </div>

          <!-- Subview 1: Users -->
          @if (adminView() === 'users') {
            <div class="admin-users-toolbar">
              <div class="status-filter-pills">
                <span class="filter-lbl">Status:</span>
                <button
                  type="button"
                  class="pill-btn-sm"
                  [class.active]="adminUserStatusFilter() === 'active'"
                  (click)="adminUserStatusFilter.set('active')">
                  ● Active (Default)
                </button>
                <button
                  type="button"
                  class="pill-btn-sm"
                  [class.active]="adminUserStatusFilter() === 'all'"
                  (click)="adminUserStatusFilter.set('all')">
                  All
                </button>
                <button
                  type="button"
                  class="pill-btn-sm"
                  [class.active]="adminUserStatusFilter() === 'inactive'"
                  (click)="adminUserStatusFilter.set('inactive')">
                  Inactive / Deleted
                </button>
              </div>
            </div>

            <div class="table-responsive">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Full Name</th>
                    <th>Timezone</th>
                    <th>Created Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of filteredAdminUsers(); track u.id) {
                    <tr>
                      <td class="bold">{{ u.email }}</td>
                      <td>{{ u.fullName }}</td>
                      <td>{{ u.timezone }}</td>
                      <td>{{ u.createdAtUtc | date:'mediumDate' }}</td>
                      <td>
                        <span class="status-pill" [class.active]="u.isActive && !u.isDeleted" [class.deleted]="u.isDeleted">
                          {{ u.isDeleted ? 'Deleted' : (u.isActive ? 'Active' : 'Inactive') }}
                        </span>
                      </td>
                    </tr>
                  }
                  @if (filteredAdminUsers().length === 0) {
                    <tr>
                      <td colspan="5" class="table-empty-row">No users found matching status filter.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- Subview 2: Audit Logs -->
          @if (adminView() === 'audit') {
            <div class="audit-filter-row">
              <input
                type="text"
                [(ngModel)]="auditSearch"
                placeholder="Filter by action (e.g. Export, Register, Deletion)..."
                class="form-control filter-input"
                (ngModelChange)="loadAuditLogs()"
              />
            </div>
            <div class="table-responsive">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp (UTC)</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>Details</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  @for (log of auditLogs(); track log.id) {
                    <tr>
                      <td class="nowrap">{{ log.timestampUtc | date:'medium' }}</td>
                      <td><span class="action-tag">{{ log.action }}</span></td>
                      <td>{{ log.userEmail || 'System' }}</td>
                      <td>{{ log.details || '-' }}</td>
                      <td><code>{{ log.ipAddress || 'local' }}</code></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- Subview 3: System Health -->
          @if (adminView() === 'health') {
            @if (systemHealth(); as h) {
              <div class="health-grid">
                <div class="health-card">
                  <span class="health-label">System Status</span>
                  <span class="health-value text-success">{{ h.status }}</span>
                </div>
                <div class="health-card">
                  <span class="health-label">Process Uptime</span>
                  <span class="health-value">{{ h.processUptime }}</span>
                </div>
                <div class="health-card">
                  <span class="health-label">Allocated Memory</span>
                  <span class="health-value">{{ h.memoryAllocatedMb }} MB</span>
                </div>
                <div class="health-card">
                  <span class="health-label">Working Set Memory</span>
                  <span class="health-value">{{ h.workingSetMb }} MB</span>
                </div>
                <div class="health-card">
                  <span class="health-label">Runtime Framework</span>
                  <span class="health-value">{{ h.framework }}</span>
                </div>
                <div class="health-card">
                  <span class="health-label">Database Provider</span>
                  <span class="health-value">{{ h.databaseProvider }}</span>
                </div>
              </div>
            }
          }
        </div>
      }

      <!-- Modal: Create Category -->
      @if (showCategoryModal()) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <h3>Add New Category</h3>
            <form (ngSubmit)="submitCategory()">
              <div class="form-group">
                <label>Category Type</label>
                <select [(ngModel)]="newCatType" name="type" class="form-control">
                  <option [ngValue]="1">Income</option>
                  <option [ngValue]="2">Expense</option>
                </select>
              </div>

              <div class="form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  [(ngModel)]="newCatName"
                  name="name"
                  placeholder="e.g. Freelance, Subscriptions, Fitness"
                  class="form-control"
                  required
                />
              </div>

              <div class="form-group">
                <label>Color</label>
                <input
                  type="color"
                  [(ngModel)]="newCatColor"
                  name="color"
                  class="form-control color-picker"
                />
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="showCategoryModal.set(false)">
                  Cancel
                </button>
                <button type="submit" class="btn-primary" [disabled]="!newCatName.trim()">
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal: Confirm Delete Account -->
      @if (showDeleteModal()) {
        <div class="modal-backdrop">
          <div class="modal-card danger-modal">
            <div class="danger-modal-title">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <h3>Confirm Account Deletion</h3>
            </div>
            <p>
              This is permanent and cannot be undone. To confirm, type <strong>DELETE</strong> below:
            </p>
            <input
              type="text"
              [(ngModel)]="deleteConfirmText"
              placeholder="Type DELETE to confirm"
              class="form-control danger-input"
            />
            <div class="modal-actions">
              <button type="button" class="btn-cancel" (click)="showDeleteModal.set(false)">
                Cancel
              </button>
              <button
                type="button"
                class="btn-danger"
                [disabled]="deleteConfirmText !== 'DELETE'"
                (click)="confirmDeleteAccount()"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Create Custom Role Modal -->
      @if (showCreateRoleModal()) {
        <div class="modal-backdrop" (click)="closeCreateRoleModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3>Create Custom Role</h3>
            <div class="form-group">
              <label>Role Name <span style="color: var(--color-danger)">*</span></label>
              <input
                type="text"
                [(ngModel)]="newRoleName"
                placeholder="e.g. Auditor, BillingStaff, JuniorAccountant"
                class="form-control"
              />
            </div>
            <div class="form-group">
              <label>Description</label>
              <input
                type="text"
                [(ngModel)]="newRoleDescription"
                placeholder="Brief description of this role"
                class="form-control"
              />
            </div>
            <div class="form-group">
              <label>Copy Initial Rights From Template</label>
              <select [(ngModel)]="newRoleCopyFrom" class="form-control">
                <option value="User">User (Standard Personal Access)</option>
                <option value="Viewer">Viewer (Read Only Access)</option>
                <option value="Accountant">Accountant (Ledgers & Reports)</option>
                <option value="Manager">Manager (Operations & Approvals)</option>
                <option value="Admin">Admin (Full Access)</option>
              </select>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-cancel" (click)="closeCreateRoleModal()">
                Cancel
              </button>
              <button
                type="button"
                class="btn-primary"
                [disabled]="!newRoleName.trim()"
                (click)="createCustomRole()"
              >
                Create Role
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .settings-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-bottom: 3rem;
    }

    .page-header {
      h2 {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--color-text-main);
        margin: 0;
      }
      .subtitle {
        font-size: 0.875rem;
        color: var(--color-text-muted);
        margin: 0.25rem 0 0;
      }
    }

    .settings-nav-tabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0.5rem;
      overflow-x: auto;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: transparent;
      border: 1px solid transparent;
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-muted);
      cursor: pointer;
      white-space: nowrap;
      min-height: var(--min-touch-target);

      .tab-svg {
        flex-shrink: 0;
      }

      &:hover {
        background: var(--color-bg-subtle, #f3f4f6);
        color: var(--color-text-main);
      }

      &.active {
        background: var(--color-primary);
        color: #ffffff;
      }

      &.tab-admin {
        border-color: #818cf8;
      }
    }

    .title-with-icon {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--color-primary);

      h3 {
        margin: 0;
        color: var(--color-text-main);
      }
    }

    .alert-box {
      background: #ecfdf5;
      border: 1px solid #10b981;
      color: #065f46;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.875rem;

      &.alert-error {
        background: #fef2f2;
        border-color: #ef4444;
        color: #991b1b;
      }
    }

    .btn-close-alert {
      background: transparent;
      border: none;
      font-size: 1rem;
      cursor: pointer;
      color: inherit;
    }

    .card-section {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);

      h3 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--color-text-main);
      }
    }

    .section-desc {
      font-size: 0.85rem;
      color: var(--color-text-muted);
      margin: 0.25rem 0 1.25rem;
    }

    .form-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 520px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;

      label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--color-text-main);
      }
    }

    .form-control {
      padding: 0.5rem 0.85rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-card);
      color: var(--color-text-main);
      font-size: 0.875rem;
      min-height: var(--min-touch-target);
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;

      &:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
      }

      &:disabled {
        opacity: 0.65;
        background: var(--color-bg-subtle);
        cursor: not-allowed;
      }
    }

    .field-hint {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .theme-toggle-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-subtle);
    }

    .theme-info {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;

      strong {
        font-size: 0.875rem;
        color: var(--color-text-main);
      }
      span {
        font-size: 0.8rem;
        color: var(--color-text-muted);
      }
    }

    .btn-theme-toggle {
      padding: 0.45rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-card);
      color: var(--color-text-main);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      min-height: 40px;
      transition: all 0.15s ease;

      &:hover {
        background: var(--color-bg-subtle);
        border-color: var(--color-text-muted);
      }
    }

    .form-actions {
      margin-top: 0.5rem;
    }

    .btn-primary {
      padding: 0.5rem 1.25rem;
      background: var(--color-primary);
      color: #ffffff;
      border: none;
      border-radius: var(--radius-md);
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      min-height: var(--min-touch-target);
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        background: var(--color-primary-hover);
        box-shadow: 0 4px 6px -1px rgb(79 70 229 / 0.3);
      }

      &:active:not(:disabled) {
        transform: scale(0.98);
      }

      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    }

    /* Category management */
    .card-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .categories-columns {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;

      @media (min-width: 768px) {
        grid-template-columns: 1fr 1fr;
      }
    }

    .category-group-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 1rem;
      background: var(--color-bg-main, #ffffff);

      h4 {
        margin: 0 0 0.75rem;
        font-size: 0.95rem;
        color: var(--color-text-main);
      }
    }

    .categories-flow {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .cat-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      background: var(--color-bg-subtle, #f3f4f6);
      border: 1px solid var(--color-border);
      color: var(--color-text-main);

      .btn-delete-cat {
        background: none;
        border: none;
        color: var(--color-text-muted);
        cursor: pointer;
        font-size: 0.75rem;
        padding: 0 0.2rem;
        margin-left: 0.25rem;
        border-radius: 4px;
        line-height: 1;

        &:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.15);
        }
      }
    }

    .chip-color {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    /* Data Export Grid */
    .export-cards-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;

      @media (min-width: 768px) {
        grid-template-columns: 1fr 1fr;
      }
    }

    .export-option-box {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: var(--color-bg-main, #ffffff);

      .export-icon {
        font-size: 1.75rem;
      }

      h4 {
        margin: 0;
        font-size: 1.05rem;
        color: var(--color-text-main);
      }

      p {
        font-size: 0.85rem;
        color: var(--color-text-muted);
        margin: 0 0 0.75rem;
        flex: 1;
      }
    }

    .btn-outline {
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-primary);
      color: var(--color-primary);
      background: transparent;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      min-height: var(--min-touch-target);

      &:hover:not(:disabled) {
        background: var(--color-primary);
        color: #ffffff;
      }

      &.btn-excel-accent {
        border-color: #10b981;
        color: #047857;

        &:hover:not(:disabled) {
          background: #10b981;
          color: #ffffff;
        }
      }
    }

    /* Danger zone */
    .danger-zone-card {
      border-color: #ef4444;
      background: #fef2f2;
    }

    .danger-title {
      color: #991b1b !important;
    }

    .danger-desc {
      font-size: 0.875rem;
      color: #7f1d1d;
      margin: 0.5rem 0 1.25rem;
      line-height: 1.5;
    }

    .btn-danger {
      padding: 0.6rem 1.25rem;
      background: #dc2626;
      color: #ffffff;
      border: none;
      border-radius: var(--radius-sm);
      font-weight: 600;
      cursor: pointer;
      min-height: var(--min-touch-target);

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:hover:not(:disabled) {
        background: #b91c1c;
      }
    }

    /* Admin Subtabs & Table */
    .admin-subtabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0.5rem;
    }

    .subtab-btn {
      padding: 0.35rem 0.85rem;
      border: 1px solid var(--color-border);
      background: var(--color-bg-subtle, #f3f4f6);
      color: var(--color-text-main);
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;

      &.active {
        background: #4f46e5;
        color: #ffffff;
        border-color: #4f46e5;
      }
    }

    .admin-users-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.85rem;

      .status-filter-pills {
        display: flex;
        align-items: center;
        gap: 0.35rem;

        .filter-lbl {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-text-muted);
          text-transform: uppercase;
          margin-right: 0.25rem;
        }

        .pill-btn-sm {
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          border: 1px solid var(--color-border);
          background: var(--color-bg-subtle);
          color: var(--color-text-muted);
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            color: var(--color-text-main);
          }

          &.active {
            background: #10b981;
            border-color: #10b981;
            color: #ffffff;
          }
        }
      }
    }

    .table-responsive {
      overflow-x: auto;
    }

    .admin-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;

      th {
        text-align: left;
        padding: 0.5rem 0.75rem;
        border-bottom: 2px solid var(--color-border);
        color: var(--color-text-muted);
        text-transform: uppercase;
        font-size: 0.75rem;
      }

      td {
        padding: 0.65rem 0.75rem;
        border-bottom: 1px solid var(--color-border);
      }

      .bold {
        font-weight: 600;
      }
      .nowrap {
        white-space: nowrap;
      }
    }

    .status-pill {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;

      &.active {
        background: #dcfce7;
        color: #166534;
      }
      &.deleted {
        background: #fee2e2;
        color: #991b1b;
      }
    }

    .action-tag {
      background: var(--color-bg-subtle, #f3f4f6);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
    }

    .filter-input {
      max-width: 360px;
      margin-bottom: 1rem;
    }

    .health-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;

      @media (min-width: 768px) {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .health-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 1rem;
      background: var(--color-bg-main, #ffffff);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      .health-label {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }

      .health-value {
        font-size: 1.1rem;
        font-weight: 700;
      }

      .text-success {
        color: #10b981;
      }
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 1rem;
    }

    .modal-card {
      background: var(--color-bg-card);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      width: 100%;
      max-width: 440px;
      box-shadow: var(--shadow-lg);

      h3 {
        margin: 0 0 1rem;
        font-size: 1.2rem;
        color: var(--color-text-main);
      }
    }

    .color-picker {
      height: 44px;
      padding: 4px;
      cursor: pointer;
    }

    .danger-modal {
      border: 2px solid #ef4444;
    }

    .danger-input {
      margin: 1rem 0;
      border-color: #ef4444;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }

    .btn-cancel {
      padding: 0.5rem 1rem;
      background: var(--color-bg-subtle, #f3f4f6);
      color: var(--color-text-main);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-weight: 600;
    }

    /* Appearance & Studio Styles */
    .studio-block {
      margin-bottom: 24px;
    }

    .studio-subheading {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }

    .studio-card-section {
      position: relative;
    }

    .studio-badge-pill {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border-radius: 9999px;
      background: var(--color-accent-subtle);
      color: var(--color-accent-fg);
      border: 1px solid var(--color-border);
      vertical-align: middle;
    }

    /* Live Interactive Theme Showcase */
    .live-theme-showcase {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-canvas-subtle);
      padding: 16px 20px;
      margin-bottom: 24px;
      box-shadow: var(--shadow-sm);
    }

    .showcase-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--color-border-subtle);
      margin-bottom: 16px;
    }

    .showcase-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;

      .showcase-indicator-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
        animation: pulseDot 2s infinite ease-in-out;
      }

      .showcase-label {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--color-text-muted);
      }
    }

    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.2); }
    }

    .showcase-theme-badge {
      display: flex;
      align-items: center;
      gap: 8px;

      .theme-mode-tag {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 9999px;
        background: #fef3c7;
        color: #92400e;

        &.dark-tag {
          background: #1e293b;
          color: #93c5fd;
        }
      }

      .theme-name-tag {
        font-size: 13px;
        font-weight: 700;
        color: var(--color-text-main);
      }
    }

    .showcase-content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
    }

    .showcase-card-preview {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .mini-label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--color-text-muted);
      }
    }

    .mini-balances {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .mini-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 10px;
        border-radius: var(--radius-sm);
        font-size: 12px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;

        &.income {
          background: var(--color-income-bg);
          color: var(--color-income);
          border: 1px solid var(--color-income-border);
        }

        &.expense {
          background: var(--color-expense-bg);
          color: var(--color-expense);
          border: 1px solid var(--color-expense-border);
        }

        &.net {
          background: var(--color-bg-card);
          color: var(--color-text-main);
          border: 1px solid var(--color-border);
        }

        .arrow {
          font-weight: 900;
        }
      }
    }

    .mini-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .mini-btn-primary {
        padding: 6px 14px;
        border-radius: var(--radius-sm);
        font-size: 12px;
        font-weight: 600;
        background: var(--color-primary);
        color: var(--color-primary-contrast);
        border: 1px solid var(--color-primary);
        cursor: pointer;
        transition: opacity 0.15s ease;

        &:hover {
          opacity: 0.9;
        }
      }

      .mini-btn-secondary {
        padding: 6px 14px;
        border-radius: var(--radius-sm);
        font-size: 12px;
        font-weight: 600;
        background: var(--color-canvas-subtle);
        color: var(--color-text-main);
        border: 1px solid var(--color-border);
        cursor: pointer;

        &:hover {
          background: var(--color-bg-hover);
        }
      }

      .mini-btn-danger {
        padding: 6px 14px;
        border-radius: var(--radius-sm);
        font-size: 12px;
        font-weight: 600;
        background: var(--color-btn-danger-bg);
        color: var(--color-btn-danger-text);
        border: 1px solid var(--color-btn-danger-border);
        cursor: pointer;

        &:hover {
          background: var(--color-btn-danger-hover-bg);
          color: var(--color-btn-danger-hover-text);
        }
      }
    }

    .spectrum-swatches {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .spectrum-chip {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px 8px;
        border-radius: var(--radius-xs);
        border: 1px solid rgba(0, 0, 0, 0.15);
        min-width: 65px;
        height: 28px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

        .chip-hex {
          font-size: 10px;
          font-weight: 700;
          font-family: var(--font-family-mono);
          text-shadow: 0 0 3px rgba(0, 0, 0, 0.6), 0 0 2px rgba(255, 255, 255, 0.6);
          color: #ffffff;
        }
      }
    }

    /* Studio Headers and Filter Controls */
    .studio-header-with-filter {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 14px;

      .studio-subheading {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text-main);
      }

      .studio-subdesc {
        margin: 2px 0 0;
        font-size: 12px;
        color: var(--color-text-muted);
      }
    }

    .theme-filter-pills {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--color-canvas-subtle);
      padding: 3px;
      border-radius: 9999px;
      border: 1px solid var(--color-border);

      .theme-filter-btn {
        padding: 4px 12px;
        border-radius: 9999px;
        border: none;
        background: transparent;
        color: var(--color-text-muted);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          color: var(--color-text-main);
        }

        &.active {
          background: var(--color-primary);
          color: var(--color-primary-contrast);
          box-shadow: var(--shadow-sm);
        }
      }
    }

    /* Theme Picker Cards */
    .theme-picker-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 14px;
    }

    .theme-select-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 16px;
      background: var(--color-canvas-subtle);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 140px;
      transition: all 0.15s ease;

      &:hover {
        border-color: var(--color-accent-fg);
        transform: translateY(-1px);
        box-shadow: var(--shadow-sm);
      }

      &.active {
        border-color: var(--color-primary);
        background: var(--color-bg-card);
        box-shadow: 0 0 0 2px var(--color-primary);
      }

      .theme-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;

        .theme-category-pill {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 9999px;
          background: #fef3c7;
          color: #92400e;

          &.dark {
            background: #1e293b;
            color: #93c5fd;
          }
        }
      }

      .theme-swatch-bar {
        display: flex;
        gap: 6px;

        .swatch-circle {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 1px solid rgba(0, 0, 0, 0.15);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        }
      }

      .theme-meta {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;

        .theme-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text-main);
        }

        .theme-desc {
          font-size: 12px;
          color: var(--color-text-muted);
          line-height: 1.4;
          margin: 0;
        }
      }

      .theme-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: auto;
        padding-top: 6px;
      }
    }

    .active-tag-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 700;
      color: var(--color-primary);
      background: var(--color-primary-light);
      padding: 3px 10px;
      border-radius: 9999px;
    }

    .select-hint-text {
      font-size: 11px;
      color: var(--color-text-subtle);
    }

    /* Font Stack Cards */
    .font-picker-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
    }

    .font-select-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 16px;
      background: var(--color-canvas-subtle);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: all 0.15s ease;

      &:hover {
        border-color: var(--color-accent-fg);
      }

      &.active {
        border-color: var(--color-primary);
        background: var(--color-bg-card);
        box-shadow: 0 0 0 2px var(--color-primary);
      }

      .font-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;

        .font-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text-main);
        }
      }

      .font-desc {
        font-size: 12px;
        color: var(--color-text-muted);
        line-height: 1.4;
        margin: 0;
      }

      .font-sample-box {
        background: var(--color-canvas-default);
        border: 1px solid var(--color-border-subtle);
        border-radius: var(--radius-sm);
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .sample-amount {
          font-size: 15px;
          font-weight: 700;
          color: var(--color-primary);
        }

        .sample-sub {
          font-size: 11px;
          color: var(--color-text-muted);
        }
      }
    }

    /* Corner Radius Selector Cards */
    .radius-picker-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 14px;
    }

    .radius-select-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 16px;
      background: var(--color-canvas-subtle);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      transition: all 0.15s ease;

      &:hover {
        border-color: var(--color-accent-fg);
      }

      &.active {
        border-color: var(--color-primary);
        background: var(--color-bg-card);
        box-shadow: 0 0 0 2px var(--color-primary);
      }

      .radius-visual-box {
        width: 100%;
        height: 48px;
        background: var(--color-primary-light);
        border: 2px solid var(--color-primary);
        display: flex;
        align-items: center;
        justify-content: center;

        .radius-value-tag {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-primary);
        }
      }

      .radius-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;

        .radius-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text-main);
        }

        .radius-desc {
          font-size: 11px;
          color: var(--color-text-muted);
        }
      }
    }

    /* Icon Packs & Sidebar Position Vertical Card Architecture (No Squishing!) */
    .icon-picker-grid,
    .sidebar-picker-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 14px;
    }

    .icon-select-card,
    .sidebar-select-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 16px;
      background: var(--color-canvas-subtle);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 140px;
      transition: all 0.15s ease;

      &:hover {
        border-color: var(--color-accent-fg);
        transform: translateY(-1px);
        box-shadow: var(--shadow-sm);
      }

      &.active {
        border-color: var(--color-primary);
        background: var(--color-bg-card);
        box-shadow: 0 0 0 2px var(--color-primary);
      }

      .icon-card-header,
      .sidebar-card-header {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .icon-preview-tag,
      .pos-badge {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-sm);
        background: var(--color-bg-card);
        border: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-primary);
        flex-shrink: 0;
      }

      .icon-title-wrap,
      .sidebar-title-wrap {
        display: flex;
        flex-direction: column;
        gap: 3px;

        .icon-title,
        .pos-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text-main);
        }
      }

      .icon-desc-wrap,
      .pos-desc-wrap {
        width: 100%;

        .icon-desc,
        .pos-desc {
          font-size: 12px;
          color: var(--color-text-muted);
          line-height: 1.45;
          margin: 0;
          word-break: normal;
        }
      }

      .icon-card-footer,
      .sidebar-card-footer {
        margin-top: auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 6px;
      }
    }

    /* Currency Cards */
    .currency-picker-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    .currency-select-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 14px;
      background: var(--color-canvas-subtle);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.15s ease;

      &:hover {
        border-color: var(--color-accent-fg);
      }

      &.active {
        border-color: var(--color-primary);
        background: var(--color-bg-card);
        box-shadow: 0 0 0 2px var(--color-primary);
      }

      .curr-symbol-box {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--color-primary-light);
        color: var(--color-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: 800;
        flex-shrink: 0;
      }

      .curr-meta {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;

        .curr-code {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text-main);
        }

        .curr-name {
          font-size: 11px;
          color: var(--color-text-muted);
        }
      }
    }

    /* Sensory Audio Soundboard & Explicit Flag Controls */
    .audio-panel-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .audio-header-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .audio-live-flag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      transition: all 0.2s ease;

      .status-pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
      }

      &.flag-on {
        background: rgba(16, 185, 129, 0.15);
        color: #059669;
        border: 1px solid rgba(16, 185, 129, 0.35);

        .status-pulse-dot {
          background: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
          animation: audioFlagPulse 2s infinite ease-in-out;
        }
      }

      &.flag-off {
        background: rgba(100, 116, 139, 0.12);
        color: var(--color-text-muted);
        border: 1px solid var(--color-border);

        .status-pulse-dot {
          background: #94a3b8;
        }
      }
    }

    @keyframes audioFlagPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.25); opacity: 0.75; }
    }

    .audio-flag-switch-group {
      display: inline-flex;
      align-items: center;
      background: var(--color-canvas-subtle);
      border: 1px solid var(--color-border);
      border-radius: 9999px;
      padding: 3px;
      gap: 3px;
      box-shadow: var(--shadow-sm);

      .audio-flag-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 16px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        border: none;
        background: transparent;
        color: var(--color-text-muted);
        transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);

        .flag-icon {
          font-size: 13px;
        }

        &:hover {
          color: var(--color-text-main);
        }

        &.btn-flag-on.active {
          background: #10b981;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.35);
        }

        &.btn-flag-off.active {
          background: #64748b;
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(100, 116, 139, 0.3);
        }
      }
    }

    .audio-status-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      margin: 12px 0 16px 0;
      border: 1px solid transparent;
      font-size: 12px;
      transition: all 0.2s ease;
      flex-wrap: wrap;

      &.banner-active {
        background: rgba(16, 185, 129, 0.08);
        border-color: rgba(16, 185, 129, 0.25);
        color: var(--color-text-main);

        .banner-icon {
          color: #10b981;
        }
      }

      &.banner-muted {
        background: var(--color-canvas-subtle);
        border-color: var(--color-border);
        color: var(--color-text-muted);

        .banner-icon {
          color: #94a3b8;
        }
      }

      .status-banner-content {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;

        .banner-icon {
          font-size: 16px;
        }

        .banner-text {
          strong {
            color: var(--color-text-main);
          }
        }
      }

      .btn-banner-quick-toggle {
        padding: 5px 12px;
        font-size: 11px;
        font-weight: 600;
        border-radius: var(--radius-xs);
        border: 1px solid var(--color-border);
        background: var(--color-bg-card);
        color: var(--color-text-main);
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          border-color: var(--color-accent-fg);
          background: var(--color-canvas-subtle);
        }
      }
    }

    .soundboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 14px;
      margin-top: 10px;
    }

    .sound-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 14px;
      background: var(--color-canvas-subtle);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: all 0.15s ease;

      &:hover {
        border-color: var(--color-accent-fg);
        transform: translateY(-1px);
        box-shadow: var(--shadow-sm);
      }

      .sound-icon-box {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;

        &.click { background: rgba(11, 87, 208, 0.12); }
        &.success { background: rgba(16, 185, 129, 0.15); }
        &.delete { background: rgba(239, 68, 68, 0.12); }
        &.nav { background: rgba(99, 102, 241, 0.12); }
      }

      .sound-info {
        display: flex;
        flex-direction: column;
        gap: 2px;

        strong {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text-main);
        }

        span {
          font-size: 11px;
          color: var(--color-text-muted);
        }
      }

      .btn-sound-play {
        margin-top: auto;
        padding: 6px 12px;
        border-radius: var(--radius-xs);
        border: 1px solid var(--color-border);
        background: var(--color-bg-card);
        color: var(--color-text-main);
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          background: var(--color-primary);
          color: var(--color-primary-contrast);
          border-color: var(--color-primary);
        }
      }
    }

    /* Workflow & Density Settings Switch Cards */
    .settings-switch-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;

      @media (min-width: 768px) {
        grid-template-columns: 1fr 1fr;
      }
    }

    .setting-switch-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 14px;
      background: var(--color-canvas-subtle);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      transition: all 0.12s ease;

      &:hover {
        border-color: var(--color-accent-fg);
      }

      .switch-content {
        strong {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text-main);
        }
        p {
          font-size: 12px;
          color: var(--color-text-muted);
          margin: 2px 0 0;
        }
      }

      .toggle-pill {
        padding: 4px 12px;
        border-radius: 9999px;
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

    .danger-modal-title {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.75rem;

      h3 {
        margin: 0;
        color: #991b1b;
      }
    }

    .export-icon-box {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: var(--color-bg-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-muted);
      margin-bottom: 0.25rem;

      &.text-excel {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
      }
    }

    .btn-recycle-link {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.85rem;
      border-radius: 8px;
      font-size: 0.8125rem;
      font-weight: 600;
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;
      border: 1px solid rgba(239, 68, 68, 0.25);
      text-decoration: none;
      transition: all 0.2s ease;

      &:hover {
        background: #dc2626;
        color: #fff;
      }
    }

    .info-alert-box {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-radius: 10px;
      background: rgba(79, 70, 229, 0.08);
      border: 1px solid rgba(79, 70, 229, 0.2);
      color: var(--color-text-main);
      margin-bottom: 1.25rem;

      svg {
        flex-shrink: 0;
        margin-top: 0.15rem;
        color: #4f46e5;
      }

      strong {
        display: block;
        font-size: 0.875rem;
        font-weight: 700;
        color: #4f46e5;
        margin-bottom: 0.25rem;
      }

      p {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--color-text-muted);
        line-height: 1.45;
      }
    }

    .perm-quick-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;

      .btn-sm-action {
        padding: 0.4rem 0.8rem;
        border-radius: 6px;
        font-size: 0.8125rem;
        font-weight: 600;
        background: var(--color-bg-base);
        border: 1px solid var(--color-border);
        color: var(--color-text-main);
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }
      }
    }

    .modules-perm-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1rem;
    }

    .perm-module-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-radius: 12px;
      background: var(--color-bg-base);
      border: 1px solid var(--color-border);
      transition: all 0.2s ease;

      &.allowed {
        border-left: 4px solid #10b981;
      }

      &.blocked {
        border-left: 4px solid #ef4444;
      }

      .perm-card-content {
        display: flex;
        align-items: flex-start;
        gap: 0.875rem;
        flex: 1;

        .module-icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          &.icon-tx { background: rgba(16, 185, 129, 0.15); color: #10b981; }
          &.icon-cat { background: rgba(236, 72, 153, 0.15); color: #ec4899; }
          &.icon-loans { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
          &.icon-epfo { background: rgba(37, 99, 235, 0.15); color: #2563eb; }
          &.icon-inv { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
          &.icon-biz { background: rgba(79, 70, 229, 0.15); color: #4f46e5; }
        }

        .perm-meta {
          flex: 1;

          .perm-title-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.25rem;

            h4 {
              margin: 0;
              font-size: 0.9375rem;
              font-weight: 700;
              color: var(--color-text-main);
            }

            .perm-status-badge {
              font-size: 0.65rem;
              font-weight: 800;
              padding: 0.15rem 0.45rem;
              border-radius: 4px;
              background: rgba(239, 68, 68, 0.15);
              color: #dc2626;

              &.on {
                background: rgba(16, 185, 129, 0.15);
                color: #059669;
              }
            }
          }

          p {
            margin: 0;
            font-size: 0.775rem;
            color: var(--color-text-muted);
            line-height: 1.4;
          }
        }
      }
    }

    /* =========================================================
       ROLE & RIGHTS MANAGEMENT STYLES
       ========================================================= */
    .role-rights-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .title-svg-primary {
      color: var(--color-primary);
    }

    .btn-create-role {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.85rem;
      background: var(--color-primary);
      color: #fff;
      font-size: 0.825rem;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: opacity 0.15s ease;

      &:hover {
        opacity: 0.9;
      }
    }

    .role-subtabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0.5rem;
    }

    .role-selector-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      background: var(--color-surface, rgba(0, 0, 0, 0.02));
      padding: 0.75rem 1rem;
      border-radius: 10px;
      border: 1px solid var(--color-border);

      .role-sel-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--color-text-muted);
      }

      .role-pills-list {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
    }

    .role-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.85rem;
      border: 1px solid var(--color-border);
      background: var(--color-bg-card);
      border-radius: 20px;
      cursor: pointer;
      font-size: 0.825rem;
      color: var(--color-text-main);
      transition: all 0.15s ease;

      .role-badge-count {
        font-size: 0.7rem;
        padding: 0.1rem 0.45rem;
        background: var(--color-border);
        border-radius: 10px;
        color: var(--color-text-muted);
      }

      .btn-delete-role-icon {
        font-size: 0.75rem;
        padding: 0 0.2rem;
        color: var(--color-danger);
        &:hover {
          font-weight: bold;
        }
      }

      &.active {
        background: var(--color-primary);
        color: #fff;
        border-color: var(--color-primary);

        .role-badge-count {
          background: rgba(255, 255, 255, 0.25);
          color: #fff;
        }

        .btn-delete-role-icon {
          color: #fee2e2;
        }
      }
    }

    .active-role-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: var(--color-surface, rgba(0, 0, 0, 0.02));
      border: 1px solid var(--color-border);
      border-radius: 10px;

      .active-role-info {
        .role-title-line {
          display: flex;
          align-items: center;
          gap: 0.5rem;

          h4 {
            margin: 0;
            font-size: 1rem;
            color: var(--color-text-main);
          }

          .highlight-role {
            color: var(--color-primary);
            font-weight: 700;
          }

          .system-role-badge {
            font-size: 0.7rem;
            padding: 0.15rem 0.5rem;
            background: rgba(14, 165, 233, 0.15);
            color: #0284c7;
            border-radius: 4px;
            font-weight: 600;
          }
        }

        .role-desc-text {
          margin: 0.25rem 0 0;
          font-size: 0.8rem;
          color: var(--color-text-muted);
        }
      }

      .matrix-presets-actions {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        flex-wrap: wrap;

        .preset-label {
          font-size: 0.775rem;
          color: var(--color-text-muted);
          font-weight: 600;
          margin-right: 0.25rem;
        }

        .btn-preset {
          padding: 0.35rem 0.65rem;
          font-size: 0.75rem;
          border: 1px solid var(--color-border);
          background: var(--color-bg-card);
          color: var(--color-text-main);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            border-color: var(--color-primary);
            color: var(--color-primary);
          }
        }
      }
    }

    .matrix-table-wrapper {
      border: 1px solid var(--color-border);
      border-radius: 10px;
      overflow: hidden;
    }

    .rights-matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;

      th {
        background: var(--color-surface, rgba(0, 0, 0, 0.02));
        padding: 0.85rem 1rem;
        font-weight: 600;
        color: var(--color-text-muted);
        border-bottom: 1px solid var(--color-border);
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.02em;

        &.text-center {
          text-align: center;
        }
      }

      td {
        padding: 0.85rem 1rem;
        border-bottom: 1px solid var(--color-border);
        color: var(--color-text-main);
        vertical-align: middle;

        &.text-center {
          text-align: center;
        }
      }

      tr:last-child td {
        border-bottom: none;
      }

      tr:hover td {
        background: rgba(0, 0, 0, 0.015);
      }

      .module-title-wrap {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;

        .module-name-row {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        .module-icon-pill {
          font-size: 1rem;
          line-height: 1;
        }

        .module-name {
          font-weight: 600;
          color: var(--color-text-main);
        }

        .badge-mini-ai {
          font-size: 0.62rem;
          font-weight: 700;
          color: #8b5cf6;
          background: rgba(139, 92, 246, 0.12);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 4px;
          padding: 1px 5px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .badge-mini-market {
          font-size: 0.62rem;
          font-weight: 700;
          color: #059669;
          background: rgba(5, 150, 105, 0.12);
          border: 1px solid rgba(5, 150, 105, 0.25);
          border-radius: 4px;
          padding: 1px 5px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .module-hint {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
      }

      .btn-row-toggle {
        padding: 0.3rem 0.6rem;
        font-size: 0.75rem;
        border: 1px solid var(--color-border);
        background: transparent;
        color: var(--color-text-muted);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          color: var(--color-text-main);
          border-color: var(--color-text-muted);
        }
      }
    }

    /* Custom Toggle Switch */
    .custom-toggle {
      position: relative;
      display: inline-block;
      width: 38px;
      height: 22px;
      cursor: pointer;

      input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .toggle-slider {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--color-border, #cbd5e1);
        transition: 0.2s ease;
        border-radius: 22px;

        &:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.2s ease;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
      }

      input:checked + .toggle-slider {
        background-color: var(--color-success, #10b981);
      }

      &.danger-slider input:checked + .toggle-slider {
        background-color: var(--color-danger, #ef4444);
      }

      input:checked + .toggle-slider:before {
        transform: translateX(16px);
      }

      &.toggle-disabled,
      input:disabled + .toggle-slider {
        opacity: 0.35;
        cursor: not-allowed;
      }
    }

    .matrix-save-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1rem 0;

      .footer-status-text {
        font-size: 0.8rem;
        color: var(--color-text-muted);
      }

      .btn-save-rights {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.65rem 1.4rem;
        background: var(--color-primary);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s ease;

        &:hover:not(:disabled) {
          opacity: 0.9;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }
    }

    .select-role-dropdown {
      padding: 0.35rem 0.65rem;
      font-size: 0.825rem;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-bg-card);
      color: var(--color-text-main);
      max-width: 160px;
    }
  `]
})
export class SettingsComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly transactionsService = inject(TransactionsService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  readonly themeService = inject(ThemeService);
  readonly authService = inject(AuthService);
  public readonly deletionPermissionsService = inject(DeletionPermissionsService);
  public readonly deletionPerms = this.deletionPermissionsService.permissions;
  public readonly roleRightsService = inject(RoleRightsService);

  readonly activeTab = signal<'preferences' | 'appearance' | 'categories' | 'export' | 'deletion-rights' | 'role-rights' | 'privacy' | 'admin'>('preferences');
  readonly profile = signal<UserProfile | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly saving = signal<boolean>(false);
  readonly exporting = signal<string | null>(null);
  readonly alertMessage = signal<string | null>(null);
  readonly isAlertError = signal<boolean>(false);

  // Role & Rights signals
  readonly roleRightsSubView = signal<'matrix' | 'users'>('matrix');
  readonly rolesList = signal<RoleSummary[]>([]);
  readonly selectedRole = signal<string>('Admin');
  readonly roleRightsMatrix = signal<ModuleRight[]>([]);
  readonly roleRightsLoading = signal<boolean>(false);
  readonly roleRightsSaving = signal<boolean>(false);
  readonly userRoleAssignments = signal<UserRoleAssignment[]>([]);
  readonly userRolesLoading = signal<boolean>(false);
  readonly showCreateRoleModal = signal<boolean>(false);
  newRoleName = '';
  newRoleDescription = '';
  newRoleCopyFrom = 'User';

  // Theme category filter & computed helpers
  readonly themeCategoryFilter = signal<'all' | 'light' | 'dark'>('all');
  readonly filteredThemes = computed(() => {
    const filter = this.themeCategoryFilter();
    if (filter === 'all') return this.themeService.availableThemes;
    return this.themeService.availableThemes.filter(t => t.category === filter);
  });
  readonly activeThemeDef = computed(() => {
    const curr = this.themeService.currentTheme();
    return this.themeService.availableThemes.find(t => t.id === curr) || this.themeService.availableThemes[0];
  });

  testSound(type: 'click' | 'success' | 'delete' | 'nav'): void {
    this.themeService.previewSound(type);
  }

  // Preference form model
  prefForm = {
    fullName: '',
    timezone: 'Asia/Kolkata',
    locale: 'en-IN'
  };

  // Category Modal state
  readonly showCategoryModal = signal<boolean>(false);
  newCatType: TransactionType = 2; // Expense by default
  newCatName = '';
  newCatColor = '#ef4444';

  // Danger zone modal
  readonly showDeleteModal = signal<boolean>(false);
  deleteConfirmText = '';

  // Admin section
  readonly adminView = signal<'users' | 'audit' | 'health'>('users');
  readonly adminUsers = signal<AdminUser[]>([]);
  readonly adminUserStatusFilter = signal<'active' | 'all' | 'inactive'>('active');
  readonly filteredAdminUsers = computed(() => {
    const list = this.adminUsers();
    const filter = this.adminUserStatusFilter();
    if (filter === 'active') {
      return list.filter(u => u.isActive && !u.isDeleted);
    } else if (filter === 'inactive') {
      return list.filter(u => !u.isActive || u.isDeleted);
    }
    return list;
  });
  readonly auditLogs = signal<AuditLogItem[]>([]);
  readonly systemHealth = signal<SystemHealth | null>(null);
  auditSearch = '';

  get isAdmin(): boolean {
    const u = this.authService.currentUser();
    return u?.role === 'Admin';
  }

  expenseCategories = () => this.categories().filter(c => c.type === 2);
  incomeCategories = () => this.categories().filter(c => c.type === 1);

  ngOnInit(): void {
    this.loadPreferences();
    this.loadCategories();
    this.deletionPermissionsService.fetchPermissions().subscribe({
      error: (e) => console.warn('Could not fetch deletion permissions on settings init:', e)
    });
  }

  setTab(tab: 'preferences' | 'appearance' | 'categories' | 'export' | 'deletion-rights' | 'role-rights' | 'privacy' | 'admin'): void {
    this.activeTab.set(tab);
    if (tab === 'admin') {
      this.loadAdminData();
    }
    if (tab === 'role-rights') {
      this.loadRoleRightsData();
    }
    if (tab === 'deletion-rights') {
      this.deletionPermissionsService.fetchPermissions().subscribe({
        error: (e) => console.warn('Could not refresh deletion permissions on tab open:', e)
      });
    }
  }

  togglePermission(module: keyof DeletionPermissions): void {
    const current = this.deletionPerms();
    const updatedVal = !current[module];
    const payload = { [module]: updatedVal };
    this.deletionPermissionsService.updatePermissions(payload).subscribe({
      next: () => {
        this.themeService.playClickSound();
        this.alertMessage.set(`Deletion for ${module.toUpperCase()} is now ${updatedVal ? 'ON (Allowed)' : 'OFF (Blocked)'} and saved to database.`);
        this.isAlertError.set(false);
      },
      error: () => {
        this.alertMessage.set('Failed to update deletion permission on server.');
        this.isAlertError.set(true);
      }
    });
  }

  setAllPermissions(allow: boolean): void {
    const payload: DeletionPermissions = {
      transactions: allow,
      categories: allow,
      loans: allow,
      epfo: allow,
      investments: allow,
      business: allow,
      goals: allow
    };
    this.deletionPermissionsService.updatePermissions(payload).subscribe({
      next: () => {
        this.themeService.playClickSound();
        this.alertMessage.set(`All modules deletion permissions saved in database as ${allow ? 'ALLOWED (ON)' : 'LOCKED (OFF)'}.`);
        this.isAlertError.set(false);
      },
      error: () => {
        this.alertMessage.set('Failed to update deletion permissions.');
        this.isAlertError.set(true);
      }
    });
  }

  reloadDeletionPermissions(): void {
    this.deletionPermissionsService.fetchPermissions().subscribe({
      next: () => {
        this.themeService.playClickSound();
        this.alertMessage.set('Deletion controls successfully re-synchronized from database.');
        this.isAlertError.set(false);
      },
      error: () => {
        this.alertMessage.set('Failed to re-sync deletion permissions from server.');
        this.isAlertError.set(true);
      }
    });
  }

  loadPreferences(): void {
    this.settingsService.getPreferences().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.prefForm.fullName = data.fullName;
        this.prefForm.timezone = data.timezone;
        this.prefForm.locale = data.locale;
      },
      error: () => {
        // Fallback to authService currentUser if endpoint fails
        const u = this.authService.currentUser();
        if (u) {
          this.prefForm.fullName = u.fullName;
        }
      }
    });
  }

  loadCategories(): void {
    this.transactionsService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats)
    });
  }

  deleteCategory(cat: Category): void {
    if (!this.deletionPermissionsService.canDelete('categories')) {
      this.alertMessage.set('Deletion is disabled for Categories in Settings. Please turn it ON in Deletion Controls.');
      this.isAlertError.set(true);
      return;
    }
    if (confirm(`Move category "${cat.name}" to Recycle Bin?`)) {
      this.http.delete(`/api/v1/categories/${cat.id}`).subscribe({
        next: () => {
          this.themeService.playDeleteSound();
          this.alertMessage.set(`Category "${cat.name}" moved to Recycle Bin.`);
          this.isAlertError.set(false);
          this.loadCategories();
        },
        error: (err: any) => {
          const msg = err?.error?.message || err?.error?.error || 'Failed to delete category.';
          this.alertMessage.set(msg);
          this.isAlertError.set(true);
        }
      });
    }
  }

  savePreferences(): void {
    this.saving.set(true);
    this.settingsService.updatePreferences(this.prefForm).subscribe({
      next: (res) => {
        this.themeService.playSuccessSound();
        this.profile.set(res);
        this.saving.set(false);
        this.showAlert('Preferences saved successfully.');
      },
      error: (err) => {
        this.saving.set(false);
        this.showAlert(err?.error?.detail || 'Failed to save preferences.', true);
      }
    });
  }

  openCategoryModal(): void {
    this.newCatName = '';
    this.newCatColor = this.newCatType === 1 ? '#10b981' : '#ef4444';
    this.showCategoryModal.set(true);
  }

  submitCategory(): void {
    if (!this.newCatName.trim()) return;

    this.transactionsService.createCategory({
      name: this.newCatName.trim(),
      type: this.newCatType,
      color: this.newCatColor,
      icon: 'tag'
    }).subscribe({
      next: (created) => {
        this.themeService.playSuccessSound();
        this.categories.update(list => [...list, created]);
        this.showCategoryModal.set(false);
        this.showAlert(`Category '${created.name}' created successfully.`);
      },
      error: (err) => {
        this.showAlert(err?.error?.detail || 'Failed to create category.', true);
      }
    });
  }

  downloadJsonBackup(): void {
    this.exporting.set('json');
    this.settingsService.exportJson().subscribe({
      next: (blob) => {
        this.themeService.playSuccessSound();
        const fileName = `Hisaab_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        this.settingsService.downloadBlob(blob, fileName);
        this.exporting.set(null);
        this.showAlert(`JSON backup downloaded successfully.`);
      },
      error: () => {
        this.exporting.set(null);
        this.showAlert('Failed to export JSON archive.', true);
      }
    });
  }

  downloadExcelBackup(): void {
    this.exporting.set('excel');
    this.settingsService.exportExcel().subscribe({
      next: (blob) => {
        this.themeService.playSuccessSound();
        const fileName = `Hisaab_Master_Data_${new Date().toISOString().slice(0, 10)}.xlsx`;
        this.settingsService.downloadBlob(blob, fileName);
        this.exporting.set(null);
        this.showAlert(`Master Excel workbook downloaded successfully.`);
      },
      error: () => {
        this.exporting.set(null);
        this.showAlert('Failed to export Excel workbook.', true);
      }
    });
  }

  openDeleteModal(): void {
    this.deleteConfirmText = '';
    this.showDeleteModal.set(true);
  }

  confirmDeleteAccount(): void {
    if (this.deleteConfirmText !== 'DELETE') return;

    this.settingsService.deleteAccount().subscribe({
      next: () => {
        this.showDeleteModal.set(false);
        this.authService.logout();
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.showAlert('Failed to delete account. Please try again.', true);
      }
    });
  }

  // Admin Methods
  setAdminView(view: 'users' | 'audit' | 'health'): void {
    this.adminView.set(view);
    if (view === 'users') this.loadAdminUsers();
    else if (view === 'audit') this.loadAuditLogs();
    else if (view === 'health') this.loadSystemHealth();
  }

  loadAdminData(): void {
    this.loadAdminUsers();
    this.loadAuditLogs();
    this.loadSystemHealth();
  }

  loadAdminUsers(): void {
    this.settingsService.getAdminUsers().subscribe({
      next: (users) => this.adminUsers.set(users)
    });
  }

  loadAuditLogs(): void {
    this.settingsService.getAuditLogs(this.auditSearch).subscribe({
      next: (res) => this.auditLogs.set(res.items)
    });
  }

  loadSystemHealth(): void {
    this.settingsService.getSystemHealth().subscribe({
      next: (h) => this.systemHealth.set(h)
    });
  }

  // ==========================================
  // Role & Rights Management Methods
  // ==========================================
  loadRoleRightsData(): void {
    this.roleRightsLoading.set(true);
    this.roleRightsService.getRoles().subscribe({
      next: (roles) => {
        this.rolesList.set(roles);
        if (roles.length > 0 && !roles.some(r => r.name.toLowerCase() === this.selectedRole().toLowerCase())) {
          this.selectedRole.set(roles[0].name);
        }
        this.loadSelectedRoleRights();
      },
      error: () => {
        this.roleRightsLoading.set(false);
        this.showAlert('Failed to load roles list.', true);
      }
    });

    this.loadUserRoles();
  }

  loadSelectedRoleRights(): void {
    const role = this.selectedRole();
    if (!role) return;
    this.roleRightsLoading.set(true);
    this.roleRightsService.getRoleRights(role).subscribe({
      next: (rights) => {
        this.roleRightsMatrix.set(rights);
        this.roleRightsLoading.set(false);
      },
      error: () => {
        this.roleRightsLoading.set(false);
        this.showAlert(`Failed to load rights for ${role}.`, true);
      }
    });
  }

  selectRole(roleName: string): void {
    this.selectedRole.set(roleName);
    this.loadSelectedRoleRights();
  }

  getActiveRoleDescription(): string {
    const role = this.rolesList().find(r => r.name.toLowerCase() === this.selectedRole().toLowerCase());
    return role?.description || 'Custom role permissions matrix.';
  }

  toggleRight(moduleIndex: number, field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canExport'): void {
    const current = [...this.roleRightsMatrix()];
    if (!current[moduleIndex]) return;
    const nextVal = !current[moduleIndex][field];

    if (field !== 'canView' && nextVal && !current[moduleIndex].canView) {
      // If user enables any operation (Create/Edit/Delete/Export), automatically enable View right
      current[moduleIndex] = {
        ...current[moduleIndex],
        canView: true,
        [field]: true
      };
    } else if (field === 'canView' && !nextVal) {
      // If user disables View right, automatically disable all operation rights
      current[moduleIndex] = {
        ...current[moduleIndex],
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false
      };
    } else {
      current[moduleIndex] = {
        ...current[moduleIndex],
        [field]: nextVal
      };
    }
    this.roleRightsMatrix.set(current);
  }

  toggleAllModuleRights(moduleIndex: number): void {
    const current = [...this.roleRightsMatrix()];
    const row = current[moduleIndex];
    if (!row) return;
    const shouldAllow = !this.isRowAllAllowed(row);
    current[moduleIndex] = {
      ...row,
      canView: shouldAllow,
      canCreate: shouldAllow,
      canEdit: shouldAllow,
      canDelete: shouldAllow,
      canExport: shouldAllow
    };
    this.roleRightsMatrix.set(current);
  }

  isRowAllAllowed(row: ModuleRight): boolean {
    return row.canView && row.canCreate && row.canEdit && row.canDelete && row.canExport;
  }

  isRowNoneAllowed(row: ModuleRight): boolean {
    return !row.canView && !row.canCreate && !row.canEdit && !row.canDelete && !row.canExport;
  }

  applyRolePreset(preset: 'all' | 'readonly' | 'nodelete' | 'clear'): void {
    const current = this.roleRightsMatrix().map(r => {
      switch (preset) {
        case 'all':
          return { ...r, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true };
        case 'readonly':
          return { ...r, canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: true };
        case 'nodelete':
          return { ...r, canDelete: false };
        case 'clear':
          return { ...r, canView: false, canCreate: false, canEdit: false, canDelete: false, canExport: false };
        default:
          return r;
      }
    });
    this.roleRightsMatrix.set(current);
  }

  getModuleIcon(module: string): string {
    switch (module?.toLowerCase()) {
      case 'dashboard': return '📊';
      case 'analytics': return '📈';
      case 'transactions': return '💳';
      case 'business': return '💼';
      case 'loans': return '🤝';
      case 'goals': return '🎯';
      case 'investments': return '💹';
      case 'marketai': return '🤖';
      case 'epfo': return '🏛️';
      case 'reports': return '📑';
      case 'datatransfer': return '🔄';
      case 'recyclebin': return '🗑️';
      case 'settings': return '⚙️';
      case 'categories': return '🏷️';
      case 'users': return '👥';
      default: return '📁';
    }
  }

  saveRoleRights(): void {
    const role = this.selectedRole();
    if (!role) return;

    this.roleRightsSaving.set(true);
    this.roleRightsService.updateRoleRights(role, this.roleRightsMatrix()).subscribe({
      next: (res) => {
        this.roleRightsSaving.set(false);
        this.showAlert(res.message || `Rights successfully saved for ${role}!`);
        this.roleRightsService.loadMyRights().subscribe();
      },
      error: (err) => {
        this.roleRightsSaving.set(false);
        this.showAlert(err?.error?.message || 'Failed to save role rights.', true);
      }
    });
  }

  loadUserRoles(): void {
    this.userRolesLoading.set(true);
    this.roleRightsService.getUserRoles().subscribe({
      next: (users) => {
        this.userRoleAssignments.set(users);
        this.userRolesLoading.set(false);
      },
      error: () => {
        this.userRolesLoading.set(false);
      }
    });
  }

  onUserRoleChange(user: UserRoleAssignment, newRole: string): void {
    user.role = newRole;
  }

  assignRoleToUser(userId: string, newRole: string): void {
    this.roleRightsService.assignUserRole(userId, newRole).subscribe({
      next: (res) => {
        this.showAlert(res.message || 'User role updated successfully.');
        this.loadRoleRightsData();
        this.roleRightsService.loadMyRights().subscribe();
      },
      error: (err) => {
        this.showAlert(err?.error?.message || 'Failed to update user role.', true);
      }
    });
  }

  openCreateRoleModal(): void {
    this.newRoleName = '';
    this.newRoleDescription = '';
    this.newRoleCopyFrom = 'User';
    this.showCreateRoleModal.set(true);
  }

  closeCreateRoleModal(): void {
    this.showCreateRoleModal.set(false);
  }

  createCustomRole(): void {
    if (!this.newRoleName.trim()) return;

    this.roleRightsService.createRole({
      roleName: this.newRoleName.trim(),
      description: this.newRoleDescription.trim(),
      copyFromRole: this.newRoleCopyFrom
    }).subscribe({
      next: (res) => {
        this.showCreateRoleModal.set(false);
        this.showAlert(res.message || 'Custom role created successfully.');
        this.selectedRole.set(this.newRoleName.trim());
        this.loadRoleRightsData();
      },
      error: (err) => {
        this.showAlert(err?.error?.message || 'Failed to create role.', true);
      }
    });
  }

  deleteCustomRole(roleName: string): void {
    if (!confirm(`Are you sure you want to delete role '${roleName}'? Any users assigned to this role will be reassigned to 'User'.`)) {
      return;
    }

    this.roleRightsService.deleteRole(roleName).subscribe({
      next: (res) => {
        this.showAlert(res.message || `Role '${roleName}' deleted successfully.`);
        this.selectedRole.set('User');
        this.loadRoleRightsData();
      },
      error: (err) => {
        this.showAlert(err?.error?.message || 'Cannot delete role.', true);
      }
    });
  }

  private showAlert(msg: string, isError = false): void {
    this.alertMessage.set(msg);
    this.isAlertError.set(isError);
  }
}
