import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardService } from './services/dashboard.service';
import { DashboardResponse, MonthlyTrend } from './models/dashboard.model';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { MonthPickerComponent } from '../../shared/components/month-picker/month-picker.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InrCurrencyPipe, StatCardComponent, MonthPickerComponent],
  template: `
    <div class="dashboard-page">
      <!-- Top Header & Month Navigator -->
      <div class="dashboard-header">
        <div class="title-section">
          <h1 class="page-title">Financial Dashboard</h1>
          <p class="subtitle">Complete personal balance sheet and monthly cashflow</p>
        </div>

        <div class="header-picker-wrap">
          <app-month-picker [initialMonth]="selectedMonth()" (monthChange)="onMonthPickerChange($event)" />
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Calculating financial metrics and net worth...</p>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="alert-error">
          <p>{{ error() }}</p>
          <button type="button" class="btn-retry" (click)="loadDashboard()">Retry</button>
        </div>
      }

      @if (!loading() && dashboardData(); as d) {
        <!-- HERO CARD: Net Worth Balance Sheet -->
        <div class="net-worth-hero-card">
          <div class="hero-header">
            <div>
              <span class="hero-badge">NET WORTH</span>
              <div class="net-worth-amount amount" role="text">{{ d.netWorth.formattedTotalNetWorth }}</div>
              <span class="hero-subtext">Total Liquid Cash + Investments + EPF + Receivables − Payables</span>
            </div>
            <div class="assets-liabilities-badges">
              <div class="badge-item asset">
                <span class="label">Total Assets</span>
                <span class="value">{{ d.netWorth.formattedTotalAssets }}</span>
              </div>
              <div class="badge-item liability">
                <span class="label">Total Liabilities</span>
                <span class="value">{{ d.netWorth.formattedTotalLiabilities }}</span>
              </div>
            </div>
          </div>

          <!-- Asset Breakdown Pill Grid -->
          <div class="balance-pills-grid">
            <div class="balance-pill">
              <span class="pill-title">Liquid Cash</span>
              <span class="pill-amount" [class.negative]="d.netWorth.liquidCash < 0">
                {{ d.netWorth.formattedLiquidCash }}
              </span>
            </div>
            <div class="balance-pill">
              <span class="pill-title">Investments</span>
              <span class="pill-amount">{{ d.netWorth.formattedInvestmentsValue }}</span>
            </div>
            <div class="balance-pill">
              <span class="pill-title">EPF Balance</span>
              <span class="pill-amount">{{ d.netWorth.formattedEpfBalance }}</span>
            </div>
            <div class="balance-pill">
              <span class="pill-title">Loans Receivable</span>
              <span class="pill-amount text-success">{{ d.netWorth.formattedLoansReceivable }}</span>
            </div>
            <div class="balance-pill">
              <span class="pill-title">Loans Payable</span>
              <span class="pill-amount text-danger">{{ d.netWorth.formattedLoansPayable }}</span>
            </div>
          </div>
        </div>

        <!-- Monthly KPI Cards Grid -->
        <div class="kpi-grid">
          <app-stat-card
            title="Monthly Income"
            [amount]="d.monthlyOverview.totalIncome"
            subtitle="Earned in {{ formatMonthDisplay(selectedMonth()) }}"
            variant="income"
          />
          <app-stat-card
            title="Monthly Expenses"
            [amount]="d.monthlyOverview.totalExpense"
            subtitle="{{ d.monthlyOverview.transactionCount }} transactions recorded"
            variant="expense"
          />
          <app-stat-card
            title="Monthly Net Savings"
            [amount]="d.monthlyOverview.netSavings"
            subtitle="{{ d.monthlyOverview.savingsRatePercentage }}% savings rate"
            [variant]="d.monthlyOverview.netSavings >= 0 ? 'income' : 'expense'"
          />
          <div class="quick-links-card">
            <div class="quick-links-header">
              <h4>Quick Actions</h4>
            </div>
            <div class="action-buttons-group">
              <a routerLink="/transactions" class="btn-action">+ Transaction</a>
              <a routerLink="/loans" class="btn-action">+ Loan</a>
              <a routerLink="/investments" class="btn-action">+ Investment</a>
              <a routerLink="/epfo" class="btn-action">+ EPFO</a>
            </div>
          </div>
        </div>

        <!-- Middle Section: 6-Month Income vs Expense Trend Bar Chart -->
        <div class="chart-section-card">
          <div class="chart-header">
            <div>
              <h3>6-Month Cashflow Trend</h3>
              <p class="chart-subtitle">Monthly comparison of Income vs Expenses</p>
            </div>
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-dot income"></span> Income</span>
              <span class="legend-item"><span class="legend-dot expense"></span> Expense</span>
            </div>
          </div>

          <div class="bars-container">
            @for (t of d.monthlyTrends; track t.month) {
              <div class="month-bar-group">
                <div class="bar-pair">
                  <!-- Income Bar -->
                  <div class="bar-col">
                    <div
                      class="bar bar-income"
                      [style.height.%]="getBarHeight(t.income)"
                      [title]="'Income: ' + (t.income | inrCurrency)"
                    ></div>
                  </div>
                  <!-- Expense Bar -->
                  <div class="bar-col">
                    <div
                      class="bar bar-expense"
                      [style.height.%]="getBarHeight(t.expense)"
                      [title]="'Expense: ' + (t.expense | inrCurrency)"
                    ></div>
                  </div>
                </div>
                <div class="month-label-text">{{ t.monthLabel }}</div>
                <div class="month-net-text" [class.negative]="t.netSavings < 0">
                  {{ t.netSavings >= 0 ? '+' : '' }}{{ t.netSavings | inrCurrency }}
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Lower Section: Split Columns (Category Breakdown & Upcoming Loan Dues) -->
        <div class="dashboard-split-grid">
          <!-- Category Breakdown Card -->
          <div class="category-card">
            <div class="card-header">
              <h3>Top Expenses by Category</h3>
              <span class="badge">{{ d.topExpenseCategories.length }} Categories</span>
            </div>

            @if (d.topExpenseCategories.length === 0) {
              <div class="empty-mini">
                <p>No expense transactions recorded for {{ formatMonthDisplay(selectedMonth()) }}.</p>
                <a routerLink="/transactions" class="link-btn">+ Add Expense</a>
              </div>
            } @else {
              <div class="categories-list">
                @for (c of d.topExpenseCategories; track c.categoryId) {
                  <div class="cat-item">
                    <div class="cat-info">
                      <span class="cat-dot" [style.background-color]="c.categoryColor"></span>
                      <span class="cat-name">{{ c.categoryName }}</span>
                      <span class="cat-pct">{{ c.percentage }}%</span>
                      <span class="cat-amount">{{ c.formattedAmount }}</span>
                    </div>
                    <div class="cat-bar-bg">
                      <div
                        class="cat-bar-fill"
                        [style.width.%]="c.percentage"
                        [style.background-color]="c.categoryColor"
                      ></div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Upcoming Loan Dues Card -->
          <div class="dues-card">
            <div class="card-header">
              <h3>Active Loans & Upcoming Dues</h3>
              <a routerLink="/loans" class="link-view-all">View All</a>
            </div>

            @if (d.upcomingLoanDues.length === 0) {
              <div class="empty-mini">
                <p>No active loan dues or outstanding balances.</p>
                <a routerLink="/loans" class="link-btn">Create Loan</a>
              </div>
            } @else {
              <div class="dues-list">
                @for (loan of d.upcomingLoanDues; track loan.id) {
                  <div class="due-item">
                    <div class="due-main">
                      <div class="due-title-row">
                        <span class="due-name">{{ loan.name }}</span>
                        <span
                          class="due-dir-badge"
                          [class.given]="loan.direction === 1"
                          [class.taken]="loan.direction === 2"
                        >
                          {{ loan.direction === 1 ? 'Receivable (Given)' : 'Payable (Taken)' }}
                        </span>
                      </div>
                      <div class="due-sub">
                        <span>Counterparty: <strong>{{ loan.counterparty }}</strong></span>
                        @if (loan.dueDate) {
                          <span class="due-date-text">
                            Due: {{ loan.dueDate | date:'mediumDate' }}
                            @if (loan.isOverdue) {
                              <span class="badge-overdue">OVERDUE</span>
                            } @else if (loan.daysUntilDue !== null && loan.daysUntilDue <= 7) {
                              <span class="badge-due-soon">Due in {{ loan.daysUntilDue }}d</span>
                            }
                          </span>
                        }
                      </div>
                    </div>
                    <div class="due-amount-box">
                      <span class="due-amount">{{ loan.formattedOutstandingBalance }}</span>
                      <a [routerLink]="['/loans', loan.id]" class="btn-due-view">Ledger →</a>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Recent Transactions Card -->
        <div class="recent-card">
          <div class="card-header">
            <h3>Recent Transactions</h3>
            <a routerLink="/transactions" class="link-view-all">All Transactions</a>
          </div>

          @if (d.recentTransactions.length === 0) {
            <div class="empty-mini">
              <p>No transactions found. Start recording income and expenses to track your financial health.</p>
              <a routerLink="/transactions" class="link-btn">+ Add Transaction</a>
            </div>
          } @else {
            <div class="recent-table-wrapper">
              <table class="recent-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Note</th>
                    <th class="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  @for (tx of d.recentTransactions; track tx.id) {
                    <tr>
                      <td class="date-cell">{{ tx.transactionDate | date:'mediumDate' }}</td>
                      <td>
                        <span class="cat-pill">
                          <span class="cat-dot" [style.background-color]="tx.categoryColor"></span>
                          {{ tx.categoryName }}
                        </span>
                      </td>
                      <td class="note-cell">{{ tx.note || '—' }}</td>
                      <td class="text-right amount-cell" [class.income]="tx.type === 1" [class.expense]="tx.type === 2">
                        {{ tx.type === 1 ? '+' : '-' }}{{ tx.formattedAmount }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-bottom: 3rem;
    }

    .dashboard-header {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      @media (min-width: 768px) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .title-section {
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

    .month-selector-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 0.35rem 0.5rem;
      box-shadow: var(--shadow-sm);
    }

    .btn-nav {
      background: transparent;
      border: none;
      font-size: 1.25rem;
      font-weight: 700;
      cursor: pointer;
      color: var(--color-text-main);
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      min-height: var(--min-touch-target);
      display: inline-flex;
      align-items: center;
      justify-content: center;

      &:hover {
        background: var(--color-bg-subtle, #f3f4f6);
      }
    }

    .current-month-display {
      position: relative;
      cursor: pointer;
      padding: 0.25rem 0.75rem;
      font-weight: 600;
      color: var(--color-text-main);
      min-width: 140px;
      text-align: center;
    }

    .month-input-hidden {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }

    .btn-today {
      background: var(--color-primary);
      color: #ffffff;
      border: none;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.35rem 0.65rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      min-height: var(--min-touch-target);

      &:hover {
        background: var(--color-primary-hover);
      }
    }

    /* NET WORTH HERO BANNER */
    .net-worth-hero-card {
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
      color: #ffffff;
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: var(--shadow-md);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .hero-header {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      @media (min-width: 768px) {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
      }
    }

    .hero-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      background: rgba(255, 255, 255, 0.15);
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
    }

    .net-worth-amount {
      font-size: 2.25rem;
      font-weight: 800;
      line-height: 1.1;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .hero-subtext {
      font-size: 0.8rem;
      opacity: 0.85;
      display: block;
      margin-top: 0.35rem;
    }

    .assets-liabilities-badges {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .badge-item {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: var(--radius-md);
      padding: 0.5rem 0.85rem;
      display: flex;
      flex-direction: column;
      min-width: 120px;

      .label {
        font-size: 0.7rem;
        opacity: 0.8;
      }
      .value {
        font-size: 1rem;
        font-weight: 700;
      }

      &.asset .value {
        color: #86efac;
      }
      &.liability .value {
        color: #fca5a5;
      }
    }

    .balance-pills-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;

      @media (min-width: 640px) {
        grid-template-columns: repeat(3, 1fr);
      }

      @media (min-width: 1024px) {
        grid-template-columns: repeat(5, 1fr);
      }
    }

    .balance-pill {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-md);
      padding: 0.65rem 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;

      .pill-title {
        font-size: 0.75rem;
        opacity: 0.75;
      }

      .pill-amount {
        font-size: 1rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      .negative {
        color: #fca5a5;
      }
      .text-success {
        color: #86efac;
      }
      .text-danger {
        color: #fca5a5;
      }
    }

    /* KPI STATS GRID */
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

    .quick-links-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      h4 {
        margin: 0 0 0.75rem;
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--color-text-main);
      }
    }

    .action-buttons-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }

    .btn-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.4rem 0.5rem;
      background: var(--color-bg-subtle, #f3f4f6);
      color: var(--color-text-main);
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      font-weight: 600;
      text-decoration: none;
      min-height: var(--min-touch-target);
      border: 1px solid var(--color-border);

      &:hover {
        background: var(--color-primary);
        color: #ffffff;
      }
    }

    /* 6-MONTH CHART SECTION */
    .chart-section-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .chart-header {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;

      @media (min-width: 640px) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }

      h3 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--color-text-main);
      }

      .chart-subtitle {
        margin: 0.2rem 0 0;
        font-size: 0.85rem;
        color: var(--color-text-muted);
      }
    }

    .chart-legend {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-text-main);
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 2px;

      &.income {
        background: var(--color-income, #10b981);
      }
      &.expense {
        background: var(--color-expense, #ef4444);
      }
    }

    .bars-container {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 0.5rem;
      height: 220px;
      align-items: flex-end;
      padding-top: 1.5rem;
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 0.5rem;
    }

    .month-bar-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    .bar-pair {
      display: flex;
      gap: 4px;
      align-items: flex-end;
      height: 140px;
      width: 100%;
      max-width: 48px;
    }

    .bar-col {
      flex: 1;
      height: 100%;
      display: flex;
      align-items: flex-end;
    }

    .bar {
      width: 100%;
      min-height: 4px;
      border-radius: 3px 3px 0 0;
      transition: height 0.4s ease;

      &.bar-income {
        background: var(--color-income, #10b981);
      }
      &.bar-expense {
        background: var(--color-expense, #ef4444);
      }
    }

    .month-label-text {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .month-net-text {
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--color-income, #10b981);
      white-space: nowrap;

      &.negative {
        color: var(--color-expense, #ef4444);
      }
    }

    /* SPLIT GRID */
    .dashboard-split-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;

      @media (min-width: 1024px) {
        grid-template-columns: 1fr 1fr;
      }
    }

    .category-card, .dues-card, .recent-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      box-shadow: var(--shadow-sm);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;

      h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--color-text-main);
      }
    }

    .badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      background: var(--color-bg-subtle, #f3f4f6);
      color: var(--color-text-muted);
    }

    .link-view-all {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    /* Category list */
    .categories-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .cat-item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .cat-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
    }

    .cat-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .cat-name {
      font-weight: 600;
      color: var(--color-text-main);
      flex: 1;
    }

    .cat-pct {
      color: var(--color-text-muted);
      font-size: 0.8rem;
    }

    .cat-amount {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--color-text-main);
    }

    .cat-bar-bg {
      height: 6px;
      background: var(--color-bg-subtle, #f3f4f6);
      border-radius: 3px;
      overflow: hidden;
    }

    .cat-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    /* Loan dues */
    .dues-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .due-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-bg-main, #ffffff);
    }

    .due-main {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .due-title-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .due-name {
      font-weight: 600;
      font-size: 0.9rem;
      color: var(--color-text-main);
    }

    .due-dir-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;

      &.given {
        background: #ecfdf5;
        color: #065f46;
      }
      &.taken {
        background: #fef2f2;
        color: #991b1b;
      }
    }

    .due-sub {
      font-size: 0.8rem;
      color: var(--color-text-muted);
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .badge-overdue {
      background: #ef4444;
      color: #ffffff;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 800;
    }

    .badge-due-soon {
      background: #f59e0b;
      color: #ffffff;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 700;
    }

    .due-amount-box {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.2rem;
    }

    .due-amount {
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--color-text-main);
    }

    .btn-due-view {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    /* RECENT TRANSACTIONS TABLE */
    .recent-table-wrapper {
      overflow-x: auto;
    }

    .recent-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;

      th {
        text-align: left;
        padding: 0.5rem 0.75rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--color-border);
      }

      td {
        padding: 0.65rem 0.75rem;
        border-bottom: 1px solid var(--color-border);
      }

      tr:last-child td {
        border-bottom: none;
      }
    }

    .cat-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-weight: 500;
    }

    .amount-cell {
      font-weight: 700;
      font-variant-numeric: tabular-nums;

      &.income {
        color: var(--color-income, #10b981);
      }
      &.expense {
        color: var(--color-expense, #ef4444);
      }
    }

    .text-right {
      text-align: right;
    }

    .empty-mini {
      text-align: center;
      padding: 1.5rem;
      color: var(--color-text-muted);
      font-size: 0.85rem;

      p {
        margin: 0 0 0.5rem;
      }
    }

    .link-btn {
      display: inline-block;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-primary);
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      gap: 1rem;
      color: var(--color-text-muted);
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .alert-error {
      background: #fef2f2;
      border: 1px solid #f87171;
      color: #b91c1c;
      padding: 1rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .btn-retry {
      background: #b91c1c;
      color: #ffffff;
      border: none;
      padding: 0.4rem 0.8rem;
      border-radius: var(--radius-sm);
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly selectedMonth = signal<string>(this.getCurrentMonthString());
  readonly dashboardData = signal<DashboardResponse | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardService.getDashboard(this.selectedMonth(), 6).subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail || err?.message || 'Failed to load dashboard data.');
        this.loading.set(false);
      }
    });
  }

  changeMonth(delta: number): void {
    const [year, month] = this.selectedMonth().split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    const yStr = date.getFullYear().toString();
    const mStr = (date.getMonth() + 1).toString().padStart(2, '0');
    this.selectedMonth.set(`${yStr}-${mStr}`);
    this.loadDashboard();
  }

  onMonthPickerChange(newMonth: string): void {
    if (newMonth && newMonth !== this.selectedMonth()) {
      this.selectedMonth.set(newMonth);
      this.loadDashboard();
    }
  }

  resetToCurrentMonth(): void {
    const cur = this.getCurrentMonthString();
    if (this.selectedMonth() !== cur) {
      this.selectedMonth.set(cur);
      this.loadDashboard();
    }
  }

  formatMonthDisplay(monthStr: string): string {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  getBarHeight(amount: number): number {
    const data = this.dashboardData();
    if (!data || !data.monthlyTrends || data.monthlyTrends.length === 0) return 4;
    const maxVal = Math.max(
      ...data.monthlyTrends.map(t => Math.max(t.income, t.expense)),
      1
    );
    if (maxVal <= 0 || amount <= 0) return 4;
    const pct = Math.round((amount / maxVal) * 100);
    return Math.max(pct, 4); // minimum 4% height for visibility
  }

  private getCurrentMonthString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${y}-${m}`;
  }
}
