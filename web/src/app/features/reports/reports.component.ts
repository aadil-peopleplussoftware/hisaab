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
            <span class="icon-circle icon-income">📄</span>
            <div>
              <h3>Income & Expense Statement</h3>
              <p>Category-wise transaction breakdown and net savings summary</p>
            </div>
          </div>

          <div class="card-controls">
            <label>
              <span>Reporting Month:</span>
              <input type="month" [(ngModel)]="transactionsMonth" class="form-input" />
            </label>
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
                ⬇ Download PDF (A4)
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
                📊 Export Excel
              }
            </button>
          </div>
        </div>

        <!-- Report 2: Executive Monthly Financial Statement (Dashboard) -->
        <div class="report-card hero-style">
          <div class="card-icon-title">
            <span class="icon-circle icon-dash">⭐</span>
            <div>
              <h3>Comprehensive Financial Statement</h3>
              <p>Full net worth balance sheet, liquid cash, investments, EPF, and loans</p>
            </div>
          </div>

          <div class="card-controls">
            <label>
              <span>Statement Month:</span>
              <input type="month" [(ngModel)]="statementMonth" class="form-input" />
            </label>
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
                ⬇ Download Executive Statement (PDF)
              }
            </button>
          </div>
        </div>

        <!-- Report 3: Loans & Ledger Statement -->
        <div class="report-card">
          <div class="card-icon-title">
            <span class="icon-circle icon-loan">🤝</span>
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
                ⬇ Download PDF (A4)
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
                📊 Export Excel
              }
            </button>
          </div>
        </div>

        <!-- Report 4: EPFO Passbook Statement -->
        <div class="report-card">
          <div class="card-icon-title">
            <span class="icon-circle icon-epfo">🏛️</span>
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
                ⬇ Download PDF (A4)
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
                📊 Export Excel
              }
            </button>
          </div>
        </div>

        <!-- Report 5: Investment Portfolio Valuation -->
        <div class="report-card">
          <div class="card-icon-title">
            <span class="icon-circle icon-invest">📈</span>
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
                ⬇ Download PDF (A4)
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
                📊 Export Excel
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

  transactionsMonth = this.getCurrentMonth();
  statementMonth = this.getCurrentMonth();
  epfYear = 2026;

  readonly loadingKey = signal<string | null>(null);
  readonly statusMessage = signal<string | null>(null);
  readonly isError = signal<boolean>(false);

  downloadTransactionsPdf(): void {
    this.executeDownload('tx-pdf', () =>
      this.reportsService.getPdfReport('transactions', { month: this.transactionsMonth }),
      `Hisaab_Transactions_${this.transactionsMonth}.pdf`
    );
  }

  downloadTransactionsExcel(): void {
    this.executeDownload('tx-xlsx', () =>
      this.reportsService.getExcelReport('transactions', { month: this.transactionsMonth }),
      `Hisaab_Transactions_${this.transactionsMonth}.xlsx`
    );
  }

  downloadDashboardPdf(): void {
    this.executeDownload('dash-pdf', () =>
      this.reportsService.getPdfReport('dashboard', { month: this.statementMonth }),
      `Hisaab_Statement_${this.statementMonth}.pdf`
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
