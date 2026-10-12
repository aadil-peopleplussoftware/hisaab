import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { ThemeService } from '../../core/services/theme.service';
import { DeletionPermissionsService } from '../../core/services/deletion-permissions.service';
import { BusinessService } from './services/business.service';
import {
  Business,
  BusinessPaymentStatus,
  BusinessPnLSummary,
  BusinessTransaction,
  BusinessTransactionType,
  BusinessType,
  CreateBusinessRequest,
  CreateBusinessTransactionRequest,
  UpdateBusinessRequest,
  UpdateBusinessTransactionRequest
} from './models/business.model';

@Component({
  selector: 'app-business',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, InrCurrencyPipe],
  template: `
    <div class="business-container">
      <!-- Top Header -->
      <header class="page-header">
        <div class="header-main">
          <div class="header-title-row">
            <div class="icon-avatar">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
                <line x1="12" y1="12" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <h1 class="page-title">Business & Ventures</h1>
              <p class="page-subtitle">
                Multi-entity bookkeeping, client invoicing, vendor OPEX, and real-time P&L intelligence.
              </p>
            </div>
          </div>

          <div class="header-actions">
            <button
              type="button"
              class="btn btn-outline"
              (click)="openNewBusinessModal()"
              title="Add New Venture"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New Business</span>
            </button>

            <button
              type="button"
              class="btn btn-primary"
              (click)="openNewTxnModal()"
              [disabled]="businesses().length === 0"
              title="Record Income or Expense"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>Record Transaction</span>
            </button>
          </div>
        </div>

        <!-- Business Entity Switcher Tabs -->
        <div class="business-nav-tabs">
          <button
            type="button"
            class="tab-btn"
            [class.active]="selectedBusinessId() === null"
            (click)="selectBusiness(null)"
          >
            <span class="tab-indicator all-indicator"></span>
            <span class="tab-label">Consolidated (All Ventures)</span>
            <span class="tab-badge">{{ businesses().length }}</span>
          </button>

          @for (biz of businesses(); track biz.id) {
            <div class="tab-pill-wrapper" [class.active]="selectedBusinessId() === biz.id">
              <button
                type="button"
                class="tab-btn tab-pill"
                (click)="selectBusiness(biz.id)"
              >
                <span class="tab-indicator" [style.backgroundColor]="biz.color || '#2563eb'"></span>
                <span class="tab-label">{{ biz.name }}</span>
                <span class="tab-type-tag">{{ biz.typeName }}</span>
              </button>
              @if (selectedBusinessId() === biz.id) {
                <button
                  type="button"
                  class="tab-edit-btn"
                  (click)="openEditBusinessModal(biz)"
                  title="Configure {{ biz.name }}"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>
              }
            </div>
          }
        </div>
      </header>

      @if (loading()) {
        <div class="state-card loading-state">
          <div class="spinner"></div>
          <p>Calculating financial metrics & ledger summaries...</p>
        </div>
      } @else if (businesses().length === 0) {
        <!-- Zero state when no business is created yet -->
        <div class="state-card empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
              <line x1="12" y1="12" x2="12" y2="15" />
            </svg>
          </div>
          <h2>No Business Ventures Registered</h2>
          <p>
            Create your first venture — whether it's freelancing, agency client work, a SaaS product, an e-commerce store, or consulting — to track revenue, expenses, and net profit margins.
          </p>
          <button type="button" class="btn btn-primary" (click)="openNewBusinessModal()">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Create Your First Business</span>
          </button>
        </div>
      } @else {
        <!-- Executive P&L Scorecard -->
        @if (activeSummary(); as summary) {
          <div class="scorecard-grid">
            <!-- Gross Revenue -->
            <div class="score-card revenue-card">
              <div class="card-head">
                <span class="card-label">GROSS REVENUE</span>
                <span class="trend-pill positive">Inflow</span>
              </div>
              <div class="card-value">{{ summary.grossRevenue | inrCurrency }}</div>
              <div class="card-footer">
                <span class="footer-text">Total client billing & receipts</span>
              </div>
            </div>

            <!-- OPEX / Expenses -->
            <div class="score-card expense-card">
              <div class="card-head">
                <span class="card-label">TOTAL OPEX & EXPENSES</span>
                <span class="trend-pill negative">Outflow</span>
              </div>
              <div class="card-value">{{ summary.totalExpenses | inrCurrency }}</div>
              <div class="card-footer">
                <span class="footer-text">Payroll, tools, ads & overhead</span>
              </div>
            </div>

            <!-- Net Profit / Loss -->
            <div class="score-card profit-card" [class.is-loss]="summary.netProfit < 0">
              <div class="card-head">
                <span class="card-label">NET PROFIT / LOSS</span>
                <span
                  class="trend-pill"
                  [class.positive]="summary.netProfit >= 0"
                  [class.negative]="summary.netProfit < 0"
                >
                  {{ summary.netProfit >= 0 ? 'NET PROFIT' : 'NET LOSS' }}
                </span>
              </div>
              <div class="card-value" [class.loss-value]="summary.netProfit < 0">
                {{ summary.netProfit | inrCurrency }}
              </div>
              <div class="card-footer">
                <span class="margin-badge">
                  <strong>{{ summary.profitMarginPercent }}%</strong> Profit Margin
                </span>
              </div>
            </div>

            <!-- Working Capital & Tax Overview -->
            <div class="score-card capital-card">
              <div class="card-head">
                <span class="card-label">RECEIVABLES & TAXES</span>
                <span class="trend-pill neutral">Balance</span>
              </div>
              <div class="metrics-split">
                <div class="split-col">
                  <span class="sub-label">Awaiting Collection</span>
                  <strong class="col-val text-amber">{{ summary.accountsReceivable | inrCurrency }}</strong>
                  <span class="sub-meta">{{ summary.pendingInvoicesCount }} pending</span>
                </div>
                <div class="split-col">
                  <span class="sub-label">Vendor Payables</span>
                  <strong class="col-val text-rose">{{ summary.accountsPayable | inrCurrency }}</strong>
                  <span class="sub-meta">{{ summary.overdueInvoicesCount }} overdue</span>
                </div>
              </div>
              <div class="tax-line">
                <span>Net Tax/GST Reserved:</span>
                <strong>{{ summary.netTaxLiability | inrCurrency }}</strong>
              </div>
            </div>
          </div>

          <!-- Financial Trend & Category Breakdown Visuals -->
          <div class="analytics-row">
            <!-- 6-Month Cashflow Trend -->
            <div class="chart-panel">
              <div class="panel-head">
                <div class="panel-title-group">
                  <span class="panel-title">6-Month Revenue vs. OPEX Trend</span>
                  <span class="panel-subtitle">Monthly cash flow & profitability trajectory</span>
                </div>
                <div class="chart-legend">
                  <span class="legend-item"><i class="dot rev-dot"></i> Revenue</span>
                  <span class="legend-item"><i class="dot exp-dot"></i> Expenses</span>
                </div>
              </div>

              <div class="bars-container">
                @for (m of summary.monthlyTrend; track m.monthKey) {
                  <div class="month-column">
                    <div class="bar-pair">
                      <!-- Revenue bar -->
                      <div
                        class="trend-bar bar-rev"
                        [style.height.%]="getBarHeight(m.revenue, maxMonthlyAmount(summary))"
                        [title]="'Revenue: ' + m.revenue"
                      ></div>
                      <!-- Expense bar -->
                      <div
                        class="trend-bar bar-exp"
                        [style.height.%]="getBarHeight(m.expense, maxMonthlyAmount(summary))"
                        [title]="'OPEX: ' + m.expense"
                      ></div>
                    </div>
                    <span class="month-lbl">{{ m.monthLabel }}</span>
                    <span
                      class="net-indicator"
                      [class.positive]="m.netProfit >= 0"
                      [class.negative]="m.netProfit < 0"
                    >
                      {{ m.netProfit >= 0 ? '+' : '' }}{{ formatK(m.netProfit) }}
                    </span>
                  </div>
                }
              </div>
            </div>

            <!-- OPEX Category Breakdown -->
            <div class="breakdown-panel">
              <div class="panel-head">
                <div class="panel-title-group">
                  <span class="panel-title">Expense Distribution</span>
                  <span class="panel-subtitle">Top operational cost drivers</span>
                </div>
              </div>

              <div class="breakdown-list">
                @if (expenseBreakdowns(summary).length === 0) {
                  <p class="empty-breakdown">No operational expenses recorded yet.</p>
                } @else {
                  @for (cat of expenseBreakdowns(summary); track cat.category) {
                    <div class="breakdown-item">
                      <div class="item-info">
                        <span class="cat-name">{{ cat.category }}</span>
                        <span class="cat-amount">{{ cat.amount | inrCurrency }} ({{ cat.percentage }}%)</span>
                      </div>
                      <div class="cat-progress-bg">
                        <div class="cat-progress-fill" [style.width.%]="cat.percentage"></div>
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          </div>
        }

        <!-- Bookkeeping Ledger Section -->
        <section class="ledger-section">
          <div class="ledger-header">
            <div class="ledger-title-group">
              <h2 class="section-title">Transactions Ledger</h2>
              <span class="badge badge-subtle">{{ filteredTransactions().length }} entries</span>
            </div>

            <div class="ledger-tools">
              <!-- Search -->
              <div class="search-input-box">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Filter client, vendor, invoice #..."
                  [(ngModel)]="searchQuery"
                  (ngModelChange)="onFilterChange()"
                />
              </div>

              <!-- Type Filter -->
              <select [(ngModel)]="filterType" (ngModelChange)="onFilterChange()" class="select-filter">
                <option value="">All Types</option>
                <option [value]="1">Revenue / Income</option>
                <option [value]="2">Expense / OPEX</option>
              </select>

              <!-- Status Filter -->
              <select [(ngModel)]="filterStatus" (ngModelChange)="onFilterChange()" class="select-filter">
                <option value="">All Statuses</option>
                <option [value]="1">Paid</option>
                <option [value]="2">Pending</option>
                <option [value]="3">Overdue</option>
                <option [value]="4">Cancelled</option>
              </select>

              <!-- CSV Export -->
              <button
                type="button"
                class="btn btn-outline btn-sm"
                (click)="exportTransactionsCsv()"
                title="Export filtered transactions as CSV"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <!-- Ledger Table -->
          <div class="table-responsive">
            <table class="ledger-table">
              <thead>
                <tr>
                  <th>Date & Ref</th>
                  <th>Counterparty / Entity</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Tax & Base</th>
                  <th class="text-right">Total Amount</th>
                  <th class="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                @if (filteredTransactions().length === 0) {
                  <tr>
                    <td colspan="7" class="table-empty-row">
                      <p>No transactions match your active filters.</p>
                    </td>
                  </tr>
                } @else {
                  @for (t of filteredTransactions(); track t.id) {
                    <tr class="ledger-row">
                      <!-- Date & Ref -->
                      <td>
                        <div class="cell-main">{{ t.transactionDate | date:'mediumDate' }}</div>
                        <div class="cell-sub">
                          @if (t.invoiceNumber) {
                            <span class="inv-chip">{{ t.invoiceNumber }}</span>
                          } @else {
                            <span>No ref</span>
                          }
                        </div>
                      </td>

                      <!-- Counterparty & Business -->
                      <td>
                        <div class="cell-main font-medium">{{ t.counterparty }}</div>
                        <div class="cell-sub">
                          <span class="entity-pill">{{ t.businessName }}</span>
                          @if (t.paymentMethod) {
                            <span class="method-chip">• {{ t.paymentMethod }}</span>
                          }
                        </div>
                      </td>

                      <!-- Category -->
                      <td>
                        <span class="category-chip" [class.cat-income]="t.type === 1" [class.cat-expense]="t.type === 2">
                          {{ t.category }}
                        </span>
                        @if (t.description) {
                          <div class="cell-notes" [title]="t.description">{{ t.description }}</div>
                        }
                      </td>

                      <!-- Payment Status -->
                      <td>
                        <div class="status-cell">
                          <span
                            class="status-chip"
                            [class.status-paid]="t.paymentStatus === 1"
                            [class.status-pending]="t.paymentStatus === 2"
                            [class.status-overdue]="t.paymentStatus === 3"
                            [class.status-cancelled]="t.paymentStatus === 4"
                          >
                            {{ t.paymentStatusName }}
                          </span>
                          @if (t.paymentStatus === 2 && t.dueDate) {
                            <span class="due-date">Due {{ t.dueDate | date:'shortDate' }}</span>
                          }
                        </div>
                      </td>

                      <!-- Tax & Base -->
                      <td>
                        <div class="cell-main">{{ t.amount | inrCurrency }}</div>
                        <div class="cell-sub tax-info">
                          Tax ({{ t.taxRatePercent }}%): {{ t.taxAmount | inrCurrency }}
                        </div>
                      </td>

                      <!-- Total Amount -->
                      <td class="text-right">
                        <div
                          class="amount-display font-semibold"
                          [class.text-income]="t.type === 1"
                          [class.text-expense]="t.type === 2"
                        >
                          {{ t.type === 1 ? '+' : '-' }}{{ t.totalAmount | inrCurrency }}
                        </div>
                      </td>

                      <!-- Actions -->
                      <td class="text-center actions-col">
                        <div class="action-buttons-row">
                          @if (t.paymentStatus === 2 || t.paymentStatus === 3) {
                            <button
                              type="button"
                              class="btn-icon btn-action-paid"
                              (click)="markAsPaid(t)"
                              title="Mark as Paid"
                            >
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </button>
                          }
                          <button
                            type="button"
                            class="btn-icon"
                            (click)="openEditTxnModal(t)"
                            title="Edit transaction"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            class="btn-icon btn-icon-danger"
                            (click)="deleteTransaction(t.id)"
                            title="Delete transaction"
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <!-- Modal: Create / Edit Business -->
      @if (showBusinessModal()) {
        <div class="modal-backdrop" (click)="closeBusinessModal()">
          <div class="modal-panel" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <h2 class="modal-title">
                {{ editingBusiness() ? 'Edit Venture: ' + editingBusiness()?.name : 'Register New Business Venture' }}
              </h2>
              <button type="button" class="btn-close" (click)="closeBusinessModal()">×</button>
            </div>

            <div class="modal-body">
              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Business Name <span class="req">*</span></label>
                  <input
                    type="text"
                    [(ngModel)]="businessForm.name"
                    placeholder="e.g. Acme Studio, Nexus SaaS"
                    class="form-control"
                  />
                </div>
                <div class="form-group flex-1">
                  <label>Legal Entity Name</label>
                  <input
                    type="text"
                    [(ngModel)]="businessForm.legalName"
                    placeholder="e.g. Acme Technologies LLP"
                    class="form-control"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Business Type</label>
                  <select [(ngModel)]="businessForm.type" class="form-control">
                    <option [value]="1">Freelance / Solo</option>
                    <option [value]="2">Agency / Studio</option>
                    <option [value]="3">SaaS / Tech Product</option>
                    <option [value]="4">E-Commerce</option>
                    <option [value]="5">Consulting & Advisory</option>
                    <option [value]="6">Retail / Trading</option>
                    <option [value]="7">Services</option>
                    <option [value]="8">Manufacturing</option>
                    <option [value]="9">Other</option>
                  </select>
                </div>
                <div class="form-group flex-1">
                  <label>Operating Currency</label>
                  <select [(ngModel)]="businessForm.currency" class="form-control">
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (AED)</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label>GSTIN / Tax Registration ID</label>
                  <input
                    type="text"
                    [(ngModel)]="businessForm.taxId"
                    placeholder="e.g. 27AABCB1234F1Z5"
                    class="form-control"
                  />
                </div>
                <div class="form-group flex-1">
                  <label>Brand Badge Color</label>
                  <div class="color-picker-row">
                    @for (col of brandColors; track col) {
                      <button
                        type="button"
                        class="color-swatch"
                        [style.backgroundColor]="col"
                        [class.selected]="businessForm.color === col"
                        (click)="businessForm.color = col"
                      ></button>
                    }
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Description / Notes</label>
                <textarea
                  [(ngModel)]="businessForm.description"
                  rows="2"
                  placeholder="Primary services, clients, or domain focus..."
                  class="form-control"
                ></textarea>
              </div>

              @if (editingBusiness()) {
                <div class="danger-zone">
                  <span class="danger-title">Delete this business</span>
                  <p class="danger-desc">
                    Permanently deletes this business entity and all associated income/expense records.
                  </p>
                  <button
                    type="button"
                    class="btn btn-danger btn-sm"
                    (click)="deleteBusiness(editingBusiness()!.id)"
                  >
                    Delete Venture
                  </button>
                </div>
              }
            </div>

            <div class="modal-foot">
              <button type="button" class="btn btn-secondary" (click)="closeBusinessModal()">Cancel</button>
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="!businessForm.name.trim()"
                (click)="saveBusiness()"
              >
                {{ editingBusiness() ? 'Update Business' : 'Create Business' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal: Record / Edit Transaction -->
      @if (showTxnModal()) {
        <div class="modal-backdrop" (click)="closeTxnModal()">
          <div class="modal-panel modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <h2 class="modal-title">
                {{ editingTxn() ? 'Edit Business Transaction' : 'Record Business Transaction' }}
              </h2>
              <button type="button" class="btn-close" (click)="closeTxnModal()">×</button>
            </div>

            <div class="modal-body">
              <!-- Type toggle -->
              <div class="txn-type-toggle">
                <button
                  type="button"
                  class="toggle-btn"
                  [class.active-income]="txnForm.type === 1"
                  (click)="setTxnType(1)"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                  <span>Client Revenue / Inflow</span>
                </button>
                <button
                  type="button"
                  class="toggle-btn"
                  [class.active-expense]="txnForm.type === 2"
                  (click)="setTxnType(2)"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                  <span>Business Expense / OPEX</span>
                </button>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Assign to Business <span class="req">*</span></label>
                  <select [(ngModel)]="txnForm.businessId" class="form-control">
                    @for (b of businesses(); track b.id) {
                      <option [value]="b.id">{{ b.name }} ({{ b.currency }})</option>
                    }
                  </select>
                </div>
                <div class="form-group flex-1">
                  <label>Category <span class="req">*</span></label>
                  <select [(ngModel)]="txnForm.category" class="form-control">
                    @for (cat of currentCategories(); track cat) {
                      <option [value]="cat">{{ cat }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Base Amount <span class="req">*</span></label>
                  <div class="input-with-prefix">
                    <span class="prefix-label">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      [(ngModel)]="txnForm.amount"
                      (ngModelChange)="onTxnAmountOrTaxChange()"
                      class="form-control"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div class="form-group flex-1">
                  <label>GST / Tax Rate %</label>
                  <select
                    [(ngModel)]="txnForm.taxRatePercent"
                    (ngModelChange)="onTxnAmountOrTaxChange()"
                    class="form-control"
                  >
                    <option [value]="0">0% (Nil / Exempt)</option>
                    <option [value]="5">5% GST</option>
                    <option [value]="12">12% GST</option>
                    <option [value]="18">18% GST (Standard)</option>
                    <option [value]="28">28% GST</option>
                  </select>
                </div>

                <div class="form-group flex-1">
                  <label>Calculated Total</label>
                  <div class="total-preview-box">
                    <strong>{{ calculateTotalPreview() | inrCurrency }}</strong>
                    <span class="sub-calc">Incl. {{ txnForm.taxAmount | inrCurrency }} Tax</span>
                  </div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label>
                    {{ txnForm.type === 1 ? 'Client Name' : 'Vendor / Contractor' }}
                    <span class="req">*</span>
                  </label>
                  <input
                    type="text"
                    [(ngModel)]="txnForm.counterparty"
                    [placeholder]="txnForm.type === 1 ? 'e.g. Acme Corp, Jane Doe' : 'e.g. AWS, Figma, Landlord'"
                    class="form-control"
                  />
                </div>
                <div class="form-group flex-1">
                  <label>Invoice / Reference #</label>
                  <input
                    type="text"
                    [(ngModel)]="txnForm.invoiceNumber"
                    placeholder="e.g. INV-2026-0042, PO-102"
                    class="form-control"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Transaction Date <span class="req">*</span></label>
                  <input type="date" [(ngModel)]="txnForm.transactionDate" class="form-control" />
                </div>
                <div class="form-group flex-1">
                  <label>Due Date (For Receivables/Payables)</label>
                  <input type="date" [(ngModel)]="txnForm.dueDate" class="form-control" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label>Payment Status</label>
                  <select [(ngModel)]="txnForm.paymentStatus" class="form-control">
                    <option [value]="1">Paid</option>
                    <option [value]="2">Pending / Awaiting</option>
                    <option [value]="3">Overdue</option>
                    <option [value]="4">Cancelled</option>
                  </select>
                </div>
                <div class="form-group flex-1">
                  <label>Payment Method</label>
                  <select [(ngModel)]="txnForm.paymentMethod" class="form-control">
                    <option value="Bank Transfer (NEFT/IMPS)">Bank Transfer (NEFT/IMPS)</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Stripe / Razorpay">Stripe / Razorpay</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Description / Line Item Notes</label>
                <textarea
                  [(ngModel)]="txnForm.description"
                  rows="2"
                  placeholder="Service deliverables, milestone details, or vendor notes..."
                  class="form-control"
                ></textarea>
              </div>
            </div>

            <div class="modal-foot">
              <button type="button" class="btn btn-secondary" (click)="closeTxnModal()">Cancel</button>
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="!txnForm.businessId || !txnForm.counterparty.trim() || txnForm.amount <= 0"
                (click)="saveTransaction()"
              >
                {{ editingTxn() ? 'Update Entry' : 'Save Transaction' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .business-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-bottom: 3rem;
    }

    /* Page Header */
    .page-header {
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: 8px;
      padding: 1.25rem 1.5rem 0 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .header-main {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .header-title-row {
      display: flex;
      gap: 0.85rem;
      align-items: center;
    }

    .icon-avatar {
      width: 42px;
      height: 42px;
      border-radius: 8px;
      background: rgba(37, 99, 235, 0.1);
      color: #2563eb;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .page-title {
      font-size: 1.35rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .page-subtitle {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin: 0.2rem 0 0 0;
    }

    .header-actions {
      display: flex;
      gap: 0.65rem;
      align-items: center;
    }

    /* Business Tabs */
    .business-nav-tabs {
      display: flex;
      gap: 0.5rem;
      border-top: 1px solid var(--border-default);
      padding: 0.75rem 0;
      overflow-x: auto;
      scrollbar-width: thin;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.85rem;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.825rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .tab-btn:hover {
      background: var(--bg-canvas);
      color: var(--text-primary);
    }

    .tab-btn.active {
      background: var(--bg-canvas);
      border-color: var(--border-default);
      color: var(--text-primary);
      font-weight: 600;
    }

    .tab-pill-wrapper {
      display: inline-flex;
      align-items: center;
      border-radius: 6px;
      transition: background 0.15s;
    }

    .tab-pill-wrapper.active {
      background: var(--bg-canvas);
      border: 1px solid var(--border-default);
    }

    .tab-pill-wrapper.active .tab-btn {
      background: transparent;
      border: none;
    }

    .tab-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .all-indicator {
      background: #8b5cf6;
    }

    .tab-badge {
      background: rgba(140, 149, 159, 0.2);
      border-radius: 10px;
      font-size: 0.7rem;
      padding: 0.1rem 0.45rem;
      font-weight: 600;
    }

    .tab-type-tag {
      font-size: 0.7rem;
      color: var(--text-muted, #8b949e);
      background: rgba(140, 149, 159, 0.15);
      padding: 0.05rem 0.35rem;
      border-radius: 4px;
    }

    .tab-edit-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      padding: 0.35rem 0.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      border-radius: 4px;
    }

    .tab-edit-btn:hover {
      color: var(--text-primary);
    }

    /* Scorecards */
    .scorecard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }

    .score-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: 8px;
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
      letter-spacing: 0.04em;
    }

    .card-value {
      font-size: 1.65rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
    }

    .card-value.loss-value {
      color: #ef4444;
    }

    .card-footer {
      font-size: 0.775rem;
      color: var(--text-secondary);
      margin-top: auto;
    }

    .trend-pill {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }

    .trend-pill.positive {
      background: rgba(34, 197, 94, 0.15);
      color: #16a34a;
    }

    .trend-pill.negative {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .trend-pill.neutral {
      background: rgba(140, 149, 159, 0.15);
      color: var(--text-secondary);
    }

    .margin-badge {
      display: inline-block;
      color: #16a34a;
      font-weight: 500;
    }

    .profit-card.is-loss .margin-badge {
      color: #ef4444;
    }

    .metrics-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-top: 0.25rem;
    }

    .split-col {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .sub-label {
      font-size: 0.7rem;
      color: var(--text-secondary);
    }

    .col-val {
      font-size: 0.95rem;
    }

    .text-amber {
      color: #f59e0b;
    }

    .text-rose {
      color: #ef4444;
    }

    .sub-meta {
      font-size: 0.7rem;
      color: var(--text-secondary);
    }

    .tax-line {
      display: flex;
      justify-content: space-between;
      border-top: 1px dashed var(--border-default);
      padding-top: 0.4rem;
      margin-top: 0.4rem;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* Analytics Row */
    .analytics-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 900px) {
      .analytics-row {
        grid-template-columns: 1fr;
      }
    }

    .chart-panel, .breakdown-panel {
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: 8px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .panel-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .panel-title-group {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .panel-title {
      font-size: 0.925rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .panel-subtitle {
      font-size: 0.775rem;
      color: var(--text-secondary);
    }

    .chart-legend {
      display: flex;
      gap: 0.85rem;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 2px;
      display: inline-block;
    }

    .rev-dot { background: #16a34a; }
    .exp-dot { background: #ef4444; }

    .bars-container {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 0.75rem;
      height: 180px;
      align-items: flex-end;
      padding-top: 1rem;
      border-bottom: 1px solid var(--border-default);
      padding-bottom: 0.5rem;
    }

    .month-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
      gap: 0.35rem;
    }

    .bar-pair {
      display: flex;
      gap: 3px;
      align-items: flex-end;
      height: 120px;
      width: 100%;
      justify-content: center;
    }

    .trend-bar {
      width: 14px;
      min-height: 4px;
      border-radius: 3px 3px 0 0;
      transition: height 0.3s ease;
    }

    .bar-rev {
      background: #16a34a;
    }

    .bar-exp {
      background: #ef4444;
    }

    .month-lbl {
      font-size: 0.725rem;
      color: var(--text-secondary);
    }

    .net-indicator {
      font-size: 0.675rem;
      font-weight: 600;
    }

    .net-indicator.positive { color: #16a34a; }
    .net-indicator.negative { color: #ef4444; }

    /* Breakdown list */
    .breakdown-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .empty-breakdown {
      font-size: 0.825rem;
      color: var(--text-secondary);
      font-style: italic;
    }

    .breakdown-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .item-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
    }

    .cat-name {
      color: var(--text-primary);
      font-weight: 500;
    }

    .cat-amount {
      color: var(--text-secondary);
      font-size: 0.75rem;
    }

    .cat-progress-bg {
      height: 6px;
      border-radius: 3px;
      background: rgba(140, 149, 159, 0.15);
      overflow: hidden;
    }

    .cat-progress-fill {
      height: 100%;
      background: #ef4444;
      border-radius: 3px;
    }

    /* Ledger Section */
    .ledger-section {
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
    }

    .ledger-header {
      padding: 1rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      border-bottom: 1px solid var(--border-default);
    }

    .ledger-title-group {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .badge-subtle {
      font-size: 0.725rem;
      background: rgba(140, 149, 159, 0.15);
      color: var(--text-secondary);
      padding: 0.15rem 0.5rem;
      border-radius: 12px;
      font-weight: 500;
    }

    .ledger-tools {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .search-input-box {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      background: var(--bg-canvas);
      border: 1px solid var(--border-default);
      border-radius: 6px;
      padding: 0.35rem 0.65rem;
      color: var(--text-secondary);
    }

    .search-input-box input {
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-size: 0.8rem;
      min-width: 170px;
    }

    .select-filter {
      background: var(--bg-canvas);
      border: 1px solid var(--border-default);
      border-radius: 6px;
      padding: 0.35rem 0.6rem;
      color: var(--text-primary);
      font-size: 0.8rem;
      outline: none;
    }

    /* Table */
    .table-responsive {
      overflow-x: auto;
    }

    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.825rem;
      text-align: left;
    }

    .ledger-table th {
      padding: 0.75rem 1rem;
      background: var(--bg-canvas);
      color: var(--text-secondary);
      font-size: 0.725rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-bottom: 1px solid var(--border-default);
    }

    .ledger-row td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--border-default);
      vertical-align: middle;
    }

    .ledger-row:hover {
      background: rgba(140, 149, 159, 0.04);
    }

    .cell-main {
      color: var(--text-primary);
    }

    .cell-sub {
      font-size: 0.725rem;
      color: var(--text-secondary);
      margin-top: 0.15rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .inv-chip {
      font-family: monospace;
      font-size: 0.7rem;
      background: rgba(140, 149, 159, 0.15);
      padding: 0.1rem 0.35rem;
      border-radius: 3px;
    }

    .entity-pill {
      background: rgba(37, 99, 235, 0.1);
      color: #2563eb;
      font-size: 0.7rem;
      padding: 0.1rem 0.4rem;
      border-radius: 3px;
      font-weight: 500;
    }

    .category-chip {
      display: inline-block;
      font-size: 0.725rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 500;
    }

    .cat-income {
      background: rgba(34, 197, 94, 0.12);
      color: #16a34a;
    }

    .cat-expense {
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
    }

    .cell-notes {
      font-size: 0.7rem;
      color: var(--text-secondary);
      margin-top: 0.2rem;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status-cell {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .status-chip {
      display: inline-block;
      font-size: 0.7rem;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-weight: 600;
      width: fit-content;
    }

    .status-paid {
      background: rgba(34, 197, 94, 0.15);
      color: #16a34a;
    }

    .status-pending {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }

    .status-overdue {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .status-cancelled {
      background: rgba(140, 149, 159, 0.2);
      color: var(--text-secondary);
    }

    .due-date {
      font-size: 0.675rem;
      color: var(--text-secondary);
    }

    .tax-info {
      font-size: 0.7rem;
    }

    .text-income {
      color: #16a34a;
    }

    .text-expense {
      color: #ef4444;
    }

    .actions-col {
      width: 110px;
    }

    .action-buttons-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
    }

    .btn-icon {
      background: transparent;
      border: 1px solid transparent;
      border-radius: 5px;
      padding: 0.3rem;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    .btn-icon:hover {
      background: var(--bg-canvas);
      border-color: var(--border-default);
      color: var(--text-primary);
    }

    .btn-action-paid {
      color: #16a34a;
      background: rgba(34, 197, 94, 0.1);
    }

    .btn-action-paid:hover {
      background: #16a34a;
      color: #ffffff;
    }

    .btn-icon-danger:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .table-empty-row {
      text-align: center;
      padding: 2.5rem 1rem !important;
      color: var(--text-secondary);
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999;
      padding: 1rem;
    }

    .modal-panel {
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: 10px;
      width: 100%;
      max-width: 540px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
      max-height: 90vh;
    }

    .modal-lg {
      max-width: 680px;
    }

    .modal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.15rem 1.5rem;
      border-bottom: 1px solid var(--border-default);
    }

    .modal-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 1.35rem;
      cursor: pointer;
      line-height: 1;
    }

    .modal-body {
      padding: 1.25rem 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .modal-foot {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-default);
      display: flex;
      justify-content: flex-end;
      gap: 0.65rem;
    }

    /* Forms */
    .form-row {
      display: flex;
      gap: 0.85rem;
    }

    .flex-1 {
      flex: 1;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-group label {
      font-size: 0.775rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .req {
      color: #ef4444;
    }

    .form-control {
      background: var(--bg-canvas);
      border: 1px solid var(--border-default);
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      color: var(--text-primary);
      font-size: 0.85rem;
      outline: none;
      width: 100%;
      box-sizing: border-box;
    }

    .form-control:focus {
      border-color: #2563eb;
    }

    .input-with-prefix {
      display: flex;
      align-items: center;
      background: var(--bg-canvas);
      border: 1px solid var(--border-default);
      border-radius: 6px;
      padding: 0 0.5rem;
    }

    .prefix-label {
      color: var(--text-secondary);
      font-size: 0.85rem;
      padding-right: 0.25rem;
    }

    .input-with-prefix .form-control {
      border: none;
      padding-left: 0.25rem;
    }

    .total-preview-box {
      background: var(--bg-canvas);
      border: 1px solid var(--border-default);
      border-radius: 6px;
      padding: 0.45rem 0.75rem;
      display: flex;
      flex-direction: column;
      font-size: 0.95rem;
      color: var(--text-primary);
    }

    .sub-calc {
      font-size: 0.7rem;
      color: var(--text-secondary);
    }

    .color-picker-row {
      display: flex;
      gap: 0.45rem;
      align-items: center;
    }

    .color-swatch {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
    }

    .color-swatch.selected {
      border-color: var(--text-primary);
      transform: scale(1.15);
    }

    .txn-type-toggle {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      background: var(--bg-canvas);
      border: 1px solid var(--border-default);
      border-radius: 8px;
      padding: 0.25rem;
    }

    .toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.825rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }

    .toggle-btn.active-income {
      background: rgba(34, 197, 94, 0.15);
      color: #16a34a;
      font-weight: 600;
    }

    .toggle-btn.active-expense {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      font-weight: 600;
    }

    .danger-zone {
      margin-top: 0.5rem;
      border: 1px solid rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.05);
      border-radius: 6px;
      padding: 0.85rem;
    }

    .danger-title {
      font-size: 0.825rem;
      font-weight: 600;
      color: #ef4444;
    }

    .danger-desc {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin: 0.25rem 0 0.65rem 0;
    }

    /* Common states */
    .state-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: 8px;
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .empty-state h2 {
      font-size: 1.25rem;
      color: var(--text-primary);
      margin: 0;
    }

    .empty-state p {
      max-width: 520px;
      color: var(--text-secondary);
      font-size: 0.875rem;
      line-height: 1.5;
      margin: 0;
    }

    .empty-icon {
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(140, 149, 159, 0.2);
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.45rem 0.95rem;
      border-radius: 6px;
      font-size: 0.825rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      line-height: 1.2;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-sm {
      padding: 0.3rem 0.65rem;
      font-size: 0.775rem;
    }

    .btn-primary {
      background: #2563eb;
      color: #ffffff;
      border-color: #1d4ed8;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-secondary {
      background: var(--bg-canvas);
      border-color: var(--border-default);
      color: var(--text-primary);
    }

    .btn-secondary:hover:not(:disabled) {
      background: rgba(140, 149, 159, 0.15);
    }

    .btn-outline {
      background: transparent;
      border-color: var(--border-default);
      color: var(--text-primary);
    }

    .btn-outline:hover:not(:disabled) {
      background: var(--bg-canvas);
    }

    .btn-danger {
      background: #ef4444;
      color: #ffffff;
      border-color: #dc2626;
    }

    .btn-danger:hover:not(:disabled) {
      background: #dc2626;
    }
  `]
})
export class BusinessComponent implements OnInit {
  private readonly businessService = inject(BusinessService);
  private readonly deletionPermissionsService = inject(DeletionPermissionsService);
  readonly themeService = inject(ThemeService);

  readonly brandColors = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#64748b'];

  readonly incomeCategories = [
    'Client Retainer',
    'Project Fee / Milestone',
    'Product / SaaS Subscription',
    'Consulting / Advisory',
    'Product Sales',
    'Affiliate & Partnerships',
    'Royalty',
    'Other Revenue'
  ];

  readonly expenseCategories = [
    'Payroll & Salaries',
    'Contractor & Freelancer Fees',
    'Software & SaaS Subscriptions',
    'Cloud Hosting & Infrastructure',
    'Marketing & Advertising (Meta/Google)',
    'Office Rent & Coworking',
    'Hardware & Devices',
    'Legal & Accounting Services',
    'Travel & Client Entertainment',
    'Taxes, Duties & Levies',
    'Utilities & Internet',
    'Bank Fees & Payment Gateway Charges',
    'Other Operating Expense'
  ];

  loading = signal<boolean>(true);
  businesses = signal<Business[]>([]);
  consolidatedSummary = signal<BusinessPnLSummary | null>(null);
  selectedBusinessId = signal<string | null>(null);
  selectedBusinessPnL = signal<BusinessPnLSummary | null>(null);
  transactions = signal<BusinessTransaction[]>([]);

  // Filters
  filterType: BusinessTransactionType | '' = '';
  filterStatus: BusinessPaymentStatus | '' = '';
  searchQuery: string = '';

  // Modals
  showBusinessModal = signal<boolean>(false);
  editingBusiness = signal<Business | null>(null);
  businessForm = {
    name: '',
    legalName: '',
    type: BusinessType.Services,
    currency: 'INR',
    taxId: '',
    description: '',
    color: '#2563eb'
  };

  showTxnModal = signal<boolean>(false);
  editingTxn = signal<BusinessTransaction | null>(null);
  txnForm = {
    businessId: '',
    type: BusinessTransactionType.Expense,
    category: 'Software & SaaS Subscriptions',
    amount: 0,
    taxRatePercent: 18,
    taxAmount: 0,
    transactionDate: new Date().toISOString().substring(0, 10),
    counterparty: '',
    invoiceNumber: '',
    dueDate: '',
    paymentStatus: BusinessPaymentStatus.Paid,
    paymentMethod: 'Bank Transfer (NEFT/IMPS)',
    description: ''
  };

  readonly activeSummary = computed<BusinessPnLSummary | null>(() => {
    if (this.selectedBusinessId()) {
      return this.selectedBusinessPnL();
    }
    return this.consolidatedSummary();
  });

  readonly currentCategories = computed<string[]>(() => {
    return this.txnForm.type === BusinessTransactionType.Income
      ? this.incomeCategories
      : this.expenseCategories;
  });

  readonly filteredTransactions = computed<BusinessTransaction[]>(() => {
    const list = this.transactions();
    const selBiz = this.selectedBusinessId();
    const q = this.searchQuery.trim().toLowerCase();

    return list.filter(t => {
      if (selBiz && t.businessId !== selBiz) return false;
      if (this.filterType && t.type !== Number(this.filterType)) return false;
      if (this.filterStatus && t.paymentStatus !== Number(this.filterStatus)) return false;
      if (q) {
        const matchCounterparty = t.counterparty.toLowerCase().includes(q);
        const matchInv = t.invoiceNumber ? t.invoiceNumber.toLowerCase().includes(q) : false;
        const matchCat = t.category.toLowerCase().includes(q);
        const matchDesc = t.description ? t.description.toLowerCase().includes(q) : false;
        if (!matchCounterparty && !matchInv && !matchCat && !matchDesc) return false;
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.businessService.getBusinesses(true).subscribe({
      next: (res) => {
        this.businesses.set(res.businesses);
        this.consolidatedSummary.set(res.consolidatedSummary);
        this.loadTransactions();
      },
      error: (err) => {
        console.error('Failed to load businesses:', err);
        this.loading.set(false);
      }
    });
  }

  loadTransactions(): void {
    this.businessService.getTransactions().subscribe({
      next: (txns) => {
        this.transactions.set(txns);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load transactions:', err);
        this.loading.set(false);
      }
    });
  }

  selectBusiness(id: string | null): void {
    this.selectedBusinessId.set(id);
    if (id) {
      this.businessService.getBusinessPnL(id).subscribe({
        next: (pnl) => this.selectedBusinessPnL.set(pnl),
        error: (err) => console.error('Failed to get business PnL:', err)
      });
    } else {
      this.selectedBusinessPnL.set(null);
    }
  }

  onFilterChange(): void {
    // Computed signal handles local table filtering reactively
  }

  // --- Business Modal ---
  openNewBusinessModal(): void {
    this.editingBusiness.set(null);
    this.businessForm = {
      name: '',
      legalName: '',
      type: BusinessType.Services,
      currency: 'INR',
      taxId: '',
      description: '',
      color: '#2563eb'
    };
    this.showBusinessModal.set(true);
  }

  openEditBusinessModal(b: Business): void {
    this.editingBusiness.set(b);
    this.businessForm = {
      name: b.name,
      legalName: b.legalName || '',
      type: b.type,
      currency: b.currency,
      taxId: b.taxId || '',
      description: b.description || '',
      color: b.color || '#2563eb'
    };
    this.showBusinessModal.set(true);
  }

  closeBusinessModal(): void {
    this.showBusinessModal.set(false);
    this.editingBusiness.set(null);
  }

  saveBusiness(): void {
    if (!this.businessForm.name.trim()) return;

    if (this.editingBusiness()) {
      const payload: UpdateBusinessRequest = {
        name: this.businessForm.name,
        legalName: this.businessForm.legalName || null,
        type: Number(this.businessForm.type),
        currency: this.businessForm.currency,
        taxId: this.businessForm.taxId || null,
        description: this.businessForm.description || null,
        isActive: true,
        color: this.businessForm.color
      };

      this.businessService.updateBusiness(this.editingBusiness()!.id, payload).subscribe({
        next: () => {
          this.closeBusinessModal();
          this.loadData();
        },
        error: (err) => console.error('Failed to update business:', err)
      });
    } else {
      const payload: CreateBusinessRequest = {
        name: this.businessForm.name,
        legalName: this.businessForm.legalName || null,
        type: Number(this.businessForm.type),
        currency: this.businessForm.currency,
        taxId: this.businessForm.taxId || null,
        description: this.businessForm.description || null,
        color: this.businessForm.color
      };

      this.businessService.createBusiness(payload).subscribe({
        next: () => {
          this.closeBusinessModal();
          this.loadData();
        },
        error: (err) => console.error('Failed to create business:', err)
      });
    }
  }

  deleteBusiness(id: string): void {
    if (!this.deletionPermissionsService.canDelete('business')) {
      alert('Deletion is disabled for Business in Settings. Enable it in Settings > Deletion Controls to delete this venture.');
      return;
    }

    if (!confirm('Are you sure you want to delete this business? All transactions under it will be moved to the Recycle Bin.')) {
      return;
    }

    this.businessService.deleteBusiness(id).subscribe({
      next: () => {
        this.closeBusinessModal();
        if (this.selectedBusinessId() === id) {
          this.selectedBusinessId.set(null);
        }
        this.loadData();
      },
      error: (err) => console.error('Failed to delete business:', err)
    });
  }

  // --- Transaction Modal ---
  openNewTxnModal(): void {
    this.editingTxn.set(null);
    const defaultBiz = this.selectedBusinessId() || (this.businesses()[0]?.id ?? '');
    this.txnForm = {
      businessId: defaultBiz,
      type: BusinessTransactionType.Expense,
      category: this.expenseCategories[0],
      amount: 0,
      taxRatePercent: 18,
      taxAmount: 0,
      transactionDate: new Date().toISOString().substring(0, 10),
      counterparty: '',
      invoiceNumber: '',
      dueDate: '',
      paymentStatus: BusinessPaymentStatus.Paid,
      paymentMethod: 'Bank Transfer (NEFT/IMPS)',
      description: ''
    };
    this.showTxnModal.set(true);
  }

  openEditTxnModal(t: BusinessTransaction): void {
    this.editingTxn.set(t);
    this.txnForm = {
      businessId: t.businessId,
      type: t.type,
      category: t.category,
      amount: t.amount,
      taxRatePercent: t.taxRatePercent,
      taxAmount: t.taxAmount,
      transactionDate: t.transactionDate.substring(0, 10),
      counterparty: t.counterparty,
      invoiceNumber: t.invoiceNumber || '',
      dueDate: t.dueDate ? t.dueDate.substring(0, 10) : '',
      paymentStatus: t.paymentStatus,
      paymentMethod: t.paymentMethod || 'Bank Transfer (NEFT/IMPS)',
      description: t.description || ''
    };
    this.showTxnModal.set(true);
  }

  closeTxnModal(): void {
    this.showTxnModal.set(false);
    this.editingTxn.set(null);
  }

  setTxnType(type: BusinessTransactionType): void {
    this.txnForm.type = type;
    this.txnForm.category = type === BusinessTransactionType.Income
      ? this.incomeCategories[0]
      : this.expenseCategories[0];
  }

  onTxnAmountOrTaxChange(): void {
    if (this.txnForm.amount > 0 && this.txnForm.taxRatePercent >= 0) {
      this.txnForm.taxAmount = Math.round(this.txnForm.amount * (this.txnForm.taxRatePercent / 100) * 100) / 100;
    } else {
      this.txnForm.taxAmount = 0;
    }
  }

  calculateTotalPreview(): number {
    return Number(this.txnForm.amount || 0) + Number(this.txnForm.taxAmount || 0);
  }

  saveTransaction(): void {
    if (!this.txnForm.businessId || !this.txnForm.counterparty.trim() || this.txnForm.amount <= 0) {
      return;
    }

    if (this.editingTxn()) {
      const payload: UpdateBusinessTransactionRequest = {
        businessId: this.txnForm.businessId,
        type: Number(this.txnForm.type),
        category: this.txnForm.category,
        amount: Number(this.txnForm.amount),
        taxRatePercent: Number(this.txnForm.taxRatePercent),
        taxAmount: Number(this.txnForm.taxAmount),
        transactionDate: new Date(this.txnForm.transactionDate).toISOString(),
        counterparty: this.txnForm.counterparty,
        invoiceNumber: this.txnForm.invoiceNumber || null,
        dueDate: this.txnForm.dueDate ? new Date(this.txnForm.dueDate).toISOString() : null,
        paymentStatus: Number(this.txnForm.paymentStatus),
        paymentMethod: this.txnForm.paymentMethod || null,
        description: this.txnForm.description || null
      };

      this.businessService.updateTransaction(this.editingTxn()!.id, payload).subscribe({
        next: () => {
          this.closeTxnModal();
          this.loadData();
        },
        error: (err) => console.error('Failed to update transaction:', err)
      });
    } else {
      const payload: CreateBusinessTransactionRequest = {
        businessId: this.txnForm.businessId,
        type: Number(this.txnForm.type),
        category: this.txnForm.category,
        amount: Number(this.txnForm.amount),
        taxRatePercent: Number(this.txnForm.taxRatePercent),
        taxAmount: Number(this.txnForm.taxAmount),
        transactionDate: new Date(this.txnForm.transactionDate).toISOString(),
        counterparty: this.txnForm.counterparty,
        invoiceNumber: this.txnForm.invoiceNumber || null,
        dueDate: this.txnForm.dueDate ? new Date(this.txnForm.dueDate).toISOString() : null,
        paymentStatus: Number(this.txnForm.paymentStatus),
        paymentMethod: this.txnForm.paymentMethod || null,
        description: this.txnForm.description || null
      };

      this.businessService.createTransaction(payload).subscribe({
        next: () => {
          this.closeTxnModal();
          this.loadData();
        },
        error: (err) => console.error('Failed to create transaction:', err)
      });
    }
  }

  deleteTransaction(id: string): void {
    if (!this.deletionPermissionsService.canDelete('business')) {
      alert('Deletion is disabled for Business in Settings. Enable it in Settings > Deletion Controls to delete this entry.');
      return;
    }

    if (!confirm('Are you sure you want to delete this entry? It will be moved to the Recycle Bin.')) return;

    this.businessService.deleteTransaction(id).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Failed to delete transaction:', err)
    });
  }

  markAsPaid(t: BusinessTransaction): void {
    this.businessService.updateStatus(t.id, BusinessPaymentStatus.Paid).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Failed to mark as paid:', err)
    });
  }

  exportTransactionsCsv(): void {
    const data = this.filteredTransactions();
    if (data.length === 0) return;

    const headers = [
      'Date',
      'Invoice #',
      'Venture',
      'Type',
      'Category',
      'Counterparty',
      'Base Amount',
      'Tax Rate %',
      'Tax Amount',
      'Total Amount',
      'Status',
      'Payment Method',
      'Notes'
    ];

    const rows = data.map(t => [
      `"${t.transactionDate.substring(0, 10)}"`,
      `"${t.invoiceNumber || ''}"`,
      `"${t.businessName}"`,
      `"${t.typeName}"`,
      `"${t.category}"`,
      `"${t.counterparty.replace(/"/g, '""')}"`,
      t.amount,
      t.taxRatePercent,
      t.taxAmount,
      t.totalAmount,
      `"${t.paymentStatusName}"`,
      `"${t.paymentMethod || ''}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `business_ledger_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Visual Helpers ---
  maxMonthlyAmount(summary: BusinessPnLSummary): number {
    let max = 1;
    for (const m of summary.monthlyTrend) {
      if (m.revenue > max) max = m.revenue;
      if (m.expense > max) max = m.expense;
    }
    return max;
  }

  getBarHeight(value: number, max: number): number {
    if (max <= 0 || value <= 0) return 4;
    return Math.max(4, Math.min(100, (value / max) * 100));
  }

  formatK(val: number): string {
    const abs = Math.abs(val);
    if (abs >= 10000000) return (val / 10000000).toFixed(1) + 'Cr';
    if (abs >= 100000) return (val / 100000).toFixed(1) + 'L';
    if (abs >= 1000) return (val / 1000).toFixed(1) + 'k';
    return val.toFixed(0);
  }

  expenseBreakdowns(summary: BusinessPnLSummary) {
    return summary.categoryBreakdown.filter(c => c.type === BusinessTransactionType.Expense);
  }
}

