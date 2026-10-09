import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InvestmentsService } from '../services/investments.service';
import {
  CreateInvestmentTransactionRequest,
  HoldingDetail,
  InvestmentTransactionKind,
  InvestmentType,
  UpdateHoldingRequest
} from '../models/investment.model';
import { InrCurrencyPipe } from '../../../shared/pipes/inr-currency.pipe';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-holding-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InrCurrencyPipe, StatCardComponent],
  template: `
    <div class="holding-detail-page">
      <!-- Navigation & Action Bar -->
      <div class="page-nav no-print">
        <button type="button" class="btn-back" (click)="goBack()">
          &larr; Back to Investments
        </button>

        <div class="header-buttons">
          <button type="button" class="btn-outline btn-print" (click)="printReport()">
            🖨️ Print Report
          </button>
          <button type="button" class="btn-primary" (click)="openAddTxnModal()">
            + Record Transaction
          </button>
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
        <!-- Asset Header Card -->
        <div class="asset-header-card card">
          <div class="header-main-info">
            <div>
              <div class="badge-row">
                <span class="badge" [style.background-color]="getAllocationColor(d.holding.type) + '20'" [style.color]="getAllocationColor(d.holding.type)">
                  {{ d.holding.typeName }}
                </span>
                <span class="text-xs text-muted">
                  Valuation updated {{ d.holding.valueUpdatedAtUtc | date:'mediumDate' }}
                </span>
              </div>
              <h2 class="holding-title">{{ d.holding.name }}</h2>
              @if (d.holding.note) {
                <div class="holding-subnote">{{ d.holding.note }}</div>
              }
            </div>

            <!-- Management Buttons -->
            <div class="action-buttons no-print">
              <button type="button" class="btn-action" (click)="openUpdateValModal()">
                Update Valuation
              </button>
              <button type="button" class="btn-action" (click)="openEditModal()">
                Edit Details
              </button>
              <button type="button" class="btn-action btn-danger" (click)="confirmDeleteHolding()">
                Delete Asset
              </button>
            </div>
          </div>
        </div>

        <!-- Financial KPI Cards -->
        <div class="summary-grid">
          <app-stat-card
            title="Current Valuation"
            [amount]="d.holding.currentValue"
            subtitle="Market Value"
            variant="neutral"
          />
          <app-stat-card
            title="Net Invested"
            [amount]="d.holding.totalInvested"
            subtitle="Principal Deployed"
            variant="neutral"
          />
          <app-stat-card
            title="Total Profit / Loss"
            [amount]="d.holding.absoluteGainLoss"
            [subtitle]="(d.holding.absoluteGainLoss >= 0 ? '+' : '') + d.holding.gainLossPercentage + '% Overall Return'"
            [variant]="d.holding.absoluteGainLoss >= 0 ? 'income' : 'expense'"
          />
          <app-stat-card
            title="Dividends Earned"
            [amount]="d.holding.totalDividend"
            subtitle="Payout Inflow"
            variant="income"
          />
        </div>

        <!-- Printable Header (Print Only) -->
        <div class="print-statement-header print-only">
          <div class="print-brand">
            <h1>HISAAB — INVESTMENT HOLDING REPORT</h1>
            <p>Generated on {{ today | date:'medium' }}</p>
          </div>
          <div class="print-meta-grid">
            <div><strong>Asset Name:</strong> {{ d.holding.name }}</div>
            <div><strong>Asset Class:</strong> {{ d.holding.typeName }}</div>
            <div><strong>Current Value:</strong> {{ d.holding.currentValue | inrCurrency }}</div>
            <div><strong>Net Invested:</strong> {{ d.holding.totalInvested | inrCurrency }}</div>
            <div><strong>Total Gain / Loss:</strong> {{ d.holding.absoluteGainLoss | inrCurrency }} ({{ d.holding.gainLossPercentage }}%)</div>
            <div><strong>Units Held:</strong> {{ d.holding.totalUnits > 0 ? d.holding.totalUnits : 'N/A' }}</div>
          </div>
        </div>

        <!-- Transactions Ledger Section -->
        <div class="ledger-section card">
          <div class="ledger-header no-print">
            <div>
              <h3>Transaction History</h3>
              <p class="subtitle">{{ d.transactions.length }} recorded buy, sell, or dividend events</p>
            </div>
            <button type="button" class="btn-primary btn-sm" (click)="openAddTxnModal()">
              + Add Transaction
            </button>
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
                    <span class="badge" [ngClass]="getKindBadgeClass(txn.kind)">
                      {{ txn.kindName }}
                    </span>
                    <span class="txn-date">{{ txn.transactionDate | date:'mediumDate' }}</span>
                  </div>

                  <div class="txn-row-amounts">
                    <div>
                      <span class="amount-label">Amount:</span>
                      <span class="tabular-nums font-bold" [ngClass]="getAmountColorClass(txn.kind)">
                        {{ txn.kind === 2 ? '-' : '+' }}{{ txn.amount | inrCurrency }}
                      </span>
                    </div>
                    @if (txn.units) {
                      <div>
                        <span class="amount-label">Units:</span>
                        <span class="tabular-nums font-medium text-main">{{ txn.units }}</span>
                      </div>
                    }
                  </div>

                  @if (txn.note) {
                    <div class="txn-note">{{ txn.note }}</div>
                  }

                  <div class="txn-actions no-print">
                    <button type="button" class="btn-text-danger" (click)="deleteTransaction(txn.id)">
                      Delete
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Desktop Ledger Table (>= 768px) -->
            <div class="desktop-table-wrapper">
              <table class="ledger-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Units / Quantity</th>
                    <th class="text-right">Transaction Amount</th>
                    <th>Note / Reference</th>
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
                      <td class="tabular-nums font-medium">{{ txn.units ? txn.units : '—' }}</td>
                      <td class="text-right tabular-nums font-bold" [ngClass]="getAmountColorClass(txn.kind)">
                        {{ txn.kind === 2 ? '-' : '+' }}{{ txn.amount | inrCurrency }}
                      </td>
                      <td class="text-muted">{{ txn.note || '—' }}</td>
                      <td class="text-right no-print">
                        <button type="button" class="btn-icon-danger" title="Delete" (click)="deleteTransaction(txn.id)">
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

      <!-- Add Transaction Modal -->
      @if (showAddTxnModal()) {
        <div class="modal-backdrop" (click)="closeAddTxnModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Record Asset Transaction</h3>
              <button type="button" class="btn-close" (click)="closeAddTxnModal()">&times;</button>
            </div>

            <form [formGroup]="txnForm" (ngSubmit)="submitTransaction()">
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">Transaction Kind *</label>
                  <select class="form-control" formControlName="kind">
                    <option [value]="1">Buy / Add Units (Increases Invested)</option>
                    <option [value]="2">Sell / Redeem (Reduces Invested)</option>
                    <option [value]="3">Dividend Payout (Cash Return)</option>
                  </select>
                </div>

                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label" for="txnAmt">Amount (₹) *</label>
                    <input
                      id="txnAmt"
                      type="number"
                      step="0.01"
                      class="form-control"
                      placeholder="e.g. 5000"
                      formControlName="amount"
                    />
                    @if (txnForm.get('amount')?.invalid && txnForm.get('amount')?.touched) {
                      <span class="form-error">Amount must be greater than zero.</span>
                    }
                  </div>

                  <div class="form-group col-half">
                    <label class="form-label" for="txnUnits">Units / Quantity</label>
                    <input
                      id="txnUnits"
                      type="number"
                      step="0.0001"
                      class="form-control"
                      placeholder="e.g. 10.5"
                      formControlName="units"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="tDate">Transaction Date *</label>
                  <input
                    id="tDate"
                    type="date"
                    class="form-control"
                    formControlName="transactionDate"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label" for="newVal">Update Current Value (Optional)</label>
                  <input
                    id="newVal"
                    type="number"
                    step="0.01"
                    class="form-control"
                    placeholder="Updated total market value of holding"
                    formControlName="updatedCurrentValue"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label" for="tNote">Note / Reference</label>
                  <input
                    id="tNote"
                    type="text"
                    class="form-control"
                    placeholder="e.g. Monthly SIP / Dividend transfer"
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

      <!-- Update Valuation Modal -->
      @if (showUpdateValModal()) {
        <div class="modal-backdrop" (click)="closeUpdateValModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Update Asset Valuation</h3>
              <button type="button" class="btn-close" (click)="closeUpdateValModal()">&times;</button>
            </div>

            <form [formGroup]="valForm" (ngSubmit)="submitUpdateValuation()">
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label" for="valAmt">Latest Market Value (₹) *</label>
                  <input
                    id="valAmt"
                    type="number"
                    step="0.01"
                    class="form-control"
                    placeholder="Enter latest portfolio value"
                    formControlName="currentValue"
                  />
                  @if (valForm.get('currentValue')?.invalid && valForm.get('currentValue')?.touched) {
                    <span class="form-error">Current value must be greater than or equal to 0.</span>
                  }
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-outline" (click)="closeUpdateValModal()" [disabled]="submitting()">
                  Cancel
                </button>
                <button type="submit" class="btn-primary" [disabled]="valForm.invalid || submitting()">
                  {{ submitting() ? 'Updating...' : 'Update Value' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Edit Holding Modal -->
      @if (showEditModal()) {
        <div class="modal-backdrop" (click)="closeEditModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Edit Asset Details</h3>
              <button type="button" class="btn-close" (click)="closeEditModal()">&times;</button>
            </div>

            <form [formGroup]="editForm" (ngSubmit)="submitEditHolding()">
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label" for="editName">Holding Name *</label>
                  <input id="editName" type="text" class="form-control" formControlName="name" />
                </div>

                <div class="form-group">
                  <label class="form-label" for="editType">Asset Class *</label>
                  <select id="editType" class="form-control" formControlName="type">
                    <option [value]="1">Mutual Fund</option>
                    <option [value]="2">Stock / Equity</option>
                    <option [value]="7">Gold / SGB / Silver</option>
                    <option [value]="3">Fixed Deposit (FD)</option>
                    <option [value]="4">Recurring Deposit (RD)</option>
                    <option [value]="5">Public Provident Fund (PPF)</option>
                    <option [value]="6">National Pension System (NPS)</option>
                    <option [value]="8">Other Investment</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label" for="editNote">Notes</label>
                  <input id="editNote" type="text" class="form-control" formControlName="note" />
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
    .holding-detail-page {
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
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }

    .header-buttons {
      display: flex;
      gap: 0.75rem;
    }

    .asset-header-card {
      padding: 1.5rem;
    }

    .header-main-info {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    @media (min-width: 768px) {
      .header-main-info {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
      }
    }

    .badge-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.35rem;
    }

    .badge {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .holding-title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-main);
    }

    .holding-subnote {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      margin-top: 0.25rem;
    }

    .action-buttons {
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
        grid-template-columns: repeat(4, 1fr);
      }
    }

    /* Ledger */
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

    .desktop-table-wrapper {
      display: none;
      overflow-x: auto;
    }

    @media (min-width: 768px) {
      .desktop-table-wrapper {
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

    .badge-buy { background: #e0f2fe; color: #0284c7; }
    .badge-sell { background: #fffbeb; color: #d97706; }
    .badge-dividend { background: #ecfdf5; color: #059669; }

    .text-buy { color: #0284c7; }
    .text-sell { color: #d97706; }
    .text-dividend { color: #059669; }
    .text-main { color: var(--color-text-main); }
    .text-right { text-align: right; }

    .btn-icon-danger {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.25rem;
      cursor: pointer;
      line-height: 1;
      padding: 0.25rem 0.5rem;
    }

    .btn-icon-danger:hover {
      color: #ef4444;
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

    .print-only { display: none; }

    @media print {
      .no-print { display: none !important; }
      .print-only { display: block !important; }

      .holding-detail-page { background: white !important; color: black !important; gap: 1rem; }
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

      .ledger-table th, .ledger-table td {
        border-bottom: 1px solid #ccc !important;
        padding: 0.5rem 0.25rem !important;
        color: black !important;
      }
    }
  `]
})
export class HoldingDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly investmentsService = inject(InvestmentsService);
  private readonly fb = inject(FormBuilder);

  readonly detail = signal<HoldingDetail | null>(null);
  readonly loading = signal<boolean>(true);
  readonly submitting = signal<boolean>(false);
  readonly showAddTxnModal = signal<boolean>(false);
  readonly showUpdateValModal = signal<boolean>(false);
  readonly showEditModal = signal<boolean>(false);
  readonly today = new Date();

  readonly txnForm = this.fb.group({
    kind: [InvestmentTransactionKind.Buy, [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    units: [null as number | null, [Validators.min(0)]],
    transactionDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
    updatedCurrentValue: [null as number | null, [Validators.min(0)]],
    note: ['']
  });

  readonly valForm = this.fb.group({
    currentValue: [null as number | null, [Validators.required, Validators.min(0)]]
  });

  readonly editForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    type: [InvestmentType.MutualFund, [Validators.required]],
    note: ['']
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/investments']);
      return;
    }
    this.loadDetail(id);
  }

  loadDetail(id: string): void {
    this.loading.set(true);
    this.investmentsService.getHoldingById(id).subscribe({
      next: (res) => {
        this.detail.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/investments']);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/investments']);
  }

  printReport(): void {
    window.print();
  }

  openAddTxnModal(): void {
    this.txnForm.reset({
      kind: InvestmentTransactionKind.Buy,
      amount: null,
      units: null,
      transactionDate: new Date().toISOString().substring(0, 10),
      updatedCurrentValue: null,
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

    const payload: CreateInvestmentTransactionRequest = {
      kind: Number(formVal.kind),
      amount: Number(formVal.amount),
      units: formVal.units ? Number(formVal.units) : null,
      transactionDate: formVal.transactionDate!,
      updatedCurrentValue: formVal.updatedCurrentValue ? Number(formVal.updatedCurrentValue) : null,
      note: formVal.note?.trim() || null
    };

    this.investmentsService.createTransaction(current.holding.id, payload).subscribe({
      next: (res) => {
        this.detail.set(res);
        this.submitting.set(false);
        this.closeAddTxnModal();
      },
      error: () => {
        this.submitting.set(false);
      }
    });
  }

  deleteTransaction(txnId: string): void {
    const current = this.detail();
    if (!current) return;

    if (confirm('Are you sure you want to delete this transaction?')) {
      this.investmentsService.deleteTransaction(current.holding.id, txnId).subscribe({
        next: () => {
          this.loadDetail(current.holding.id);
        }
      });
    }
  }

  openUpdateValModal(): void {
    const current = this.detail();
    if (!current) return;

    this.valForm.patchValue({
      currentValue: current.holding.currentValue
    });
    this.showUpdateValModal.set(true);
  }

  closeUpdateValModal(): void {
    this.showUpdateValModal.set(false);
  }

  submitUpdateValuation(): void {
    const current = this.detail();
    if (!current || this.valForm.invalid) {
      this.valForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const formVal = this.valForm.value;

    const payload: UpdateHoldingRequest = {
      name: current.holding.name,
      type: current.holding.type,
      currentValue: Number(formVal.currentValue),
      note: current.holding.note
    };

    this.investmentsService.updateHolding(current.holding.id, payload).subscribe({
      next: (res) => {
        this.detail.set(res);
        this.submitting.set(false);
        this.closeUpdateValModal();
      },
      error: () => {
        this.submitting.set(false);
      }
    });
  }

  openEditModal(): void {
    const current = this.detail();
    if (!current) return;

    this.editForm.patchValue({
      name: current.holding.name,
      type: current.holding.type,
      note: current.holding.note || ''
    });
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
  }

  submitEditHolding(): void {
    const current = this.detail();
    if (!current || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const formVal = this.editForm.value;

    const payload: UpdateHoldingRequest = {
      name: formVal.name!.trim(),
      type: Number(formVal.type),
      currentValue: current.holding.currentValue,
      note: formVal.note?.trim() || null
    };

    this.investmentsService.updateHolding(current.holding.id, payload).subscribe({
      next: (res) => {
        this.detail.set(res);
        this.submitting.set(false);
        this.closeEditModal();
      },
      error: () => {
        this.submitting.set(false);
      }
    });
  }

  confirmDeleteHolding(): void {
    const current = this.detail();
    if (!current) return;

    if (confirm(`Are you sure you want to delete ${current.holding.name}? This will remove all associated transactions.`)) {
      this.investmentsService.deleteHolding(current.holding.id).subscribe({
        next: () => {
          this.router.navigate(['/investments']);
        }
      });
    }
  }

  getKindBadgeClass(kind: InvestmentTransactionKind): string {
    switch (kind) {
      case InvestmentTransactionKind.Buy: return 'badge-buy';
      case InvestmentTransactionKind.Sell: return 'badge-sell';
      case InvestmentTransactionKind.Dividend: return 'badge-dividend';
      default: return '';
    }
  }

  getAmountColorClass(kind: InvestmentTransactionKind): string {
    switch (kind) {
      case InvestmentTransactionKind.Buy: return 'text-buy';
      case InvestmentTransactionKind.Sell: return 'text-sell';
      case InvestmentTransactionKind.Dividend: return 'text-dividend';
      default: return 'text-main';
    }
  }

  getAllocationColor(type: InvestmentType): string {
    switch (type) {
      case InvestmentType.MutualFund: return '#4f46e5';
      case InvestmentType.Stock: return '#0284c7';
      case InvestmentType.Gold: return '#eab308';
      case InvestmentType.FixedDeposit: return '#059669';
      case InvestmentType.RecurringDeposit: return '#10b981';
      case InvestmentType.PPF: return '#0d9488';
      case InvestmentType.NPS: return '#8b5cf6';
      default: return '#64748b';
    }
  }
}
