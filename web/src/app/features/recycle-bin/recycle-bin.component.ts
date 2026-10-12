import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { RecycleBinService, RecycleBinItem } from './services/recycle-bin.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-recycle-bin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="recycle-bin-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-titles">
          <div class="title-with-badge">
            <div class="header-icon-box">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <div>
              <h1 class="page-title">Recycle Bin</h1>
              <span class="count-badge" *ngIf="recycleBinService.moduleCounts().all > 0">
                {{ recycleBinService.moduleCounts().all }} Deleted Items
              </span>
            </div>
          </div>
          <p class="subtitle">
            Items soft-deleted across all modules are safely preserved here. Restore them back to active ledgers anytime or purge permanently.
          </p>
        </div>

        <div class="header-actions">
          <button
            type="button"
            class="btn-refresh"
            (click)="loadItems()"
            [disabled]="recycleBinService.loading()"
            title="Refresh recycle bin"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" [class.spin]="recycleBinService.loading()">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>Refresh</span>
          </button>

          <button
            type="button"
            class="btn-empty-bin"
            (click)="openEmptyModal()"
            [disabled]="recycleBinService.moduleCounts().all === 0 || recycleBinService.loading()"
            title="Permanently remove all items"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>Empty Recycle Bin</span>
          </button>
        </div>
      </div>

      <!-- Live Toast Alert -->
      @if (toastMessage()) {
        <div class="toast-banner" [class.toast-error]="isToastError()">
          <div class="toast-content">
            <svg *ngIf="!isToastError()" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <svg *ngIf="isToastError()" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{{ toastMessage() }}</span>
          </div>
          <button type="button" class="btn-close-toast" (click)="toastMessage.set(null)">✕</button>
        </div>
      }

      <!-- KPI Overview Cards -->
      <div class="kpi-grid">
        <div class="kpi-card" [class.active-kpi]="activeModule() === 'all'" (click)="setModule('all')">
          <div class="kpi-header">
            <span class="kpi-label">TOTAL IN TRASH</span>
            <div class="kpi-icon-pill icon-all">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </div>
          </div>
          <div class="kpi-value">{{ recycleBinService.moduleCounts().all }}</div>
          <span class="kpi-sub">Across all 6 modules</span>
        </div>

        <div class="kpi-card" [class.active-kpi]="activeModule() === 'transactions'" (click)="setModule('transactions')">
          <div class="kpi-header">
            <span class="kpi-label">TRANSACTIONS</span>
            <div class="kpi-icon-pill icon-tx">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div class="kpi-value">{{ recycleBinService.moduleCounts().transactions }}</div>
          <span class="kpi-sub">Income & Expense logs</span>
        </div>

        <div class="kpi-card" [class.active-kpi]="activeModule() === 'loans'" (click)="setModule('loans')">
          <div class="kpi-header">
            <span class="kpi-label">LOANS & CREDIT</span>
            <div class="kpi-icon-pill icon-loans">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
          </div>
          <div class="kpi-value">{{ recycleBinService.moduleCounts().loans }}</div>
          <span class="kpi-sub">Loans & payments</span>
        </div>

        <div class="kpi-card" [class.active-kpi]="activeModule() === 'epfo'" (click)="setModule('epfo')">
          <div class="kpi-header">
            <span class="kpi-label">EPFO PASSBOOK</span>
            <div class="kpi-icon-pill icon-epfo">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
          </div>
          <div class="kpi-value">{{ recycleBinService.moduleCounts().epfo }}</div>
          <span class="kpi-sub">Monthly EPFO entries</span>
        </div>

        <div class="kpi-card" [class.active-kpi]="activeModule() === 'investments'" (click)="setModule('investments')">
          <div class="kpi-header">
            <span class="kpi-label">INVESTMENTS</span>
            <div class="kpi-icon-pill icon-inv">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
          </div>
          <div class="kpi-value">{{ recycleBinService.moduleCounts().investments }}</div>
          <span class="kpi-sub">Holdings & trades</span>
        </div>

        <div class="kpi-card" [class.active-kpi]="activeModule() === 'business'" (click)="setModule('business')">
          <div class="kpi-header">
            <span class="kpi-label">BUSINESS</span>
            <div class="kpi-icon-pill icon-biz">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
          </div>
          <div class="kpi-value">{{ recycleBinService.moduleCounts().business }}</div>
          <span class="kpi-sub">Ventures & invoices</span>
        </div>
      </div>

      <!-- Controls & Search Toolbar -->
      <div class="toolbar-card">
        <!-- Module Filter Tabs -->
        <div class="module-pills-row">
          <button
            type="button"
            class="filter-pill"
            [class.active]="activeModule() === 'all'"
            (click)="setModule('all')"
          >
            All Items ({{ recycleBinService.moduleCounts().all }})
          </button>

          <button
            type="button"
            class="filter-pill"
            [class.active]="activeModule() === 'transactions'"
            (click)="setModule('transactions')"
          >
            Transactions ({{ recycleBinService.moduleCounts().transactions }})
          </button>

          <button
            type="button"
            class="filter-pill"
            [class.active]="activeModule() === 'categories'"
            (click)="setModule('categories')"
          >
            Categories ({{ recycleBinService.moduleCounts().categories }})
          </button>

          <button
            type="button"
            class="filter-pill"
            [class.active]="activeModule() === 'loans'"
            (click)="setModule('loans')"
          >
            Loans ({{ recycleBinService.moduleCounts().loans }})
          </button>

          <button
            type="button"
            class="filter-pill"
            [class.active]="activeModule() === 'epfo'"
            (click)="setModule('epfo')"
          >
            EPFO ({{ recycleBinService.moduleCounts().epfo }})
          </button>

          <button
            type="button"
            class="filter-pill"
            [class.active]="activeModule() === 'investments'"
            (click)="setModule('investments')"
          >
            Investments ({{ recycleBinService.moduleCounts().investments }})
          </button>

          <button
            type="button"
            class="filter-pill"
            [class.active]="activeModule() === 'business'"
            (click)="setModule('business')"
          >
            Business ({{ recycleBinService.moduleCounts().business }})
          </button>
        </div>

        <!-- Search Bar -->
        <div class="search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            placeholder="Search deleted records by title, description or amount..."
            class="search-input"
          />
          <button *ngIf="searchQuery" type="button" class="btn-clear-search" (click)="clearSearch()">✕</button>
        </div>
      </div>

      <!-- Main Content Area: Deleted Items List -->
      <div class="content-card">
        @if (recycleBinService.loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Scanning recycle bin archives...</p>
          </div>
        } @else if (recycleBinService.items().length === 0) {
          <div class="empty-state">
            <div class="empty-icon-wrap">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </div>
            <h3>Recycle Bin is Empty</h3>
            <p>
              @if (searchQuery) {
                No deleted items match the search query "{{ searchQuery }}".
              } @else if (activeModule() !== 'all') {
                No deleted items found in {{ activeModule() | titlecase }}.
              } @else {
                There are no soft-deleted records in the system. When you delete records from any module, they will safely appear here for recovery.
              }
            </p>
            <div class="empty-actions">
              <a routerLink="/settings" class="btn-settings-link">
                Review Module Deletion Permissions in Settings →
              </a>
            </div>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="recycle-table">
              <thead>
                <tr>
                  <th>MODULE</th>
                  <th>RECORD DETAILS</th>
                  <th>AMOUNT</th>
                  <th>DELETED AT</th>
                  <th>ORIGINAL DATE</th>
                  <th class="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                @for (item of recycleBinService.items(); track item.id) {
                  <tr class="item-row">
                    <!-- Module Pill -->
                    <td>
                      <span class="module-tag tag-{{ item.module.toLowerCase() }}">
                        {{ item.module }}
                      </span>
                      <span class="sub-type-badge">{{ item.subType }}</span>
                    </td>

                    <!-- Title & Details -->
                    <td class="details-cell">
                      <div class="item-title">{{ item.title }}</div>
                      <div class="item-desc" *ngIf="item.description">{{ item.description }}</div>
                    </td>

                    <!-- Amount -->
                    <td>
                      @if (item.amount !== null && item.amount !== undefined) {
                        <span class="amount-val" [class.mask-amount]="themeService.privacyMode()">
                          {{ item.currency === 'USD' ? '$' : '₹' }} {{ item.amount | number:'1.2-2' }}
                        </span>
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </td>

                    <!-- Deleted At -->
                    <td class="date-cell">
                      <div class="date-primary">{{ item.deletedAtUtc | date:'mediumDate' }}</div>
                      <div class="date-time">{{ item.deletedAtUtc | date:'shortTime' }}</div>
                    </td>

                    <!-- Original Date -->
                    <td class="date-cell">
                      @if (item.originalDate) {
                        <div class="date-primary">{{ item.originalDate | date:'mediumDate' }}</div>
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </td>

                    <!-- Actions -->
                    <td class="actions-cell text-right">
                      <div class="action-buttons-group">
                        <button
                          type="button"
                          class="btn-action-restore"
                          (click)="restore(item)"
                          [disabled]="actionLoading()"
                          title="Restore back to active ledger"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2">
                            <polyline points="1 4 1 10 7 10" />
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                          </svg>
                          <span>Restore</span>
                        </button>

                        <button
                          type="button"
                          class="btn-action-purge"
                          (click)="openPurgeModal(item)"
                          [disabled]="actionLoading()"
                          title="Permanently erase from database"
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span>Purge</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="pagination-bar" *ngIf="recycleBinService.totalCount() > pageSize">
            <span class="page-info">
              Showing {{ (currentPage() - 1) * pageSize + 1 }} to {{ Math.min(currentPage() * pageSize, recycleBinService.totalCount()) }} of {{ recycleBinService.totalCount() }} records
            </span>
            <div class="page-btns">
              <button
                type="button"
                class="btn-page"
                [disabled]="currentPage() === 1"
                (click)="setPage(currentPage() - 1)"
              >
                Previous
              </button>
              <span class="current-page-num">{{ currentPage() }}</span>
              <button
                type="button"
                class="btn-page"
                [disabled]="currentPage() * pageSize >= recycleBinService.totalCount()"
                (click)="setPage(currentPage() + 1)"
              >
                Next
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Modal: Confirm Permanent Purge Single Item -->
      @if (showPurgeModal() && selectedItemForPurge()) {
        <div class="modal-backdrop" (click)="showPurgeModal.set(false)">
          <div class="modal-dialog danger-modal" (click)="$event.stopPropagation()">
            <div class="modal-icon-badge danger">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>

            <div class="modal-header-content">
              <h3>Permanently Delete Record?</h3>
              <p>
                You are about to permanently delete <strong>{{ selectedItemForPurge()?.title }}</strong> from the <strong>{{ selectedItemForPurge()?.module }}</strong> module.
              </p>
            </div>

            <div class="purge-warning-box">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#dc2626" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>This record will be permanently purged from the database and <strong>CANNOT</strong> be recovered.</span>
            </div>

            <div class="modal-actions-row">
              <button type="button" class="btn-cancel" (click)="showPurgeModal.set(false)" [disabled]="actionLoading()">
                Cancel
              </button>
              <button
                type="button"
                class="btn-confirm-purge"
                (click)="confirmPurge()"
                [disabled]="actionLoading()"
              >
                {{ actionLoading() ? 'Purging...' : 'Delete Permanently' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal: Confirm Empty Entire Recycle Bin -->
      @if (showEmptyModal()) {
        <div class="modal-backdrop" (click)="showEmptyModal.set(false)">
          <div class="modal-dialog danger-modal" (click)="$event.stopPropagation()">
            <div class="modal-icon-badge danger">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <div class="modal-header-content">
              <h3>Empty Entire Recycle Bin?</h3>
              <p>
                @if (activeModule() === 'all') {
                  This will permanently wipe all <strong>{{ recycleBinService.moduleCounts().all }} records</strong> currently in the trash across all modules.
                } @else {
                  This will permanently wipe all <strong>{{ getActiveModuleCount() }} records</strong> in the <strong>{{ activeModule() | titlecase }}</strong> module.
                }
              </p>
            </div>

            <div class="purge-warning-box">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#dc2626" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>This operation cannot be undone. All data will be irreversibly erased from the system.</span>
            </div>

            <div class="modal-actions-row">
              <button type="button" class="btn-cancel" (click)="showEmptyModal.set(false)" [disabled]="actionLoading()">
                Cancel
              </button>
              <button
                type="button"
                class="btn-confirm-purge"
                (click)="confirmEmpty()"
                [disabled]="actionLoading()"
              >
                {{ actionLoading() ? 'Emptying...' : 'Yes, Empty Trash Now' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .recycle-bin-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-bottom: 3rem;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1.5rem;
      flex-wrap: wrap;

      .header-titles {
        max-width: 680px;
      }

      .title-with-badge {
        display: flex;
        align-items: center;
        gap: 0.875rem;

        .header-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .page-title {
          font-size: 1.625rem;
          font-weight: 700;
          color: var(--color-text-main);
          margin: 0;
          letter-spacing: -0.02em;
        }

        .count-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.65rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          background: rgba(239, 68, 68, 0.15);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
      }

      .subtitle {
        font-size: 0.875rem;
        color: var(--color-text-muted);
        margin: 0.35rem 0 0;
        line-height: 1.45;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
    }

    .btn-refresh {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 0.9rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      color: var(--color-text-main);
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        border-color: var(--color-primary);
        color: var(--color-primary);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .spin {
        animation: spin 1s linear infinite;
      }
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .btn-empty-bin {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #dc2626;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background: #dc2626;
        color: #fff;
        border-color: #dc2626;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    /* Live Toast */
    .toast-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #059669;
      font-size: 0.875rem;
      font-weight: 500;

      &.toast-error {
        background: rgba(239, 68, 68, 0.12);
        border-color: rgba(239, 68, 68, 0.3);
        color: #dc2626;
      }

      .toast-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .btn-close-toast {
        background: none;
        border: none;
        color: inherit;
        font-size: 1rem;
        cursor: pointer;
        padding: 0 0.25rem;
      }
    }

    /* KPI Cards Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 0.875rem;
    }

    .kpi-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;

      &:hover {
        border-color: var(--color-primary);
        transform: translateY(-2px);
      }

      &.active-kpi {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.15);
      }

      .kpi-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.5rem;

        .kpi-label {
          font-size: 0.6875rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
        }

        .kpi-icon-pill {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;

          &.icon-all { background: rgba(100, 116, 139, 0.15); color: #64748b; }
          &.icon-tx { background: rgba(16, 185, 129, 0.15); color: #10b981; }
          &.icon-loans { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
          &.icon-epfo { background: rgba(37, 99, 235, 0.15); color: #2563eb; }
          &.icon-inv { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
          &.icon-biz { background: rgba(79, 70, 229, 0.15); color: #4f46e5; }
        }
      }

      .kpi-value {
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--color-text-main);
        line-height: 1.2;
      }

      .kpi-sub {
        font-size: 0.75rem;
        color: var(--color-text-muted);
        margin-top: 0.25rem;
        display: block;
      }
    }

    /* Toolbar */
    .toolbar-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 0.875rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }

    .module-pills-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;

      &::-webkit-scrollbar {
        height: 4px;
      }
      &::-webkit-scrollbar-thumb {
        background: var(--color-border);
        border-radius: 4px;
      }

      .filter-pill {
        white-space: nowrap;
        padding: 0.4rem 0.8rem;
        border-radius: 8px;
        font-size: 0.8125rem;
        font-weight: 600;
        background: var(--color-bg-base);
        border: 1px solid var(--color-border);
        color: var(--color-text-muted);
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          color: var(--color-text-main);
          border-color: var(--color-primary);
        }

        &.active {
          background: var(--color-primary);
          color: #fff;
          border-color: var(--color-primary);
        }
      }
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: var(--color-bg-base);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 0.45rem 0.75rem;
      color: var(--color-text-muted);

      .search-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-size: 0.875rem;
        color: var(--color-text-main);

        &::placeholder {
          color: var(--color-text-muted);
        }
      }

      .btn-clear-search {
        background: none;
        border: none;
        color: var(--color-text-muted);
        cursor: pointer;
        font-size: 0.85rem;
      }
    }

    /* Content Card */
    .content-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      overflow: hidden;
      min-height: 280px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 1rem;
      color: var(--color-text-muted);

      .spinner {
        width: 36px;
        height: 36px;
        border: 3px solid var(--color-border);
        border-top-color: var(--color-primary);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin-bottom: 1rem;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 4rem 1.5rem;

      .empty-icon-wrap {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: rgba(100, 116, 139, 0.1);
        color: var(--color-text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1.25rem;
      }

      h3 {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--color-text-main);
        margin: 0 0 0.5rem;
      }

      p {
        max-width: 460px;
        font-size: 0.875rem;
        color: var(--color-text-muted);
        line-height: 1.5;
        margin: 0;
      }

      .empty-actions {
        margin-top: 1.5rem;

        .btn-settings-link {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-primary);
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }

    .table-responsive {
      overflow-x: auto;
    }

    .recycle-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;

      th {
        padding: 0.75rem 1rem;
        background: var(--color-bg-base);
        color: var(--color-text-muted);
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-align: left;
        border-bottom: 1px solid var(--color-border);

        &.text-right {
          text-align: right;
        }
      }

      td {
        padding: 0.875rem 1rem;
        border-bottom: 1px solid var(--color-border);
        color: var(--color-text-main);
        vertical-align: middle;

        &.text-right {
          text-align: right;
        }
      }

      .item-row:hover {
        background: rgba(0, 0, 0, 0.015);
      }
    }

    .module-tag {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-right: 0.35rem;

      &.tag-transactions { background: rgba(16, 185, 129, 0.15); color: #059669; }
      &.tag-categories { background: rgba(236, 72, 153, 0.15); color: #db2777; }
      &.tag-loans { background: rgba(245, 158, 11, 0.15); color: #d97706; }
      &.tag-epfo { background: rgba(37, 99, 235, 0.15); color: #2563eb; }
      &.tag-investments { background: rgba(139, 92, 246, 0.15); color: #7c3aed; }
      &.tag-business { background: rgba(79, 70, 229, 0.15); color: #4f46e5; }
    }

    .sub-type-badge {
      display: inline-block;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .details-cell {
      max-width: 320px;

      .item-title {
        font-weight: 600;
        color: var(--color-text-main);
      }

      .item-desc {
        font-size: 0.75rem;
        color: var(--color-text-muted);
        margin-top: 0.15rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .amount-val {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--color-text-main);

      &.mask-amount {
        filter: blur(5px);
        user-select: none;
        transition: filter 0.2s ease;

        &:hover {
          filter: none;
        }
      }
    }

    .date-cell {
      .date-primary {
        font-weight: 500;
      }
      .date-time {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }
    }

    .action-buttons-group {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-action-restore {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #059669;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        background: #059669;
        color: #fff;
        border-color: #059669;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    .btn-action-purge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.75rem;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 600;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #dc2626;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        background: #dc2626;
        color: #fff;
        border-color: #dc2626;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    /* Pagination */
    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--color-border);
      background: var(--color-bg-base);

      .page-info {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }

      .page-btns {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        .current-page-num {
          font-size: 0.8125rem;
          font-weight: 700;
          padding: 0.25rem 0.5rem;
        }

        .btn-page {
          padding: 0.35rem 0.65rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          background: var(--color-bg-card);
          border: 1px solid var(--color-border);
          color: var(--color-text-main);
          cursor: pointer;

          &:hover:not(:disabled) {
            border-color: var(--color-primary);
          }

          &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
        }
      }
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-dialog {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      padding: 1.5rem;
      max-width: 460px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);

      &.danger-modal {
        border-top: 4px solid #dc2626;
      }

      .modal-icon-badge {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1rem;

        &.danger {
          background: rgba(239, 68, 68, 0.12);
          color: #dc2626;
        }
      }

      .modal-header-content {
        h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-main);
          margin: 0 0 0.5rem;
        }

        p {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          line-height: 1.45;
          margin: 0;
        }
      }

      .purge-warning-box {
        margin-top: 1rem;
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.75rem;
        border-radius: 8px;
        background: rgba(239, 68, 68, 0.08);
        border: 1px solid rgba(239, 68, 68, 0.2);
        color: #b91c1c;
        font-size: 0.8125rem;
        line-height: 1.4;
      }

      .modal-actions-row {
        margin-top: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.75rem;

        .btn-cancel {
          padding: 0.55rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-main);
          cursor: pointer;

          &:hover {
            background: var(--color-bg-base);
          }
        }

        .btn-confirm-purge {
          padding: 0.55rem 1.25rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          background: #dc2626;
          border: none;
          color: #fff;
          cursor: pointer;

          &:hover:not(:disabled) {
            background: #b91c1c;
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }
      }
    }
  `]
})
export class RecycleBinComponent implements OnInit {
  public recycleBinService = inject(RecycleBinService);
  public themeService = inject(ThemeService);

  public activeModule = signal<string>('all');
  public searchQuery = '';
  public currentPage = signal<number>(1);
  public pageSize = 20;

  public selectedItemForPurge = signal<RecycleBinItem | null>(null);
  public showPurgeModal = signal<boolean>(false);
  public showEmptyModal = signal<boolean>(false);
  public actionLoading = signal<boolean>(false);

  public toastMessage = signal<string | null>(null);
  public isToastError = signal<boolean>(false);

  public Math = Math;

  private searchDebounceTimer: any;

  ngOnInit(): void {
    this.loadItems();
  }

  public getActiveModuleCount(): number {
    const counts = this.recycleBinService.moduleCounts();
    const mod = this.activeModule().toLowerCase();
    switch (mod) {
      case 'transactions': return counts.transactions;
      case 'categories': return counts.categories;
      case 'loans': return counts.loans;
      case 'epfo': return counts.epfo;
      case 'investments': return counts.investments;
      case 'business': return counts.business;
      default: return counts.all;
    }
  }

  public setModule(mod: string): void {
    this.activeModule.set(mod);
    this.currentPage.set(1);
    this.loadItems();
  }

  public setPage(p: number): void {
    this.currentPage.set(p);
    this.loadItems();
  }

  public onSearchChange(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.currentPage.set(1);
      this.loadItems();
    }, 300);
  }

  public clearSearch(): void {
    this.searchQuery = '';
    this.currentPage.set(1);
    this.loadItems();
  }

  public loadItems(): void {
    this.recycleBinService.getItems(
      this.activeModule(),
      this.searchQuery,
      this.currentPage(),
      this.pageSize
    ).subscribe({
      error: () => {
        this.showToast('Could not load deleted items from server.', true);
      }
    });
  }

  public restore(item: RecycleBinItem): void {
    this.actionLoading.set(true);
    this.recycleBinService.restoreItem(item.module, item.id).subscribe({
      next: res => {
        this.actionLoading.set(false);
        this.showToast(res.message || `Successfully restored ${item.title}.`, false);
        this.loadItems();
      },
      error: err => {
        this.actionLoading.set(false);
        const errMsg = err?.error?.error || err?.error?.message || 'Failed to restore item.';
        this.showToast(errMsg, true);
      }
    });
  }

  public openPurgeModal(item: RecycleBinItem): void {
    this.selectedItemForPurge.set(item);
    this.showPurgeModal.set(true);
  }

  public confirmPurge(): void {
    const item = this.selectedItemForPurge();
    if (!item) return;

    this.actionLoading.set(true);
    this.recycleBinService.permanentDelete(item.module, item.id).subscribe({
      next: res => {
        this.actionLoading.set(false);
        this.showPurgeModal.set(false);
        this.selectedItemForPurge.set(null);
        this.showToast(res.message || 'Item permanently deleted from database.', false);
        this.loadItems();
      },
      error: err => {
        this.actionLoading.set(false);
        const errMsg = err?.error?.error || err?.error?.message || 'Failed to purge item.';
        this.showToast(errMsg, true);
      }
    });
  }

  public openEmptyModal(): void {
    this.showEmptyModal.set(true);
  }

  public confirmEmpty(): void {
    this.actionLoading.set(true);
    const mod = this.activeModule() === 'all' ? undefined : this.activeModule();
    this.recycleBinService.emptyRecycleBin(mod).subscribe({
      next: res => {
        this.actionLoading.set(false);
        this.showEmptyModal.set(false);
        this.showToast(res.message || 'Recycle bin emptied successfully.', false);
        this.loadItems();
      },
      error: err => {
        this.actionLoading.set(false);
        const errMsg = err?.error?.error || err?.error?.message || 'Failed to empty recycle bin.';
        this.showToast(errMsg, true);
      }
    });
  }

  private showToast(msg: string, isError: boolean): void {
    this.toastMessage.set(msg);
    this.isToastError.set(isError);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 4500);
  }
}

