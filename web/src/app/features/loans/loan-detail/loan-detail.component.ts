import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoansService } from '../services/loans.service';
import {
  CreateLoanTransactionRequest,
  LoanAccount,
  LoanAccountDetail,
  LoanDirection,
  LoanInterestType,
  LoanStatus,
  LoanTransaction,
  LoanTransactionKind,
  UpdateLoanRequest
} from '../models/loan.model';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-loan-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InrCurrencyPipe, StatCardComponent],
  template: `
    <div class="loan-detail-page">
      <!-- Top Action & Navigation Bar -->
      <div class="page-nav no-print">
        <button type="button" class="btn-back" (click)="goBack()">
          &larr; Back to Loans
        </button>

        <div class="header-buttons">
          <button type="button" class="btn-outline btn-print" (click)="printStatement()">
            🖨️ Print Statement
          </button>
          @if (detail()?.account?.status === 1) {
            <button type="button" class="btn-primary" (click)="openAddTxnModal()">
              + Record Payment
            </button>
          }
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-state">
          <div class="skeleton-header"></div>
          <div class="skeleton-grid"></div>
        </div>
      }

      @if (!loading() && detail(); as d) {
        <!-- Account Header Card -->
        <div class="account-header-card card">
          <div class="header-main-info">
            <div class="title-section">
              <div class="badges-row">
                <span
                  class="badge"
                  [class.badge-given]="d.account.direction === 1"
                  [class.badge-taken]="d.account.direction === 2">
                  {{ d.account.direction === 1 ? 'Given (Lent)' : 'Taken (Borrowed)' }}
                </span>
                <span
                  class="badge"
                  [class.badge-active]="d.account.status === 1"
                  [class.badge-closed]="d.account.status === 2">
                  {{ d.account.status === 1 ? 'Active' : 'Closed' }}
                </span>
              </div>
              <h1 class="account-name">{{ d.account.name }}</h1>
              <div class="counterparty-name">
                {{ d.account.direction === 1 ? 'Borrower: ' : 'Lender: ' }}
                <strong>{{ d.account.counterparty }}</strong>
              </div>
            </div>

            <!-- Management Actions -->
            <div class="account-actions no-print">
              @if (d.account.status === 1) {
                <button type="button" class="btn-action" (click)="toggleAccountStatus(2)">
                  Mark as Closed
                </button>
              } @else {
                <button type="button" class="btn-action" (click)="toggleAccountStatus(1)">
                  Reopen Account
                </button>
              }
              <button type="button" class="btn-action" (click)="openEditModal()">
                Edit Details
              </button>
              <button type="button" class="btn-action btn-danger" (click)="confirmDeleteLoan()">
                Delete Loan
              </button>
            </div>
          </div>

          <!-- Quick Parameters Grid -->
          <div class="params-grid">
            <div class="param-item">
              <span class="param-label">Interest Rate</span>
              <span class="param-value">
                {{ d.account.interestRate }}% <span class="text-muted text-xs">({{ d.account.interestTypeName }})</span>
              </span>
            </div>
            <div class="param-item">
              <span class="param-label">Daily Accrual</span>
              <span class="param-value tabular-nums">{{ d.dailyInterest | inrCurrency }}/day</span>
            </div>
            <div class="param-item">
              <span class="param-label">Start Date</span>
              <span class="param-value">{{ d.account.startDate | date:'mediumDate' }}</span>
            </div>
            <div class="param-item">
              <span class="param-label">Due Date</span>
              <span class="param-value">{{ d.account.dueDate ? (d.account.dueDate | date:'mediumDate') : 'No due date' }}</span>
            </div>
            <div class="param-item">
              <span class="param-label">Duration Elapsed</span>
              <span class="param-value">{{ d.daysElapsed }} days</span>
            </div>
            @if (d.account.note) {
              <div class="param-item full-width">
                <span class="param-label">Notes & Terms</span>
                <span class="param-value note-text">{{ d.account.note }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Financial KPI Cards -->
        <div class="summary-grid">
          <app-stat-card
            title="Original Principal"
            [amount]="d.account.principal"
            subtitle="Initial Disbursed Amount"
            variant="neutral"
          />
          <app-stat-card
            title="Total Repaid"
            [amount]="d.account.totalRepaid"
            subtitle="Paid Back So Far"
            variant="income"
          />
          <app-stat-card
            title="Outstanding Balance"
            [amount]="d.account.outstandingBalance"
            [subtitle]="d.account.direction === 1 ? 'Current Receivable' : 'Current Payable'"
            [variant]="d.account.direction === 1 ? 'income' : 'expense'"
          />
          <app-stat-card
            title="Accrued Interest"
            [amount]="d.account.accruedInterest"
            subtitle="Estimated to Date"
            variant="neutral"
          />
          <app-stat-card
            title="Projected Payoff"
            [amount]="d.projectedPayoffAmount"
            subtitle="Outstanding + Accrued Interest"
            variant="neutral"
          />
        </div>

        <!-- Printable Header (Visible only when printing) -->
        <div class="print-statement-header print-only">
          <div class="print-brand">
            <h1>HISAAB — LOAN STATEMENT</h1>
            <p>Generated on {{ today | date:'medium' }}</p>
          </div>
          <div class="print-meta-grid">
            <div><strong>Loan:</strong> {{ d.account.name }}</div>
            <div><strong>Counterparty:</strong> {{ d.account.counterparty }}</div>
            <div><strong>Direction:</strong> {{ d.account.direction === 1 ? 'Given (Receivable)' : 'Taken (Payable)' }}</div>
            <div><strong>Interest:</strong> {{ d.account.interestRate }}% {{ d.account.interestTypeName }}</div>
            <div><strong>Principal:</strong> {{ d.account.principal | inrCurrency }}</div>
            <div><strong>Current Outstanding:</strong> {{ d.account.outstandingBalance | inrCurrency }}</div>
          </div>
        </div>

        <!-- Transaction Ledger Section -->
        <div class="ledger-section card">
          <div class="ledger-header no-print">
            <div>
              <h3>Account Ledger</h3>
              <p class="subtitle">{{ d.transactions.length }} transaction records with running balance</p>
            </div>
            @if (d.account.status === 1) {
              <button type="button" class="btn-primary btn-sm" (click)="openAddTxnModal()">
                + Add Transaction
              </button>
            }
          </div>

          <!-- Empty Transactions -->
          @if (d.transactions.length === 0) {
            <div class="empty-ledger">
              <p>No transactions recorded yet.</p>
            </div>
          } @else {
            <!-- Mobile Transaction List (< 768px) -->
            <div class="mobile-txn-list">
              @for (txn of d.transactions; track txn.id) {
                <div class="txn-card">
                  <div class="txn-row-top">
                    <span
                      class="badge"
                      [ngClass]="getKindBadgeClass(txn.kind)">
                      {{ txn.kindName }}
                    </span>
                    <span class="txn-date">{{ txn.transactionDate | date:'mediumDate' }}</span>
                  </div>

                  <div class="txn-row-amounts">
                    <div>
                      <span class="amount-label">Amount:</span>
                      <span class="tabular-nums font-bold" [ngClass]="getAmountTextClass(txn.kind)">
                        {{ txn.kind === 2 ? '-' : '+' }}{{ txn.amount | inrCurrency }}
                      </span>
                    </div>
                    <div>
                      <span class="amount-label">Running Bal:</span>
                      <span class="tabular-nums font-bold text-main">{{ txn.runningBalance | inrCurrency }}</span>
                    </div>
                  </div>

                  @if (txn.note) {
                    <div class="txn-note">{{ txn.note }}</div>
                  }

                  <div class="txn-actions no-print">
                    <button
                      type="button"
                      class="btn-text-danger"
                      (click)="deleteTransaction(txn.id)">
                      Delete
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Desktop Ledger Table (>= 768px) -->
            <div class="desktop-ledger-table-wrapper">
              <table class="ledger-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description / Note</th>
                    <th class="text-right">Transaction Amount</th>
                    <th class="text-right">Running Balance</th>
                    <th class="text-right no-print">Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (txn of d.transactions; track txn.id) {
                    <tr>
                      <td class="text-muted">{{ txn.transactionDate | date:'mediumDate' }}</td>
                      <td>
                        <span class="badge" [ngClass]="getKindBadgeClass(txn.kind)">
                          {{ txn.kindName }}
                        </span>
                      </td>
                      <td class="note-cell">{{ txn.note || '—' }}</td>
                      <td class="text-right tabular-nums font-medium" [ngClass]="getAmountTextClass(txn.kind)">
                        {{ txn.kind === 2 ? '-' : '+' }}{{ txn.amount | inrCurrency }}
                      </td>
                      <td class="text-right tabular-nums font-bold text-main">
                        {{ txn.runningBalance | inrCurrency }}
                      </td>
                      <td class="text-right no-print">
                        <button
                          type="button"
                          class="btn-icon-danger"
                          title="Delete transaction"
                          (click)="deleteTransaction(txn.id)">
                          &times;
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- Record Transaction Modal -->
      @if (showAddTxnModal()) {
        <div class="modal-backdrop" (click)="closeAddTxnModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Record Loan Transaction</h3>
              <button type="button" class="btn-close" (click)="closeAddTxnModal()">&times;</button>
            </div>

            <form [formGroup]="txnForm" (ngSubmit)="submitTransaction()">
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">Transaction Kind *</label>
                  <select class="form-control" formControlName="kind">
                    <option [value]="2">Repayment (Reduces Balance)</option>
                    <option [value]="1">Additional Disburse (Increases Balance)</option>
                    <option [value]="3">Interest Charge (Adds to Balance)</option>
                    <option [value]="4">Late Fee / Penalty (Adds to Balance)</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label" for="txnAmount">Amount (₹) *</label>
                  <input
                    id="txnAmount"
                    type="number"
                    step="0.01"
                    class="form-control"
                    placeholder="e.g. 10000"
                    formControlName="amount"
                  />
                  @if (txnForm.get('amount')?.invalid && txnForm.get('amount')?.touched) {
                    <span class="form-error">Amount must be greater than zero.</span>
                  }
                </div>

                <div class="form-group">
                  <label class="form-label" for="txnDate">Date *</label>
                  <input
                    id="txnDate"
                    type="date"
                    class="form-control"
                    formControlName="transactionDate"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label" for="txnNote">Note / Reference</label>
                  <input
                    id="txnNote"
                    type="text"
                    class="form-control"
                    placeholder="e.g. UPI Ref #49281, Cash repayment"
                    formControlName="note"
                  />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-outline" (click)="closeAddTxnModal()" [disabled]="submitting()">
                  Cancel
                </button>
                <button type="submit" class="btn-primary" [disabled]="txnForm.invalid || submitting()">
                  {{ submitting() ? 'Saving...' : 'Record Transaction' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Edit Loan Modal -->
      @if (showEditModal()) {
        <div class="modal-backdrop" (click)="closeEditModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Edit Loan Details</h3>
              <button type="button" class="btn-close" (click)="closeEditModal()">&times;</button>
            </div>

            <form [formGroup]="editForm" (ngSubmit)="submitEditLoan()">
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">Loan Name *</label>
                  <input type="text" class="form-control" formControlName="name" />
                </div>

                <div class="form-group">
                  <label class="form-label">Counterparty *</label>
                  <input type="text" class="form-control" formControlName="counterparty" />
                </div>

                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label">Interest Rate (% p.a.)</label>
                    <input type="number" step="0.1" class="form-control" formControlName="interestRate" />
                  </div>
                  <div class="form-group col-half">
                    <label class="form-label">Interest Type</label>
                    <select class="form-control" formControlName="interestType">
                      <option [value]="0">None (0%)</option>
                      <option [value]="1">Simple Interest</option>
                      <option [value]="2">Compound Interest (Monthly)</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Due Date (Optional)</label>
                  <input type="date" class="form-control" formControlName="dueDate" />
                </div>

                <div class="form-group">
                  <label class="form-label">Notes & Terms</label>
                  <textarea class="form-control" rows="2" formControlName="note"></textarea>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-outline" (click)="closeEditModal()" [disabled]="submitting()">
                  Cancel
                </button>
                <button type="submit" class="btn-primary" [disabled]="editForm.invalid || submitting()">
                  {{ submitting() ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .loan-detail-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .btn-back {
      background: transparent;
      border: none;
      color: var(--color-primary);
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0.5rem 0;
    }

    .header-buttons {
      display: flex;
      gap: 0.75rem;
    }

    .account-header-card {
      padding: 1.5rem;
    }

    .header-main-info {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 1.25rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--color-border);
    }

    @media (min-width: 768px) {
      .header-main-info {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
      }
    }

    .badges-row {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-given { background: #ecfdf5; color: #065f46; }
    .badge-taken { background: #fffbeb; color: #92400e; }
    .badge-active { background: #e0f2fe; color: #0369a1; }
    .badge-closed { background: #f1f5f9; color: #475569; }

    .account-name {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-main);
    }

    .counterparty-name {
      font-size: 1rem;
      color: var(--color-text-muted);
      margin-top: 0.25rem;
    }

    .account-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .btn-action {
      padding: 0.4rem 0.8rem;
      font-size: 0.8125rem;
      font-weight: 500;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-card);
      color: var(--color-text-main);
      cursor: pointer;
      min-height: 40px;
    }

    .btn-action:hover {
      background: var(--color-bg-subtle);
    }

    .btn-danger {
      color: #ef4444;
      border-color: #fca5a5;
    }

    .btn-danger:hover {
      background: #fee2e2;
    }

    .params-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    @media (min-width: 768px) {
      .params-grid {
        grid-template-columns: repeat(5, 1fr);
      }
    }

    .param-item {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .param-item.full-width {
      grid-column: 1 / -1;
    }

    .param-label {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }

    .param-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--color-text-main);
    }

    .note-text {
      font-weight: 400;
      color: var(--color-text-muted);
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    @media (min-width: 640px) {
      .summary-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 1024px) {
      .summary-grid {
        grid-template-columns: repeat(5, 1fr);
      }
    }

    /* Ledger Section */
    .ledger-section {
      padding: 1.5rem;
    }

    .ledger-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }

    .ledger-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--color-text-main);
    }

    .mobile-txn-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    @media (min-width: 768px) {
      .mobile-txn-list {
        display: none;
      }
    }

    .desktop-ledger-table-wrapper {
      display: none;
      overflow-x: auto;
    }

    @media (min-width: 768px) {
      .desktop-ledger-table-wrapper {
        display: block;
      }
    }

    .txn-card {
      padding: 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-card);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .txn-row-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .txn-date {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .txn-row-amounts {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9375rem;
    }

    .amount-label {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      margin-right: 0.35rem;
    }

    .txn-note {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .txn-actions {
      display: flex;
      justify-content: flex-end;
    }

    .btn-text-danger {
      background: transparent;
      border: none;
      color: #ef4444;
      font-size: 0.75rem;
      cursor: pointer;
      min-height: 36px;
      padding: 0.25rem 0.5rem;
    }

    /* Ledger Table */
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .ledger-table th {
      padding: 0.75rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
    }

    .ledger-table td {
      padding: 0.875rem 1rem;
      font-size: 0.875rem;
      border-bottom: 1px solid var(--color-border);
    }

    .note-cell {
      color: var(--color-text-main);
      max-width: 250px;
    }

    .btn-icon-danger {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.25rem;
      cursor: pointer;
      line-height: 1;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
    }

    .btn-icon-danger:hover {
      color: #ef4444;
      background: #fee2e2;
    }

    /* Kind badge styling */
    .badge-disburse { background: #e0f2fe; color: #0284c7; }
    .badge-repayment { background: #ecfdf5; color: #059669; }
    .badge-interest { background: #f3e8ff; color: #9333ea; }
    .badge-penalty { background: #fee2e2; color: #dc2626; }

    .text-income { color: #059669; }
    .text-expense { color: #d97706; }
    .text-danger { color: #dc2626; }
    .text-purple { color: #9333ea; }
    .text-main { color: var(--color-text-main); }
    .text-right { text-align: right; }

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

    .print-only { display: none; }

    /* Print Stylesheet (Section 8) */
    @media print {
      .no-print { display: none !important; }
      .print-only { display: block !important; }

      .loan-detail-page {
        gap: 1rem;
        background: white !important;
        color: black !important;
      }

      .card {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
      }

      .print-statement-header {
        border-bottom: 2px solid #000;
        padding-bottom: 1rem;
        margin-bottom: 1.5rem;
      }

      .print-brand h1 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 800;
        letter-spacing: 0.05em;
      }

      .print-meta-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
        margin-top: 1rem;
        font-size: 0.875rem;
      }

      .ledger-table th, .ledger-table td {
        border-bottom: 1px solid #ccc !important;
        padding: 0.5rem 0.25rem !important;
        color: black !important;
      }

      .badge {
        border: 1px solid #999;
        background: transparent !important;
        color: black !important;
      }
    }
  `]
})
export class LoanDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly loansService = inject(LoansService);
  private readonly fb = inject(FormBuilder);

  readonly detail = signal<LoanAccountDetail | null>(null);
  readonly loading = signal<boolean>(true);
  readonly submitting = signal<boolean>(false);
  readonly showAddTxnModal = signal<boolean>(false);
  readonly showEditModal = signal<boolean>(false);
  readonly today = new Date();

  readonly txnForm = this.fb.group({
    kind: [LoanTransactionKind.Repayment, [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    transactionDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
    note: ['']
  });

  readonly editForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    counterparty: ['', [Validators.required, Validators.maxLength(150)]],
    interestRate: [0, [Validators.min(0), Validators.max(100)]],
    interestType: [LoanInterestType.None, [Validators.required]],
    dueDate: [''],
    note: ['']
  });

  ngOnInit(): void {
    const loanId = this.route.snapshot.paramMap.get('id');
    if (!loanId) {
      this.router.navigate(['/loans']);
      return;
    }

    this.loadDetail(loanId);
  }

  loadDetail(loanId: string): void {
    this.loading.set(true);
    this.loansService.getLoanById(loanId).subscribe({
      next: (res) => {
        this.detail.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/loans']);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/loans']);
  }

  printStatement(): void {
    window.print();
  }

  toggleAccountStatus(newStatus: LoanStatus): void {
    const current = this.detail();
    if (!current) return;

    this.loansService.changeStatus(current.account.id, newStatus).subscribe({
      next: (updated) => {
        this.detail.set(updated);
      }
    });
  }

  confirmDeleteLoan(): void {
    const current = this.detail();
    if (!current) return;

    if (confirm(`Are you sure you want to delete the loan "${current.account.name}"? This will also remove its transaction history.`)) {
      this.loansService.deleteLoan(current.account.id).subscribe({
        next: () => {
          this.router.navigate(['/loans']);
        }
      });
    }
  }

  openAddTxnModal(): void {
    this.txnForm.reset({
      kind: LoanTransactionKind.Repayment,
      amount: null,
      transactionDate: new Date().toISOString().substring(0, 10),
      note: ''
    });
    this.showAddTxnModal.set(true);
  }

  closeAddTxnModal(): void {
    this.showAddTxnModal.set(false);
  }

  submitTransaction(): void {
    const current = this.detail();
    if (!current || this.txnForm.invalid) {
      this.txnForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const formVal = this.txnForm.value;

    const payload: CreateLoanTransactionRequest = {
      kind: Number(formVal.kind),
      amount: Number(formVal.amount),
      transactionDate: formVal.transactionDate!,
      note: formVal.note?.trim() || null
    };

    this.loansService.createTransaction(current.account.id, payload).subscribe({
      next: (updated) => {
        this.detail.set(updated);
        this.submitting.set(false);
        this.closeAddTxnModal();
      },
      error: (err) => {
        this.submitting.set(false);
        alert(err?.error?.detail || 'Failed to record transaction.');
      }
    });
  }

  deleteTransaction(txnId: string): void {
    const current = this.detail();
    if (!current) return;

    if (confirm('Are you sure you want to delete this transaction?')) {
      this.loansService.deleteTransaction(current.account.id, txnId).subscribe({
        next: () => {
          this.loadDetail(current.account.id);
        }
      });
    }
  }

  openEditModal(): void {
    const current = this.detail();
    if (!current) return;

    this.editForm.patchValue({
      name: current.account.name,
      counterparty: current.account.counterparty,
      interestRate: current.account.interestRate,
      interestType: current.account.interestType,
      dueDate: current.account.dueDate ? current.account.dueDate.substring(0, 10) : '',
      note: current.account.note || ''
    });
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
  }

  submitEditLoan(): void {
    const current = this.detail();
    if (!current || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const formVal = this.editForm.value;

    const payload: UpdateLoanRequest = {
      name: formVal.name!.trim(),
      counterparty: formVal.counterparty!.trim(),
      interestRate: Number(formVal.interestRate || 0),
      interestType: Number(formVal.interestType || 0),
      dueDate: formVal.dueDate ? formVal.dueDate : null,
      note: formVal.note?.trim() || null
    };

    this.loansService.updateLoan(current.account.id, payload).subscribe({
      next: (updated) => {
        this.detail.set(updated);
        this.submitting.set(false);
        this.closeEditModal();
      },
      error: () => {
        this.submitting.set(false);
      }
    });
  }

  getKindBadgeClass(kind: LoanTransactionKind): string {
    switch (kind) {
      case LoanTransactionKind.Disburse: return 'badge-disburse';
      case LoanTransactionKind.Repayment: return 'badge-repayment';
      case LoanTransactionKind.Interest: return 'badge-interest';
      case LoanTransactionKind.Penalty: return 'badge-penalty';
      default: return '';
    }
  }

  getAmountTextClass(kind: LoanTransactionKind): string {
    switch (kind) {
      case LoanTransactionKind.Disburse: return 'text-expense';
      case LoanTransactionKind.Repayment: return 'text-income';
      case LoanTransactionKind.Interest: return 'text-purple';
      case LoanTransactionKind.Penalty: return 'text-danger';
      default: return '';
    }
  }
}

