import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EpfoService } from './services/epfo.service';
import {
  CreateEpfRequest,
  EpfEntry,
  EpfResponse,
  EpfYearlySummary,
  UpdateEpfRequest
} from './models/epf.model';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { DeletionPermissionsService } from '../../core/services/deletion-permissions.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-epfo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InrCurrencyPipe, StatCardComponent],
  template: `
    <div class="epfo-page">
      <!-- Page Header & Actions -->
      <div class="page-header no-print">
        <div>
          <h1 class="page-title">EPFO (Provident Fund)</h1>
          <p class="subtitle">Track monthly EPF contributions, EPS pension fund, interest credits & running balance</p>
        </div>

        <div class="header-actions">
          <div class="year-selector-wrap">
            <label for="yearSelect" class="year-label">Year:</label>
            <select
              id="yearSelect"
              class="select-year"
              [value]="selectedYear()"
              (change)="onYearChange($event)">
              @for (yr of availableYears(); track yr) {
                <option [value]="yr">{{ yr }}</option>
              }
            </select>
          </div>

          <button type="button" class="btn-outline btn-print" (click)="printStatement()">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            <span>Print</span>
          </button>
          <button type="button" class="btn-primary" (click)="openCreateModal()">
            + Add Entry
          </button>
        </div>
      </div>

      <!-- Financial Summary Cards -->
      <div class="summary-grid">
        <app-stat-card
          title="Total EPF Balance"
          [amount]="allTimeEpfBalance()"
          subtitle="Cumulative Withdrawable Balance"
          variant="income"
        />
        <app-stat-card
          title="Pension Fund (EPS)"
          [amount]="allTimePensionBalance()"
          subtitle="All-Time Pension Accumulation"
          variant="neutral"
        />
        <app-stat-card
          title="Yearly Closing Balance"
          [amount]="summary()?.closingBalance || 0"
          [subtitle]="'As of end of ' + selectedYear()"
          variant="neutral"
        />
        <app-stat-card
          title="Employee Share (Year)"
          [amount]="summary()?.totalEmployeeShare || 0"
          subtitle="12% Contribution"
          variant="neutral"
        />
        <app-stat-card
          title="Employer Share (Year)"
          [amount]="summary()?.totalEmployerShare || 0"
          subtitle="3.67% Contribution"
          variant="neutral"
        />
      </div>

      <!-- Printable Statement Header (visible only when printing) -->
      <div class="print-statement-header print-only">
        <div class="print-brand">
          <h1>HISAAB — EPFO PROVIDENT FUND STATEMENT</h1>
          <p>Financial Statement for Calendar Year {{ selectedYear() }} | Generated on {{ today | date:'medium' }}</p>
        </div>
        @if (summary(); as s) {
          <div class="print-meta-grid">
            <div><strong>Total EPF Balance:</strong> {{ allTimeEpfBalance() | inrCurrency }}</div>
            <div><strong>Total Pension Fund:</strong> {{ allTimePensionBalance() | inrCurrency }}</div>
            <div><strong>Opening Balance ({{ selectedYear() }}):</strong> {{ s.openingBalance | inrCurrency }}</div>
            <div><strong>Closing Balance ({{ selectedYear() }}):</strong> {{ s.closingBalance | inrCurrency }}</div>
            <div><strong>Employee Contributions:</strong> {{ s.totalEmployeeShare | inrCurrency }}</div>
            <div><strong>Employer Contributions:</strong> {{ s.totalEmployerShare | inrCurrency }}</div>
            <div><strong>Interest Credited:</strong> {{ s.totalInterest | inrCurrency }}</div>
            <div><strong>Withdrawals:</strong> {{ s.totalWithdrawals | inrCurrency }}</div>
          </div>
        }
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-container">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && entries().length === 0) {
        <div class="empty-card card">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.8">
              <line x1="3" y1="21" x2="21" y2="21"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <polyline points="12 3 2 10 22 10"/>
              <line x1="6" y1="10" x2="6" y2="21"/>
              <line x1="10" y1="10" x2="10" y2="21"/>
              <line x1="14" y1="10" x2="14" y2="21"/>
              <line x1="18" y1="10" x2="18" y2="21"/>
            </svg>
          </div>
          <h3>No EPF entries found for {{ selectedYear() }}</h3>
          <p>Record your monthly EPFO contribution slip or passbook entry.</p>
          <button type="button" class="btn-primary mt-4" (click)="openCreateModal()">
            + Add First EPF Entry
          </button>
        </div>
      }

      <!-- Monthly Breakdown List (Mobile Cards & Desktop Table) -->
      @if (!loading() && entries().length > 0) {
        <!-- Mobile Cards (< 768px) -->
        <div class="mobile-entry-list">
          @for (entry of entries(); track entry.id) {
            <div class="entry-card card">
              <div class="entry-header">
                <div>
                  <h4 class="month-title">{{ entry.monthLabel }}</h4>
                  @if (entry.note) {
                    <div class="entry-note">{{ entry.note }}</div>
                  }
                </div>
                <div class="badge badge-inflow">
                  +{{ entry.netInflow | inrCurrency }}
                </div>
              </div>

              <div class="entry-metrics">
                <div class="metric-row">
                  <span class="metric-label">Running EPF Balance:</span>
                  <span class="tabular-nums font-bold text-teal">{{ entry.runningBalance | inrCurrency }}</span>
                </div>
                <div class="metric-row sub-row">
                  <span class="metric-label">Employee Share (12%):</span>
                  <span class="sub-val">{{ entry.employeeShare | inrCurrency }}</span>
                </div>
                <div class="metric-row sub-row">
                  <span class="metric-label">Employer Share (3.67%):</span>
                  <span class="sub-val">{{ entry.employerShare | inrCurrency }}</span>
                </div>
                <div class="metric-row sub-row">
                  <span class="metric-label">Pension Share (8.33%):</span>
                  <span class="sub-val">{{ entry.pensionShare | inrCurrency }}</span>
                </div>
                @if (entry.interest > 0) {
                  <div class="metric-row sub-row">
                    <span class="metric-label">Interest Credited:</span>
                    <span class="sub-val text-green">+{{ entry.interest | inrCurrency }}</span>
                  </div>
                }
                @if (entry.withdrawal > 0) {
                  <div class="metric-row sub-row">
                    <span class="metric-label">Withdrawal:</span>
                    <span class="sub-val text-danger">-{{ entry.withdrawal | inrCurrency }}</span>
                  </div>
                }
              </div>

              <div class="entry-actions no-print">
                <button type="button" class="btn-sm btn-outline" (click)="openEditModal(entry)">
                  Edit
                </button>
                <button type="button" class="btn-sm btn-text-danger" (click)="confirmDelete(entry)">
                  Delete
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Desktop Ledger Table (>= 768px) -->
        <div class="desktop-table-container card">
          <table class="epf-table">
            <thead>
              <tr>
                <th class="col-month">Month</th>
                <th class="text-right col-num">Employee (12%)</th>
                <th class="text-right col-num">Employer (3.67%)</th>
                <th class="text-right col-num">Pension (8.33%)</th>
                <th class="text-right col-num">Interest</th>
                <th class="text-right col-num">Withdrawal</th>
                <th class="text-right col-num">Net Inflow</th>
                <th class="text-right col-num">Running EPF Balance</th>
                <th class="text-right col-actions no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of entries(); track entry.id) {
                <tr class="table-row">
                  <td class="col-month">
                    <div class="month-cell font-bold">{{ entry.monthLabel }}</div>
                    @if (entry.note) {
                      <div class="note-subtext" [title]="entry.note">{{ entry.note }}</div>
                    }
                  </td>
                  <td class="text-right tabular-nums col-num">{{ entry.employeeShare | inrCurrency }}</td>
                  <td class="text-right tabular-nums col-num">{{ entry.employerShare | inrCurrency }}</td>
                  <td class="text-right tabular-nums col-num text-muted">{{ entry.pensionShare | inrCurrency }}</td>
                  <td class="text-right tabular-nums col-num text-green">
                    {{ entry.interest > 0 ? ('+' + (entry.interest | inrCurrency)) : '—' }}
                  </td>
                  <td class="text-right tabular-nums col-num text-danger">
                    {{ entry.withdrawal > 0 ? ('-' + (entry.withdrawal | inrCurrency)) : '—' }}
                  </td>
                  <td class="text-right tabular-nums col-num font-semibold text-teal">
                    +{{ entry.netInflow | inrCurrency }}
                  </td>
                  <td class="text-right tabular-nums col-num font-bold text-main">
                    {{ entry.runningBalance | inrCurrency }}
                  </td>
                  <td class="text-right col-actions no-print">
                    <div class="actions-wrap">
                      <button type="button" class="btn-icon" title="Edit entry" (click)="openEditModal(entry)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button type="button" class="btn-icon-danger" title="Delete entry" (click)="confirmDelete(entry)">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Add / Edit Modal Sheet -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingId() ? 'Edit EPF Entry' : 'Add Monthly EPF Entry' }}</h3>
              <button type="button" class="btn-close" (click)="closeModal()">&times;</button>
            </div>

            <form [formGroup]="epfForm" (ngSubmit)="submitEntry()">
              <div class="modal-body">
                <!-- Month Picker (YYYY-MM) -->
                <div class="form-group">
                  <label class="form-label" for="epfMonth">Contribution Month *</label>
                  <input
                    id="epfMonth"
                    type="month"
                    class="form-control"
                    formControlName="month"
                  />
                  @if (epfForm.get('month')?.invalid && epfForm.get('month')?.touched) {
                    <span class="form-error">Month is required.</span>
                  }
                </div>

                <!-- Monthly Shares Grid -->
                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label" for="employeeShare">Employee Share (12%) *</label>
                    <input
                      id="employeeShare"
                      type="number"
                      step="0.01"
                      class="form-control"
                      placeholder="e.g. 1800"
                      formControlName="employeeShare"
                    />
                  </div>

                  <div class="form-group col-half">
                    <label class="form-label" for="employerShare">Employer Share (3.67%) *</label>
                    <input
                      id="employerShare"
                      type="number"
                      step="0.01"
                      class="form-control"
                      placeholder="e.g. 550"
                      formControlName="employerShare"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="pensionShare">Pension Share (EPS 8.33%) *</label>
                  <input
                    id="pensionShare"
                    type="number"
                    step="0.01"
                    class="form-control"
                    placeholder="e.g. 1250"
                    formControlName="pensionShare"
                  />
                </div>

                <!-- Interest & Withdrawal Row -->
                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label" for="interest">Interest Credited (₹)</label>
                    <input
                      id="interest"
                      type="number"
                      step="0.01"
                      class="form-control"
                      placeholder="0"
                      formControlName="interest"
                    />
                  </div>

                  <div class="form-group col-half">
                    <label class="form-label" for="withdrawal">PF Withdrawal (₹)</label>
                    <input
                      id="withdrawal"
                      type="number"
                      step="0.01"
                      class="form-control"
                      placeholder="0"
                      formControlName="withdrawal"
                    />
                  </div>
                </div>

                <!-- Notes / Employer reference -->
                <div class="form-group">
                  <label class="form-label" for="note">Note / Company Name</label>
                  <input
                    id="note"
                    type="text"
                    class="form-control"
                    placeholder="e.g. Infosys Ltd / TCS salary"
                    formControlName="note"
                  />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-outline" (click)="closeModal()" [disabled]="submitting()">
                  Cancel
                </button>
                <button type="submit" class="btn-primary" [disabled]="epfForm.invalid || submitting()">
                  {{ submitting() ? 'Saving...' : (editingId() ? 'Save Changes' : 'Add Entry') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .epfo-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    @media (min-width: 640px) {
      .page-header {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .page-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-main);
    }

    .subtitle {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      color: var(--color-text-muted);
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .year-selector-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .year-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-muted);
    }

    .select-year {
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-card);
      color: var(--color-text-main);
      font-weight: 600;
      font-size: 0.875rem;
      min-height: 44px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.875rem;
    }

    /* Mobile Entries */
    .mobile-entry-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    @media (min-width: 768px) {
      .mobile-entry-list {
        display: none;
      }
    }

    .desktop-table-container {
      display: none;
      overflow-x: auto;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xs);
    }

    @media (min-width: 768px) {
      .desktop-table-container {
        display: block;
      }
    }

    .entry-card {
      padding: 1.25rem;
    }

    .entry-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--color-border);
    }

    .month-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--color-text-main);
    }

    .entry-note {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      margin-top: 0.2rem;
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .badge-inflow {
      background: #ecfdf5;
      color: #065f46;
    }

    .entry-metrics {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 0.75rem;
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }

    .sub-row {
      font-size: 0.8125rem;
    }

    .metric-label {
      color: var(--color-text-muted);
    }

    .sub-val {
      font-weight: 500;
      color: var(--color-text-main);
      white-space: nowrap;
    }

    .entry-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--color-border);
    }

    .btn-sm {
      padding: 0.35rem 0.75rem;
      font-size: 0.8125rem;
      min-height: 36px;
    }

    .btn-text-danger {
      background: transparent;
      border: 1px solid transparent;
      color: #ef4444;
      font-size: 0.8125rem;
      cursor: pointer;
    }

    /* Desktop Table */
    .epf-table {
      width: 100%;
      min-width: 1050px;
      border-collapse: collapse;
      text-align: left;
    }

    .epf-table th {
      padding: 0.85rem 1rem;
      font-size: 0.725rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg-subtle);
      white-space: nowrap;
    }

    .epf-table td {
      padding: 0.85rem 1rem;
      font-size: 0.875rem;
      border-bottom: 1px solid var(--color-border);
      vertical-align: middle;
      color: var(--color-text-main);
    }

    .table-row:hover {
      background-color: var(--color-bg-subtle);
    }

    .col-month {
      min-width: 150px;
      max-width: 240px;
    }

    .col-num {
      white-space: nowrap !important;
      font-variant-numeric: tabular-nums lining-nums;
      font-feature-settings: 'tnum' 1, 'lnum' 1;
    }

    .month-cell {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-main);
      white-space: nowrap;
    }

    .note-subtext {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-top: 0.2rem;
      max-width: 220px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .col-actions {
      white-space: nowrap !important;
      width: 84px;
    }

    .actions-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.35rem;
      white-space: nowrap;
    }

    .text-teal { color: #0d9488; }
    .text-green { color: #059669; }
    .text-danger { color: #ef4444; }
    .text-main { color: var(--color-text-main); }
    .text-right { text-align: right; }

    .btn-icon {
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: var(--color-text-muted);
      padding: 0.35rem 0.45rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      min-height: 32px;
      min-width: 32px;
    }

    .btn-icon:hover {
      background: var(--color-bg-subtle);
      color: var(--color-text-main);
      border-color: var(--color-border-subtle);
    }

    .btn-icon-danger {
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: #ef4444;
      padding: 0.35rem 0.45rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
      min-height: 32px;
      min-width: 32px;
    }

    .btn-icon-danger:hover {
      background: #fee2e2;
      border-color: #fca5a5;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 50;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    @media (min-width: 640px) {
      .modal-backdrop { align-items: center; }
    }

    .modal-dialog {
      background: var(--color-bg-card);
      width: 100%;
      max-width: 500px;
      border-radius: 1rem 1rem 0 0;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: var(--shadow-lg);
    }

    @media (min-width: 640px) {
      .modal-dialog { border-radius: var(--radius-lg); }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem;
      border-bottom: 1px solid var(--color-border);
    }

    .modal-header h3 { margin: 0; font-size: 1.25rem; }

    .btn-close {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--color-border);
      background: var(--color-bg-subtle);
    }

    .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .form-row { display: flex; gap: 0.75rem; }
    .col-half { flex: 1; }
    .form-label { font-size: 0.8125rem; font-weight: 500; color: var(--color-text-muted); }
    .form-control {
      padding: 0.625rem 0.875rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-card);
      color: var(--color-text-main);
      font-size: 0.875rem;
      min-height: 44px;
    }
    .form-error { font-size: 0.75rem; color: #ef4444; }

    .empty-card {
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .empty-icon { font-size: 3rem; margin-bottom: 0.75rem; }

    .loading-container { display: flex; flex-direction: column; gap: 1rem; }
    .skeleton-card {
      height: 90px;
      background: var(--color-bg-subtle);
      border-radius: var(--radius-md);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 0.3; }
    }

    .print-only { display: none; }

    /* Print Stylesheet */
    @media print {
      .no-print { display: none !important; }
      .print-only { display: block !important; }

      .epfo-page { background: white !important; color: black !important; gap: 1rem; }
      .card { border: none !important; box-shadow: none !important; padding: 0 !important; }

      .print-statement-header {
        border-bottom: 2px solid #000;
        padding-bottom: 1rem;
        margin-bottom: 1.5rem;
      }

      .print-brand h1 { margin: 0; font-size: 1.5rem; font-weight: 800; }

      .print-meta-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
        margin-top: 1rem;
        font-size: 0.875rem;
      }

      .epf-table th, .epf-table td {
        border-bottom: 1px solid #ccc !important;
        padding: 0.5rem 0.25rem !important;
        color: black !important;
      }
    }
  `]
})
export class EpfoComponent implements OnInit {
  private readonly epfoService = inject(EpfoService);
  private readonly deletionPermissionsService = inject(DeletionPermissionsService);
  private readonly fb = inject(FormBuilder);
  public readonly themeService = inject(ThemeService);

  readonly entries = signal<EpfEntry[]>([]);
  readonly summary = signal<EpfYearlySummary | null>(null);
  readonly availableYears = signal<number[]>([new Date().getFullYear()]);
  readonly selectedYear = signal<number>(new Date().getFullYear());
  readonly allTimeEpfBalance = signal<number>(0);
  readonly allTimePensionBalance = signal<number>(0);

  readonly loading = signal<boolean>(true);
  readonly submitting = signal<boolean>(false);
  readonly showModal = signal<boolean>(false);
  readonly editingId = signal<string | null>(null);
  readonly today = new Date();

  readonly epfForm = this.fb.group({
    month: ['', [Validators.required]],
    employeeShare: [1800 as number | null, [Validators.required, Validators.min(0)]],
    employerShare: [550 as number | null, [Validators.required, Validators.min(0)]],
    pensionShare: [1250 as number | null, [Validators.required, Validators.min(0)]],
    interest: [0, [Validators.min(0)]],
    withdrawal: [0, [Validators.min(0)]],
    note: ['']
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(year?: number): void {
    this.loading.set(true);
    const yr = year ?? this.selectedYear();

    this.epfoService.getEpfEntries(yr).subscribe({
      next: (res) => {
        this.entries.set(res.entries);
        this.summary.set(res.summary);
        this.availableYears.set(res.availableYears);
        this.selectedYear.set(res.summary.year);
        this.allTimeEpfBalance.set(res.allTimeEpfBalance);
        this.allTimePensionBalance.set(res.allTimePensionBalance);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onYearChange(event: Event): void {
    const yr = Number((event.target as HTMLSelectElement).value);
    this.selectedYear.set(yr);
    this.loadData(yr);
  }

  printStatement(): void {
    window.print();
  }

  openCreateModal(): void {
    this.editingId.set(null);
    const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    this.epfForm.reset({
      month: currentMonthStr,
      employeeShare: 1800,
      employerShare: 550,
      pensionShare: 1250,
      interest: 0,
      withdrawal: 0,
      note: ''
    });
    this.showModal.set(true);
  }

  openEditModal(entry: EpfEntry): void {
    this.editingId.set(entry.id);
    const monthStr = entry.month.substring(0, 7); // "YYYY-MM"
    this.epfForm.patchValue({
      month: monthStr,
      employeeShare: entry.employeeShare,
      employerShare: entry.employerShare,
      pensionShare: entry.pensionShare,
      interest: entry.interest,
      withdrawal: entry.withdrawal,
      note: entry.note || ''
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingId.set(null);
  }

  submitEntry(): void {
    if (this.epfForm.invalid) {
      this.epfForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const formVal = this.epfForm.value;

    // Convert "YYYY-MM" to "YYYY-MM-01"
    const normalizedMonth = `${formVal.month}-01`;

    const payload: CreateEpfRequest = {
      month: normalizedMonth,
      employeeShare: Number(formVal.employeeShare || 0),
      employerShare: Number(formVal.employerShare || 0),
      pensionShare: Number(formVal.pensionShare || 0),
      interest: Number(formVal.interest || 0),
      withdrawal: Number(formVal.withdrawal || 0),
      note: formVal.note?.trim() || null
    };

    const editId = this.editingId();
    const action$ = editId
      ? this.epfoService.updateEpfEntry(editId, payload)
      : this.epfoService.createEpfEntry(payload);

    action$.subscribe({
      next: (res) => {
        this.themeService.playSuccessSound();
        this.entries.set(res.entries);
        this.summary.set(res.summary);
        this.availableYears.set(res.availableYears);
        this.allTimeEpfBalance.set(res.allTimeEpfBalance);
        this.allTimePensionBalance.set(res.allTimePensionBalance);
        this.submitting.set(false);
        this.closeModal();
      },
      error: (err) => {
        this.submitting.set(false);
        alert(err?.error?.detail || err?.error?.title || 'Failed to save EPF entry.');
      }
    });
  }

  confirmDelete(entry: EpfEntry): void {
    if (!this.deletionPermissionsService.canDelete('epfo')) {
      alert('Deletion is disabled for EPFO in Settings. Enable it in Settings > Deletion Controls to delete this entry.');
      return;
    }

    if (confirm(`Are you sure you want to delete the EPF entry for ${entry.monthLabel}? It will be moved to the Recycle Bin.`)) {
      this.epfoService.deleteEpfEntry(entry.id).subscribe({
        next: () => {
          this.themeService.playDeleteSound();
          this.loadData();
        }
      });
    }
  }
}
