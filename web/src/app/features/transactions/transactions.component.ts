import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TransactionsService } from './services/transactions.service';
import { Category, MonthlySummary, Transaction, TransactionType } from './models/transaction.model';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { MonthPickerComponent } from '../../shared/components/month-picker/month-picker.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { DeletionPermissionsService } from '../../core/services/deletion-permissions.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InrCurrencyPipe, MonthPickerComponent, StatCardComponent],
  template: `
    <div class="transactions-page">
      <!-- Page Title & Actions -->
      <div class="page-header no-print">
        <div>
          <h1 class="page-title">Income & Expenses</h1>
          <p class="subtitle">Monthly transaction ledger and expense tracking</p>
        </div>

        <div class="header-actions">
          <app-month-picker (monthChange)="onMonthChange($event)" />
          <button type="button" class="btn-primary" (click)="openCreateModal()">
            + Add Transaction
          </button>
        </div>
      </div>

      <!-- Monthly Financial Summary Cards -->
      <div class="summary-grid">
        <app-stat-card
          title="Total Income"
          [amount]="summary()?.totalIncome || 0"
          subtitle="Monthly Inflow"
          variant="income"
        />
        <app-stat-card
          title="Total Expenses"
          [amount]="summary()?.totalExpense || 0"
          subtitle="Monthly Outflow"
          variant="expense"
        />
        <app-stat-card
          title="Net Savings"
          [amount]="summary()?.netSavings || 0"
          [subtitle]="'Savings Rate: ' + (summary()?.savingsRatePercentage || 0) + '%'"
          variant="neutral"
        />
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="toolbar card no-print">
        <div class="type-pills">
          <button
            type="button"
            class="pill-btn"
            [class.active]="selectedType() === null"
            (click)="setTypeFilter(null)">
            All
          </button>
          <button
            type="button"
            class="pill-btn pill-income"
            [class.active]="selectedType() === 1"
            (click)="setTypeFilter(1)">
            Income
          </button>
          <button
            type="button"
            class="pill-btn pill-expense"
            [class.active]="selectedType() === 2"
            (click)="setTypeFilter(2)">
            Expenses
          </button>
        </div>

        <div class="filter-controls">
          <select
            class="select-category"
            [value]="selectedCategory() || ''"
            (change)="onCategoryChange($event)">
            <option value="">All Categories</option>
            @for (cat of categories(); track cat.id) {
              <option [value]="cat.id">{{ cat.name }}</option>
            }
          </select>

          <input
            type="text"
            class="input-search"
            placeholder="Search note or category..."
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
          />
        </div>
      </div>

      <!-- Transaction List (Mobile Cards & Desktop Table) -->
      @if (isLoading()) {
        <div class="loading-state">Loading transactions...</div>
      } @else if (transactions().length === 0) {
        <div class="empty-state card">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <h3>No transactions found</h3>
          <p>There are no transactions recorded for this period or filter.</p>
          <button type="button" class="btn-primary" (click)="openCreateModal()">
            Record First Transaction
          </button>
        </div>
      } @else {
        <!-- Desktop Table View (>= 768px) -->
        <div class="table-container card desktop-view">
          <table class="txn-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Note</th>
                <th class="text-right">Amount</th>
                <th class="text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (txn of transactions(); track txn.id) {
                <tr>
                  <td class="date-cell">{{ txn.transactionDate | date:'mediumDate' }}</td>
                  <td>
                    <span class="category-badge" [style.backgroundColor]="txn.categoryColor + '20'" [style.color]="txn.categoryColor">
                      {{ txn.categoryName }}
                    </span>
                  </td>
                  <td class="note-cell">{{ txn.note || '—' }}</td>
                  <td class="text-right amount font-bold" [class.income-text]="txn.type === 1" [class.expense-text]="txn.type === 2">
                    {{ txn.type === 1 ? '+' : '-' }}{{ txn.amount | inrCurrency }}
                  </td>
                  <td class="text-right actions-cell no-print">
                    <button type="button" class="btn-action edit" (click)="openEditModal(txn)">Edit</button>
                    <button type="button" class="btn-action delete" (click)="onDelete(txn.id)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mobile Card View (< 768px) -->
        <div class="mobile-list mobile-view">
          @for (txn of transactions(); track txn.id) {
            <div class="txn-card card" (click)="openEditModal(txn)">
              <div class="txn-card-left">
                <div class="txn-cat-badge" [style.backgroundColor]="txn.categoryColor + '20'" [style.color]="txn.categoryColor">
                  {{ txn.categoryName[0] }}
                </div>
                <div class="txn-card-info">
                  <span class="txn-cat-title">{{ txn.categoryName }}</span>
                  <span class="txn-card-date">{{ txn.transactionDate | date:'mediumDate' }}</span>
                  @if (txn.note) {
                    <span class="txn-card-note">{{ txn.note }}</span>
                  }
                </div>
              </div>
              <div class="txn-card-right">
                <span class="amount txn-card-amount" [class.income-text]="txn.type === 1" [class.expense-text]="txn.type === 2">
                  {{ txn.type === 1 ? '+' : '-' }}{{ txn.amount | inrCurrency }}
                </span>
                <button type="button" class="btn-del-sm no-print" (click)="$event.stopPropagation(); onDelete(txn.id)">
                  ✕
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Floating Action Button for Mobile -->
      <button type="button" class="fab mobile-fab no-print" (click)="openCreateModal()" aria-label="Add Transaction">
        +
      </button>

      <!-- Transaction Modal / Bottom Sheet -->
      @if (isModalOpen()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-sheet" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingId() ? 'Edit Transaction' : 'New Transaction' }}</h3>
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

              <!-- Amount Input with Large Touch Targets -->
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
                <input id="txnNote" type="text" formControlName="note" placeholder="e.g. Weekly vegetable market" />
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="txnForm.invalid || isSaving()">
                  {{ isSaving() ? 'Saving...' : (editingId() ? 'Save Changes' : 'Record Transaction') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .transactions-page {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .page-header {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      @media (min-width: 768px) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }

      h2 {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--color-text-main);
      }

      .subtitle {
        font-size: 0.875rem;
        color: var(--color-text-muted);
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 1.25rem;
      background: var(--color-primary);
      color: #ffffff;
      border: none;
      border-radius: var(--radius-md);
      font-weight: 600;
      min-height: var(--min-touch-target);
      cursor: pointer;
      transition: background-color 0.15s ease;

      &:hover {
        background: var(--color-primary-hover);
      }
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 1.25rem;
      background: var(--color-bg-subtle);
      color: var(--color-text-main);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-weight: 600;
      min-height: var(--min-touch-target);
      cursor: pointer;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;

      @media (min-width: 640px) {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      box-shadow: var(--shadow-sm);
    }

    .toolbar {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      @media (min-width: 768px) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .type-pills {
      display: inline-flex;
      background: var(--color-bg-subtle);
      padding: 0.25rem;
      border-radius: var(--radius-md);
      gap: 0.25rem;
    }

    .pill-btn {
      padding: 0.4rem 1rem;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--color-text-muted);
      cursor: pointer;
      min-height: calc(var(--min-touch-target) - 10px);

      &.active {
        background: var(--color-bg-card);
        color: var(--color-text-main);
        box-shadow: var(--shadow-sm);
      }

      &.pill-income.active {
        color: var(--color-income);
      }

      &.pill-expense.active {
        color: var(--color-expense);
      }
    }

    .filter-controls {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;

      select, input {
        min-height: var(--min-touch-target);
        padding: 0.5rem 0.85rem;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-bg-card);
        color: var(--color-text-main);
        font-size: 0.9rem;
      }

      .select-category {
        min-width: 160px;
      }

      .input-search {
        flex: 1;
        min-width: 200px;
      }
    }

    /* Views */
    .desktop-view {
      display: none;
      @media (min-width: 768px) {
        display: block;
      }
    }

    .mobile-view {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      @media (min-width: 768px) {
        display: none;
      }
    }

    /* Table Styles */
    .table-container {
      overflow-x: auto;
      padding: 0;
    }

    .txn-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;

      th {
        padding: 1rem 1.25rem;
        font-size: 0.8rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-text-muted);
        border-bottom: 1px solid var(--color-border);
        background: var(--color-bg-subtle);
      }

      td {
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--color-border);
        font-size: 0.95rem;
      }
    }

    .category-badge {
      display: inline-block;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .income-text { color: var(--color-income) !important; }
    .expense-text { color: var(--color-expense) !important; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }

    .btn-action {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.4rem 0.6rem;
      border-radius: 4px;

      &.edit {
        color: var(--color-primary);
        &:hover { background: var(--color-bg-subtle); }
      }

      &.delete {
        color: var(--color-expense);
        &:hover { background: var(--color-expense-bg); }
      }
    }

    /* Mobile Cards */
    .txn-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      cursor: pointer;
    }

    .txn-card-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .txn-cat-badge {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.1rem;
    }

    .txn-card-info {
      display: flex;
      flex-direction: column;

      .txn-cat-title {
        font-weight: 600;
        font-size: 0.95rem;
      }

      .txn-card-date {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }

      .txn-card-note {
        font-size: 0.8rem;
        color: var(--color-text-muted);
      }
    }

    .txn-card-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;

      .txn-card-amount {
        font-size: 1.1rem;
        font-weight: 700;
      }
    }

    .btn-del-sm {
      background: transparent;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: 1rem;
      padding: 0.5rem;
      min-height: auto;
      &:hover { color: var(--color-expense); }
    }

    /* Floating Action Button for Mobile */
    .mobile-fab {
      position: fixed;
      right: 1.25rem;
      bottom: calc(72px + 1.25rem);
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--color-primary);
      color: #ffffff;
      border: none;
      font-size: 1.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow-md);
      cursor: pointer;
      z-index: 40;

      @media (min-width: 768px) {
        display: none;
      }
    }

    /* Modal / Bottom Sheet */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      z-index: 100;

      @media (min-width: 640px) {
        align-items: center;
        padding: 1.5rem;
      }
    }

    .modal-sheet {
      width: 100%;
      max-width: 480px;
      background: var(--color-bg-card);
      border-top-left-radius: var(--radius-lg);
      border-top-right-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: var(--shadow-md);
      max-height: 90vh;
      overflow-y: auto;

      @media (min-width: 640px) {
        border-radius: var(--radius-lg);
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;

      h3 { font-size: 1.25rem; font-weight: 700; }
      .btn-close {
        background: transparent;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        min-height: auto;
        color: var(--color-text-muted);
      }
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    .type-toggle {
      display: flex;
      background: var(--color-bg-subtle);
      border-radius: var(--radius-md);
      padding: 0.25rem;
    }

    .toggle-label {
      flex: 1;
      text-align: center;
      padding: 0.65rem;
      font-weight: 600;
      font-size: 0.9rem;
      border-radius: 6px;
      cursor: pointer;
      color: var(--color-text-muted);

      input { display: none; }

      &.selected {
        background: var(--color-bg-card);
        color: var(--color-text-main);
        box-shadow: var(--shadow-sm);
      }
    }

    .amount-input-box {
      display: flex;
      align-items: center;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 0.25rem 0.75rem;

      .currency-symbol {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--color-text-muted);
        margin-right: 0.5rem;
      }

      .amount-field {
        width: 100%;
        border: none;
        font-size: 1.5rem;
        font-weight: 700;
        background: transparent;
        color: var(--color-text-main);
        &:focus { outline: none; }
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;

      label { font-size: 0.85rem; font-weight: 600; }

      input, select {
        width: 100%;
        min-height: var(--min-touch-target);
        padding: 0.65rem 0.85rem;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-bg-card);
        color: var(--color-text-main);
        font-size: 0.95rem;

        &:focus {
          outline: none;
          border-color: var(--color-primary);
        }
      }
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1.5rem;

      .empty-icon { font-size: 3rem; margin-bottom: 0.75rem; }
      h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 0.25rem; }
      p { font-size: 0.9rem; color: var(--color-text-muted); margin-bottom: 1.25rem; }
    }
  `]
})
export class TransactionsComponent implements OnInit {
  private readonly transactionsService = inject(TransactionsService);
  private readonly fb = inject(FormBuilder);
  public readonly deletionPermissionsService = inject(DeletionPermissionsService);

  readonly transactions = signal<Transaction[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly summary = signal<MonthlySummary | null>(null);

  readonly selectedMonth = signal<string>(new Date().toISOString().substring(0, 7));
  readonly selectedType = signal<TransactionType | null>(null);
  readonly selectedCategory = signal<string | null>(null);
  readonly searchTerm = signal<string>('');

  readonly isLoading = signal<boolean>(false);
  readonly isModalOpen = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly editingId = signal<string | null>(null);

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

    this.transactionsService.getTransactions({
      month: this.selectedMonth(),
      type: this.selectedType() || undefined,
      categoryId: this.selectedCategory() || undefined,
      search: this.searchTerm() || undefined
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.transactions.set(res.transactions.items);
        this.summary.set(res.summary);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onMonthChange(month: string): void {
    this.selectedMonth.set(month);
    this.loadTransactions();
  }

  setTypeFilter(type: TransactionType | null): void {
    this.selectedType.set(type);
    this.loadTransactions();
  }

  onCategoryChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedCategory.set(val || null);
    this.loadTransactions();
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
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

  onSubmit(): void {
    if (this.txnForm.invalid) return;

    this.isSaving.set(true);
    const val = this.txnForm.getRawValue();

    const payload = {
      type: val.type!,
      amount: Number(val.amount!),
      categoryId: val.categoryId!,
      transactionDate: val.transactionDate!,
      note: val.note || undefined
    };

    if (this.editingId()) {
      this.transactionsService.updateTransaction(this.editingId()!, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadTransactions();
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.transactionsService.createTransaction(payload).subscribe({
        next: () => {
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
