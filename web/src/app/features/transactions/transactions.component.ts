import { Component } from '@angular/core';

@Component({
  selector: 'app-transactions',
  standalone: true,
  template: `
    <div class="feature-page">
      <h2>Income & Expense Transactions</h2>
      <p>Module 3: Month-wise transactions ledger, categories, and receipts.</p>
    </div>
  `,
  styles: [`
    .feature-page {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
    }
  `]
})
export class TransactionsComponent {}

