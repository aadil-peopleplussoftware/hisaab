import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SettingsService } from './services/settings.service';
import { AdminUser, AuditLogItem, SystemHealth, UserProfile } from './models/settings.model';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { TransactionsService } from '../transactions/services/transactions.service';
import { Category, TransactionType } from '../transactions/models/transaction.model';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page">
      <div class="page-header">
        <h2>Settings & Administration</h2>
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
          ⚙️ Preferences
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'categories'"
          (click)="setTab('categories')"
        >
          🏷️ Categories
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'export'"
          (click)="setTab('export')"
        >
          💾 Data Backup & Export
        </button>
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'privacy'"
          (click)="setTab('privacy')"
        >
          🛡️ Privacy & Danger Zone
        </button>
        @if (isAdmin) {
          <button
            type="button"
            class="tab-btn tab-admin"
            [class.active]="activeTab() === 'admin'"
            (click)="setTab('admin')"
          >
            ⚡ Admin Console
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
                {{ themeService.isDarkMode() ? '☀️ Switch to Light' : '🌙 Switch to Dark' }}
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
                    {{ c.name }}
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
                    {{ c.name }}
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
              <span class="export-icon">📄</span>
              <h4>JSON Data Archive</h4>
              <p>Complete JSON dump containing your profile, categories, transactions, loans, EPFO, and investment records.</p>
              <button
                type="button"
                class="btn-outline"
                [disabled]="exporting() === 'json'"
                (click)="downloadJsonBackup()"
              >
                {{ exporting() === 'json' ? 'Exporting...' : '⬇ Download JSON Archive' }}
              </button>
            </div>

            <div class="export-option-box">
              <span class="export-icon">📊</span>
              <h4>All-in-One Excel Workbook</h4>
              <p>Multi-tab styled Excel (.xlsx) file with sheets for Overview, Transactions, Loans, EPFO, and Investments.</p>
              <button
                type="button"
                class="btn-outline btn-excel-accent"
                [disabled]="exporting() === 'excel'"
                (click)="downloadExcelBackup()"
              >
                {{ exporting() === 'excel' ? 'Exporting...' : '⬇ Export Master Workbook' }}
              </button>
            </div>
          </div>
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
              👥 User Accounts ({{ adminUsers().length }})
            </button>
            <button
              type="button"
              class="subtab-btn"
              [class.active]="adminView() === 'audit'"
              (click)="setAdminView('audit')"
            >
              📜 Audit Logs
            </button>
            <button
              type="button"
              class="subtab-btn"
              [class.active]="adminView() === 'health'"
              (click)="setAdminView('health')"
            >
              💻 System Health
            </button>
          </div>

          <!-- Subview 1: Users -->
          @if (adminView() === 'users') {
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
                  @for (u of adminUsers(); track u.id) {
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
            <h3>⚠️ Confirm Account Deletion</h3>
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
  `]
})
export class SettingsComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly transactionsService = inject(TransactionsService);
  private readonly router = inject(Router);
  readonly themeService = inject(ThemeService);
  readonly authService = inject(AuthService);

  readonly activeTab = signal<'preferences' | 'categories' | 'export' | 'privacy' | 'admin'>('preferences');
  readonly profile = signal<UserProfile | null>(null);
  readonly categories = signal<Category[]>([]);
  readonly saving = signal<boolean>(false);
  readonly exporting = signal<string | null>(null);
  readonly alertMessage = signal<string | null>(null);
  readonly isAlertError = signal<boolean>(false);

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
  }

  setTab(tab: 'preferences' | 'categories' | 'export' | 'privacy' | 'admin'): void {
    this.activeTab.set(tab);
    if (tab === 'admin') {
      this.loadAdminData();
    }
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

  savePreferences(): void {
    this.saving.set(true);
    this.settingsService.updatePreferences(this.prefForm).subscribe({
      next: (res) => {
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

  private showAlert(msg: string, isError = false): void {
    this.alertMessage.set(msg);
    this.isAlertError.set(isError);
  }
}
