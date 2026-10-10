import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoansService } from './services/loans.service';
import {
  CreateLoanRequest,
  LoanAccount,
  LoanDirection,
  LoanInterestType,
  LoanStatus,
  LoanSummary
} from './models/loan.model';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InrCurrencyPipe, StatCardComponent],
  template: `
    <div class="loans-page">
      <!-- Header & Action -->
      <div class="page-header no-print">
        <div>
          <h1 class="page-title">Loans (Given & Taken)</h1>
          <p class="subtitle">Track money lent to friends/family and borrowed debts with interest</p>
        </div>

        <div class="header-actions">
          <button type="button" class="btn-primary" (click)="openCreateModal()">
            + New Loan
          </button>
        </div>
      </div>

      <!-- Financial Summary Cards -->
      <div class="summary-grid">
        <app-stat-card
          title="Given (Lent)"
          [amount]="summary()?.totalGivenOutstanding || 0"
          subtitle="Receivable from others"
          variant="income"
        />
        <app-stat-card
          title="Taken (Borrowed)"
          [amount]="summary()?.totalTakenOutstanding || 0"
          subtitle="Payable to lenders"
          variant="expense"
        />
        <app-stat-card
          title="Net Loan Position"
          [amount]="summary()?.netPosition || 0"
          [subtitle]="(summary()?.netPosition || 0) >= 0 ? 'Net Receivable' : 'Net Debt'"
          variant="neutral"
        />
      </div>

      <!-- Filter Tabs & Search Toolbar -->
      <div class="toolbar card no-print">
        <div class="type-pills">
          <button
            type="button"
            class="pill-btn"
            [class.active]="selectedTab() === 'all'"
            (click)="setTab('all')">
            All
          </button>
          <button
            type="button"
            class="pill-btn pill-given"
            [class.active]="selectedTab() === 'given'"
            (click)="setTab('given')">
            Given (Lent)
          </button>
          <button
            type="button"
            class="pill-btn pill-taken"
            [class.active]="selectedTab() === 'taken'"
            (click)="setTab('taken')">
            Taken (Borrowed)
          </button>
          <button
            type="button"
            class="pill-btn pill-closed"
            [class.active]="selectedTab() === 'closed'"
            (click)="setTab('closed')">
            Closed
          </button>
        </div>

        <div class="filter-controls">
          <input
            type="text"
            class="input-search"
            placeholder="Search person, loan name, or note..."
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
          />
        </div>
      </div>

      <!-- Loading Skeleton -->
      @if (loading()) {
        <div class="loading-container">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && accounts().length === 0) {
        <div class="empty-card card">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h3>No loans recorded yet</h3>
          <p>Record loans you have given to friends or borrowed amounts with interest tracking.</p>
          <button type="button" class="btn-primary mt-4" (click)="openCreateModal()">
            Create Your First Loan
          </button>
        </div>
      }

      <!-- Mobile Card List View (< 768px) -->
      @if (!loading() && accounts().length > 0) {
        <div class="mobile-card-list">
          @for (acc of accounts(); track acc.id) {
            <div class="loan-card card" (click)="viewLoan(acc.id)">
              <div class="loan-card-header">
                <div>
                  <h4 class="loan-title">{{ acc.name }}</h4>
                  <div class="loan-counterparty">{{ acc.counterparty }}</div>
                </div>
                <div class="badges-row">
                  <span
                    class="badge"
                    [class.badge-given]="acc.direction === 1"
                    [class.badge-taken]="acc.direction === 2">
                    {{ acc.direction === 1 ? 'Given' : 'Taken' }}
                  </span>
                  @if (acc.status === 2) {
                    <span class="badge badge-closed">Closed</span>
                  }
                </div>
              </div>

              <div class="loan-card-body">
                <div class="metric-row">
                  <span class="metric-label">Outstanding Balance:</span>
                  <span
                    class="metric-val"
                    [class.val-given]="acc.direction === 1"
                    [class.val-taken]="acc.direction === 2">
                    {{ acc.outstandingBalance | inrCurrency }}
                  </span>
                </div>
                <div class="metric-row sub-row">
                  <span class="metric-label">Original Principal:</span>
                  <span class="sub-val">{{ acc.principal | inrCurrency }}</span>
                </div>
                <div class="metric-row sub-row">
                  <span class="metric-label">Interest:</span>
                  <span class="sub-val">
                    {{ acc.interestRate }}% {{ acc.interestTypeName }}
                  </span>
                </div>
                @if (acc.dueDate) {
                  <div class="metric-row sub-row">
                    <span class="metric-label">Due Date:</span>
                    <span class="sub-val">{{ acc.dueDate | date:'mediumDate' }}</span>
                  </div>
                }
              </div>

              <div class="loan-card-footer">
                <span class="txn-count">{{ acc.transactionCount }} transactions</span>
                <span class="link-arrow">View Ledger &rarr;</span>
              </div>
            </div>
          }
        </div>

        <!-- Desktop Ledger Table (>= 768px) -->
        <div class="desktop-table-container card">
          <table class="loans-table">
            <thead>
              <tr>
                <th>Loan / Counterparty</th>
                <th>Direction</th>
                <th>Principal</th>
                <th>Outstanding Balance</th>
                <th>Interest Rate</th>
                <th>Due Date</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (acc of accounts(); track acc.id) {
                <tr class="table-row" (click)="viewLoan(acc.id)">
                  <td>
                    <div class="loan-name-cell">{{ acc.name }}</div>
                    <div class="counterparty-cell">{{ acc.counterparty }}</div>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-given]="acc.direction === 1"
                      [class.badge-taken]="acc.direction === 2">
                      {{ acc.direction === 1 ? 'Given' : 'Taken' }}
                    </span>
                  </td>
                  <td class="tabular-nums font-medium">
                    {{ acc.principal | inrCurrency }}
                  </td>
                  <td class="tabular-nums font-bold"
                    [class.text-green]="acc.direction === 1"
                    [class.text-amber]="acc.direction === 2">
                    {{ acc.outstandingBalance | inrCurrency }}
                  </td>
                  <td>
                    {{ acc.interestRate }}% <span class="text-muted text-xs">({{ acc.interestTypeName }})</span>
                  </td>
                  <td>
                    {{ acc.dueDate ? (acc.dueDate | date:'mediumDate') : '—' }}
                  </td>
                  <td>
                    <span
                      class="status-indicator"
                      [class.status-active]="acc.status === 1"
                      [class.status-closed]="acc.status === 2">
                      {{ acc.status === 1 ? 'Active' : 'Closed' }}
                    </span>
                  </td>
                  <td class="text-right" (click)="$event.stopPropagation()">
                    <button
                      type="button"
                      class="btn-sm btn-outline"
                      (click)="viewLoan(acc.id)">
                      View Ledger
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Create Loan Modal / Bottom Sheet -->
      @if (showCreateModal()) {
        <div class="modal-backdrop" (click)="closeCreateModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Create New Loan</h3>
              <button type="button" class="btn-close" (click)="closeCreateModal()">&times;</button>
            </div>

            <form [formGroup]="loanForm" (ngSubmit)="submitCreateLoan()">
              <div class="modal-body">
                <!-- Direction Toggle -->
                <div class="form-group">
                  <label class="form-label">Loan Direction</label>
                  <div class="direction-toggle">
                    <button
                      type="button"
                      class="toggle-btn"
                      [class.active-given]="loanForm.get('direction')?.value === 1"
                      (click)="loanForm.patchValue({ direction: 1 })">
                      Given (I Lent Money)
                    </button>
                    <button
                      type="button"
                      class="toggle-btn"
                      [class.active-taken]="loanForm.get('direction')?.value === 2"
                      (click)="loanForm.patchValue({ direction: 2 })">
                      Taken (I Borrowed)
                    </button>
                  </div>
                </div>

                <!-- Loan Name -->
                <div class="form-group">
                  <label class="form-label" for="loanName">Loan Name / Purpose *</label>
                  <input
                    id="loanName"
                    type="text"
                    class="form-control"
                    placeholder="e.g. Personal loan to Ramesh or Home Loan"
                    formControlName="name"
                  />
                  @if (loanForm.get('name')?.invalid && loanForm.get('name')?.touched) {
                    <span class="form-error">Loan name is required.</span>
                  }
                </div>

                <!-- Counterparty -->
                <div class="form-group">
                  <label class="form-label" for="counterparty">
                    {{ loanForm.get('direction')?.value === 1 ? 'Borrower Name (Who took the loan) *' : 'Lender / Bank Name (Who gave the loan) *' }}
                  </label>
                  <input
                    id="counterparty"
                    type="text"
                    class="form-control"
                    placeholder="e.g. Ramesh Kumar or HDFC Bank"
                    formControlName="counterparty"
                  />
                  @if (loanForm.get('counterparty')?.invalid && loanForm.get('counterparty')?.touched) {
                    <span class="form-error">Counterparty is required.</span>
                  }
                </div>

                <!-- Principal Amount -->
                <div class="form-group">
                  <label class="form-label" for="principal">Principal Amount (₹) *</label>
                  <input
                    id="principal"
                    type="number"
                    step="0.01"
                    class="form-control"
                    placeholder="e.g. 50000"
                    formControlName="principal"
                  />
                  @if (loanForm.get('principal')?.invalid && loanForm.get('principal')?.touched) {
                    <span class="form-error">Principal must be greater than zero.</span>
                  }
                </div>

                <!-- Interest Rate & Type Row -->
                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label" for="interestRate">Interest Rate (% p.a.)</label>
                    <input
                      id="interestRate"
                      type="number"
                      step="0.1"
                      class="form-control"
                      placeholder="0"
                      formControlName="interestRate"
                    />
                  </div>

                  <div class="form-group col-half">
                    <label class="form-label" for="interestType">Interest Type</label>
                    <select id="interestType" class="form-control" formControlName="interestType">
                      <option [value]="0">None (0%)</option>
                      <option [value]="1">Simple Interest</option>
                      <option [value]="2">Compound Interest (Monthly)</option>
                    </select>
                  </div>
                </div>

                <!-- Dates Row -->
                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label" for="startDate">Start Date *</label>
                    <input
                      id="startDate"
                      type="date"
                      class="form-control"
                      formControlName="startDate"
                    />
                  </div>

                  <div class="form-group col-half">
                    <label class="form-label" for="dueDate">Due Date (Optional)</label>
                    <input
                      id="dueDate"
                      type="date"
                      class="form-control"
                      formControlName="dueDate"
                    />
                  </div>
                </div>

                <!-- Note -->
                <div class="form-group">
                  <label class="form-label" for="loanNote">Note / Agreement Details</label>
                  <textarea
                    id="loanNote"
                    class="form-control"
                    rows="2"
                    placeholder="Optional details or terms..."
                    formControlName="note"
                  ></textarea>
                </div>
              </div>

              <div class="modal-footer">
                <button
                  type="button"
                  class="btn-outline"
                  (click)="closeCreateModal()"
                  [disabled]="submitting()">
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn-primary"
                  [disabled]="loanForm.invalid || submitting()">
                  {{ submitting() ? 'Saving...' : 'Create Loan' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .loans-page {
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

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    @media (min-width: 640px) {
      .summary-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .toolbar {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
    }

    @media (min-width: 768px) {
      .toolbar {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .type-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .pill-btn {
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
      border: 1px solid var(--color-border);
      background: var(--color-bg-subtle);
      color: var(--color-text-muted);
      cursor: pointer;
      min-height: 44px;
      transition: all 0.15s ease-in-out;
    }

    .pill-btn.active {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }

    .pill-given.active {
      background: #059669;
      border-color: #059669;
    }

    .pill-taken.active {
      background: #d97706;
      border-color: #d97706;
    }

    .pill-closed.active {
      background: #64748b;
      border-color: #64748b;
    }

    .filter-controls {
      display: flex;
      flex: 1;
      max-width: 400px;
    }

    .input-search {
      width: 100%;
      padding: 0.5rem 0.875rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-card);
      color: var(--color-text-main);
      font-size: 0.875rem;
      min-height: 44px;
    }

    /* Cards & Lists */
    .mobile-card-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    @media (min-width: 768px) {
      .mobile-card-list {
        display: none;
      }
    }

    .desktop-table-container {
      display: none;
      overflow-x: auto;
    }

    @media (min-width: 768px) {
      .desktop-table-container {
        display: block;
      }
    }

    .loan-card {
      padding: 1.25rem;
      cursor: pointer;
      transition: border-color 0.15s ease;
    }

    .loan-card:hover {
      border-color: var(--color-primary);
    }

    .loan-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .loan-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-main);
    }

    .loan-counterparty {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      margin-top: 0.15rem;
    }

    .badges-row {
      display: flex;
      gap: 0.35rem;
    }

    .badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-given {
      background: #ecfdf5;
      color: #065f46;
    }

    .badge-taken {
      background: #fffbeb;
      color: #92400e;
    }

    .badge-closed {
      background: #f1f5f9;
      color: #475569;
    }

    .loan-card-body {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-bottom: 0.75rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--color-border);
    }

    .metric-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }

    .metric-label {
      color: var(--color-text-muted);
    }

    .metric-val {
      font-weight: 700;
      font-size: 1.1rem;
    }

    .val-given {
      color: #059669;
    }

    .val-taken {
      color: #d97706;
    }

    .sub-row {
      font-size: 0.8125rem;
    }

    .sub-val {
      color: var(--color-text-main);
      font-weight: 500;
    }

    .loan-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .link-arrow {
      color: var(--color-primary);
      font-weight: 600;
    }

    /* Table Styles */
    .loans-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .loans-table th {
      padding: 0.875rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
    }

    .loans-table td {
      padding: 1rem;
      font-size: 0.875rem;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text-main);
    }

    .table-row {
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .table-row:hover {
      background-color: var(--color-bg-subtle);
    }

    .loan-name-cell {
      font-weight: 600;
      color: var(--color-text-main);
    }

    .counterparty-cell {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .status-active::before {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
    }

    .status-closed::before {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
    }

    .text-green {
      color: #059669;
    }

    .text-amber {
      color: #d97706;
    }

    .text-right {
      text-align: right;
    }

    .btn-sm {
      padding: 0.35rem 0.75rem;
      font-size: 0.8125rem;
      border-radius: var(--radius-sm);
      min-height: 36px;
    }

    /* Modal bottom-sheet styles */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 50;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    @media (min-width: 640px) {
      .modal-backdrop {
        align-items: center;
      }
    }

    .modal-dialog {
      background: var(--color-bg-card);
      width: 100%;
      max-width: 520px;
      border-radius: 1rem 1rem 0 0;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: var(--shadow-lg);
    }

    @media (min-width: 640px) {
      .modal-dialog {
        border-radius: var(--radius-lg);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem;
      border-bottom: 1px solid var(--color-border);
    }

    .modal-header h3 {
      margin: 0;
      font-size: 1.25rem;
      color: var(--color-text-main);
    }

    .btn-close {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      color: var(--color-text-muted);
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

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-row {
      display: flex;
      gap: 0.75rem;
    }

    .col-half {
      flex: 1;
    }

    .form-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-muted);
    }

    .form-control {
      padding: 0.625rem 0.875rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-card);
      color: var(--color-text-main);
      font-size: 0.875rem;
      min-height: 44px;
    }

    .form-error {
      font-size: 0.75rem;
      color: #ef4444;
    }

    .direction-toggle {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .toggle-btn {
      padding: 0.625rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-subtle);
      color: var(--color-text-muted);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      min-height: 44px;
    }

    .toggle-btn.active-given {
      background: #ecfdf5;
      color: #065f46;
      border-color: #059669;
      font-weight: 600;
    }

    .toggle-btn.active-taken {
      background: #fffbeb;
      color: #92400e;
      border-color: #d97706;
      font-weight: 600;
    }

    .empty-card {
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 0.75rem;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

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
  `]
})
export class LoansComponent implements OnInit {
  private readonly loansService = inject(LoansService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly accounts = signal<LoanAccount[]>([]);
  readonly summary = signal<LoanSummary | null>(null);
  readonly loading = signal<boolean>(true);
  readonly submitting = signal<boolean>(false);
  readonly showCreateModal = signal<boolean>(false);

  readonly selectedTab = signal<'all' | 'given' | 'taken' | 'closed'>('all');
  readonly searchTerm = signal<string>('');

  readonly loanForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    counterparty: ['', [Validators.required, Validators.maxLength(150)]],
    direction: [LoanDirection.Given, [Validators.required]],
    principal: [null as number | null, [Validators.required, Validators.min(1)]],
    interestRate: [0, [Validators.min(0), Validators.max(100)]],
    interestType: [LoanInterestType.None, [Validators.required]],
    startDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
    dueDate: [''],
    note: ['']
  });

  ngOnInit(): void {
    this.loadLoans();
  }

  loadLoans(): void {
    this.loading.set(true);

    let direction: LoanDirection | null = null;
    let status: LoanStatus | null = null;

    if (this.selectedTab() === 'given') {
      direction = LoanDirection.Given;
      status = LoanStatus.Active;
    } else if (this.selectedTab() === 'taken') {
      direction = LoanDirection.Taken;
      status = LoanStatus.Active;
    } else if (this.selectedTab() === 'closed') {
      status = LoanStatus.Closed;
    }

    this.loansService.getLoans({
      direction,
      status,
      search: this.searchTerm() || undefined
    }).subscribe({
      next: (res) => {
        this.accounts.set(res.accounts);
        this.summary.set(res.summary);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  setTab(tab: 'all' | 'given' | 'taken' | 'closed'): void {
    this.selectedTab.set(tab);
    this.loadLoans();
  }

  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchTerm.set(query);
    this.loadLoans();
  }

  viewLoan(id: string): void {
    this.router.navigate(['/loans', id]);
  }

  openCreateModal(): void {
    this.loanForm.reset({
      name: '',
      counterparty: '',
      direction: LoanDirection.Given,
      principal: null,
      interestRate: 0,
      interestType: LoanInterestType.None,
      startDate: new Date().toISOString().substring(0, 10),
      dueDate: '',
      note: ''
    });
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  submitCreateLoan(): void {
    if (this.loanForm.invalid) {
      this.loanForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const formVal = this.loanForm.value;

    const payload: CreateLoanRequest = {
      name: formVal.name!.trim(),
      counterparty: formVal.counterparty!.trim(),
      direction: formVal.direction!,
      principal: Number(formVal.principal),
      interestRate: Number(formVal.interestRate || 0),
      interestType: Number(formVal.interestType || 0),
      startDate: formVal.startDate!,
      dueDate: formVal.dueDate ? formVal.dueDate : null,
      note: formVal.note?.trim() || null
    };

    this.loansService.createLoan(payload).subscribe({
      next: (created) => {
        this.submitting.set(false);
        this.closeCreateModal();
        this.router.navigate(['/loans', created.account.id]);
      },
      error: () => {
        this.submitting.set(false);
      }
    });
  }
}
