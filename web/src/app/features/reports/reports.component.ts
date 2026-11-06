import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportsService } from './services/reports.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reports-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Financial Reports & Exports</h1>
          <p class="subtitle">Download server-generated QuestPDF A4 statements and ClosedXML Excel workbooks</p>
        </div>
      </div>

      <!-- Feedback Banner -->
      @if (statusMessage()) {
        <div class="status-banner" [class.error]="isError()">
          <span>{{ statusMessage() }}</span>
          <button type="button" class="btn-close" (click)="statusMessage.set(null)">✕</button>
        </div>
      }

      <div class="reports-grid">
        <!-- Report 1: Monthly Income & Expense -->
        <div class="report-card">
          <div class="card-icon-title">
            <span class="icon-circle icon-income">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </span>
            <div>
              <h3>Income & Expense Statement</h3>
              <p>Category-wise transaction breakdown and net savings summary</p>
            </div>
          </div>

          <div class="card-controls">
            <!-- Mode Selector & Quick Presets -->
            <div class="period-mode-row">
              <span class="control-label">Period Type:</span>
              <div class="pill-group">
                <button type="button" class="pill-btn" [class.active]="txMode === 'single'" (click)="setTxMode('single')">Single Month</button>
                <button type="button" class="pill-btn" [class.active]="txMode === 'range'" (click)="setTxMode('range')">Multi-Month Range</button>
              </div>
            </div>

            <!-- Date Selectors -->
            @if (txMode === 'single') {
              <div class="month-input-row">
                <label>
                  <span>Select Month:</span>
                  <input type="month" [(ngModel)]="txFromMonth" (ngModelChange)="txToMonth = txFromMonth" class="form-input" />
                </label>
              </div>
            } @else {
              <div class="range-inputs-grid">
                <label>
                  <span>From Month:</span>
                  <input type="month" [(ngModel)]="txFromMonth" class="form-input" />
                </label>
                <label>
                  <span>To Month:</span>
                  <input type="month" [(ngModel)]="txToMonth" class="form-input" />
                </label>
              </div>
            }

            <!-- Quick Preset Chips -->
            <div class="presets-row">
              <span class="presets-label">Quick Presets:</span>
              <div class="chips-list">
                <button type="button" class="chip-btn" (click)="applyTxPreset('this-month')">This Month</button>
                <button type="button" class="chip-btn" (click)="applyTxPreset('last-month')">Last Month</button>
                <button type="button" class="chip-btn" (click)="applyTxPreset('last-3m')">Last 3 Months (Quarter)</button>
                <button type="button" class="chip-btn" (click)="applyTxPreset('last-6m')">Last 6 Months</button>
                <button type="button" class="chip-btn" (click)="applyTxPreset('current-fy')">Current FY (Apr-Mar)</button>
                <button type="button" class="chip-btn" (click)="applyTxPreset('full-year')">Full Year (Jan-Dec)</button>
              </div>
            </div>

            <!-- Prominent Live Period Mention Card -->
            <div class="period-preview-badge">
              <div class="period-badge-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div class="period-badge-content">
                <div class="badge-title">Report Period Stated on Document:</div>
                <div class="badge-highlight">{{ getPeriodDisplay(txFromMonth, txToMonth) }}</div>
                <div class="badge-sub">Duration: {{ getDurationText(txFromMonth, txToMonth) }} • Mentioned prominently at top of PDF & Excel</div>
              </div>
            </div>
          </div>

          <div class="card-actions">
            <button
              type="button"
              class="btn-download btn-pdf"
              [disabled]="loadingKey() === 'tx-pdf'"
              (click)="downloadTransactionsPdf()"
            >
              @if (loadingKey() === 'tx-pdf') {
                <span class="spinner-sm"></span> Generating...
              } @else {
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Download PDF (A4)</span>
              }
            </button>
            <button
              type="button"
              class="btn-download btn-excel"
              [disabled]="loadingKey() === 'tx-xlsx'"
              (click)="downloadTransactionsExcel()"
            >
              @if (loadingKey() === 'tx-xlsx') {
                <span class="spinner-sm"></span>
              } @else {
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="8" y1="13" x2="16" y2="13"/>
                  <line x1="8" y1="17" x2="16" y2="17"/>
                </svg>
                <span>Export Excel</span>
              }
            </button>
          </div>
        </div>

        <!-- Report 2: Executive Monthly Financial Statement (Dashboard) -->
        <div class="report-card hero-style">
          <div class="card-icon-title">
            <span class="icon-circle icon-dash">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </span>
            <div>
              <h3>Comprehensive Financial Statement</h3>
              <p>Full net worth balance sheet, liquid cash, investments, EPF, and loans</p>
            </div>
          </div>

          <div class="card-controls">
            <!-- Mode Selector & Quick Presets -->
            <div class="period-mode-row">
              <span class="control-label">Period Type:</span>
              <div class="pill-group">
                <button type="button" class="pill-btn" [class.active]="dashMode === 'single'" (click)="setDashMode('single')">Single Month</button>
                <button type="button" class="pill-btn" [class.active]="dashMode === 'range'" (click)="setDashMode('range')">Multi-Month Range</button>
              </div>
            </div>

            <!-- Date Selectors -->
            @if (dashMode === 'single') {
              <div class="month-input-row">
                <label>
                  <span>Select Statement Month:</span>
                  <input type="month" [(ngModel)]="dashFromMonth" (ngModelChange)="dashToMonth = dashFromMonth" class="form-input" />
                </label>
              </div>
            } @else {
              <div class="range-inputs-grid">
                <label>
                  <span>From Month:</span>
                  <input type="month" [(ngModel)]="dashFromMonth" class="form-input" />
                </label>
                <label>
                  <span>To Month:</span>
                  <input type="month" [(ngModel)]="dashToMonth" class="form-input" />
                </label>
              </div>
            }

            <!-- Quick Preset Chips -->
            <div class="presets-row">
              <span class="presets-label">Quick Presets:</span>
              <div class="chips-list">
                <button type="button" class="chip-btn" (click)="applyDashPreset('this-month')">This Month</button>
                <button type="button" class="chip-btn" (click)="applyDashPreset('last-month')">Last Month</button>
                <button type="button" class="chip-btn" (click)="applyDashPreset('last-3m')">Last 3 Months</button>
                <button type="button" class="chip-btn" (click)="applyDashPreset('last-6m')">Last 6 Months</button>
                <button type="button" class="chip-btn" (click)="applyDashPreset('current-fy')">Current FY</button>
                <button type="button" class="chip-btn" (click)="applyDashPreset('full-year')">Full Year</button>
              </div>
            </div>

            <!-- Prominent Live Period Mention Card -->
            <div class="period-preview-badge hero-badge">
              <div class="period-badge-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <div class="period-badge-content">
                <div class="badge-title">Statement Period Stated on Document:</div>
                <div class="badge-highlight">{{ getPeriodDisplay(dashFromMonth, dashToMonth) }}</div>
                <div class="badge-sub">Duration: {{ getDurationText(dashFromMonth, dashToMonth) }} • Cumulative balance sheet + period cashflow breakdown</div>
              </div>
            </div>
          </div>

          <div class="card-actions">
            <button
              type="button"
              class="btn-download btn-pdf-primary"
              [disabled]="loadingKey() === 'dash-pdf'"
              (click)="downloadDashboardPdf()"
            >
              @if (loadingKey() === 'dash-pdf') {
                <span class="spinner-sm"></span> Generating Statement...
              } @else {
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Download Executive Statement (PDF)</span>
              }
            </button>
          </div>
        </div>

        <!-- Report 3: Loans & Ledger Statement -->
        <div class="report-card">
          <div class="card-icon-title">
            <span class="icon-circle icon-loan">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
            <div>
              <h3>Loan Accounts & Ledger Statement</h3>
              <p>Complete ledger of given and taken loans, disbursements, and repayments</p>
            </div>
          </div>

          <div class="card-actions">
            <button
              type="button"
              class="btn-download btn-pdf"
              [disabled]="loadingKey() === 'loans-pdf'"
              (click)="downloadLoansPdf()"
            >
              @if (loadingKey() === 'loans-pdf') {
                <span class="spinner-sm"></span> Generating...
              } @else {
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Download PDF (A4)</span>
              }
            </button>
            <button
              type="button"
              class="btn-download btn-excel"
              [disabled]="loadingKey() === 'loans-xlsx'"
              (click)="downloadLoansExcel()"
            >
              @if (loadingKey() === 'loans-xlsx') {
                <span class="spinner-sm"></span>
              } @else {
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="8" y1="13" x2="16" y2="13"/>
                  <line x1="8" y1="17" x2="16" y2="17"/>
                </svg>
                <span>Export Excel</span>
              }
            </button>
          </div>
        </div>

        <!-- Report 4: EPFO Passbook Statement -->
        <div class="report-card">
          <div class="card-icon-title">
            <span class="icon-circle icon-epfo">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="21" x2="21" y2="21"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <polyline points="12 3 2 10 22 10"/>
                <line x1="6" y1="10" x2="6" y2="21"/>
                <line x1="10" y1="10" x2="10" y2="21"/>
                <line x1="14" y1="10" x2="14" y2="21"/>
                <line x1="18" y1="10" x2="18" y2="21"/>
              </svg>
            </span>
            <div>
              <h3>EPFO Annual Passbook</h3>
              <p>Monthly employee, employer, pension shares, interest, and withdrawals</p>
            </div>
          </div>

          <div class="card-controls">
            <label>
              <span>Calendar Year:</span>
              <select [(ngModel)]="epfYear" class="form-input">
                <option [ngValue]="2026">2026</option>
                <option [ngValue]="2025">2025</option>
                <option [ngValue]="2024">2024</option>
              </select>
            </label>
          </div>

          <div class="card-actions">
            <button
              type="button"
              class="btn-download btn-pdf"
              [disabled]="loadingKey() === 'epf-pdf'"
              (click)="downloadEpfoPdf()"
            >
              @if (loadingKey() === 'epf-pdf') {
                <span class="spinner-sm"></span> Generating...
              } @else {
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Download PDF (A4)</span>
              }
            </button>
            <button
              type="button"
              class="btn-download btn-excel"
              [disabled]="loadingKey() === 'epf-xlsx'"
              (click)="downloadEpfoExcel()"
            >
              @if (loadingKey() === 'epf-xlsx') {
                <span class="spinner-sm"></span>
              } @else {
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="8" y1="13" x2="16" y2="13"/>
                  <line x1="8" y1="17" x2="16" y2="17"/>
                </svg>
                <span>Export Excel</span>
              }
            </button>
          </div>
        </div>

        <!-- Report 5: Investment Portfolio Valuation -->
        <div class="report-card">
          <div class="card-icon-title">
            <span class="icon-circle icon-invest">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </span>
            <div>
              <h3>Investment Portfolio Report</h3>
              <p>Asset allocation, holding-wise valuations, invested capital, and gain/loss</p>
            </div>
          </div>

          <div class="card-actions">
            <button
              type="button"
              class="btn-download btn-pdf"
              [disabled]="loadingKey() === 'inv-pdf'"
              (click)="downloadInvestmentsPdf()"
            >
              @if (loadingKey() === 'inv-pdf') {
                <span class="spinner-sm"></span> Generating...
              } @else {
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Download PDF (A4)</span>
              }
            </button>
            <button
              type="button"
              class="btn-download btn-excel"
              [disabled]="loadingKey() === 'inv-xlsx'"
              (click)="downloadInvestmentsExcel()"
            >
              @if (loadingKey() === 'inv-xlsx') {
                <span class="spinner-sm"></span>
              } @else {
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" class="mr-1">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="8" y1="13" x2="16" y2="13"/>
                  <line x1="8" y1="17" x2="16" y2="17"/>
                </svg>
                <span>Export Excel</span>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reports-page {
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

    .status-banner {
      background: #ecfdf5;
      border: 1px solid #10b981;
      color: #065f46;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.875rem;
      font-weight: 500;

      &.error {
        background: #fef2f2;
        border-color: #ef4444;
        color: #991b1b;
      }
    }

    .btn-close {
      background: transparent;
      border: none;
      font-size: 1rem;
      cursor: pointer;
      color: inherit;
    }

    .reports-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;

      @media (min-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .report-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1.25rem;

      &.hero-style {
        border-color: #6366f1;
        background: linear-gradient(180deg, var(--color-bg-card) 0%, rgba(99, 102, 241, 0.04) 100%);
      }
    }

    .card-icon-title {
      display: flex;
      gap: 1rem;
      align-items: flex-start;

      h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--color-text-main);
      }

      p {
        margin: 0.25rem 0 0;
        font-size: 0.85rem;
        color: var(--color-text-muted);
      }
    }

    .icon-circle {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
      background: var(--color-bg-subtle, #f3f4f6);
    }

    .card-controls {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--color-text-main);
      }
    }

    .period-mode-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.25rem;

      .control-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-text-muted);
      }
    }

    .pill-group {
      display: inline-flex;
      background: var(--color-bg-subtle, #f3f4f6);
      border-radius: var(--radius-full, 9999px);
      padding: 2px;
      border: 1px solid var(--color-border);

      .pill-btn {
        background: transparent;
        border: none;
        padding: 0.25rem 0.75rem;
        border-radius: var(--radius-full, 9999px);
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-text-muted);
        cursor: pointer;
        transition: all 0.15s ease;

        &.active {
          background: var(--color-bg-card, #ffffff);
          color: var(--color-primary);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
      }
    }

    .range-inputs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;

      label {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
        span { font-size: 0.75rem; color: var(--color-text-muted); }
        .form-input { width: 100%; box-sizing: border-box; }
      }
    }

    .month-input-row {
      label {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.25rem;
        span { font-size: 0.75rem; color: var(--color-text-muted); }
        .form-input { width: 100%; box-sizing: border-box; }
      }
    }

    .presets-row {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-top: 0.25rem;

      .presets-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-text-muted);
      }
    }

    .chips-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;

      .chip-btn {
        background: var(--color-bg-subtle, #f3f4f6);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-full, 9999px);
        padding: 0.2rem 0.55rem;
        font-size: 0.75rem;
        color: var(--color-text-main);
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
          background: rgba(99, 102, 241, 0.08);
        }
      }
    }

    .period-preview-badge {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
      background: rgba(99, 102, 241, 0.08);
      border: 1px solid rgba(99, 102, 241, 0.25);
      margin-top: 0.5rem;

      .period-badge-icon {
        color: var(--color-primary);
        margin-top: 0.1rem;
        flex-shrink: 0;
      }

      .badge-title {
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .badge-highlight {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--color-primary);
        margin: 0.1rem 0;
      }

      .badge-sub {
        font-size: 0.73rem;
        color: var(--color-text-muted);
        line-height: 1.3;
      }

      &.hero-badge {
        background: rgba(79, 70, 229, 0.1);
        border-color: rgba(79, 70, 229, 0.3);
      }
    }

    .form-input {
      padding: 0.45rem 0.75rem;
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
    }

    .card-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .btn-download {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1.15rem;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      min-height: var(--min-touch-target);
      border: 1px solid transparent;
      transition: all 0.15s ease;

      &:active {
        transform: scale(0.98);
      }

      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    }

    .btn-pdf {
      background: var(--color-bg-subtle);
      color: var(--color-text-main);
      border-color: var(--color-border);

      &:hover:not(:disabled) {
        background: var(--color-expense-bg);
        color: var(--color-expense);
        border-color: var(--color-expense-border);
      }
    }

    .btn-pdf-primary {
      background: var(--color-primary);
      color: #ffffff;
      flex: 1;

      &:hover:not(:disabled) {
        background: var(--color-primary-hover);
        box-shadow: 0 4px 6px -1px rgb(79 70 229 / 0.3);
      }
    }

    .btn-excel {
      background: var(--color-bg-subtle);
      color: var(--color-text-main);
      border-color: var(--color-border);

      &:hover:not(:disabled) {
        background: var(--color-income-bg);
        color: var(--color-income);
        border-color: var(--color-income-border);
      }
    }

    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ReportsComponent {
  private readonly reportsService = inject(ReportsService);

  // Transaction Report Controls
  txMode: 'single' | 'range' = 'range';
  txFromMonth = this.getCurrentMonth();
  txToMonth = this.getCurrentMonth();

  // Comprehensive Statement Controls
  dashMode: 'single' | 'range' = 'range';
  dashFromMonth = this.getCurrentMonth();
  dashToMonth = this.getCurrentMonth();

  epfYear = 2026;

  readonly loadingKey = signal<string | null>(null);
  readonly statusMessage = signal<string | null>(null);
  readonly isError = signal<boolean>(false);

  setTxMode(mode: 'single' | 'range'): void {
    this.txMode = mode;
    if (mode === 'single') {
      this.txToMonth = this.txFromMonth;
    }
  }

  setDashMode(mode: 'single' | 'range'): void {
    this.dashMode = mode;
    if (mode === 'single') {
      this.dashToMonth = this.dashFromMonth;
    }
  }

  applyTxPreset(preset: string): void {
    const [from, to] = this.calculatePresetRange(preset);
    this.txFromMonth = from;
    this.txToMonth = to;
    this.txMode = from === to ? 'single' : 'range';
  }

  applyDashPreset(preset: string): void {
    const [from, to] = this.calculatePresetRange(preset);
    this.dashFromMonth = from;
    this.dashToMonth = to;
    this.dashMode = from === to ? 'single' : 'range';
  }

  private calculatePresetRange(preset: string): [string, string] {
    const d = new Date();
    const currYear = d.getFullYear();
    const currMonth = d.getMonth() + 1;

    const formatMonth = (y: number, m: number) => `${y}-${m.toString().padStart(2, '0')}`;
    const thisMonthStr = formatMonth(currYear, currMonth);

    switch (preset) {
      case 'this-month':
        return [thisMonthStr, thisMonthStr];

      case 'last-month': {
        const lastMDate = new Date(currYear, currMonth - 2, 1);
        const lmStr = formatMonth(lastMDate.getFullYear(), lastMDate.getMonth() + 1);
        return [lmStr, lmStr];
      }

      case 'last-3m': {
        const start = new Date(currYear, currMonth - 3, 1);
        return [formatMonth(start.getFullYear(), start.getMonth() + 1), thisMonthStr];
      }

      case 'last-6m': {
        const start = new Date(currYear, currMonth - 6, 1);
        return [formatMonth(start.getFullYear(), start.getMonth() + 1), thisMonthStr];
      }

      case 'current-fy': {
        const fyStartYear = currMonth >= 4 ? currYear : currYear - 1;
        return [formatMonth(fyStartYear, 4), thisMonthStr];
      }

      case 'full-year': {
        return [formatMonth(currYear, 1), formatMonth(currYear, 12)];
      }

      default:
        return [thisMonthStr, thisMonthStr];
    }
  }

  getPeriodDisplay(fromStr: string, toStr: string): string {
    if (!fromStr) return '—';
    const to = toStr || fromStr;
    const fDate = this.parseYearMonth(fromStr);
    const tDate = this.parseYearMonth(to);

    if (!fDate || !tDate) return fromStr;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    if (fDate.year === tDate.year && fDate.month === tDate.month) {
      return `${monthNames[fDate.month - 1]} ${fDate.year}`;
    }

    if (fDate.year === tDate.year) {
      return `${monthNames[fDate.month - 1]} to ${monthNames[tDate.month - 1]} ${fDate.year}`;
    }

    return `${monthNames[fDate.month - 1]} ${fDate.year} to ${monthNames[tDate.month - 1]} ${tDate.year}`;
  }

  getDurationText(fromStr: string, toStr: string): string {
    const fDate = this.parseYearMonth(fromStr);
    const tDate = this.parseYearMonth(toStr || fromStr);
    if (!fDate || !tDate) return '1 Month';

    let months = ((tDate.year - fDate.year) * 12) + (tDate.month - fDate.month) + 1;
    if (months <= 0) months = 1;

    return months === 1 ? '1 Month' : `${months} Months`;
  }

  private parseYearMonth(ym: string): { year: number; month: number } | null {
    if (!ym) return null;
    const parts = ym.split('-');
    if (parts.length < 2) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (isNaN(year) || isNaN(month)) return null;
    return { year, month };
  }

  downloadTransactionsPdf(): void {
    const from = this.txFromMonth;
    const to = this.txToMonth || this.txFromMonth;
    const fileTag = from === to ? from : `${from}_to_${to}`;

    this.executeDownload('tx-pdf', () =>
      this.reportsService.getPdfReport('transactions', { fromMonth: from, toMonth: to }),
      `Hisaab_Transactions_${fileTag}.pdf`
    );
  }

  downloadTransactionsExcel(): void {
    const from = this.txFromMonth;
    const to = this.txToMonth || this.txFromMonth;
    const fileTag = from === to ? from : `${from}_to_${to}`;

    this.executeDownload('tx-xlsx', () =>
      this.reportsService.getExcelReport('transactions', { fromMonth: from, toMonth: to }),
      `Hisaab_Transactions_${fileTag}.xlsx`
    );
  }

  downloadDashboardPdf(): void {
    const from = this.dashFromMonth;
    const to = this.dashToMonth || this.dashFromMonth;
    const fileTag = from === to ? from : `${from}_to_${to}`;

    this.executeDownload('dash-pdf', () =>
      this.reportsService.getPdfReport('dashboard', { fromMonth: from, toMonth: to }),
      `Hisaab_Statement_${fileTag}.pdf`
    );
  }

  downloadLoansPdf(): void {
    this.executeDownload('loans-pdf', () =>
      this.reportsService.getPdfReport('loans'),
      'Hisaab_Loans_Summary.pdf'
    );
  }

  downloadLoansExcel(): void {
    this.executeDownload('loans-xlsx', () =>
      this.reportsService.getExcelReport('loans'),
      'Hisaab_Loans_Summary.xlsx'
    );
  }

  downloadEpfoPdf(): void {
    this.executeDownload('epf-pdf', () =>
      this.reportsService.getPdfReport('epf', { year: this.epfYear }),
      `Hisaab_EPFO_Passbook_${this.epfYear}.pdf`
    );
  }

  downloadEpfoExcel(): void {
    this.executeDownload('epf-xlsx', () =>
      this.reportsService.getExcelReport('epf', { year: this.epfYear }),
      `Hisaab_EPFO_Statement_${this.epfYear}.xlsx`
    );
  }

  downloadInvestmentsPdf(): void {
    this.executeDownload('inv-pdf', () =>
      this.reportsService.getPdfReport('investments'),
      'Hisaab_Investments_Portfolio.pdf'
    );
  }

  downloadInvestmentsExcel(): void {
    this.executeDownload('inv-xlsx', () =>
      this.reportsService.getExcelReport('investments'),
      'Hisaab_Investments_Portfolio.xlsx'
    );
  }

  private executeDownload(key: string, fetchFn: () => any, fileName: string): void {
    this.loadingKey.set(key);
    this.statusMessage.set(null);
    this.isError.set(false);

    fetchFn().subscribe({
      next: (blob: Blob) => {
        this.reportsService.downloadBlob(blob, fileName);
        this.loadingKey.set(null);
        this.statusMessage.set(`Successfully downloaded ${fileName}`);
        this.isError.set(false);
      },
      error: (err: any) => {
        this.loadingKey.set(null);
        this.isError.set(true);
        this.statusMessage.set('Failed to generate statement. Please try again.');
      }
    });
  }

  private getCurrentMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  }
}
