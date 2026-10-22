import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { EpfoService } from './services/epfo.service';
import {
  CommitEpfoPassbookImportRequest,
  CreateEpfRequest,
  EpfEntry,
  EpfoPassbookParsePreview,
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, InrCurrencyPipe, StatCardComponent],
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

          <!-- Import Passbook PDF Button -->
          <button type="button" class="btn-import" (click)="openImportModal()" title="Upload and auto-extract official EPFO Passbook PDF">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Import Passbook PDF</span>
          </button>

          <!-- Export Dropdown -->
          <div class="export-dropdown-wrapper">
            <button type="button" class="btn-outline btn-export" (click)="toggleExportDropdown()">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Export</span>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            @if (showExportDropdown()) {
              <div class="export-menu" (click)="$event.stopPropagation()">
                <button type="button" class="export-menu-item" (click)="downloadPdf()">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <span>Download PDF Statement</span>
                </button>
                <button type="button" class="export-menu-item" (click)="downloadExcel()">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                    <line x1="3" y1="15" x2="21" y2="15"/>
                    <line x1="9" y1="3" x2="9" y2="21"/>
                    <line x1="15" y1="3" x2="15" y2="21"/>
                  </svg>
                  <span>Download Excel (.xlsx)</span>
                </button>
                <div class="menu-divider"></div>
                <button type="button" class="export-menu-item" (click)="printStatement()">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 6 2 18 2 18 9"/>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  <span>Print View</span>
                </button>
              </div>
            }
          </div>

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
            <div class="entry-card card" [class.card-withdrawal]="entry.withdrawal > 0">
              <div class="entry-header">
                <div>
                  <h4 class="month-title" [class.text-danger]="entry.withdrawal > 0">
                    {{ entry.monthLabel }}
                    @if (entry.withdrawal > 0) {
                      <span class="badge-mini-claim">CLAIM</span>
                    }
                  </h4>
                  @if (entry.note) {
                    <div class="entry-note">{{ entry.note }}</div>
                  }
                </div>
                <div class="badge" [class.badge-inflow]="entry.netInflow >= 0" [class.badge-outflow]="entry.netInflow < 0">
                  {{ entry.netInflow >= 0 ? '+' : '' }}{{ entry.netInflow | inrCurrency }}
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
                <tr class="table-row" [class.row-withdrawal]="entry.withdrawal > 0">
                  <td class="col-month">
                    <div class="month-cell font-bold" [class.text-danger]="entry.withdrawal > 0">
                      {{ entry.monthLabel }}
                      @if (entry.withdrawal > 0) {
                        <span class="badge-mini-claim">CLAIM</span>
                      }
                    </div>
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
                  <td class="text-right tabular-nums col-num text-danger font-semibold">
                    {{ entry.withdrawal > 0 ? ('-' + (entry.withdrawal | inrCurrency)) : '—' }}
                  </td>
                  <td class="text-right tabular-nums col-num font-bold" [class.text-teal]="entry.netInflow >= 0" [class.text-danger]="entry.netInflow < 0">
                    {{ entry.netInflow >= 0 ? '+' : '' }}{{ entry.netInflow | inrCurrency }}
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

      <!-- Import EPFO Passbook PDF Modal -->
      @if (showImportModal()) {
        <div class="modal-backdrop" (click)="closeImportModal()">
          <div class="modal-dialog import-modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-wrap">
                <div class="badge-epfo-official">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M12 2L2 7v2h20V7L12 2zM4 11v7h3v-7H4zm6 0v7h4v-7h-4zm7 0v7h3v-7h-3zM2 20v2h20v-2H2z" />
                  </svg>
                  <span>OFFICIAL EPFO PASSBOOK AUTO-PARSER</span>
                </div>
                <h3>Import Member Passbook (PDF)</h3>
                <p class="modal-subtitle">Auto-extracts member info, establishment name, monthly wage contributions, and year-end interest</p>
              </div>
              <button type="button" class="btn-close" (click)="closeImportModal()">&times;</button>
            </div>

            <div class="modal-body import-modal-body">
              <!-- Error Banner -->
              @if (parseError()) {
                <div class="alert-error">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{{ parseError() }}</span>
                </div>
              }

              <!-- STEP 1: Upload Dropzone (When no parsed preview yet) -->
              @if (!parsedPreview()) {
                <div
                  class="dropzone-area"
                  [class.drag-over]="isDraggingOver()"
                  (dragover)="onDragOver($event)"
                  (dragleave)="onDragLeave($event)"
                  (drop)="onFileDropped($event)"
                  (click)="fileInput.click()"
                >
                  <input
                    #fileInput
                    type="file"
                    accept=".pdf,application/pdf"
                    class="hidden-file-input"
                    (change)="onFileSelected($event)"
                  />

                  @if (pdfParsing()) {
                    <div class="parsing-spinner-wrap">
                      <div class="spinner"></div>
                      <h4>Reading EPFO Member Passbook...</h4>
                      <p>Extracting monthly contribution table, interest records, and establishment details</p>
                    </div>
                  } @else {
                    <div class="dropzone-content">
                      <div class="dropzone-icon-box">
                        <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.8">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <path d="M12 18v-6m-3 3 3-3 3 3"/>
                        </svg>
                      </div>
                      <h4>Drag & Drop your EPFO Passbook PDF here</h4>
                      <p>or <span class="browse-link">browse file</span> from your computer</p>
                      <div class="file-hint-pills">
                        <span class="hint-pill">✓ Official EPFO Passbook PDF</span>
                        <span class="hint-pill">✓ Financial Year Breakdown</span>
                        <span class="hint-pill">✓ 100% Secure & On-Device</span>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <!-- STEP 2: Extraction Preview -->
                @if (parsedPreview(); as p) {
                  <div class="preview-container">
                    <!-- Member & Establishment Card -->
                    <div class="passbook-meta-card">
                      <div class="meta-row">
                        <div class="meta-item">
                          <span class="meta-label">MEMBER NAME</span>
                          <span class="meta-value font-bold">{{ p.memberName }}</span>
                          <span class="meta-sub">UAN: {{ p.uan }} | Member ID: {{ p.memberId }}</span>
                        </div>
                        <div class="meta-item">
                          <span class="meta-label">ESTABLISHMENT / EMPLOYER</span>
                          <span class="meta-value font-semibold">{{ p.establishmentName }}</span>
                          <span class="meta-sub">Est ID: {{ p.establishmentId }}</span>
                        </div>
                        <div class="meta-item meta-item-fy">
                          <span class="meta-label">FINANCIAL YEAR</span>
                          <span class="fy-badge">{{ p.financialYear }}</span>
                          <span class="meta-sub">DOB: {{ p.dateOfBirth }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Summary Financial Metrics -->
                    <div class="preview-metrics-grid">
                      <div class="metric-pill-card">
                        <span class="metric-lbl">Opening Balance</span>
                        <span class="metric-amt">{{ (p.openingEmployeeBalance + p.openingEmployerBalance) | inrCurrency }}</span>
                        <span class="metric-sub">EE: {{ p.openingEmployeeBalance | inrCurrency }} | ER: {{ p.openingEmployerBalance | inrCurrency }}</span>
                      </div>
                      <div class="metric-pill-card highlight-pill">
                        <span class="metric-lbl">Total Contributions</span>
                        <span class="metric-amt text-success">{{ (p.totalContributionsEmployee + p.totalContributionsEmployer) | inrCurrency }}</span>
                        <span class="metric-sub">EE: {{ p.totalContributionsEmployee | inrCurrency }} | ER: {{ p.totalContributionsEmployer | inrCurrency }}</span>
                      </div>
                      @if ((p.totalTransferInsEmployee + p.totalTransferInsEmployer) > 0) {
                        <div class="metric-pill-card">
                          <span class="metric-lbl">Total Transfer-Ins</span>
                          <span class="metric-amt text-teal">+{{ (p.totalTransferInsEmployee + p.totalTransferInsEmployer) | inrCurrency }}</span>
                          <span class="metric-sub">EE: {{ p.totalTransferInsEmployee | inrCurrency }} | ER: {{ p.totalTransferInsEmployer | inrCurrency }}</span>
                        </div>
                      }
                      <div class="metric-pill-card" [class.danger-pill]="(p.totalWithdrawalsEmployee + p.totalWithdrawalsEmployer) > 0">
                        <span class="metric-lbl">Total Withdrawals</span>
                        <span class="metric-amt" [class.text-danger]="(p.totalWithdrawalsEmployee + p.totalWithdrawalsEmployer) > 0">
                          {{ (p.totalWithdrawalsEmployee + p.totalWithdrawalsEmployer) > 0 ? ('-' + ((p.totalWithdrawalsEmployee + p.totalWithdrawalsEmployer) | inrCurrency)) : (0 | inrCurrency) }}
                        </span>
                        <span class="metric-sub">EE: {{ p.totalWithdrawalsEmployee | inrCurrency }} | ER: {{ p.totalWithdrawalsEmployer | inrCurrency }}</span>
                      </div>
                      <div class="metric-pill-card">
                        <span class="metric-lbl">Annual Interest</span>
                        <span class="metric-amt text-teal">+{{ (p.annualInterestEmployee + p.annualInterestEmployer) | inrCurrency }}</span>
                        <span class="metric-sub">EE: {{ p.annualInterestEmployee | inrCurrency }} | ER: {{ p.annualInterestEmployer | inrCurrency }}</span>
                      </div>
                      <div class="metric-pill-card">
                        <span class="metric-lbl">Year Closing Balance</span>
                        <span class="metric-amt font-bold">{{ (p.closingEmployeeBalance + p.closingEmployerBalance) | inrCurrency }}</span>
                        <span class="metric-sub">Withdrawable EPF Fund</span>
                      </div>
                    </div>

                    <!-- Monthly Entries List to be Saved -->
                    <div class="preview-table-wrap">
                      <div class="preview-table-header">
                        <h4>Monthly Records Detected ({{ p.monthlyEntries.length }} entries)</h4>
                        <span class="badge-ready">✓ Validated & Ready</span>
                      </div>
                      <div class="preview-table-scroll">
                        <table class="preview-table">
                          <thead>
                            <tr>
                              <th>Month</th>
                              <th class="text-right">Employee (12%)</th>
                              <th class="text-right">Employer (3.67%)</th>
                              <th class="text-right">Pension (8.33%)</th>
                              <th class="text-right">Withdrawal</th>
                              <th class="text-right">Interest</th>
                              <th class="text-right">Net Inflow</th>
                              <th>Note / Particulars</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (item of p.monthlyEntries; track $index) {
                              <tr [class.row-withdrawal]="item.withdrawal > 0">
                                <td class="font-bold text-main">
                                  <div class="month-title-row">
                                    <span [class.text-danger]="item.withdrawal > 0">{{ item.monthLabel }}</span>
                                    @if (item.withdrawal > 0) {
                                      <span class="badge-mini-claim">CLAIM</span>
                                    }
                                  </div>
                                </td>
                                <td class="text-right tabular-nums">{{ item.employeeShare | inrCurrency }}</td>
                                <td class="text-right tabular-nums">{{ item.employerShare | inrCurrency }}</td>
                                <td class="text-right tabular-nums text-muted">{{ item.pensionShare | inrCurrency }}</td>
                                <td class="text-right tabular-nums font-semibold" [class.text-danger]="item.withdrawal > 0">
                                  {{ item.withdrawal > 0 ? ('-' + (item.withdrawal | inrCurrency)) : '—' }}
                                </td>
                                <td class="text-right tabular-nums text-green">
                                  {{ item.interest > 0 ? ('+' + (item.interest | inrCurrency)) : '—' }}
                                </td>
                                <td class="text-right tabular-nums font-bold" [class.text-teal]="item.netInflow >= 0" [class.text-danger]="item.netInflow < 0">
                                  {{ item.netInflow >= 0 ? '+' : '' }}{{ item.netInflow | inrCurrency }}
                                </td>
                                <td class="cell-note" [title]="item.note">{{ item.note }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <!-- Replace Existing Checkbox -->
                    <div class="import-options-card">
                      <label class="custom-checkbox-wrap">
                        <input
                          type="checkbox"
                          [(ngModel)]="replaceExisting"
                        />
                        <span class="checkbox-label">
                          <strong>Replace existing entries for this financial year</strong>
                          <small>Prevents duplicate rows if you have already recorded partial months manually</small>
                        </span>
                      </label>
                    </div>
                  </div>
                }
              }
            </div>

            <div class="modal-footer import-modal-footer">
              @if (!parsedPreview()) {
                <button type="button" class="btn-outline" (click)="closeImportModal()">
                  Cancel
                </button>
              } @else {
                <button type="button" class="btn-outline" (click)="resetImportFile()" [disabled]="pdfImporting()">
                  Upload Different PDF
                </button>
                <button
                  type="button"
                  class="btn-primary btn-commit-import"
                  (click)="commitImport()"
                  [disabled]="pdfImporting()"
                >
                  @if (pdfImporting()) {
                    <span class="spinner-sm"></span>
                    <span>Saving to Database...</span>
                  } @else {
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Confirm & Import to Passbook</span>
                  }
                </button>
              }
            </div>
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

    /* Distinct Withdrawal & Claim Rows */
    .row-withdrawal {
      background: rgba(239, 68, 68, 0.04);
      &:hover {
        background: rgba(239, 68, 68, 0.08) !important;
      }
    }

    .card-withdrawal {
      border-left: 3px solid #ef4444;
      background: rgba(239, 68, 68, 0.02);
    }

    .badge-mini-claim {
      font-size: 0.65rem;
      font-weight: 700;
      color: #dc2626;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 4px;
      padding: 1px 5px;
      margin-left: 0.35rem;
      letter-spacing: 0.03em;
      vertical-align: middle;
      display: inline-block;
    }

    .badge-outflow {
      background: rgba(239, 68, 68, 0.12);
      color: #dc2626;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }

    .month-title-row {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
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

    /* Import Passbook Button */
    .btn-import {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: linear-gradient(135deg, #0d9488 0%, #059669 100%);
      color: #fff;
      font-weight: 600;
      font-size: 0.875rem;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(13, 148, 136, 0.25);
      transition: all 0.2s ease;
      min-height: 44px;

      &:hover {
        background: linear-gradient(135deg, #0f766e 0%, #047857 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 6px rgba(13, 148, 136, 0.35);
      }
    }

    /* Export Dropdown */
    .export-dropdown-wrapper {
      position: relative;
    }

    .btn-export {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      min-height: 44px;
    }

    .export-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      min-width: 220px;
      padding: 0.35rem 0;
      z-index: 50;
      display: flex;
      flex-direction: column;
    }

    .export-menu-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem 1rem;
      background: transparent;
      border: none;
      color: var(--color-text-main);
      font-size: 0.84rem;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      width: 100%;
      transition: background 0.15s;

      &:hover {
        background: var(--color-bg-subtle);
        color: var(--color-primary);
      }
    }

    .menu-divider {
      height: 1px;
      background: var(--color-border);
      margin: 0.3rem 0;
    }

    /* Import Modal Dialog */
    .import-modal-dialog {
      max-width: 860px !important;
      width: 95%;
    }

    .modal-title-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .badge-epfo-official {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(13, 148, 136, 0.12);
      color: #0f766e;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
      width: fit-content;
    }

    .modal-subtitle {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      margin: 0;
    }

    .dropzone-area {
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-lg);
      padding: 3rem 1.5rem;
      text-align: center;
      background: var(--color-bg-subtle);
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover, &.drag-over {
        border-color: #0d9488;
        background: rgba(13, 148, 136, 0.04);
      }
    }

    .hidden-file-input { display: none; }

    .dropzone-icon-box {
      color: #0d9488;
      margin-bottom: 1rem;
    }

    .browse-link {
      color: #0d9488;
      font-weight: 600;
      text-decoration: underline;
    }

    .file-hint-pills {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 1.25rem;
    }

    .hint-pill {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      background: var(--color-bg-card);
      padding: 0.25rem 0.6rem;
      border-radius: 20px;
      border: 1px solid var(--color-border);
    }

    .parsing-spinner-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;

      .spinner {
        width: 36px;
        height: 36px;
        border: 3px solid rgba(13, 148, 136, 0.2);
        border-top-color: #0d9488;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Passbook Meta Card */
    .passbook-meta-card {
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
    }

    .meta-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .meta-label {
      font-size: 0.6875rem;
      font-weight: 700;
      color: var(--color-text-muted);
      letter-spacing: 0.05em;
    }

    .meta-value {
      font-size: 0.95rem;
      color: var(--color-text-main);
    }

    .meta-sub {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .fy-badge {
      display: inline-block;
      background: #0d9488;
      color: white;
      font-size: 0.8125rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
      width: fit-content;
    }

    .preview-metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .metric-pill-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;

      &.highlight-pill {
        border-color: rgba(16, 185, 129, 0.4);
        background: rgba(16, 185, 129, 0.03);
      }

      &.danger-pill {
        border-color: rgba(239, 68, 68, 0.4);
        background: rgba(239, 68, 68, 0.04);
      }
    }

    .metric-lbl {
      font-size: 0.72rem;
      color: var(--color-text-muted);
      font-weight: 600;
    }

    .metric-amt {
      font-size: 1.15rem;
      font-weight: 700;
    }

    .preview-table-wrap {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      overflow: hidden;
      margin-bottom: 1rem;
    }

    .preview-table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.65rem 1rem;
      background: var(--color-bg-subtle);
      border-bottom: 1px solid var(--color-border);

      h4 { margin: 0; font-size: 0.875rem; font-weight: 600; }
    }

    .badge-ready {
      font-size: 0.72rem;
      font-weight: 700;
      color: #059669;
      background: rgba(5, 150, 105, 0.1);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .preview-table-scroll {
      max-height: 230px;
      overflow-y: auto;
    }

    .preview-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;

      th {
        position: sticky;
        top: 0;
        background: var(--color-bg-card);
        padding: 0.5rem 0.75rem;
        border-bottom: 1px solid var(--color-border);
        font-weight: 600;
        color: var(--color-text-muted);
        text-align: left;
      }

      td {
        padding: 0.45rem 0.75rem;
        border-bottom: 1px solid var(--color-border);
      }
    }

    .cell-note {
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--color-text-muted);
      font-size: 0.75rem;
    }

    .import-options-card {
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
    }

    .custom-checkbox-wrap {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      cursor: pointer;

      input { margin-top: 0.2rem; }
    }

    .checkbox-label {
      display: flex;
      flex-direction: column;
      font-size: 0.84rem;

      small { color: var(--color-text-muted); font-size: 0.75rem; }
    }

    .btn-commit-import {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
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

  // Import Passbook PDF Signals
  readonly showImportModal = signal<boolean>(false);
  readonly pdfParsing = signal<boolean>(false);
  readonly pdfImporting = signal<boolean>(false);
  readonly parsedPreview = signal<EpfoPassbookParsePreview | null>(null);
  readonly parseError = signal<string | null>(null);
  readonly isDraggingOver = signal<boolean>(false);
  readonly replaceExisting = signal<boolean>(true);

  // Export Signals
  readonly showExportDropdown = signal<boolean>(false);

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.showExportDropdown()) {
      this.showExportDropdown.set(false);
    }
  }

  toggleExportDropdown(): void {
    setTimeout(() => {
      this.showExportDropdown.update(v => !v);
    }, 0);
  }

  downloadPdf(): void {
    this.showExportDropdown.set(false);
    this.epfoService.downloadExportPdf(this.selectedYear()).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Hisaab_EPFO_Passbook_${this.selectedYear()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => alert('Failed to download PDF statement.')
    });
  }

  downloadExcel(): void {
    this.showExportDropdown.set(false);
    this.epfoService.downloadExportExcel(this.selectedYear()).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Hisaab_EPFO_${this.selectedYear()}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => alert('Failed to download Excel spreadsheet.')
    });
  }

  openImportModal(): void {
    this.showImportModal.set(true);
    this.resetImportFile();
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
    this.resetImportFile();
  }

  resetImportFile(): void {
    this.parsedPreview.set(null);
    this.parseError.set(null);
    this.pdfParsing.set(false);
    this.pdfImporting.set(false);
    this.isDraggingOver.set(false);
    this.replaceExisting.set(true);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleSelectedFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleSelectedFile(input.files[0]);
      input.value = ''; // reset so same file can be selected again
    }
  }

  private handleSelectedFile(file: File): void {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      this.parseError.set('Please select a valid official EPFO PDF file (.pdf).');
      return;
    }

    this.parseError.set(null);
    this.pdfParsing.set(true);

    this.epfoService.uploadPassbookPdf(file).subscribe({
      next: (preview) => {
        this.pdfParsing.set(false);
        this.parsedPreview.set(preview);
        this.themeService.playSuccessSound();
      },
      error: (err) => {
        this.pdfParsing.set(false);
        this.parseError.set(err?.error?.message || 'Could not parse the EPFO Passbook PDF. Please ensure it is an official passbook downloaded from unifiedportal-mem.epfindia.gov.in');
      }
    });
  }

  commitImport(): void {
    const preview = this.parsedPreview();
    if (!preview || preview.monthlyEntries.length === 0) return;

    this.pdfImporting.set(true);
    this.epfoService.commitPassbookImport({
      entries: preview.monthlyEntries,
      replaceExistingYear: this.replaceExisting()
    }).subscribe({
      next: (res) => {
        this.pdfImporting.set(false);
        this.themeService.playSuccessSound();
        this.entries.set(res.entries);
        this.summary.set(res.summary);
        this.availableYears.set(res.availableYears);
        this.allTimeEpfBalance.set(res.allTimeEpfBalance);
        this.allTimePensionBalance.set(res.allTimePensionBalance);

        // Auto select the imported year
        const importedYear = preview.monthlyEntries[0]?.month
          ? new Date(preview.monthlyEntries[0].month).getFullYear()
          : res.summary.year;

        this.selectedYear.set(importedYear);
        this.closeImportModal();
        alert(`Successfully imported ${preview.monthlyEntries.length} EPFO monthly records for ${preview.financialYear}!`);
      },
      error: (err) => {
        this.pdfImporting.set(false);
        alert(err?.error?.message || 'Failed to save imported EPFO records.');
      }
    });
  }

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
