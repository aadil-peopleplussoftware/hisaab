import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { TransactionsService } from './services/transactions.service';
import { AttachmentMetadata, Category, MonthlySummary, Transaction, TransactionType } from './models/transaction.model';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { DeletionPermissionsService } from '../../core/services/deletion-permissions.service';
import { ThemeService } from '../../core/services/theme.service';

export type DatePreset =
  | 'month'
  | 'year'
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'last7Days'
  | 'lastMonth'
  | 'last30Days'
  | 'thisYear'
  | 'all'
  | 'custom';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, InrCurrencyPipe],
  template: `
    <div class="google-console-page">
      <!-- Top Page Header (Google Play Console Style, Hisaab Content) -->
      <header class="console-header no-print">
        <div class="console-header-left">
          <h1 class="console-title">Transactions</h1>
          <p class="console-subtitle">
            Manage daily income, expenses, and ledger records with real-time balance calculations and receipt attachments.
          </p>
        </div>

        <div class="console-header-actions">
          <!-- Import / Export Pill Button -->
          <a
            routerLink="/data-transfer"
            class="btn-console-pill outlined"
            title="Import and export transactions"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Import / Export</span>
          </a>

          <!-- + Record Transaction Action Button -->
          <button
            type="button"
            class="btn-console-pill primary"
            (click)="openCreateModal()"
            title="Record new transaction"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Add Transaction</span>
          </button>
        </div>
      </header>

      <!-- 4-Column Performance & Metrics Row (Google Play Console Card Layout, Real Hisaab Data) -->
      <section class="console-metrics-card">
        <div class="metric-column">
          <div class="metric-caption-row">
            <span class="metric-caption">Total Income</span>
          </div>
          <div class="metric-amount font-google text-income">
            {{ (summary()?.totalIncome || 0) | inrCurrency }}
          </div>
          <div class="metric-trend-row positive">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
            <span>Monthly earnings received</span>
          </div>
        </div>

        <div class="metric-column">
          <div class="metric-caption-row">
            <span class="metric-caption">Total Expenses</span>
          </div>
          <div class="metric-amount font-google text-expense">
            {{ (summary()?.totalExpense || 0) | inrCurrency }}
          </div>
          <div class="metric-trend-row negative">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <span>Monthly expenditure</span>
          </div>
        </div>

        <div class="metric-column">
          <div class="metric-caption-row">
            <span class="metric-caption">Net Savings</span>
          </div>
          <div class="metric-amount font-google" [class.text-income]="(summary()?.netSavings || 0) >= 0" [class.text-expense]="(summary()?.netSavings || 0) < 0">
            {{ (summary()?.netSavings || 0) | inrCurrency }}
          </div>
          <div class="metric-trend-row neutral">
            <span>Savings rate: {{ summary()?.savingsRatePercentage || 0 }}%</span>
          </div>
        </div>

        <div class="metric-column">
          <div class="metric-caption-row">
            <span class="metric-caption">Total Records</span>
          </div>
          <div class="metric-amount font-google">
            {{ totalCount() }}
          </div>
          <div class="metric-trend-row neutral">
            <span>{{ transactions().length }} shown of {{ totalCount() }} records</span>
          </div>
        </div>
      </section>

      <!-- Google Play Console Filter Bar -->
      <div class="console-filter-bar no-print">
        <!-- 1. Search Box Pill with Magnifying Glass -->
        <div class="search-box-pill">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            class="search-input"
            placeholder="Search by note, description or category..."
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
          />
        </div>

        <!-- 2. Vertical Divider Line -->
        <div class="filter-divider"></div>

        <!-- 3. Add Filter & Quick Chips -->
        <div class="filter-controls-group">
          <div class="filter-chips-row">
            <button
              type="button"
              class="filter-chip"
              [class.active]="selectedType() === null"
              (click)="setTypeFilter(null)"
            >
              All
            </button>
            <button
              type="button"
              class="filter-chip chip-income"
              [class.active]="selectedType() === 1"
              (click)="setTypeFilter(1)"
            >
              Income
            </button>
            <button
              type="button"
              class="filter-chip chip-expense"
              [class.active]="selectedType() === 2"
              (click)="setTypeFilter(2)"
            >
              Expenses
            </button>

            @if (categories().length > 0) {
              <select
                class="filter-category-select"
                [value]="selectedCategory() || ''"
                (change)="onCategoryChange($event)"
              >
                <option value="">All Categories</option>
                @for (cat of categories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
            }
          </div>
        </div>

        <!-- 4. Date Filter, Month/Year Picker & Custom Range Dropdown -->
        <div class="date-filter-group" (click)="$event.stopPropagation()">
          <!-- Month & Year Direct Selector Bar Control -->
          <div class="month-year-bar-control">
            <button
              type="button"
              class="btn-bar-nav"
              (click)="stepMonth(-1)"
              title="Previous Month"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            <!-- Month Dropdown -->
            <select
              class="filter-select-pill month-select"
              [value]="selectedFilterMonth()"
              (change)="onFilterMonthChange($event)"
              title="Filter by Month"
            >
              <option value="all">Whole Year (All Months)</option>
              @for (m of monthsList; track m.value) {
                <option [value]="m.value">{{ m.fullName }}</option>
              }
            </select>

            <!-- Year Dropdown -->
            <select
              class="filter-select-pill year-select"
              [value]="selectedFilterYear()"
              (change)="onFilterYearChange($event)"
              title="Filter by Year"
            >
              @for (yr of availableYears; track yr) {
                <option [value]="yr">{{ yr }}</option>
              }
            </select>

            <button
              type="button"
              class="btn-bar-nav"
              (click)="stepMonth(1)"
              title="Next Month"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>

          <div class="custom-date-filter-wrap">
            <button
              type="button"
              class="btn-date-filter"
              [class.active-custom]="isCustomOrPresetActive()"
              (click)="toggleDateDropdown($event)"
              title="Filter by quick presets, specific month/year, or custom date range"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span class="date-filter-text">{{ dateFilterLabel() }}</span>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" class="chevron-icon" [class.rotated]="isDateDropdownOpen()">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            @if (isCustomOrPresetActive()) {
              <button
                type="button"
                class="btn-reset-preset"
                (click)="resetToCurrentMonth($event)"
                title="Reset to current month"
              >
                ✕
              </button>
            }

            @if (isDateDropdownOpen()) {
              <div class="date-popover" (click)="$event.stopPropagation()">
                <div class="popover-header">
                  <div class="popover-title-row">
                    <span class="p-title">Filter by Date & Period</span>
                    @if (isCustomOrPresetActive()) {
                      <button type="button" class="btn-popover-reset" (click)="resetToCurrentMonth($event)">
                        Reset
                      </button>
                    }
                  </div>
                  <span class="p-subtitle">Select month, whole year, quick preset, or custom range</span>
                </div>

                <div class="popover-body">
                  <!-- 1. Month & Year Matrix Section -->
                  <div class="month-year-matrix-section">
                    <div class="matrix-header-row">
                      <span class="section-tag">SELECT MONTH & YEAR</span>
                      <div class="matrix-year-control">
                        <button type="button" class="btn-yr-step" (click)="stepPopoverYear(-1)" title="Previous Year">‹</button>
                        <select
                          class="matrix-year-select"
                          [value]="popoverYear()"
                          (change)="onPopoverYearChange($event)"
                        >
                          @for (yr of availableYears; track yr) {
                            <option [value]="yr">{{ yr }}</option>
                          }
                        </select>
                        <button type="button" class="btn-yr-step" (click)="stepPopoverYear(1)" title="Next Year">›</button>
                      </div>
                    </div>

                    <!-- Whole Year Button -->
                    <button
                      type="button"
                      class="btn-full-year-pill"
                      [class.active]="activeDatePreset() === 'year' && selectedFilterYear() === popoverYear()"
                      (click)="selectMonthAndYear('all')"
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <span>Full Year {{ popoverYear() }} (All 12 Months)</span>
                    </button>

                    <!-- 12-Month Matrix -->
                    <div class="month-matrix-grid">
                      @for (m of monthsList; track m.value) {
                        <button
                          type="button"
                          class="month-matrix-btn"
                          [class.active]="activeDatePreset() === 'month' && selectedFilterYear() === popoverYear() && selectedFilterMonth() === m.value"
                          (click)="selectMonthAndYear(m.value)"
                        >
                          {{ m.name }}
                        </button>
                      }
                    </div>
                  </div>

                  <div class="popover-divider"></div>

                  <!-- 2. Quick Presets Grid -->
                  <div class="presets-section">
                    <div class="section-tag">QUICK PRESETS</div>
                    <div class="presets-grid">
                      <button
                        type="button"
                        class="preset-chip"
                        [class.active]="activeDatePreset() === 'today'"
                        (click)="applyPreset('today')"
                      >
                        ⚡ Today
                      </button>
                      <button
                        type="button"
                        class="preset-chip"
                        [class.active]="activeDatePreset() === 'yesterday'"
                        (click)="applyPreset('yesterday')"
                      >
                        Yesterday
                      </button>
                      <button
                        type="button"
                        class="preset-chip"
                        [class.active]="activeDatePreset() === 'thisWeek'"
                        (click)="applyPreset('thisWeek')"
                      >
                        This Week
                      </button>
                      <button
                        type="button"
                        class="preset-chip"
                        [class.active]="activeDatePreset() === 'last7Days'"
                        (click)="applyPreset('last7Days')"
                      >
                        Last 7 Days
                      </button>
                      <button
                        type="button"
                        class="preset-chip"
                        [class.active]="activeDatePreset() === 'month' && selectedFilterMonth() === (now.getMonth() + 1) && selectedFilterYear() === now.getFullYear()"
                        (click)="resetToCurrentMonth()"
                      >
                        📅 This Month
                      </button>
                      <button
                        type="button"
                        class="preset-chip"
                        [class.active]="activeDatePreset() === 'lastMonth'"
                        (click)="applyPreset('lastMonth')"
                      >
                        Last Month
                      </button>
                      <button
                        type="button"
                        class="preset-chip"
                        [class.active]="activeDatePreset() === 'last30Days'"
                        (click)="applyPreset('last30Days')"
                      >
                        Last 30 Days
                      </button>
                      <button
                        type="button"
                        class="preset-chip"
                        [class.active]="activeDatePreset() === 'thisYear'"
                        (click)="applyPreset('thisYear')"
                      >
                        This Year
                      </button>
                      <button
                        type="button"
                        class="preset-chip"
                        [class.active]="activeDatePreset() === 'all'"
                        (click)="applyPreset('all')"
                      >
                        ♾️ All Time
                      </button>
                    </div>
                  </div>

                  <div class="popover-divider"></div>

                  <!-- 3. Custom Date Range -->
                  <div class="custom-range-section">
                    <div class="section-tag">CUSTOM DATE RANGE</div>
                    <div class="date-pickers-row">
                      <div class="date-field-col">
                        <span class="field-label">From Date</span>
                        <input
                          type="date"
                          class="date-input"
                          [value]="customStartDate()"
                          (input)="onCustomStartDateChange($event)"
                        />
                      </div>
                      <div class="date-range-sep">to</div>
                      <div class="date-field-col">
                        <span class="field-label">To Date</span>
                        <input
                          type="date"
                          class="date-input"
                          [value]="customEndDate()"
                          (input)="onCustomEndDateChange($event)"
                        />
                      </div>
                    </div>

                    <div class="popover-footer-actions">
                      <button type="button" class="btn-popover-cancel" (click)="closeDateDropdown()">
                        Close
                      </button>
                      <button
                        type="button"
                        class="btn-popover-apply"
                        (click)="applyCustomRange()"
                        [disabled]="!customStartDate() || !customEndDate()"
                      >
                        Apply Date Range
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Google Play Console Data Table -->
      <div class="console-table-card">
        @if (isLoading()) {
          <div class="console-loading-state">
            <div class="spinner-material"></div>
            <span>Loading transactions...</span>
          </div>
        } @else if (transactions().length === 0) {
          <!-- Empty State -->
          <div class="console-empty-state">
            <p class="empty-text">No transactions found. Try changing your search term or filters.</p>
            <button type="button" class="btn-console-pill primary sm" (click)="openCreateModal()" style="margin-top: 1rem;">
              <span>+ Record Transaction</span>
            </button>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="console-data-table">
              <thead>
                <tr>
                  <th class="col-date">Date</th>
                  <th class="col-app">Category</th>
                  <th class="col-note">Description & Receipt</th>
                  <th class="col-status">Type</th>
                  <th class="col-amount text-right">Amount</th>
                  <th class="col-actions text-right no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (txn of transactions(); track txn.id) {
                  <tr class="console-row" (click)="openEditModal(txn)">
                    <!-- Date -->
                    <td class="col-date">
                      <span class="date-main">{{ txn.transactionDate | date:'mediumDate' }}</span>
                    </td>

                    <!-- Category with Clean Squircle Icon -->
                    <td class="col-app">
                      <div class="app-cell">
                        <div
                          class="app-squircle"
                          [style.backgroundColor]="txn.categoryColor ? (txn.categoryColor + '18') : '#e8f0fe'"
                          [style.borderColor]="txn.categoryColor ? (txn.categoryColor + '35') : '#d3e3fd'"
                          [style.color]="txn.categoryColor || '#0b57d0'"
                        >
                          {{ (txn.categoryName || 'C')[0].toUpperCase() }}
                        </div>
                        <div class="app-meta">
                          <span class="app-title">{{ txn.categoryName }}</span>
                        </div>
                      </div>
                    </td>

                    <!-- Note / Description & Attachment pill -->
                    <td class="col-note">
                      <div class="note-container">
                        <span class="note-text">{{ txn.note || '—' }}</span>
                        @if (txn.attachmentUrl || txn.attachmentId) {
                          <button
                            type="button"
                            class="receipt-pill-btn"
                            (click)="openViewerForTxn(txn, $event)"
                            title="View attached bill / receipt"
                          >
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                            </svg>
                            <span>{{ isPdfFile(txn.attachmentFileType, txn.attachmentFileName) ? 'PDF Receipt' : 'Bill' }}</span>
                          </button>
                        }
                      </div>
                    </td>

                    <!-- Status Pill (Income / Expense) -->
                    <td class="col-status">
                      <span
                        class="status-pill"
                        [class.status-income]="txn.type === 1"
                        [class.status-expense]="txn.type === 2"
                      >
                        {{ txn.type === 1 ? 'Income' : 'Expense' }}
                      </span>
                    </td>

                    <!-- Amount -->
                    <td class="col-amount text-right font-google">
                      <span [class.income-val]="txn.type === 1" [class.expense-val]="txn.type === 2">
                        {{ txn.type === 1 ? '+' : '-' }}{{ txn.amount | inrCurrency }}
                      </span>
                    </td>

                    <!-- Actions -->
                    <td class="col-actions text-right no-print" (click)="$event.stopPropagation()">
                      @if (txn.attachmentUrl || txn.attachmentId) {
                        <button
                          type="button"
                          class="btn-table-action view-bill"
                          (click)="openViewerForTxn(txn, $event)"
                          title="View attached bill or receipt"
                        >
                          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          <span>Bill</span>
                        </button>
                      }
                      <button type="button" class="btn-table-action" (click)="openEditModal(txn)">
                        Edit
                      </button>
                      <button type="button" class="btn-table-action delete" (click)="onDelete(txn.id)">
                        Delete
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Google Play Console Pagination Bar -->
          @if (totalCount() > 0) {
            <div class="console-pagination-bar no-print">
              <div class="pagination-left">
                <span class="pagination-label">Rows per page:</span>
                <select class="pagination-select" [value]="pageSize()" (change)="onPageSizeChange($event)">
                  <option [value]="25">25</option>
                  <option [value]="50">50</option>
                  <option [value]="100">100</option>
                  <option [value]="250">250</option>
                  <option [value]="1000">All (up to 1,000)</option>
                </select>
              </div>

              <div class="pagination-right">
                <span class="pagination-range-text">
                  {{ paginationStart() }}–{{ paginationEnd() }} of {{ totalCount() }}
                </span>

                <div class="pagination-nav-btns">
                  <button
                    type="button"
                    class="btn-nav-page"
                    [disabled]="currentPage() <= 1"
                    (click)="goToPage(currentPage() - 1)"
                    title="Previous page"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>

                  <button
                    type="button"
                    class="btn-nav-page"
                    [disabled]="currentPage() >= totalPages()"
                    (click)="goToPage(currentPage() + 1)"
                    title="Next page"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          }
        }
      </div>

      <!-- Clean Console Footer (Hisaab Domain) -->
      <footer class="console-footer no-print">
        <div class="footer-left">
          <span>Hisaab · Personal Finance & Wealth Management</span>
        </div>

        <div class="footer-right">
          <span>Multi-Currency · Real-Time Calculation · Encrypted Storage</span>
        </div>
      </footer>

      <!-- Modal / Dialog for Create & Edit -->
      @if (isModalOpen()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-sheet" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingId() ? 'Edit Transaction' : 'Record New Transaction' }}</h3>
              <button type="button" class="btn-close" (click)="closeModal()">✕</button>
            </div>

            <form [formGroup]="txnForm" (ngSubmit)="onSubmit()" class="modal-form">
              <!-- Type Switcher -->
              <div class="type-toggle">
                <label class="toggle-label" [class.selected]="txnForm.get('type')?.value === 2">
                  <input type="radio" [value]="2" formControlName="type" (change)="onModalTypeChange()" />
                  Expense
                </label>
                <label class="toggle-label" [class.selected]="txnForm.get('type')?.value === 1">
                  <input type="radio" [value]="1" formControlName="type" (change)="onModalTypeChange()" />
                  Income
                </label>
              </div>

              <!-- Amount Input -->
              <div class="form-group">
                <label for="txnAmount">Amount (₹)</label>
                <div class="amount-input-box">
                  <span class="currency-symbol">₹</span>
                  <input
                    id="txnAmount"
                    type="number"
                    step="0.01"
                    formControlName="amount"
                    placeholder="0.00"
                    class="amount-field tabular-nums"
                  />
                </div>
              </div>

              <!-- Category Picker -->
              <div class="form-group">
                <label for="txnCategory">Category</label>
                <select id="txnCategory" formControlName="categoryId">
                  @for (cat of filteredModalCategories(); track cat.id) {
                    <option [value]="cat.id">{{ cat.name }}</option>
                  }
                </select>
              </div>

              <!-- Date Picker -->
              <div class="form-group">
                <label for="txnDate">Date</label>
                <input id="txnDate" type="date" formControlName="transactionDate" />
              </div>

              <!-- Note -->
              <div class="form-group">
                <label for="txnNote">Note / Description (Optional)</label>
                <input id="txnNote" type="text" formControlName="note" placeholder="e.g. Electricity bill, grocery shopping, invoice" />
              </div>

              <!-- Bill / Receipt Attachment (Optional) -->
              <div class="form-group attachment-section">
                <div class="attachment-label-row">
                  <label>Bill / Receipt Attachment</label>
                  <span class="optional-tag">Optional</span>
                </div>

                @if (currentAttachment()) {
                  <div class="attachment-preview-box">
                    <div class="attachment-thumb-wrap" (click)="openViewerForCurrent()">
                      @if (isImageFile(currentAttachment()?.contentType, currentAttachment()?.originalFileName)) {
                        <img [src]="currentAttachment()?.fileUrl" alt="Receipt preview" class="attachment-thumbnail" />
                      } @else {
                        <div class="pdf-thumbnail-badge">
                          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                          </svg>
                          <span>PDF</span>
                        </div>
                      }
                    </div>

                    <div class="attachment-meta" (click)="openViewerForCurrent()">
                      <span class="attachment-name" [title]="currentAttachment()?.originalFileName">
                        {{ currentAttachment()?.originalFileName }}
                      </span>
                      <span class="attachment-size">
                        {{ formatFileSize(currentAttachment()?.fileSizeBytes) }}
                      </span>
                    </div>

                    <div class="attachment-btns">
                      <button type="button" class="btn-att-pill view" (click)="openViewerForCurrent()" title="View full size">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        <span>View</span>
                      </button>
                      <button type="button" class="btn-att-pill remove" (click)="removeAttachment()" title="Remove attachment">
                        ✕
                      </button>
                    </div>
                  </div>
                } @else {
                  <div
                    class="dropzone-area"
                    [class.dragging]="isDragging()"
                    (dragover)="onDragOver($event)"
                    (dragleave)="onDragLeave($event)"
                    (drop)="onDrop($event)"
                    (click)="fileInput.click()"
                  >
                    <input
                      #fileInput
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/svg+xml,application/pdf"
                      (change)="onFileSelected($event)"
                      style="display: none;"
                    />
                    @if (isUploadingAttachment()) {
                      <div class="upload-loader">
                        <div class="spinner-material-sm"></div>
                        <span>Uploading receipt...</span>
                      </div>
                    } @else {
                      <div class="dropzone-inner">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" class="upload-icon">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <p class="dropzone-prompt">
                          <strong>Click to upload</strong> or drag & drop / paste image (Ctrl+V)
                        </p>
                        <span class="dropzone-subtext">PNG, JPG, JPEG, WEBP, GIF, or PDF (up to 15 MB)</span>
                      </div>
                    }
                  </div>
                }

                @if (uploadError()) {
                  <div class="upload-error-msg">{{ uploadError() }}</div>
                }
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="txnForm.invalid || isSaving() || isUploadingAttachment()">
                  {{ isSaving() ? 'Saving...' : (editingId() ? 'Save Changes' : 'Record Transaction') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Full-Screen Lightbox / Document Viewer Modal -->
      @if (viewerModalOpen() && viewerItem()) {
        <div class="lightbox-backdrop" (click)="closeViewer()">
          <div class="lightbox-dialog" (click)="$event.stopPropagation()">
            <!-- Header -->
            <div class="lightbox-header">
              <div class="lightbox-title-box">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" class="title-icon">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span class="lightbox-filename" [title]="viewerItem()?.fileName">{{ viewerItem()?.fileName }}</span>
                @if (viewerItem()?.size) {
                  <span class="lightbox-size">{{ formatFileSize(viewerItem()?.size) }}</span>
                }
              </div>

              <div class="lightbox-actions">
                @if (isImageFile(viewerItem()?.fileType, viewerItem()?.fileName)) {
                  <div class="lightbox-zoom-group">
                    <button type="button" class="btn-lightbox-icon" (click)="zoomOut()" title="Zoom out (-)">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                    <span class="zoom-value">{{ (viewerZoom() * 100).toFixed(0) }}%</span>
                    <button type="button" class="btn-lightbox-icon" (click)="zoomIn()" title="Zoom in (+)">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                    <button type="button" class="btn-lightbox-icon" (click)="rotate()" title="Rotate 90°">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                      </svg>
                    </button>
                    <button type="button" class="btn-lightbox-text" (click)="resetView()" title="Reset view">
                      Reset
                    </button>
                  </div>
                }

                <a
                  [href]="getDownloadUrl(viewerItem()?.url)"
                  [download]="viewerItem()?.fileName"
                  class="btn-lightbox-download"
                  title="Download original receipt"
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span>Download</span>
                </a>

                <button type="button" class="btn-lightbox-close" (click)="closeViewer()" title="Close viewer (Esc)">✕</button>
              </div>
            </div>

            <!-- Body / Stage -->
            <div class="lightbox-stage">
              @if (isImageFile(viewerItem()?.fileType, viewerItem()?.fileName)) {
                <div class="image-stage-wrap">
                  <img
                    [src]="viewerItem()?.url"
                    [alt]="viewerItem()?.fileName"
                    class="lightbox-image"
                    [style.transform]="'scale(' + viewerZoom() + ') rotate(' + viewerRotation() + 'deg)'"
                  />
                </div>
              } @else if (isPdfFile(viewerItem()?.fileType, viewerItem()?.fileName)) {
                <div class="pdf-stage-wrap">
                  @if (safeViewerUrl()) {
                    <iframe [src]="safeViewerUrl()" class="pdf-frame" title="PDF Document"></iframe>
                  }
                </div>
              } @else {
                <div class="generic-stage-wrap">
                  <p>Preview is not directly supported in-browser for this file format.</p>
                  <a [href]="getDownloadUrl(viewerItem()?.url)" class="btn-console-pill primary" download>Download File</a>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent implements OnInit {
  private readonly transactionsService = inject(TransactionsService);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  public readonly deletionPermissionsService = inject(DeletionPermissionsService);
  public readonly themeService = inject(ThemeService);

  readonly transactions = signal<Transaction[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly summary = signal<MonthlySummary | null>(null);

  readonly availableYears: number[] = [2028, 2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020];
  readonly now = new Date();
  readonly selectedFilterYear = signal<number>(new Date().getFullYear());
  readonly selectedFilterMonth = signal<number | 'all'>(new Date().getMonth() + 1);
  readonly popoverYear = signal<number>(new Date().getFullYear());

  readonly monthsList = [
    { value: 1, name: 'Jan', fullName: 'January' },
    { value: 2, name: 'Feb', fullName: 'February' },
    { value: 3, name: 'Mar', fullName: 'March' },
    { value: 4, name: 'Apr', fullName: 'April' },
    { value: 5, name: 'May', fullName: 'May' },
    { value: 6, name: 'Jun', fullName: 'June' },
    { value: 7, name: 'Jul', fullName: 'July' },
    { value: 8, name: 'Aug', fullName: 'August' },
    { value: 9, name: 'Sep', fullName: 'September' },
    { value: 10, name: 'Oct', fullName: 'October' },
    { value: 11, name: 'Nov', fullName: 'November' },
    { value: 12, name: 'Dec', fullName: 'December' },
  ];

  readonly selectedMonth = signal<string>(new Date().toISOString().substring(0, 7));
  readonly selectedType = signal<TransactionType | null>(null);
  readonly selectedCategory = signal<string | null>(null);
  readonly searchTerm = signal<string>('');

  // Custom Date Filter States
  readonly activeDatePreset = signal<DatePreset>('month');
  readonly isDateDropdownOpen = signal<boolean>(false);
  readonly customStartDate = signal<string>('');
  readonly customEndDate = signal<string>('');

  // Pagination States
  readonly totalCount = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(100);

  paginationStart(): number {
    if (this.totalCount() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  paginationEnd(): number {
    return Math.min(this.currentPage() * this.pageSize(), this.totalCount());
  }

  onPageSizeChange(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    this.pageSize.set(val);
    this.currentPage.set(1);
    this.loadTransactions();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadTransactions();
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.isDateDropdownOpen.set(false);
  }

  toggleDateDropdown(event: Event): void {
    event.stopPropagation();
    this.isDateDropdownOpen.update(v => !v);
  }

  closeDateDropdown(): void {
    this.isDateDropdownOpen.set(false);
  }

  onFilterMonthChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    if (val === 'all') {
      this.selectedFilterMonth.set('all');
      this.activeDatePreset.set('year');
    } else {
      const numMo = Number(val);
      this.selectedFilterMonth.set(numMo);
      this.activeDatePreset.set('month');
      this.selectedMonth.set(`${this.selectedFilterYear()}-${String(numMo).padStart(2, '0')}`);
    }
    this.currentPage.set(1);
    this.loadTransactions();
  }

  onFilterYearChange(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    this.selectedFilterYear.set(val);
    this.popoverYear.set(val);
    const mo = this.selectedFilterMonth();
    if (mo !== 'all') {
      this.selectedMonth.set(`${val}-${String(mo).padStart(2, '0')}`);
    }
    this.currentPage.set(1);
    this.loadTransactions();
  }

  stepMonth(delta: number): void {
    let yr = this.selectedFilterYear();
    let mo = this.selectedFilterMonth();
    if (mo === 'all') {
      yr += delta;
      this.selectedFilterYear.set(yr);
      this.popoverYear.set(yr);
      this.activeDatePreset.set('year');
    } else {
      let numMo = Number(mo) + delta;
      if (numMo < 1) {
        numMo = 12;
        yr -= 1;
      } else if (numMo > 12) {
        numMo = 1;
        yr += 1;
      }
      this.selectedFilterYear.set(yr);
      this.popoverYear.set(yr);
      this.selectedFilterMonth.set(numMo);
      this.selectedMonth.set(`${yr}-${String(numMo).padStart(2, '0')}`);
      this.activeDatePreset.set('month');
    }
    this.currentPage.set(1);
    this.loadTransactions();
  }

  stepPopoverYear(delta: number): void {
    this.popoverYear.update(y => y + delta);
  }

  onPopoverYearChange(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    this.popoverYear.set(val);
  }

  selectMonthAndYear(month: number | 'all', year?: number): void {
    const targetYear = year ?? this.popoverYear();
    this.selectedFilterYear.set(targetYear);
    this.popoverYear.set(targetYear);
    this.selectedFilterMonth.set(month);
    if (month === 'all') {
      this.activeDatePreset.set('year');
    } else {
      this.activeDatePreset.set('month');
      this.selectedMonth.set(`${targetYear}-${String(month).padStart(2, '0')}`);
    }
    this.isDateDropdownOpen.set(false);
    this.currentPage.set(1);
    this.loadTransactions();
  }

  applyPreset(preset: DatePreset): void {
    this.activeDatePreset.set(preset);
    const now = new Date();
    if (preset === 'month') {
      const yr = now.getFullYear();
      const mo = now.getMonth() + 1;
      this.selectedFilterYear.set(yr);
      this.selectedFilterMonth.set(mo);
      this.popoverYear.set(yr);
      this.selectedMonth.set(`${yr}-${String(mo).padStart(2, '0')}`);
    } else if (preset === 'lastMonth') {
      const prevM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const yr = prevM.getFullYear();
      const mo = prevM.getMonth() + 1;
      this.selectedFilterYear.set(yr);
      this.selectedFilterMonth.set(mo);
      this.popoverYear.set(yr);
      this.selectedMonth.set(`${yr}-${String(mo).padStart(2, '0')}`);
    } else if (preset === 'thisYear') {
      const yr = now.getFullYear();
      this.selectedFilterYear.set(yr);
      this.selectedFilterMonth.set('all');
      this.popoverYear.set(yr);
    }
    this.isDateDropdownOpen.set(false);
    this.currentPage.set(1);
    this.loadTransactions();
  }

  onCustomStartDateChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.customStartDate.set(val);
  }

  onCustomEndDateChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.customEndDate.set(val);
  }

  applyCustomRange(): void {
    if (this.customStartDate() && this.customEndDate()) {
      this.activeDatePreset.set('custom');
      this.isDateDropdownOpen.set(false);
      this.currentPage.set(1);
      this.loadTransactions();
    }
  }

  resetToCurrentMonth(event?: Event): void {
    if (event) event.stopPropagation();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    this.selectedFilterYear.set(currentYear);
    this.selectedFilterMonth.set(currentMonth);
    this.popoverYear.set(currentYear);
    this.selectedMonth.set(`${currentYear}-${String(currentMonth).padStart(2, '0')}`);
    this.activeDatePreset.set('month');
    this.customStartDate.set('');
    this.customEndDate.set('');
    this.isDateDropdownOpen.set(false);
    this.currentPage.set(1);
    this.loadTransactions();
  }

  isCustomOrPresetActive(): boolean {
    const p = this.activeDatePreset();
    if (p === 'custom' || p === 'today' || p === 'yesterday' || p === 'thisWeek' || p === 'last7Days' || p === 'last30Days' || p === 'all') {
      return true;
    }
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    if (p === 'year') {
      return this.selectedFilterYear() !== currentYear;
    }
    if (p === 'month') {
      return this.selectedFilterYear() !== currentYear || this.selectedFilterMonth() !== currentMonth;
    }
    return false;
  }

  dateFilterLabel(): string {
    const p = this.activeDatePreset();
    if (p === 'today') return '⚡ Today';
    if (p === 'yesterday') return 'Yesterday';
    if (p === 'thisWeek') return 'This Week';
    if (p === 'last7Days') return 'Last 7 Days';
    if (p === 'month') {
      const mo = this.selectedFilterMonth();
      const yr = this.selectedFilterYear();
      if (mo === 'all') return `Year ${yr}`;
      const mObj = this.monthsList.find(m => m.value === mo);
      return `${mObj ? mObj.name : mo} ${yr}`;
    }
    if (p === 'year') return `Year ${this.selectedFilterYear()}`;
    if (p === 'lastMonth') return 'Last Month';
    if (p === 'last30Days') return 'Last 30 Days';
    if (p === 'thisYear') return `Year ${new Date().getFullYear()}`;
    if (p === 'all') return 'All Time';
    if (p === 'custom') {
      if (this.customStartDate() && this.customEndDate()) {
        return `${this.formatShortDate(this.customStartDate())} - ${this.formatShortDate(this.customEndDate())}`;
      }
      return 'Custom Range';
    }
    return 'Filter Date';
  }

  private formatShortDate(iso: string): string {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    }
    return iso;
  }

  private formatDateIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  readonly isLoading = signal<boolean>(false);
  readonly isModalOpen = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly editingId = signal<string | null>(null);

  // Attachment state for Create/Edit Modal
  readonly currentAttachment = signal<AttachmentMetadata | null>(null);
  readonly isUploadingAttachment = signal<boolean>(false);
  readonly uploadError = signal<string | null>(null);
  readonly isDragging = signal<boolean>(false);

  // Lightbox Viewer state
  readonly viewerModalOpen = signal<boolean>(false);
  readonly viewerItem = signal<{ url: string; fileName: string; fileType?: string; size?: number } | null>(null);
  readonly viewerZoom = signal<number>(1);
  readonly viewerRotation = signal<number>(0);
  readonly safeViewerUrl = signal<SafeResourceUrl | null>(null);

  readonly txnForm = this.fb.group({
    type: [2 as TransactionType, [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    categoryId: ['', [Validators.required]],
    transactionDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
    note: ['']
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadTransactions();
  }

  loadCategories(): void {
    this.transactionsService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats)
    });
  }

  loadTransactions(): void {
    this.isLoading.set(true);

    const preset = this.activeDatePreset();
    let monthParam: string | undefined = undefined;
    let startParam: string | undefined = undefined;
    let endParam: string | undefined = undefined;

    if (preset === 'month') {
      const yr = this.selectedFilterYear();
      const mo = this.selectedFilterMonth();
      if (mo === 'all') {
        startParam = `${yr}-01-01`;
        endParam = `${yr}-12-31`;
      } else {
        monthParam = `${yr}-${String(mo).padStart(2, '0')}`;
      }
    } else if (preset === 'year') {
      const yr = this.selectedFilterYear();
      startParam = `${yr}-01-01`;
      endParam = `${yr}-12-31`;
    } else if (preset === 'all') {
      monthParam = 'all';
    } else if (preset === 'today') {
      const today = this.formatDateIso(new Date());
      startParam = today;
      endParam = today;
    } else if (preset === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const y = this.formatDateIso(d);
      startParam = y;
      endParam = y;
    } else if (preset === 'thisWeek') {
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      startParam = this.formatDateIso(monday);
      endParam = this.formatDateIso(now);
    } else if (preset === 'last7Days') {
      const now = new Date();
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      startParam = this.formatDateIso(past);
      endParam = this.formatDateIso(now);
    } else if (preset === 'lastMonth') {
      const now = new Date();
      const prevM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prevM.getFullYear();
      const m = String(prevM.getMonth() + 1).padStart(2, '0');
      monthParam = `${y}-${m}`;
    } else if (preset === 'last30Days') {
      const now = new Date();
      const past = new Date(now);
      past.setDate(now.getDate() - 29);
      startParam = this.formatDateIso(past);
      endParam = this.formatDateIso(now);
    } else if (preset === 'thisYear') {
      const now = new Date();
      startParam = `${now.getFullYear()}-01-01`;
      endParam = `${now.getFullYear()}-12-31`;
    } else if (preset === 'custom') {
      startParam = this.customStartDate();
      endParam = this.customEndDate();
    }

    this.transactionsService.getTransactions({
      month: monthParam,
      startDate: startParam,
      endDate: endParam,
      type: this.selectedType() || undefined,
      categoryId: this.selectedCategory() || undefined,
      search: this.searchTerm() || undefined,
      page: this.currentPage(),
      pageSize: this.pageSize()
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.transactions.set(res.transactions.items);
        this.totalCount.set(res.transactions.totalCount);
        this.totalPages.set(res.transactions.totalPages);
        this.summary.set(res.summary);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onMonthChange(month: string): void {
    this.selectedMonth.set(month);
    this.currentPage.set(1);
    this.loadTransactions();
  }

  setTypeFilter(type: TransactionType | null): void {
    this.selectedType.set(type);
    this.currentPage.set(1);
    this.loadTransactions();
  }

  onCategoryChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedCategory.set(val || null);
    this.currentPage.set(1);
    this.loadTransactions();
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    this.currentPage.set(1);
    this.loadTransactions();
  }

  filteredModalCategories(): Category[] {
    const currentType = this.txnForm.get('type')?.value;
    return this.categories().filter(c => c.type === currentType);
  }

  onModalTypeChange(): void {
    const cats = this.filteredModalCategories();
    if (cats.length > 0) {
      this.txnForm.patchValue({ categoryId: cats[0].id });
    }
  }

  openCreateModal(): void {
    this.editingId.set(null);
    this.currentAttachment.set(null);
    this.uploadError.set(null);
    const initialType = (this.selectedType() || 2) as TransactionType;
    this.txnForm.reset({
      type: initialType,
      amount: null,
      categoryId: '',
      transactionDate: new Date().toISOString().substring(0, 10),
      note: ''
    });
    this.onModalTypeChange();
    this.isModalOpen.set(true);
  }

  openEditModal(txn: Transaction): void {
    this.editingId.set(txn.id);
    this.uploadError.set(null);

    if (txn.attachmentUrl || txn.attachmentId) {
      this.currentAttachment.set({
        id: txn.attachmentId || '',
        fileName: txn.attachmentFileName || 'Receipt',
        originalFileName: txn.attachmentFileName || 'Receipt',
        contentType: txn.attachmentFileType || 'image/jpeg',
        fileSizeBytes: txn.attachmentFileSize || 0,
        fileUrl: txn.attachmentUrl || `/api/v1/attachments/${txn.attachmentId}`
      });
    } else {
      this.currentAttachment.set(null);
    }

    this.txnForm.patchValue({
      type: txn.type,
      amount: txn.amount,
      categoryId: txn.categoryId,
      transactionDate: txn.transactionDate.substring(0, 10),
      note: txn.note || ''
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  // --- Attachment Upload & Drag-and-Drop & Clipboard Paste Handlers ---
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFile(input.files[0]);
      input.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.uploadFile(event.dataTransfer.files[0]);
    }
  }

  @HostListener('window:paste', ['$event'])
  onWindowPaste(event: ClipboardEvent): void {
    if (!this.isModalOpen()) return;
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          this.uploadFile(file);
          break;
        }
      }
    }
  }

  uploadFile(file: File): void {
    // Check 15MB limit
    if (file.size > 15 * 1024 * 1024) {
      this.uploadError.set('File size exceeds the 15 MB limit.');
      return;
    }

    this.isUploadingAttachment.set(true);
    this.uploadError.set(null);

    this.transactionsService.uploadAttachment(file).subscribe({
      next: (metadata) => {
        this.currentAttachment.set(metadata);
        this.isUploadingAttachment.set(false);
        this.themeService.playSuccessSound();
      },
      error: (err) => {
        this.isUploadingAttachment.set(false);
        const msg = err?.error?.error || 'Failed to upload attachment. Please ensure it is an image or PDF.';
        this.uploadError.set(msg);
      }
    });
  }

  removeAttachment(): void {
    this.currentAttachment.set(null);
    this.uploadError.set(null);
  }

  // --- Lightbox / Viewer Helpers ---
  openViewerForTxn(txn: Transaction, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const url = txn.attachmentUrl || (txn.attachmentId ? `/api/v1/attachments/${txn.attachmentId}` : '');
    if (!url) return;

    this.viewerItem.set({
      url,
      fileName: txn.attachmentFileName || 'Receipt',
      fileType: txn.attachmentFileType,
      size: txn.attachmentFileSize
    });

    if (this.isPdfFile(txn.attachmentFileType, txn.attachmentFileName)) {
      this.safeViewerUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    } else {
      this.safeViewerUrl.set(null);
    }

    this.viewerZoom.set(1);
    this.viewerRotation.set(0);
    this.viewerModalOpen.set(true);
  }

  openViewerForCurrent(): void {
    const att = this.currentAttachment();
    if (!att) return;

    this.viewerItem.set({
      url: att.fileUrl,
      fileName: att.originalFileName,
      fileType: att.contentType,
      size: att.fileSizeBytes
    });

    if (this.isPdfFile(att.contentType, att.originalFileName)) {
      this.safeViewerUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(att.fileUrl));
    } else {
      this.safeViewerUrl.set(null);
    }

    this.viewerZoom.set(1);
    this.viewerRotation.set(0);
    this.viewerModalOpen.set(true);
  }

  closeViewer(): void {
    this.viewerModalOpen.set(false);
    this.viewerItem.set(null);
    this.safeViewerUrl.set(null);
  }

  zoomIn(): void {
    this.viewerZoom.update(z => Math.min(Number((z + 0.25).toFixed(2)), 3.0));
  }

  zoomOut(): void {
    this.viewerZoom.update(z => Math.max(Number((z - 0.25).toFixed(2)), 0.5));
  }

  rotate(): void {
    this.viewerRotation.update(r => (r + 90) % 360);
  }

  resetView(): void {
    this.viewerZoom.set(1);
    this.viewerRotation.set(0);
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.viewerModalOpen()) {
      this.closeViewer();
    } else if (this.isModalOpen()) {
      this.closeModal();
    }
  }

  isImageFile(fileType?: string, fileName?: string): boolean {
    if (fileType && fileType.startsWith('image/')) return true;
    if (!fileName) return true; // Default fallback to image display
    const lower = fileName.toLowerCase();
    return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') ||
           lower.endsWith('.webp') || lower.endsWith('.gif') || lower.endsWith('.bmp') || lower.endsWith('.svg');
  }

  isPdfFile(fileType?: string, fileName?: string): boolean {
    if (fileType === 'application/pdf') return true;
    if (!fileName) return false;
    return fileName.toLowerCase().endsWith('.pdf');
  }

  formatFileSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getDownloadUrl(url?: string): string {
    if (!url) return '';
    if (url.includes('/api/v1/attachments/') && !url.includes('/download')) {
      return `${url}/download`;
    }
    return url;
  }

  // --- Submit & Delete ---
  onSubmit(): void {
    if (this.txnForm.invalid) return;

    this.isSaving.set(true);
    const val = this.txnForm.getRawValue();
    const att = this.currentAttachment();

    const payload = {
      type: val.type!,
      amount: Number(val.amount!),
      categoryId: val.categoryId!,
      transactionDate: val.transactionDate!,
      note: val.note || undefined,
      attachmentId: att ? att.id : undefined,
      attachmentUrl: att ? att.fileUrl : undefined,
      attachmentFileName: att ? att.originalFileName : undefined,
      attachmentFileType: att ? att.contentType : undefined,
      attachmentFileSize: att ? att.fileSizeBytes : undefined
    };

    if (this.editingId()) {
      this.transactionsService.updateTransaction(this.editingId()!, payload).subscribe({
        next: () => {
          this.themeService.playSuccessSound();
          this.isSaving.set(false);
          this.closeModal();
          this.loadTransactions();
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.transactionsService.createTransaction(payload).subscribe({
        next: () => {
          this.themeService.playSuccessSound();
          this.isSaving.set(false);
          this.closeModal();
          this.loadTransactions();
        },
        error: () => this.isSaving.set(false)
      });
    }
  }

  onDelete(id: string): void {
    if (!this.deletionPermissionsService.canDelete('transactions')) {
      alert('Deletion is disabled for Transactions in Settings. Please turn it ON under Settings > Deletion Controls.');
      return;
    }
    if (confirm('Are you sure you want to delete this transaction? It will be moved to the Recycle Bin.')) {
      this.transactionsService.deleteTransaction(id).subscribe({
        next: () => {
          this.themeService.playDeleteSound();
          this.loadTransactions();
        },
        error: (err) => {
          const msg = err?.error?.message || err?.error?.error || 'Failed to delete transaction.';
          alert(msg);
        }
      });
    }
  }
}
