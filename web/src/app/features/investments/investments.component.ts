import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InvestmentsService } from './services/investments.service';
import {
  AssetAllocation,
  CreateHoldingRequest,
  Holding,
  InvestmentType,
  PortfolioSummary
} from './models/investment.model';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InrCurrencyPipe, StatCardComponent],
  template: `
    <div class="investments-page">
      <!-- Page Header & Action -->
      <div class="page-header no-print">
        <div>
          <h1 class="page-title">Investments & Holdings</h1>
          <p class="subtitle">Track Mutual Funds, Stocks, FD, PPF, NPS, Gold portfolio with real-time gain/loss</p>
        </div>

        <div class="header-actions">
          <button type="button" class="btn-market-ai-shortcut" (click)="goToMarketAi()">
            ✨ AI Stock Market Hub & Screener →
          </button>
          <button type="button" class="btn-primary" (click)="openCreateModal()">
            + Add Asset / Holding
          </button>
        </div>
      </div>

      <!-- Financial Summary Cards -->
      <div class="summary-grid">
        <app-stat-card
          title="Portfolio Value"
          [amount]="summary()?.totalCurrentValue || 0"
          subtitle="Current Market Valuation"
          variant="neutral"
        />
        <app-stat-card
          title="Total Invested"
          [amount]="summary()?.totalInvested || 0"
          subtitle="Net Principal Invested"
          variant="neutral"
        />
        <app-stat-card
          title="Overall Gain / Loss"
          [amount]="summary()?.totalGainLoss || 0"
          [subtitle]="((summary()?.totalGainLoss || 0) >= 0 ? '+' : '') + (summary()?.overallGainLossPercentage || 0) + '% Total Return'"
          [variant]="(summary()?.totalGainLoss || 0) >= 0 ? 'income' : 'expense'"
        />
        <app-stat-card
          title="Dividends Earned"
          [amount]="summary()?.totalDividendEarned || 0"
          subtitle="Realized Payouts"
          variant="income"
        />
      </div>

      <!-- Asset Allocation Bar / Breakdown -->
      @if (allocations().length > 0) {
        <div class="allocations-card card no-print">
          <div class="allocations-header">
            <h4>Asset Class Allocation</h4>
            <span class="text-muted text-xs">{{ allocations().length }} categories</span>
          </div>

          <!-- Color Bar -->
          <div class="allocation-bar">
            @for (alloc of allocations(); track alloc.type) {
              <div
                class="bar-segment"
                [style.width.%]="alloc.percentageOfPortfolio"
                [style.background-color]="getAllocationColor(alloc.type)"
                [title]="alloc.typeName + ': ' + alloc.percentageOfPortfolio + '%'">
              </div>
            }
          </div>

          <!-- Pills List -->
          <div class="allocation-pills">
            @for (alloc of allocations(); track alloc.type) {
              <div class="alloc-pill">
                <span class="dot" [style.background-color]="getAllocationColor(alloc.type)"></span>
                <span class="alloc-name">{{ alloc.typeName }}</span>
                <span class="alloc-val">{{ alloc.totalValue | inrCurrency }}</span>
                <span class="alloc-pct">({{ alloc.percentageOfPortfolio }}%)</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Filter Tabs & Search Toolbar -->
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
            class="pill-btn"
            [class.active]="selectedType() === 1"
            (click)="setTypeFilter(1)">
            Mutual Funds
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="selectedType() === 2"
            (click)="setTypeFilter(2)">
            Stocks
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="selectedType() === 7"
            (click)="setTypeFilter(7)">
            Gold
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="selectedType() === 3"
            (click)="setTypeFilter(3)">
            Fixed Deposit
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="selectedType() === 5"
            (click)="setTypeFilter(5)">
            PPF / NPS
          </button>
        </div>

        <div class="filter-controls">
          <input
            type="text"
            class="input-search"
            placeholder="Search fund, stock, or holding name..."
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
          />
        </div>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-container">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>
      }

      <!-- Empty State -->
      @if (!loading() && holdings().length === 0) {
        <div class="empty-card card">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.8">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <h3>No investment holdings found</h3>
          <p>Add your Mutual Funds, Stocks, Gold, FD, or PPF to track your net worth and returns.</p>
          <button type="button" class="btn-primary mt-4" (click)="openCreateModal()">
            + Add Your First Holding
          </button>
        </div>
      }

      <!-- Holdings List: Mobile Cards (< 768px) & Desktop Table (>= 768px) -->
      @if (!loading() && holdings().length > 0) {
        <!-- Mobile Cards -->
        <div class="mobile-holdings-list">
          @for (h of holdings(); track h.id) {
            <div class="holding-card card" (click)="viewHolding(h.id)">
              <div class="card-header">
                <div>
                  <h4 class="holding-name">{{ h.name }}</h4>
                  <span class="badge" [style.background-color]="getAllocationColor(h.type) + '20'" [style.color]="getAllocationColor(h.type)">
                    {{ h.typeName }}
                  </span>
                </div>
                <div class="gain-badge" [class.gain-positive]="h.absoluteGainLoss >= 0" [class.gain-negative]="h.absoluteGainLoss < 0">
                  {{ h.absoluteGainLoss >= 0 ? '+' : '' }}{{ h.gainLossPercentage }}%
                </div>
              </div>

              <div class="card-metrics">
                <div class="metric-row">
                  <span class="metric-label">Current Value:</span>
                  <span class="tabular-nums font-bold text-lg">{{ h.currentValue | inrCurrency }}</span>
                </div>
                <div class="metric-row sub-row">
                  <span class="metric-label">Invested Amount:</span>
                  <span class="sub-val">{{ h.totalInvested | inrCurrency }}</span>
                </div>
                <div class="metric-row sub-row">
                  <span class="metric-label">Net Profit / Loss:</span>
                  <span class="sub-val font-semibold" [class.text-green]="h.absoluteGainLoss >= 0" [class.text-red]="h.absoluteGainLoss < 0">
                    {{ h.absoluteGainLoss >= 0 ? '+' : '' }}{{ h.absoluteGainLoss | inrCurrency }}
                  </span>
                </div>
                @if (h.totalUnits > 0) {
                  <div class="metric-row sub-row">
                    <span class="metric-label">Units Held:</span>
                    <span class="sub-val">{{ h.totalUnits }}</span>
                  </div>
                }
              </div>

              <div class="card-footer" (click)="$event.stopPropagation()">
                <span class="text-xs text-muted">{{ h.transactionCount }} transactions</span>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span class="view-link" (click)="viewHolding(h.id)">View Details &rarr;</span>
                  <button type="button" class="btn-sm btn-danger-icon" (click)="deleteHolding(h)" title="Delete Holding">🗑️</button>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Desktop Ledger Table (>= 768px) -->
        <div class="desktop-table-container card">
          <table class="holdings-table">
            <thead>
              <tr>
                <th>Holding Name</th>
                <th>Asset Class</th>
                <th class="text-right">Invested Value</th>
                <th class="text-right">Current Value</th>
                <th class="text-right">Gain / Loss (₹)</th>
                <th class="text-right">Returns (%)</th>
                <th class="text-right">Units</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (h of holdings(); track h.id) {
                <tr class="table-row" (click)="viewHolding(h.id)">
                  <td>
                    <div class="font-bold text-main">{{ h.name }}</div>
                    @if (h.note) {
                      <div class="text-xs text-muted">{{ h.note }}</div>
                    }
                  </td>
                  <td>
                    <span class="badge" [style.background-color]="getAllocationColor(h.type) + '20'" [style.color]="getAllocationColor(h.type)">
                      {{ h.typeName }}
                    </span>
                  </td>
                  <td class="text-right tabular-nums">{{ h.totalInvested | inrCurrency }}</td>
                  <td class="text-right tabular-nums font-bold text-main">{{ h.currentValue | inrCurrency }}</td>
                  <td class="text-right tabular-nums font-semibold" [class.text-green]="h.absoluteGainLoss >= 0" [class.text-red]="h.absoluteGainLoss < 0">
                    {{ h.absoluteGainLoss >= 0 ? '+' : '' }}{{ h.absoluteGainLoss | inrCurrency }}
                  </td>
                  <td class="text-right tabular-nums font-bold" [class.text-green]="h.absoluteGainLoss >= 0" [class.text-red]="h.absoluteGainLoss < 0">
                    {{ h.absoluteGainLoss >= 0 ? '+' : '' }}{{ h.gainLossPercentage }}%
                  </td>
                  <td class="text-right tabular-nums text-muted">{{ h.totalUnits > 0 ? h.totalUnits : '—' }}</td>
                  <td class="text-right" (click)="$event.stopPropagation()">
                    <div style="display: inline-flex; gap: 6px; align-items: center;">
                      <button type="button" class="btn-sm btn-outline" (click)="viewHolding(h.id)">
                        View
                      </button>
                      <button type="button" class="btn-sm btn-danger-icon" (click)="deleteHolding(h)" title="Delete Holding">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Create Holding Modal Sheet -->
      @if (showCreateModal()) {
        <div class="modal-backdrop" (click)="closeCreateModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Add New Investment Asset</h3>
              <button type="button" class="btn-close" (click)="closeCreateModal()">&times;</button>
            </div>

            <form [formGroup]="holdingForm" (ngSubmit)="submitCreateHolding()">
              <div class="modal-body">
                <!-- Holding Name -->
                <div class="form-group">
                  <label class="form-label" for="holdingName">Holding / Asset Name *</label>
                  <input
                    id="holdingName"
                    type="text"
                    class="form-control"
                    placeholder="e.g. Parag Parikh Flexi Cap Fund or TCS"
                    formControlName="name"
                  />
                  @if (holdingForm.get('name')?.invalid && holdingForm.get('name')?.touched) {
                    <span class="form-error">Holding name is required.</span>
                  }
                </div>

                <!-- Asset Type -->
                <div class="form-group">
                  <label class="form-label" for="assetType">Asset Class *</label>
                  <select id="assetType" class="form-control" formControlName="type">
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

                <!-- Invested & Current Value Row -->
                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label" for="investedAmt">Amount Invested (₹) *</label>
                    <input
                      id="investedAmt"
                      type="number"
                      step="0.01"
                      class="form-control"
                      placeholder="e.g. 50000"
                      formControlName="initialInvestedAmount"
                    />
                    @if (holdingForm.get('initialInvestedAmount')?.invalid && holdingForm.get('initialInvestedAmount')?.touched) {
                      <span class="form-error">Amount must be greater than zero.</span>
                    }
                  </div>

                  <div class="form-group col-half">
                    <label class="form-label" for="currentVal">Current Valuation (₹)</label>
                    <input
                      id="currentVal"
                      type="number"
                      step="0.01"
                      class="form-control"
                      placeholder="Same as invested if empty"
                      formControlName="currentValue"
                    />
                  </div>
                </div>

                <!-- Units & Date Row -->
                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label" for="units">Units / Quantity</label>
                    <input
                      id="units"
                      type="number"
                      step="0.0001"
                      class="form-control"
                      placeholder="e.g. 125.45"
                      formControlName="initialUnits"
                    />
                  </div>

                  <div class="form-group col-half">
                    <label class="form-label" for="txnDate">Purchase Date</label>
                    <input
                      id="txnDate"
                      type="date"
                      class="form-control"
                      formControlName="transactionDate"
                    />
                  </div>
                </div>

                <!-- Note -->
                <div class="form-group">
                  <label class="form-label" for="note">Folio / Demat / Notes</label>
                  <input
                    id="note"
                    type="text"
                    class="form-control"
                    placeholder="e.g. Zerodha Kite / Groww SIP"
                    formControlName="note"
                  />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-outline" (click)="closeCreateModal()" [disabled]="submitting()">
                  Cancel
                </button>
                <button type="submit" class="btn-primary" [disabled]="holdingForm.invalid || submitting()">
                  {{ submitting() ? 'Saving...' : 'Add Holding' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .investments-page {
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

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .btn-market-ai-shortcut {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.625rem 1.1rem;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, rgba(11, 87, 208, 0.12), rgba(99, 102, 241, 0.15));
      color: #0b57d0;
      border: 1px solid rgba(11, 87, 208, 0.35);
      font-size: 0.875rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background: #0b57d0;
        color: #ffffff;
      }
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

    /* Allocation card */
    .allocations-card {
      padding: 1.25rem;
    }

    .allocations-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .allocations-header h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-text-main);
    }

    .allocation-bar {
      display: flex;
      height: 12px;
      border-radius: 9999px;
      overflow: hidden;
      margin-bottom: 1rem;
      background: var(--color-bg-subtle);
    }

    .bar-segment {
      height: 100%;
      transition: width 0.3s ease;
    }

    .allocation-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .alloc-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8125rem;
      padding: 0.25rem 0.6rem;
      background: var(--color-bg-subtle);
      border-radius: var(--radius-sm);
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .alloc-name {
      font-weight: 600;
      color: var(--color-text-main);
    }

    .alloc-val {
      color: var(--color-text-muted);
    }

    .alloc-pct {
      font-weight: 700;
      color: var(--color-text-main);
    }

    /* Toolbar */
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
      padding: 0.5rem 0.875rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 500;
      border: 1px solid var(--color-border);
      background: var(--color-bg-subtle);
      color: var(--color-text-muted);
      cursor: pointer;
      min-height: 40px;
    }

    .pill-btn.active {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }

    .filter-controls {
      display: flex;
      flex: 1;
      max-width: 380px;
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

    /* Cards */
    .mobile-holdings-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    @media (min-width: 768px) {
      .mobile-holdings-list {
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

    .holding-card {
      padding: 1.25rem;
      cursor: pointer;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }

    .holding-name {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-text-main);
    }

    .badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-top: 0.25rem;
    }

    .gain-badge {
      font-size: 0.8125rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-sm);
    }

    .gain-positive {
      background: #ecfdf5;
      color: #059669;
    }

    .gain-negative {
      background: #fee2e2;
      color: #dc2626;
    }

    .card-metrics {
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

    .sub-row {
      font-size: 0.8125rem;
    }

    .metric-label {
      color: var(--color-text-muted);
    }

    .sub-val {
      color: var(--color-text-main);
    }

    .text-green { color: #059669; }
    .text-red { color: #dc2626; }
    .text-main { color: var(--color-text-main); }
    .text-lg { font-size: 1.15rem; }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .view-link {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-primary);
    }

    /* Table */
    .holdings-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .holdings-table th {
      padding: 0.875rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
    }

    .holdings-table td {
      padding: 1rem;
      font-size: 0.875rem;
      border-bottom: 1px solid var(--color-border);
    }

    .table-row {
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .table-row:hover {
      background-color: var(--color-bg-subtle);
    }

    .text-right { text-align: right; }
    .btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8125rem; min-height: 36px; }

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

    .empty-card {
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .empty-icon { font-size: 3rem; margin-bottom: 0.75rem; }

    .loading-container { display: flex; flex-direction: column; gap: 1rem; }
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
export class InvestmentsComponent implements OnInit {
  private readonly investmentsService = inject(InvestmentsService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  public readonly themeService = inject(ThemeService);

  readonly holdings = signal<Holding[]>([]);
  readonly summary = signal<PortfolioSummary | null>(null);
  readonly allocations = signal<AssetAllocation[]>([]);
  readonly loading = signal<boolean>(true);
  readonly submitting = signal<boolean>(false);
  readonly showCreateModal = signal<boolean>(false);

  readonly selectedType = signal<InvestmentType | null>(null);
  readonly searchTerm = signal<string>('');

  readonly holdingForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    type: [InvestmentType.MutualFund, [Validators.required]],
    initialInvestedAmount: [null as number | null, [Validators.required, Validators.min(1)]],
    currentValue: [null as number | null, [Validators.min(0)]],
    initialUnits: [null as number | null, [Validators.min(0)]],
    transactionDate: [new Date().toISOString().substring(0, 10)],
    note: ['']
  });

  goToMarketAi(): void {
    this.themeService.playClickSound();
    this.router.navigate(['/market-ai']);
  }

  deleteHolding(h: Holding): void {
    if (!confirm(`Are you sure you want to delete ${h.name}? This will move the holding and its transactions to the Recycle Bin.`)) return;
    this.investmentsService.deleteHolding(h.id).subscribe({
      next: () => {
        this.themeService.playDeleteSound();
        this.loadInvestments();
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to delete holding.');
      }
    });
  }

  ngOnInit(): void {
    this.loadInvestments();
  }

  loadInvestments(): void {
    this.loading.set(true);
    this.investmentsService.getInvestments(this.selectedType(), this.searchTerm() || undefined).subscribe({
      next: (res) => {
        this.holdings.set(res.holdings);
        this.summary.set(res.summary);
        this.allocations.set(res.allocations);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  setTypeFilter(type: InvestmentType | null): void {
    this.selectedType.set(type);
    this.loadInvestments();
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    this.loadInvestments();
  }

  viewHolding(id: string): void {
    this.router.navigate(['/investments', id]);
  }

  openCreateModal(): void {
    this.holdingForm.reset({
      name: '',
      type: InvestmentType.MutualFund,
      initialInvestedAmount: null,
      currentValue: null,
      initialUnits: null,
      transactionDate: new Date().toISOString().substring(0, 10),
      note: ''
    });
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  submitCreateHolding(): void {
    if (this.holdingForm.invalid) {
      this.holdingForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const formVal = this.holdingForm.value;

    const payload: CreateHoldingRequest = {
      name: formVal.name!.trim(),
      type: Number(formVal.type),
      initialInvestedAmount: Number(formVal.initialInvestedAmount),
      currentValue: formVal.currentValue ? Number(formVal.currentValue) : Number(formVal.initialInvestedAmount),
      initialUnits: formVal.initialUnits ? Number(formVal.initialUnits) : null,
      transactionDate: formVal.transactionDate ? formVal.transactionDate : null,
      note: formVal.note?.trim() || null
    };

    this.investmentsService.createHolding(payload).subscribe({
      next: (res) => {
        this.themeService.playSuccessSound();
        this.submitting.set(false);
        this.closeCreateModal();
        this.router.navigate(['/investments', res.holding.id]);
      },
      error: () => {
        this.submitting.set(false);
      }
    });
  }

  getAllocationColor(type: InvestmentType): string {
    switch (type) {
      case InvestmentType.MutualFund: return '#4f46e5'; // Indigo
      case InvestmentType.Stock: return '#0284c7'; // Sky blue
      case InvestmentType.Gold: return '#eab308'; // Amber/Gold
      case InvestmentType.FixedDeposit: return '#059669'; // Emerald
      case InvestmentType.RecurringDeposit: return '#10b981'; // Green
      case InvestmentType.PPF: return '#0d9488'; // Teal
      case InvestmentType.NPS: return '#8b5cf6'; // Purple
      default: return '#64748b'; // Slate
    }
  }
}
