import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TransactionsService } from './services/transactions.service';
import { Category, MonthlySummary, Transaction, TransactionType } from './models/transaction.model';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { MonthPickerComponent } from '../../shared/components/month-picker/month-picker.component';
import { DeletionPermissionsService } from '../../core/services/deletion-permissions.service';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InrCurrencyPipe, MonthPickerComponent],
  template: `
    <div class="google-console-page">
      <!-- Top Page Header (Google Play Console Style, Hisaab Content) -->
      <header class="console-header no-print">
        <div class="console-header-left">
          <h1 class="console-title">Transactions</h1>
          <p class="console-subtitle">
            Manage daily income, expenses, and ledger records with real-time balance calculations.
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
            {{ transactions().length }}
          </div>
          <div class="metric-trend-row neutral">
            <span>Active transactions listed</span>
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

        <!-- 4. Date/Month Picker -->
        <div class="date-range-container">
          <app-month-picker (monthChange)="onMonthChange($event)" />
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
                  <th class="col-note">Description / Note</th>
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

                    <!-- Note / Description -->
                    <td class="col-note">
                      <span class="note-text">{{ txn.note || '—' }}</span>
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
              <h3>{{ editingId() ? 'Edit Order Transaction' : 'Record New Transaction' }}</h3>
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
                <input id="txnNote" type="text" formControlName="note" placeholder="e.g. Server hosting, API subscription" />
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
  styleUrl: './transactions.component.scss'
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
