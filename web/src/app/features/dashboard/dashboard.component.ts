import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent],
  template: `
    <div class="dashboard-page">
      <div class="page-title-row">
        <div>
          <h2>Financial Overview</h2>
          <p class="subtitle">Summary for current month</p>
        </div>
        <button type="button" class="btn-primary desktop-btn">
          + Add Entry
        </button>
      </div>

      <!-- KPI Stat Cards Grid (Mobile 1 col, Tablet 2 col, Desktop 4 col) -->
      <div class="kpi-grid">
        <app-stat-card
          title="Total Income"
          [amount]="125000"
          subtitle="Salary & Consulting"
          variant="income"
        />
        <app-stat-card
          title="Total Expenses"
          [amount]="42350"
          subtitle="Rent, Groceries, Utilities"
          variant="expense"
        />
        <app-stat-card
          title="Net Savings"
          [amount]="82650"
          subtitle="Monthly surplus"
          variant="neutral"
        />
        <app-stat-card
          title="Net Worth"
          [amount]="1845000"
          subtitle="Cash + EPF + Investments"
          variant="investment"
        />
      </div>

      <!-- Foundation Status Card -->
      <div class="foundation-card">
        <h3>Foundation Module Initialized</h3>
        <p>ASP.NET Core 8 Web API Clean Architecture backend connected with Angular 18 Standalone shell.</p>
        <div class="status-tags">
          <span class="tag tag-success">Backend: Clean Architecture .NET 8</span>
          <span class="tag tag-success">Frontend: Angular 18 Standalone</span>
          <span class="tag tag-success">PostgreSQL 16 & Multi-tenancy Isolation</span>
          <span class="tag tag-success">OWASP Top 10 Security Headers</span>
        </div>
      </div>

      <!-- Mobile Floating Action Button -->
      <button type="button" class="fab mobile-fab" aria-label="Add transaction">
        +
      </button>
    </div>
  `,
  styles: [`
    .dashboard-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;

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

    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 1.25rem;
      background: var(--color-primary);
      color: var(--color-primary-contrast);
      border: none;
      border-radius: var(--radius-md);
      font-weight: 600;
      cursor: pointer;
      min-height: var(--min-touch-target);
      transition: background-color 0.15s ease;

      &:hover {
        background: var(--color-primary-hover);
      }
    }

    .desktop-btn {
      display: none;
      @media (min-width: 768px) {
        display: inline-flex;
      }
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;

      @media (min-width: 640px) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (min-width: 1024px) {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .foundation-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);

      h3 {
        font-size: 1.15rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
      }

      p {
        font-size: 0.9rem;
        color: var(--color-text-muted);
        margin-bottom: 1rem;
      }
    }

    .status-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .tag {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;

      &.tag-success {
        background: var(--color-income-bg);
        color: var(--color-income);
        border: 1px solid var(--color-income);
      }
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
  `]
})
export class DashboardComponent {}
