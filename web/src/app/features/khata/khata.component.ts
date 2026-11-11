import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { KhataService } from './services/khata.service';
import {
  KhataEntry,
  KhataEventDetail,
  KhataEventFund,
  KhataEventItem,
  KhataEventSummary,
  KhataParty,
  KhataPartyDetail,
  LiquidityAccount,
  LiquiditySummary
} from './models/khata.model';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';

@Component({
  selector: 'app-khata',
  standalone: true,
  imports: [CommonModule, FormsModule, InrCurrencyPipe],
  template: `
    <div class="khata-container">
      <!-- Page Header -->
      <header class="page-header">
        <div class="header-titles">
          <div class="title-row">
            <div class="header-icon-box">📖</div>
            <div>
              <h1 class="page-title">Local Khata & Len-Den (कच्चा-पक्का हिसाब)</h1>
              <p class="subtitle">Complete Passbooks, Net Balance vs Accounts, and Shopping/Trip Expense Reconciliation</p>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <button type="button" class="btn-sheet-import" (click)="importSampleSheetData()" [disabled]="loading()">
            <span class="btn-emoji">⚡</span>
            <span>Import My Sheet Data</span>
          </button>
          <button type="button" class="btn-danger-outline" (click)="confirmClearAllData()" [disabled]="loading()" title="Clear all local khata data to start fresh">
            <span class="btn-emoji">🗑️</span>
            <span>Reset All</span>
          </button>
          @if (activeTab() === 'parties') {
            <button type="button" class="btn-primary" (click)="openNewPartyModal()">
              <span class="btn-plus">+</span> New Person Khata
            </button>
          } @else if (activeTab() === 'liquidity') {
            <button type="button" class="btn-primary" (click)="openAddAccountModal()">
              <span class="btn-plus">+</span> Add Bank/Share A/c
            </button>
          } @else if (activeTab() === 'events') {
            <button type="button" class="btn-primary" (click)="openNewEventModal()">
              <span class="btn-plus">+</span> New Shopping Trip
            </button>
          }
        </div>
      </header>

      <!-- Main Navigation Tabs -->
      <nav class="nav-tabs">
        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'parties'"
          (click)="setActiveTab('parties')">
          <span class="tab-icon">👥</span>
          <span class="tab-label">Party Ledgers (व्यक्तिगत खाते)</span>
          <span class="tab-badge">{{ parties().length }}</span>
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'liquidity'"
          (click)="setActiveTab('liquidity')">
          <span class="tab-icon">🏦</span>
          <span class="tab-label">Settlement & Liquidity (Image 1 Engine)</span>
          @if (liquidityData(); as liq) {
            <span class="tab-badge warning">In-Hand ₹{{ liq.finalInHand | number:'1.0-0' }}</span>
          }
        </button>

        <button
          type="button"
          class="tab-btn"
          [class.active]="activeTab() === 'events'"
          (click)="setActiveTab('events')">
          <span class="tab-icon">🛍️</span>
          <span class="tab-label">Shopping & Local Kharcha (Image 2)</span>
          <span class="tab-badge">{{ events().length }}</span>
        </button>
      </nav>

      <!-- Alert Notification Banner -->
      @if (alertMessage()) {
        <div class="alert-banner" [class.success]="alertType() === 'success'" [class.error]="alertType() === 'error'">
          <div class="alert-left">
            <span>{{ alertType() === 'success' ? '✅' : '⚠️' }}</span>
            <span>{{ alertMessage() }}</span>
          </div>
          <button type="button" class="close-alert" (click)="alertMessage.set(null)">✕</button>
        </div>
      }

      <!-- TAB 1: PARTIES & PASSBOOKS -->
      @if (activeTab() === 'parties') {
        <section class="tab-content">
          <!-- Summary Cards Row -->
          <div class="summary-cards">
            <div class="card stat-card payable-card">
              <div class="card-icon icon-red">🔴</div>
              <div class="card-info">
                <span class="card-label">Total Dena Hai (Payable)</span>
                <span class="card-amount text-danger">{{ summary()?.totalDenaHai || 0 | inrCurrency }}</span>
                <span class="card-sub">Lenders & family debts to repay</span>
              </div>
            </div>

            <div class="card stat-card receivable-card">
              <div class="card-icon icon-green">🟢</div>
              <div class="card-info">
                <span class="card-label">Total Lena Hai (Receivable)</span>
                <span class="card-amount text-success">{{ summary()?.totalLenaHai || 0 | inrCurrency }}</span>
                <span class="card-sub">Money lent to others to collect</span>
              </div>
            </div>

            <div class="card stat-card net-card">
              <div class="card-icon icon-blue">⚖️</div>
              <div class="card-info">
                <span class="card-label">Net Balance Position</span>
                <span class="card-amount" [class.text-success]="(summary()?.netBalance || 0) >= 0" [class.text-danger]="(summary()?.netBalance || 0) < 0">
                  {{ summary()?.netBalance || 0 | inrCurrency }}
                </span>
                <span class="card-sub">{{ (summary()?.netBalance || 0) >= 0 ? 'Surplus (Net Receivable)' : 'Net Debt to Clear' }}</span>
              </div>
            </div>
          </div>

          <!-- Filter & Search Toolbar -->
          <div class="toolbar-card card">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input
                type="text"
                class="search-input"
                placeholder="Search person by name, phone, or remark..."
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearchChange($event)" />
            </div>

            <div class="filter-pills">
              <button
                type="button"
                class="pill-btn"
                [class.active]="partyFilter() === 'ALL'"
                (click)="setPartyFilter('ALL')">
                All Ledgers ({{ parties().length }})
              </button>
              <button
                type="button"
                class="pill-btn pill-danger"
                [class.active]="partyFilter() === 'Payable'"
                (click)="setPartyFilter('Payable')">
                🔴 Dena Hai (Payable)
              </button>
              <button
                type="button"
                class="pill-btn pill-success"
                [class.active]="partyFilter() === 'Receivable'"
                (click)="setPartyFilter('Receivable')">
                🟢 Lena Hai (Receivable)
              </button>
            </div>
          </div>

          <!-- Parties Grid -->
          @if (loading() && parties().length === 0) {
            <div class="empty-state card">
              <div class="spinner"></div>
              <p>Loading personal ledgers...</p>
            </div>
          } @else if (filteredParties().length === 0) {
            <div class="empty-state card">
              <div class="empty-icon">📂</div>
              <h3>No Party Accounts Found</h3>
              <p>Create your first person's khata or click "Import My Sheet Data" above to load Junaid, Mosin, and other loans.</p>
              <button type="button" class="btn-primary" (click)="openNewPartyModal()">+ Create Khata</button>
            </div>
          } @else {
            <div class="parties-grid">
              @for (party of filteredParties(); track party.id) {
                <div class="party-card card" (click)="openPartyPassbook(party.id)">
                  <div class="party-card-top">
                    <div class="party-avatar" [class.payable]="party.type === 'Payable'" [class.receivable]="party.type === 'Receivable'">
                      {{ party.name.substring(0, 2).toUpperCase() }}
                    </div>
                    <div class="party-meta">
                      <div class="party-name-row">
                        <h3 class="party-name">{{ party.name }}</h3>
                        <span class="badge" [class.badge-danger]="party.type === 'Payable'" [class.badge-success]="party.type === 'Receivable'">
                          {{ party.type === 'Payable' ? 'Dena Hai' : 'Lena Hai' }}
                        </span>
                      </div>
                      <span class="party-category">{{ party.category || 'General' }} • {{ party.entriesCount }} transactions</span>
                    </div>

                    <!-- Quick Party Edit & Delete Action Menu -->
                    <div class="party-card-actions" (click)="$event.stopPropagation()">
                      <button type="button" class="btn-action-icon" (click)="openEditPartyModal(party)" title="Edit Person Details">✏️</button>
                      <button type="button" class="btn-action-icon btn-del-icon" (click)="deleteParty(party)" title="Delete Khata">🗑️</button>
                    </div>
                  </div>

                  <div class="party-balance-row">
                    <div class="balance-left">
                      <span class="balance-label">Net Pending Amount</span>
                      <span class="balance-value" [class.text-danger]="party.type === 'Payable'" [class.text-success]="party.type === 'Receivable'">
                        {{ party.netPending | inrCurrency }}
                      </span>
                    </div>
                    <div class="balance-action">
                      <button type="button" class="btn-open-passbook">Passbook ➔</button>
                    </div>
                  </div>

                  <div class="party-mini-ledger">
                    <div class="mini-col">
                      <span class="mini-lbl">IN (Mila/Received)</span>
                      <span class="mini-val text-success">{{ party.totalIn | inrCurrency }}</span>
                    </div>
                    <div class="mini-col divider"></div>
                    <div class="mini-col">
                      <span class="mini-lbl">OUT (Diya/Spent)</span>
                      <span class="mini-val text-danger">{{ party.totalOut | inrCurrency }}</span>
                    </div>
                  </div>

                  @if (party.notes) {
                    <div class="party-note-preview">
                      <span>📝 {{ party.notes }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </section>
      }

      <!-- TAB 2: LIQUIDITY HUB & SETTLEMENT ENGINE (Matches Image 1) -->
      @if (activeTab() === 'liquidity') {
        <section class="tab-content">
          @if (liquidityData(); as liq) {
            <!-- Hero Settlement Banner matching Image 1 Calculations -->
            <div class="settlement-hero card">
              <div class="hero-top">
                <div class="hero-badge-tag">Image 1 • Liquidity Reconciliation Hub</div>
                <h2 class="hero-title">Live Settlement & Cash In-Hand ("Jajuke")</h2>
                <p class="hero-desc">Formula: Total Available Balance (Bank + Share) − Total Dena Hai − Buffer Adjustments = Final In-Hand Cash</p>
              </div>

              <div class="formula-pipeline">
                <div class="pipeline-step">
                  <span class="step-lbl">1. Available Funds</span>
                  <span class="step-val text-primary">{{ liq.totalBalance | inrCurrency }}</span>
                  <span class="step-sub">Bank ({{ liq.totalBank | inrCurrency }}) + Share ({{ liq.totalShare | inrCurrency }})</span>
                </div>
                <div class="pipeline-operator">−</div>
                <div class="pipeline-step">
                  <span class="step-lbl">2. Total Dena Hai</span>
                  <span class="step-val text-danger">{{ liq.totalDenaHai | inrCurrency }}</span>
                  <span class="step-sub">All active payable accounts</span>
                </div>
                <div class="pipeline-operator">=</div>
                <div class="pipeline-step">
                  <span class="step-lbl">3. Baki A/C Surplus</span>
                  <span class="step-val text-warning">{{ liq.bakiAc | inrCurrency }}</span>
                  <span class="step-sub">Surplus before deductions</span>
                </div>
                <div class="pipeline-operator">−</div>
                <div class="pipeline-step">
                  <span class="step-lbl">4. Adjustments</span>
                  <div class="adj-input-wrapper">
                    <span>₹</span>
                    <input
                      type="number"
                      class="adj-input"
                      [ngModel]="userAdjustment()"
                      (ngModelChange)="onAdjustmentChange($event)"
                      placeholder="e.g. 27800" />
                  </div>
                  <span class="step-sub">Misc / Buffer deductions</span>
                </div>
                <div class="pipeline-operator">=</div>
                <div class="pipeline-step highlight">
                  <span class="step-lbl">5. Final In-Hand (Jajuke)</span>
                  <span class="step-val text-final-success">{{ liq.finalInHand | inrCurrency }}</span>
                  <span class="step-sub">Net clear cash in your hand</span>
                </div>
              </div>
            </div>

            <!-- Two Column Comparison Grid -->
            <div class="liquidity-two-col">
              <!-- Left Column: Pending Debts Breakdown (Dena Hai) -->
              <div class="col-card card">
                <div class="col-header">
                  <div>
                    <h3>🔴 Total Dena Hai Breakdown</h3>
                    <span class="col-subtitle">People you owe money to (Sum: {{ liq.totalDenaHai | inrCurrency }})</span>
                  </div>
                </div>

                <div class="debts-list">
                  @for (debt of liq.debtsBreakdown; track debt.id) {
                    <div class="debt-row">
                      <div class="debt-info">
                        <span class="debt-avatar">👤</span>
                        <div>
                          <span class="debt-name">{{ debt.name }}</span>
                          <span class="debt-tag">{{ debt.type === 'Payable' ? 'Dena Hai' : 'Lena Hai' }}</span>
                        </div>
                      </div>
                      <span class="debt-amount text-danger font-mono">{{ debt.pending | inrCurrency }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Right Column: Bank Accounts & Share Portfolios -->
              <div class="col-card card">
                <div class="col-header">
                  <div>
                    <h3>🏦 Available Accounts & Wallets</h3>
                    <span class="col-subtitle">Liquid bank balances & stock accounts (Sum: {{ liq.totalBalance | inrCurrency }})</span>
                  </div>
                  <button type="button" class="btn-sm-primary" (click)="openAddAccountModal()">+ Add Account</button>
                </div>

                <div class="accounts-list">
                  @for (acc of liq.accounts; track acc.id) {
                    <div class="account-row">
                      <div class="account-left">
                        <span class="acc-icon-box">{{ acc.accountType === 'Share' ? '📈' : (acc.accountType === 'Bank' ? '🏦' : '💵') }}</span>
                        <div>
                          <span class="acc-name">{{ acc.accountName }}</span>
                          <span class="acc-type">{{ acc.accountType }} @if (acc.notes) { • {{ acc.notes }} }</span>
                        </div>
                      </div>
                      <div class="account-right">
                        <span class="acc-balance font-mono">{{ acc.balance | inrCurrency }}</span>
                        <button type="button" class="btn-action-icon" (click)="openEditAccountModal(acc)" title="Edit account">✏️</button>
                        <button type="button" class="btn-action-icon btn-del-icon" (click)="deleteLiquidityAccount(acc.id)" title="Delete account">🗑️</button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        </section>
      }

      <!-- TAB 3: SHOPPING & LOCAL KHARCHA (Matches Image 2) -->
      @if (activeTab() === 'events') {
        <section class="tab-content">
          <!-- Event Selector Bar -->
          <div class="event-selector-bar card">
            <div class="selector-left">
              <span class="sel-label">Active Trip / Event:</span>
              <div class="sel-control-wrapper">
                <select class="event-dropdown" [ngModel]="selectedEventId()" (ngModelChange)="selectEvent($event)">
                  @for (ev of events(); track ev.id) {
                    <option [value]="ev.id">{{ ev.title }} ({{ ev.date | date:'dd MMM yyyy' }})</option>
                  }
                </select>
              </div>
              @if (currentEvent(); as ev) {
                <div class="trip-quick-actions">
                  <button type="button" class="btn-trip-action" (click)="openEditEventModal(ev)" title="Edit Trip Details">
                    <span>✏️</span> Edit Trip
                  </button>
                  <button type="button" class="btn-trip-action btn-trip-del" (click)="deleteCurrentEvent()" title="Delete Trip">
                    <span>🗑️</span> Delete Trip
                  </button>
                </div>
              }
            </div>
            <button type="button" class="btn-primary" (click)="openNewEventModal()">
              <span class="btn-plus">+</span> Create New Shopping Trip
            </button>
          </div>

          @if (currentEvent(); as ev) {
            <!-- Event Hero Totals matching Image 2 (Responsive Wide-Screen Layout) -->
            <div class="event-hero-grid">
              <!-- Card 1: Funds Pooled -->
              <div class="card stat-card fund-card">
                <div class="card-icon icon-blue">💰</div>
                <div class="card-info">
                  <span class="card-label">Funds Pooled (Mila)</span>
                  <span class="card-amount text-primary">{{ ev.totalFunds | inrCurrency }}</span>
                  <span class="card-sub">{{ ev.funds.length }} Contributors (Abba, Aadil)</span>
                </div>
              </div>

              <!-- Card 2: Shopping Items -->
              <div class="card stat-card shopping-card">
                <div class="card-icon icon-purple">👗</div>
                <div class="card-info">
                  <span class="card-label">Shopping Items Total</span>
                  <span class="card-amount text-danger">{{ ev.shoppingTotal | inrCurrency }}</span>
                  <span class="card-sub">Dresses, shirts, fabrics</span>
                </div>
              </div>

              <!-- Card 3: Local Pocket Kharch -->
              <div class="card stat-card petty-card">
                <div class="card-icon icon-orange">🚕</div>
                <div class="card-info">
                  <span class="card-label">Local Pocket Kharcha</span>
                  <span class="card-amount text-danger">{{ ev.localKharchTotal | inrCurrency }}</span>
                  <span class="card-sub">Train, nasta, hotel, auto</span>
                </div>
              </div>

              <!-- Card 4: Cash Given -->
              <div class="card stat-card cash-card">
                <div class="card-icon icon-amber">🤝</div>
                <div class="card-info">
                  <span class="card-label">Cash Given (Handover)</span>
                  <span class="card-amount text-danger">{{ ev.cashHandoverTotal | inrCurrency }}</span>
                  <span class="card-sub">Handed to Bushra / others</span>
                </div>
              </div>

              <!-- Card 5: Grand Total Spent -->
              <div class="card stat-card total-spent-card">
                <div class="card-icon icon-dark">🧾</div>
                <div class="card-info">
                  <span class="card-label">Grand Total Spent</span>
                  <span class="card-amount text-warning">{{ ev.totalSpent | inrCurrency }}</span>
                  <span class="card-sub">Shopping + Local + Handover</span>
                </div>
              </div>

              <!-- Card 6: Remaining Cash In-Hand -->
              <div class="card stat-card rem-card">
                <div class="card-icon icon-emerald">✨</div>
                <div class="card-info">
                  <span class="card-label">Remaining In-Hand Cash</span>
                  <span class="card-amount" [class.text-success]="ev.remainingBalance >= 0" [class.text-danger]="ev.remainingBalance < 0">
                    {{ ev.remainingBalance | inrCurrency }}
                  </span>
                  <span class="card-sub">{{ ev.remainingBalance >= 0 ? 'Surplus Cash Left' : 'Shortfall / Overspent' }}</span>
                </div>
              </div>
            </div>

            <!-- 3 Column Event Breakdown (Full Fluid Width for 25", 32", 55" Screens) -->
            <div class="event-details-grid">
              <!-- Column 1: Itemized Shopping List -->
              <div class="col-card card shopping-column">
                <div class="col-header">
                  <div class="col-title-group">
                    <div class="col-title-badge icon-purple">🛍️</div>
                    <div>
                      <h3 class="col-main-title">Itemized Shopping List</h3>
                      <span class="col-total-chip text-danger">{{ ev.shoppingTotal | inrCurrency }}</span>
                    </div>
                  </div>
                  <button type="button" class="btn-sm-primary" (click)="openAddItemModal('Shopping')">+ Add Item</button>
                </div>

                <div class="items-table-wrapper">
                  <table class="khata-table">
                    <thead>
                      <tr>
                        <th style="width: 45%;">Item Description</th>
                        <th style="width: 20%;">For</th>
                        <th style="width: 20%;" class="text-right">Amount</th>
                        <th style="width: 15%;" class="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of getItemsByType(ev, 'Shopping'); track item.id) {
                        <tr class="table-row">
                          <td class="item-name-cell">
                            <strong>{{ item.description }}</strong>
                          </td>
                          <td>
                            <span class="tag-beneficiary">{{ item.beneficiary || 'Family' }}</span>
                          </td>
                          <td class="text-right font-mono font-bold">{{ item.amount | inrCurrency }}</td>
                          <td class="text-center actions-cell">
                            <button type="button" class="btn-table-action" (click)="openEditItemModal(item)" title="Edit Item">✏️</button>
                            <button type="button" class="btn-table-action btn-del" (click)="deleteEventItem(item.id)" title="Delete Item">🗑️</button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Column 2: Local Pocket Kharcha -->
              <div class="col-card card petty-column">
                <div class="col-header">
                  <div class="col-title-group">
                    <div class="col-title-badge icon-orange">🚕</div>
                    <div>
                      <h3 class="col-main-title">Local Kharcha & Daily Pocket</h3>
                      <span class="col-total-chip text-danger">{{ ev.localKharchTotal | inrCurrency }}</span>
                    </div>
                  </div>
                  <button type="button" class="btn-sm-primary" (click)="openAddItemModal('LocalKharch')">+ Quick Kharch</button>
                </div>

                <div class="items-table-wrapper">
                  <table class="khata-table">
                    <thead>
                      <tr>
                        <th style="width: 60%;">Expense Details</th>
                        <th style="width: 25%;" class="text-right">Amount</th>
                        <th style="width: 15%;" class="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of getItemsByType(ev, 'LocalKharch'); track item.id) {
                        <tr class="table-row">
                          <td class="item-name-cell">{{ item.description }}</td>
                          <td class="text-right font-mono font-bold text-danger">{{ item.amount | inrCurrency }}</td>
                          <td class="text-center actions-cell">
                            <button type="button" class="btn-table-action" (click)="openEditItemModal(item)" title="Edit Item">✏️</button>
                            <button type="button" class="btn-table-action btn-del" (click)="deleteEventItem(item.id)" title="Delete Item">🗑️</button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Column 3: Fund Pool & Cash Handover -->
              <div class="col-card card fund-column">
                <div class="col-header">
                  <div class="col-title-group">
                    <div class="col-title-badge icon-emerald">💵</div>
                    <div>
                      <h3 class="col-main-title">Contributors & Handover</h3>
                      <span class="col-total-chip text-primary">Pool: {{ ev.totalFunds | inrCurrency }}</span>
                    </div>
                  </div>
                  <button type="button" class="btn-sm-primary" (click)="openAddFundModal()">+ Add Contributor</button>
                </div>

                <!-- Section: Contributors -->
                <div class="sub-section">
                  <div class="sub-header-row">
                    <h4 class="sub-heading">Fund Contributors (Paisa Kisne Dala)</h4>
                    <span class="sub-badge">{{ ev.funds.length }} People</span>
                  </div>
                  <div class="contributors-list">
                    @for (fund of ev.funds; track fund.id) {
                      <div class="contributor-item">
                        <div class="contributor-left">
                          <span class="c-avatar">👤</span>
                          <span class="c-name">{{ fund.contributorName }}</span>
                        </div>
                        <div class="contributor-right">
                          <span class="c-amt text-success font-mono font-bold">{{ fund.amount | inrCurrency }}</span>
                          <button type="button" class="btn-table-action" (click)="openEditFundModal(fund)" title="Edit Contributor">✏️</button>
                          <button type="button" class="btn-table-action btn-del" (click)="deleteFund(fund.id)" title="Delete Contributor">🗑️</button>
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Section: Handover -->
                <div class="sub-section mt-4">
                  <div class="sub-header-row">
                    <h4 class="sub-heading">Direct Handover (Cash Given)</h4>
                    <button type="button" class="btn-xs-link" (click)="openAddItemModal('CashHandover')">+ Add Handover</button>
                  </div>
                  <div class="contributors-list">
                    @for (item of getItemsByType(ev, 'CashHandover'); track item.id) {
                      <div class="contributor-item handover">
                        <div class="contributor-left">
                          <span class="c-avatar handover-avatar">🤝</span>
                          <div>
                            <span class="c-name">{{ item.description }}</span>
                            <span class="c-sub">{{ item.beneficiary || 'Cash Given' }}</span>
                          </div>
                        </div>
                        <div class="contributor-right">
                          <span class="c-amt text-danger font-mono font-bold">{{ item.amount | inrCurrency }}</span>
                          <button type="button" class="btn-table-action" (click)="openEditItemModal(item)" title="Edit Handover">✏️</button>
                          <button type="button" class="btn-table-action btn-del" (click)="deleteEventItem(item.id)" title="Delete Handover">🗑️</button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </section>
      }

      <!-- MODAL: PARTY PASSBOOK DRAWER / MODAL -->
      @if (activePartyDetail(); as p) {
        <div class="modal-overlay" (click)="closePartyPassbook()">
          <div class="passbook-drawer" (click)="$event.stopPropagation()">
            <!-- Drawer Header -->
            <div class="drawer-header">
              <div class="party-drawer-title">
                <div class="party-avatar-lg" [class.payable]="p.type === 'Payable'" [class.receivable]="p.type === 'Receivable'">
                  {{ p.name.substring(0, 2).toUpperCase() }}
                </div>
                <div>
                  <div class="flex-center gap-2">
                    <h2 class="drawer-name">{{ p.name }}</h2>
                    <button type="button" class="btn-action-icon" (click)="openEditPartyModal(p)" title="Edit Person Details">✏️</button>
                    <button type="button" class="btn-action-icon btn-del-icon" (click)="deleteParty(p)" title="Delete Khata">🗑️</button>
                  </div>
                  <span class="drawer-phone">📞 {{ p.phone || 'No phone' }} • {{ p.category || 'Family' }}</span>
                </div>
              </div>

              <div class="drawer-right-actions">
                <button type="button" class="btn-whatsapp" (click)="shareWhatsApp(p)">
                  <span>💬</span> WhatsApp Statement
                </button>
                <button type="button" class="btn-close-drawer" (click)="closePartyPassbook()">✕</button>
              </div>
            </div>

            <!-- Running Balance Hero -->
            <div class="passbook-balance-banner" [class.bg-danger-soft]="p.type === 'Payable'" [class.bg-success-soft]="p.type === 'Receivable'">
              <div class="banner-stat">
                <span class="banner-lbl">Total IN (Mila)</span>
                <span class="banner-amt text-success">{{ p.totalIn | inrCurrency }}</span>
              </div>
              <div class="banner-divider">−</div>
              <div class="banner-stat">
                <span class="banner-lbl">Total OUT (Diya)</span>
                <span class="banner-amt text-danger">{{ p.totalOut | inrCurrency }}</span>
              </div>
              <div class="banner-divider">=</div>
              <div class="banner-stat highlight">
                <span class="banner-lbl">Pending Net {{ p.type === 'Payable' ? 'Dena Hai' : 'Lena Hai' }}</span>
                <span class="banner-amt" [class.text-danger]="p.type === 'Payable'" [class.text-success]="p.type === 'Receivable'">
                  {{ p.netPending | inrCurrency }}
                </span>
              </div>
            </div>

            <!-- Two Fast Action Buttons: IN (Green) vs OUT (Red) -->
            <div class="entry-actions-row">
              <button
                type="button"
                class="btn-entry-in"
                [class.active]="entryFormType() === 'IN' && !editingEntryId()"
                (click)="toggleEntryForm('IN')">
                <span class="btn-icon">🟢</span>
                <span class="btn-text">+ IN (Mila / Usne Diya)</span>
              </button>

              <button
                type="button"
                class="btn-entry-out"
                [class.active]="entryFormType() === 'OUT' && !editingEntryId()"
                (click)="toggleEntryForm('OUT')">
                <span class="btn-icon">🔴</span>
                <span class="btn-text">− OUT (Diya / Kharch Kiya)</span>
              </button>
            </div>

            <!-- Quick Add / Edit Entry Form Inline -->
            @if (entryFormType()) {
              <div class="quick-entry-card card" [class.border-success]="entryFormType() === 'IN'" [class.border-danger]="entryFormType() === 'OUT'">
                <div class="quick-form-title">
                  <span [class.text-success]="entryFormType() === 'IN'" [class.text-danger]="entryFormType() === 'OUT'">
                    {{ editingEntryId() ? '✏️ Edit Transaction Entry' : (entryFormType() === 'IN' ? '🟢 Add IN Entry (Paisa Aaya / Mila)' : '🔴 Add OUT Entry (Paisa Diya / Kharcha Kiya)') }}
                  </span>
                  <button type="button" class="btn-close-sm" (click)="cancelEntryForm()">✕</button>
                </div>

                <div class="form-grid">
                  <div class="form-group">
                    <label>Amount (₹) *</label>
                    <input
                      type="number"
                      class="form-control text-lg font-bold"
                      placeholder="0.00"
                      [(ngModel)]="newEntryAmount" />
                    <!-- Quick Amount Chips -->
                    <div class="quick-chips">
                      <button type="button" (click)="newEntryAmount = 500">+500</button>
                      <button type="button" (click)="newEntryAmount = 1000">+1k</button>
                      <button type="button" (click)="newEntryAmount = 5000">+5k</button>
                      <button type="button" (click)="newEntryAmount = 50000">+50k</button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Category Tag</label>
                    <select class="form-control" [(ngModel)]="newEntryCategory">
                      <option value="Medical">Medical (दवाखाना)</option>
                      <option value="Wedding">Wedding / Shadi</option>
                      <option value="A/c Transfer">A/c Bank Transfer</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Cash">Cash Handover</option>
                      <option value="Advance">Advance</option>
                      <option value="Food">Hotel / Food</option>
                      <option value="Fund Received">Fund Received</option>
                      <option value="General">General / Other</option>
                    </select>
                  </div>

                  <div class="form-group full-width">
                    <label>Remark / Note (e.g. 'medical', 'A/c junaid', 'Shadi muskan')</label>
                    <input
                      type="text"
                      class="form-control"
                      placeholder="Enter description or purpose..."
                      [(ngModel)]="newEntryRemark" />
                  </div>
                </div>

                <div class="form-actions">
                  <button type="button" class="btn-secondary" (click)="cancelEntryForm()">Cancel</button>
                  <button type="button" class="btn-primary" (click)="submitEntry(p.id)">
                    {{ editingEntryId() ? 'Update Entry' : ('Save ' + entryFormType() + ' Entry') }}
                  </button>
                </div>
              </div>
            }

            <!-- Passbook Entries Ledger Table -->
            <div class="passbook-ledger-wrapper">
              <div class="ledger-header-title">
                <h3>Transaction Statement (खाता विवरणी)</h3>
                <span class="ledger-count">{{ p.entries.length }} records</span>
              </div>

              @if (p.entries.length === 0) {
                <div class="empty-state">
                  <p>No transactions yet. Click "+ IN" or "− OUT" to add your first transaction.</p>
                </div>
              } @else {
                <table class="ledger-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Category & Remark</th>
                      <th class="text-right">Amount</th>
                      <th class="text-right">Running Balance</th>
                      <th class="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (e of p.entries; track e.id) {
                      <tr>
                        <td class="font-mono text-muted">{{ e.date | date:'dd MMM yyyy' }}</td>
                        <td>
                          <span class="badge" [class.badge-success]="e.entryType === 'IN'" [class.badge-danger]="e.entryType === 'OUT'">
                            {{ e.entryType === 'IN' ? '+ IN' : '− OUT' }}
                          </span>
                        </td>
                        <td>
                          <div class="entry-desc">
                            <span class="entry-cat">{{ e.category || 'General' }}</span>
                            @if (e.remark) {
                              <span class="entry-rem">{{ e.remark }}</span>
                            }
                          </div>
                        </td>
                        <td class="text-right font-mono font-bold" [class.text-success]="e.entryType === 'IN'" [class.text-danger]="e.entryType === 'OUT'">
                          {{ e.entryType === 'IN' ? '+' : '−' }} {{ e.amount | inrCurrency }}
                        </td>
                        <td class="text-right font-mono font-bold">
                          {{ e.runningBalance | inrCurrency }}
                        </td>
                        <td class="text-center actions-cell">
                          <button type="button" class="btn-table-action" (click)="openEditEntry(e)" title="Edit entry">✏️</button>
                          <button type="button" class="btn-table-action btn-del" (click)="deleteEntry(e.id, p.id)" title="Delete entry">🗑️</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          </div>
        </div>
      }

      <!-- MODAL: CREATE / EDIT PARTY -->
      @if (showCreatePartyModal() || editingPartyId()) {
        <div class="modal-overlay" (click)="closePartyModal()">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingPartyId() ? 'Edit Person Khata (खाता बदलें)' : 'Create New Person Khata (नया खाता)' }}</h3>
              <button type="button" class="btn-close-sm" (click)="closePartyModal()">✕</button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label>Person Name *</label>
                <input type="text" class="form-control" placeholder="e.g. Junaid Bhai, Mosin, Shahid Khan" [(ngModel)]="newPartyName" />
              </div>

              <div class="form-group">
                <label>Mobile Number (optional)</label>
                <input type="tel" class="form-control" placeholder="e.g. 9876543210" [(ngModel)]="newPartyPhone" />
              </div>

              <div class="form-group">
                <label>Khata Direction *</label>
                <div class="direction-select">
                  <label class="radio-label" [class.selected]="newPartyType === 'Payable'">
                    <input type="radio" name="ptype" value="Payable" [(ngModel)]="newPartyType" />
                    <span>🔴 Dena Hai (I borrowed / I have to pay)</span>
                  </label>
                  <label class="radio-label" [class.selected]="newPartyType === 'Receivable'">
                    <input type="radio" name="ptype" value="Receivable" [(ngModel)]="newPartyType" />
                    <span>🟢 Lena Hai (I lent / They have to pay me)</span>
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label>Category</label>
                <input type="text" class="form-control" placeholder="e.g. Family, Friend, Vendor, Business" [(ngModel)]="newPartyCategory" />
              </div>

              @if (!editingPartyId()) {
                <div class="form-group">
                  <label>Starting Amount (optional)</label>
                  <input type="number" class="form-control" placeholder="0.00" [(ngModel)]="newPartyInitialAmount" />
                </div>
              }

              <div class="form-group">
                <label>Notes</label>
                <textarea class="form-control" rows="2" placeholder="Any reminder or background..." [(ngModel)]="newPartyNotes"></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closePartyModal()">Cancel</button>
              <button type="button" class="btn-primary" (click)="submitPartyForm()">
                {{ editingPartyId() ? 'Update Khata' : 'Create Khata' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: ADD / EDIT LIQUIDITY ACCOUNT -->
      @if (showAddAccountModal()) {
        <div class="modal-overlay" (click)="showAddAccountModal.set(false)">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingAccountId() ? 'Edit Bank / Share Account' : 'Add Bank / Share Account' }}</h3>
              <button type="button" class="btn-close-sm" (click)="showAddAccountModal.set(false)">✕</button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label>Account Name *</label>
                <input type="text" class="form-control" placeholder="e.g. Bank A/C 1, Share Trading Smallcap, Cash" [(ngModel)]="newAccountName" />
              </div>

              <div class="form-group">
                <label>Account Type</label>
                <select class="form-control" [(ngModel)]="newAccountType">
                  <option value="Bank">Bank Account</option>
                  <option value="Share">Share Trading / Demat</option>
                  <option value="Cash">Cash in Hand</option>
                  <option value="Other">Other Asset</option>
                </select>
              </div>

              <div class="form-group">
                <label>Current Available Balance (₹) *</label>
                <input type="number" class="form-control text-lg font-bold" placeholder="0.00" [(ngModel)]="newAccountBalance" />
              </div>

              <div class="form-group">
                <label>Notes</label>
                <input type="text" class="form-control" placeholder="Optional remark..." [(ngModel)]="newAccountNotes" />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="showAddAccountModal.set(false)">Cancel</button>
              <button type="button" class="btn-primary" (click)="submitAddAccount()">Save Account</button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: ADD / EDIT EVENT ITEM -->
      @if (showAddItemModal()) {
        <div class="modal-overlay" (click)="showAddItemModal.set(false)">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingItemId() ? 'Edit Expense Item' : ('Add ' + eventItemType + ' Expense') }}</h3>
              <button type="button" class="btn-close-sm" (click)="showAddItemModal.set(false)">✕</button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label>Item Type</label>
                <select class="form-control" [(ngModel)]="eventItemType">
                  <option value="Shopping">Shopping Item</option>
                  <option value="LocalKharch">Local Pocket Kharcha (Train/Food)</option>
                  <option value="CashHandover">Cash Handover</option>
                </select>
              </div>

              <div class="form-group">
                <label>Description *</label>
                <input type="text" class="form-control" placeholder="e.g. Burka, Train ticket, Hotel khana, Bushra ko diya" [(ngModel)]="newItemDesc" />
              </div>

              <div class="form-group">
                <label>Amount (₹) *</label>
                <input type="number" class="form-control text-lg font-bold" placeholder="0.00" [(ngModel)]="newItemAmount" />
              </div>

              <div class="form-group">
                <label>Beneficiary / For Whom</label>
                <input type="text" class="form-control" placeholder="e.g. Aadil, Abba, Bushra, Family" [(ngModel)]="newItemBeneficiary" />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="showAddItemModal.set(false)">Cancel</button>
              <button type="button" class="btn-primary" (click)="submitEventItem()">
                {{ editingItemId() ? 'Update Expense' : 'Save Expense' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: ADD / EDIT EVENT FUND -->
      @if (showAddFundModal()) {
        <div class="modal-overlay" (click)="showAddFundModal.set(false)">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingFundId() ? 'Edit Fund Contributor' : 'Add Fund Contributor' }}</h3>
              <button type="button" class="btn-close-sm" (click)="showAddFundModal.set(false)">✕</button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label>Contributor Name *</label>
                <input type="text" class="form-control" placeholder="e.g. Abba ne dale, Aadil Khan" [(ngModel)]="newFundContributor" />
              </div>

              <div class="form-group">
                <label>Amount (₹) *</label>
                <input type="number" class="form-control text-lg font-bold" placeholder="0.00" [(ngModel)]="newFundAmount" />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="showAddFundModal.set(false)">Cancel</button>
              <button type="button" class="btn-primary" (click)="submitEventFund()">
                {{ editingFundId() ? 'Update Contributor' : 'Add Contribution' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL: CREATE / EDIT EVENT -->
      @if (showCreateEventModal() || editingEventId()) {
        <div class="modal-overlay" (click)="closeEventModal()">
          <div class="modal-card card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingEventId() ? 'Edit Shopping / Trip Project' : 'Create New Shopping / Trip Project' }}</h3>
              <button type="button" class="btn-close-sm" (click)="closeEventModal()">✕</button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label>Trip / Event Title *</label>
                <input type="text" class="form-control" placeholder="e.g. Family Wedding & Pune Shopping Trip" [(ngModel)]="newEventTitle" />
              </div>

              <div class="form-group">
                <label>Notes / Purpose</label>
                <textarea class="form-control" rows="2" placeholder="Details about this trip or shopping..." [(ngModel)]="newEventNotes"></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeEventModal()">Cancel</button>
              <button type="button" class="btn-primary" (click)="submitEventForm()">
                {{ editingEventId() ? 'Update Project' : 'Create Project' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Fluid Container: Expands cleanly across 24", 25", 27", 32" monitors, and 55" TV */
    .khata-container {
      width: 100%;
      max-width: 100%;
      padding: 0.75rem 1rem 3rem;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.25rem;
      background: var(--bg-card, #ffffff);
      padding: 1.25rem 1.75rem;
      border-radius: 1rem;
      border: 1px solid var(--border-color, #e2e8f0);
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    }
    .header-titles .title-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .header-icon-box {
      font-size: 2.2rem;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.85rem;
      flex-shrink: 0;
    }
    .page-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--text-primary, #0f172a);
      margin: 0;
      line-height: 1.2;
      letter-spacing: -0.01em;
    }
    .subtitle {
      font-size: 0.875rem;
      color: var(--text-secondary, #64748b);
      margin: 0.35rem 0 0;
    }
    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      flex-wrap: wrap;
    }

    /* Navigation Tabs */
    .nav-tabs {
      display: flex;
      gap: 0.75rem;
      border-bottom: 2px solid var(--border-color, #e2e8f0);
      padding-bottom: 0.25rem;
      overflow-x: auto;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.85rem 1.5rem;
      border: none;
      background: transparent;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-secondary, #64748b);
      border-radius: 0.75rem 0.75rem 0 0;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .tab-btn:hover {
      color: var(--text-primary, #0f172a);
      background: rgba(0,0,0,0.03);
    }
    .tab-btn.active {
      color: #4f46e5;
      background: var(--bg-card, #ffffff);
      border-bottom: 3px solid #4f46e5;
      margin-bottom: -0.25rem;
      box-shadow: 0 -2px 6px rgba(79, 70, 229, 0.06);
    }
    .tab-icon {
      font-size: 1.15rem;
    }
    .tab-badge {
      font-size: 0.75rem;
      padding: 0.2rem 0.6rem;
      border-radius: 1rem;
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
    }
    .tab-badge.warning {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    /* Alert Banner */
    .alert-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.9rem 1.5rem;
      border-radius: 0.75rem;
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 600;
      border: 1px solid #bae6fd;
    }
    .alert-banner.success { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
    .alert-banner.error { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }
    .alert-left { display: flex; align-items: center; gap: 0.65rem; }
    .close-alert { background: none; border: none; cursor: pointer; font-size: 1.1rem; color: inherit; }

    /* Common Card Styles */
    .card {
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: 1rem;
      padding: 1.35rem;
      box-shadow: 0 1px 4px rgba(0,0,0,0.03);
    }

    /* Summary Cards */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.25rem;
      margin-bottom: 0.5rem;
    }
    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.1rem 1.25rem;
      background: var(--bg-card, #ffffff);
      border-radius: 0.85rem;
      border: 1px solid var(--border-color, #e2e8f0);
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      min-width: 0;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.06);
    }
    .card-icon {
      width: 46px;
      height: 46px;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.45rem;
      flex-shrink: 0;
    }
    .icon-red { background: #fee2e2; color: #dc2626; }
    .icon-green { background: #dcfce7; color: #16a34a; }
    .icon-blue { background: #e0e7ff; color: #4338ca; }
    .icon-purple { background: #f3e8ff; color: #7e22ce; }
    .icon-orange { background: #ffedd5; color: #c2410c; }
    .icon-amber { background: #fef3c7; color: #b45309; }
    .icon-dark { background: #f1f5f9; color: #334155; }
    .icon-emerald { background: #ecfdf5; color: #047857; }

    .card-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    .card-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-secondary, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: normal;
      line-height: 1.2;
      word-break: break-word;
    }
    .card-amount {
      font-size: clamp(1.25rem, 1.4vw, 1.65rem);
      font-weight: 800;
      color: var(--text-primary, #0f172a);
      line-height: 1.25;
      margin: 0.25rem 0 0.15rem;
      white-space: nowrap;
      font-family: inherit;
    }
    .card-sub {
      font-size: 0.76rem;
      color: var(--text-secondary, #64748b);
      white-space: normal;
      line-height: 1.25;
      word-break: break-word;
    }

    /* Colors */
    .text-danger { color: #dc2626 !important; }
    .text-success { color: #16a34a !important; }
    .text-primary { color: #2563eb !important; }
    .text-warning { color: #d97706 !important; }
    .text-final-success { color: #059669 !important; font-size: 1.85rem !important; }

    /* Toolbar */
    .toolbar-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: var(--bg-input, #f8fafc);
      border: 1px solid var(--border-color, #cbd5e1);
      border-radius: 0.75rem;
      padding: 0.65rem 1rem;
      min-width: 320px;
      flex: 1;
    }
    .search-input {
      border: none;
      background: transparent;
      outline: none;
      width: 100%;
      font-size: 0.95rem;
      color: var(--text-primary, #0f172a);
    }
    .filter-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .pill-btn {
      padding: 0.6rem 1.15rem;
      border-radius: 2rem;
      border: 1px solid var(--border-color, #cbd5e1);
      background: transparent;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pill-btn.active { background: #0f172a; color: #ffffff; border-color: #0f172a; }
    .pill-btn.pill-danger.active { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
    .pill-btn.pill-success.active { background: #dcfce7; color: #166534; border-color: #86efac; }

    /* Parties Grid */
    .parties-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 1.5rem;
    }
    .party-card {
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border: 1px solid var(--border-color, #e2e8f0);
    }
    .party-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.06);
      border-color: #cbd5e1;
    }
    .party-card-top {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .party-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.1rem;
      flex-shrink: 0;
    }
    .party-avatar.payable { background: #fee2e2; color: #dc2626; }
    .party-avatar.receivable { background: #dcfce7; color: #16a34a; }
    .party-meta { flex: 1; min-width: 0; }
    .party-name-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
    .party-name { font-size: 1.15rem; font-weight: 800; color: var(--text-primary, #0f172a); margin: 0; }
    .party-category { font-size: 0.8rem; color: var(--text-secondary, #64748b); }

    .party-card-actions {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .btn-action-icon {
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.45rem;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.15s;
    }
    .btn-action-icon:hover { background: #f1f5f9; border-color: #cbd5e1; }
    .btn-del-icon:hover { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }

    .party-balance-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-highlight, #f8fafc);
      padding: 0.85rem 1.15rem;
      border-radius: 0.75rem;
      border: 1px solid #f1f5f9;
    }
    .balance-left { display: flex; flex-direction: column; }
    .balance-label { font-size: 0.75rem; color: var(--text-secondary, #64748b); text-transform: uppercase; font-weight: 700; }
    .balance-value { font-size: 1.45rem; font-weight: 800; line-height: 1.2; margin-top: 0.15rem; }
    .btn-open-passbook {
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      font-weight: 700;
      background: #0f172a;
      color: #ffffff;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-open-passbook:hover { background: #334155; }
    .party-mini-ledger {
      display: flex;
      justify-content: space-between;
      border-top: 1px dashed var(--border-color, #e2e8f0);
      padding-top: 0.75rem;
    }
    .mini-col { display: flex; flex-direction: column; flex: 1; }
    .mini-col.divider { width: 1px; max-width: 1px; background: var(--border-color, #e2e8f0); margin: 0 0.75rem; }
    .mini-lbl { font-size: 0.75rem; color: var(--text-secondary, #64748b); }
    .mini-val { font-size: 1rem; font-weight: 800; margin-top: 0.1rem; }
    .party-note-preview { font-size: 0.78rem; color: var(--text-secondary, #64748b); font-style: italic; }

    /* Settlement Hero Banner (Image 1 Engine) */
    .settlement-hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 2.25rem;
      border-radius: 1.25rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
    }
    .hero-badge-tag {
      display: inline-block;
      font-size: 0.78rem;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 0.08em;
      background: rgba(255,255,255,0.12);
      padding: 0.3rem 0.85rem;
      border-radius: 1rem;
      color: #38bdf8;
      margin-bottom: 0.65rem;
    }
    .hero-title { font-size: 1.85rem; font-weight: 800; margin: 0 0 0.35rem; color: #ffffff; }
    .hero-desc { font-size: 0.9rem; color: #94a3b8; margin: 0 0 1.75rem; }
    .formula-pipeline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1.25rem;
      background: rgba(255,255,255,0.06);
      padding: 1.5rem;
      border-radius: 1rem;
      border: 1px solid rgba(255,255,255,0.12);
    }
    .pipeline-step { display: flex; flex-direction: column; flex: 1; min-width: 160px; }
    .pipeline-step.highlight {
      background: rgba(34, 197, 94, 0.18);
      border: 1px solid rgba(34, 197, 94, 0.5);
      padding: 0.85rem 1.25rem;
      border-radius: 0.85rem;
    }
    .step-lbl { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; font-weight: 700; }
    .step-val { font-size: 1.6rem; font-weight: 800; line-height: 1.2; margin: 0.3rem 0; }
    .step-sub { font-size: 0.75rem; color: #cbd5e1; }
    .pipeline-operator { font-size: 2rem; font-weight: 900; color: #64748b; }
    .adj-input-wrapper {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 0.6rem;
      padding: 0.3rem 0.65rem;
      margin: 0.3rem 0;
    }
    .adj-input { border: none; background: transparent; color: #ffffff; font-size: 1.15rem; font-weight: 700; width: 100%; outline: none; }

    /* Two Column Comparative Grid */
    .liquidity-two-col {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(460px, 1fr));
      gap: 1.75rem;
    }
    .col-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-color, #e2e8f0);
      padding-bottom: 1rem;
      margin-bottom: 1.25rem;
      gap: 1rem;
    }
    .col-header h3 { font-size: 1.2rem; font-weight: 800; margin: 0; color: var(--text-primary, #0f172a); }
    .col-subtitle { font-size: 0.82rem; color: var(--text-secondary, #64748b); }
    .debts-list, .accounts-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .debt-row, .account-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1rem;
      border-radius: 0.65rem;
      border: 1px solid var(--border-color, #f1f5f9);
      background: #ffffff;
      transition: background 0.15s;
    }
    .debt-row:hover, .account-row:hover { background: #f8fafc; }
    .debt-info { display: flex; align-items: center; gap: 0.75rem; }
    .debt-avatar { font-size: 1.35rem; }
    .debt-name { font-weight: 700; font-size: 1rem; color: var(--text-primary, #0f172a); }
    .debt-tag { font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: 0.35rem; background: #fee2e2; color: #b91c1c; font-weight: 700; margin-left: 0.5rem; }
    .debt-amount { font-weight: 800; font-size: 1.15rem; }
    .account-left { display: flex; align-items: center; gap: 0.85rem; }
    .acc-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 0.5rem;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
    }
    .acc-name { display: block; font-weight: 700; font-size: 1rem; color: var(--text-primary, #0f172a); }
    .acc-type { font-size: 0.78rem; color: var(--text-secondary, #64748b); }
    .account-right { display: flex; align-items: center; gap: 0.5rem; }
    .acc-balance { font-weight: 800; font-size: 1.15rem; color: #0f172a; margin-right: 0.5rem; }

    /* TAB 3: Event & Shopping Hero Grid (Wide 25", 32", 55" Screen Optimized) */
    .event-selector-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.25rem;
      padding: 1.15rem 1.5rem;
    }
    .selector-left { display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; }
    .sel-label { font-weight: 800; font-size: 0.95rem; color: var(--text-primary, #0f172a); }
    .event-dropdown {
      padding: 0.6rem 1.1rem;
      border-radius: 0.65rem;
      border: 1.5px solid #cbd5e1;
      font-size: 0.95rem;
      font-weight: 700;
      background: #ffffff;
      color: #0f172a;
      outline: none;
      min-width: 300px;
    }
    .trip-quick-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-trip-action {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.5rem 0.85rem;
      border-radius: 0.5rem;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      font-size: 0.85rem;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-trip-action:hover { background: #f8fafc; border-color: #94a3b8; }
    .btn-trip-del:hover { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }

    /* Stat Cards Grid: 6 cards that scale gracefully across 25", 32" monitors, 55" TV, and split-screen */
    .event-hero-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    @media (max-width: 1480px) {
      .event-hero-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.85rem;
      }
    }

    @media (max-width: 860px) {
      .event-hero-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 520px) {
      .event-hero-grid {
        grid-template-columns: 1fr;
      }
    }

    /* 3 Columns Grid: Expands to full screen width */
    .event-details-grid {
      display: grid;
      grid-template-columns: 1.35fr 1fr 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    @media (max-width: 1280px) {
      .event-details-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 860px) {
      .event-details-grid {
        grid-template-columns: 1fr;
      }
    }

    .col-title-group {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .col-title-badge {
      width: 44px;
      height: 44px;
      border-radius: 0.65rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      flex-shrink: 0;
    }
    .col-main-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-primary, #0f172a);
      margin: 0;
      line-height: 1.2;
    }
    .col-total-chip {
      font-size: 0.88rem;
      font-weight: 800;
      font-family: monospace;
      margin-top: 0.15rem;
      display: block;
    }

    /* Table styling with room to breathe */
    .items-table-wrapper {
      max-height: 550px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 transparent;
      border: 1px solid #f1f5f9;
      border-radius: 0.75rem;
    }
    .items-table-wrapper::-webkit-scrollbar {
      width: 6px;
    }
    .items-table-wrapper::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }

    .khata-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92rem;
    }
    .khata-table th {
      position: sticky;
      top: 0;
      background: #f8fafc;
      padding: 0.85rem 1rem;
      text-align: left;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      border-bottom: 2px solid #e2e8f0;
      z-index: 10;
    }
    .khata-table td {
      padding: 0.8rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .table-row:hover {
      background: #f8fafc;
    }
    .item-name-cell {
      font-size: 0.95rem;
      color: #0f172a;
    }
    .tag-beneficiary {
      font-size: 0.78rem;
      background: #f1f5f9;
      color: #334155;
      padding: 0.25rem 0.65rem;
      border-radius: 0.45rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .actions-cell {
      white-space: nowrap;
    }
    .btn-table-action {
      width: 30px;
      height: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.4rem;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      cursor: pointer;
      font-size: 0.82rem;
      margin: 0 0.15rem;
      transition: all 0.15s;
    }
    .btn-table-action:hover { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; }
    .btn-table-action.btn-del:hover { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }

    /* Fund contributors sub-sections */
    .sub-section {
      background: #f8fafc;
      padding: 1.15rem;
      border-radius: 0.85rem;
      border: 1px solid #f1f5f9;
    }
    .sub-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.85rem;
    }
    .sub-heading {
      font-size: 0.82rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0;
      color: var(--text-secondary, #64748b);
    }
    .sub-badge {
      font-size: 0.72rem;
      background: #e2e8f0;
      padding: 0.15rem 0.5rem;
      border-radius: 1rem;
      font-weight: 700;
      color: #475569;
    }
    .contributors-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .contributor-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 0.75rem 1rem;
      border-radius: 0.65rem;
      border: 1px solid #e2e8f0;
      transition: background 0.15s;
    }
    .contributor-item:hover { background: #fafafa; }
    .contributor-item.handover { border-left: 3.5px solid #ef4444; }
    .contributor-left { display: flex; align-items: center; gap: 0.65rem; }
    .c-avatar { font-size: 1.25rem; }
    .c-name { font-weight: 700; font-size: 0.95rem; color: var(--text-primary, #0f172a); }
    .c-sub { display: block; font-size: 0.75rem; color: #64748b; }
    .contributor-right { display: flex; align-items: center; gap: 0.5rem; }
    .c-amt { font-size: 1.05rem; }

    /* DRAWER / MODAL: PASSBOOK */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
      align-items: stretch;
      backdrop-filter: blur(4px);
    }
    .passbook-drawer {
      width: 100%;
      max-width: 720px;
      background: var(--bg-card, #ffffff);
      height: 100vh;
      overflow-y: auto;
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      box-shadow: -6px 0 32px rgba(0,0,0,0.18);
      animation: slideIn 0.22s ease-out;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-color, #e2e8f0);
      padding-bottom: 1.15rem;
    }
    .party-drawer-title { display: flex; align-items: center; gap: 1rem; }
    .party-avatar-lg {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      font-weight: 800;
    }
    .party-avatar-lg.payable { background: #fee2e2; color: #dc2626; }
    .party-avatar-lg.receivable { background: #dcfce7; color: #16a34a; }
    .drawer-name { margin: 0; font-size: 1.4rem; font-weight: 800; color: var(--text-primary, #0f172a); }
    .drawer-phone { font-size: 0.85rem; color: var(--text-secondary, #64748b); }
    .drawer-right-actions { display: flex; align-items: center; gap: 0.65rem; }
    .btn-whatsapp {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem 1rem;
      border-radius: 0.6rem;
      border: 1px solid #22c55e;
      background: #f0fdf4;
      color: #15803d;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-whatsapp:hover { background: #dcfce7; }
    .btn-close-drawer { background: none; border: none; font-size: 1.6rem; color: #94a3b8; cursor: pointer; }
    .passbook-balance-banner {
      display: flex;
      justify-content: space-around;
      align-items: center;
      padding: 1.35rem 1.25rem;
      border-radius: 1rem;
      border: 1.5px solid var(--border-color, #e2e8f0);
    }
    .bg-danger-soft { background: #fef2f2; border-color: #fecaca; }
    .bg-success-soft { background: #f0fdf4; border-color: #bbf7d0; }
    .banner-stat { display: flex; flex-direction: column; align-items: center; text-align: center; }
    .banner-lbl { font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #64748b; }
    .banner-amt { font-size: 1.35rem; font-weight: 800; margin-top: 0.25rem; }
    .banner-stat.highlight .banner-amt { font-size: 1.65rem; }
    .banner-divider { font-size: 1.75rem; font-weight: 900; color: #94a3b8; }

    /* Big IN/OUT Action Buttons */
    .entry-actions-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.15rem;
    }
    .btn-entry-in {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      padding: 0.95rem;
      border-radius: 0.85rem;
      border: 2px solid #22c55e;
      background: #f0fdf4;
      color: #15803d;
      font-size: 1rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-entry-in:hover, .btn-entry-in.active { background: #22c55e; color: #ffffff; }
    .btn-entry-out {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      padding: 0.95rem;
      border-radius: 0.85rem;
      border: 2px solid #ef4444;
      background: #fef2f2;
      color: #b91c1c;
      font-size: 1rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-entry-out:hover, .btn-entry-out.active { background: #ef4444; color: #ffffff; }

    /* Quick Entry Inline Card */
    .quick-entry-card {
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
      padding: 1.35rem;
      border-width: 2px;
      border-radius: 0.85rem;
    }
    .border-success { border-color: #22c55e !important; }
    .border-danger { border-color: #ef4444 !important; }
    .quick-form-title { display: flex; justify-content: space-between; align-items: center; font-weight: 800; font-size: 1.05rem; }
    .quick-chips { display: flex; gap: 0.4rem; margin-top: 0.4rem; }
    .quick-chips button {
      padding: 0.25rem 0.65rem;
      font-size: 0.78rem;
      border-radius: 0.4rem;
      border: 1px solid var(--border-color, #cbd5e1);
      background: var(--bg-card, #ffffff);
      cursor: pointer;
      font-weight: 700;
    }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-group.full-width { grid-column: 1 / -1; }
    .form-group label { display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary, #0f172a); }
    .form-control {
      width: 100%;
      padding: 0.65rem 0.85rem;
      border-radius: 0.6rem;
      border: 1.5px solid var(--border-color, #cbd5e1);
      font-size: 0.95rem;
      box-sizing: border-box;
      background: var(--bg-input, #ffffff);
      color: var(--text-primary, #0f172a);
    }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.85rem; }

    /* Passbook Ledger Table */
    .ledger-header-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; }
    .ledger-header-title h3 { font-size: 1.1rem; font-weight: 800; margin: 0; }
    .ledger-count { font-size: 0.82rem; color: #64748b; }
    .ledger-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .ledger-table th {
      padding: 0.75rem 0.65rem;
      text-align: left;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: #64748b;
      border-bottom: 2px solid var(--border-color, #e2e8f0);
    }
    .ledger-table td { padding: 0.75rem 0.65rem; border-bottom: 1px solid var(--border-color, #f1f5f9); }
    .entry-desc { display: flex; flex-direction: column; }
    .entry-cat { font-weight: 700; color: #0f172a; }
    .entry-rem { font-size: 0.78rem; color: #64748b; }

    /* Modal Cards */
    .modal-card {
      width: 90%;
      max-width: 520px;
      margin: auto;
      animation: zoomIn 0.18s ease-out;
    }
    @keyframes zoomIn {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-color, #e2e8f0);
      padding-bottom: 0.85rem;
      margin-bottom: 1.15rem;
    }
    .modal-header h3 { margin: 0; font-size: 1.25rem; font-weight: 800; }
    .modal-body { display: flex; flex-direction: column; gap: 1rem; }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.85rem;
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color, #e2e8f0);
    }

    /* Direction select radio */
    .direction-select { display: flex; flex-direction: column; gap: 0.65rem; }
    .radio-label {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.75rem 1rem;
      border: 1.5px solid var(--border-color, #cbd5e1);
      border-radius: 0.65rem;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 700;
    }
    .radio-label.selected { border-color: #0f172a; background: var(--bg-highlight, #f8fafc); }

    /* Buttons */
    .btn-primary {
      padding: 0.7rem 1.35rem;
      border-radius: 0.65rem;
      border: none;
      background: #4f46e5;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.92rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: background 0.15s;
    }
    .btn-primary:hover { background: #4338ca; }
    .btn-sheet-import {
      padding: 0.7rem 1.25rem;
      border-radius: 0.65rem;
      border: 1.5px solid #6366f1;
      background: #eef2ff;
      color: #4338ca;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.15s;
    }
    .btn-sheet-import:hover { background: #e0e7ff; }
    .btn-secondary {
      padding: 0.7rem 1.35rem;
      border-radius: 0.65rem;
      border: 1.5px solid var(--border-color, #cbd5e1);
      background: transparent;
      color: var(--text-primary, #0f172a);
      font-weight: 700;
      font-size: 0.92rem;
      cursor: pointer;
    }
    .btn-secondary:hover { background: #f8fafc; }
    .btn-danger-outline {
      padding: 0.7rem 1.15rem;
      border-radius: 0.65rem;
      border: 1.5px solid #fca5a5;
      background: #fef2f2;
      color: #dc2626;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.15s;
    }
    .btn-danger-outline:hover { background: #fee2e2; }
    .btn-sm-primary {
      padding: 0.45rem 0.9rem;
      border-radius: 0.5rem;
      border: none;
      background: #0f172a;
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }
    .btn-sm-primary:hover { background: #334155; }
    .btn-xs-link { background: none; border: none; color: #2563eb; font-size: 0.82rem; font-weight: 700; cursor: pointer; }
    .btn-close-sm { background: none; border: none; font-size: 1.3rem; color: #94a3b8; cursor: pointer; }
    .btn-plus { font-size: 1.1rem; font-weight: 900; }
    .btn-emoji { font-size: 1.05rem; }

    /* Badges */
    .badge { font-size: 0.75rem; font-weight: 800; padding: 0.25rem 0.6rem; border-radius: 0.4rem; }
    .badge-danger { background: #fee2e2; color: #dc2626; }
    .badge-success { background: #dcfce7; color: #16a34a; }

    /* Utility */
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 800; }
    .text-muted { color: #64748b; }
    .flex-between { display: flex; justify-content: space-between; align-items: center; }
    .flex-center { display: flex; align-items: center; }
    .gap-2 { gap: 0.5rem; }
    .mt-4 { margin-top: 1.15rem; }

    /* Empty state */
    .empty-state { text-align: center; padding: 3.5rem 1.5rem; color: #64748b; }
    .empty-icon { font-size: 3.5rem; margin-bottom: 0.75rem; }

    @media (max-width: 992px) {
      .formula-pipeline { flex-direction: column; align-items: stretch; }
      .pipeline-operator { text-align: center; }
      .entry-actions-row { grid-template-columns: 1fr; }
      .liquidity-two-col { grid-template-columns: 1fr; }
    }
  `]
})
export class KhataComponent implements OnInit {
  private readonly khataService = inject(KhataService);

  loading = signal(false);
  activeTab = signal<'parties' | 'liquidity' | 'events'>('parties');
  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  // Parties state
  parties = signal<KhataParty[]>([]);
  summary = signal<{ totalParties: number; totalDenaHai: number; totalLenaHai: number; netBalance: number } | null>(null);
  searchQuery = signal('');
  partyFilter = signal<'ALL' | 'Payable' | 'Receivable'>('ALL');
  activePartyDetail = signal<KhataPartyDetail | null>(null);

  // Liquidity state
  liquidityData = signal<LiquiditySummary | null>(null);
  userAdjustment = signal<number>(27800); // Default adjustment matching Image 1 (-27,800)

  // Events state
  events = signal<KhataEventSummary[]>([]);
  selectedEventId = signal<string | null>(null);
  currentEvent = signal<KhataEventDetail | null>(null);

  // Modal controls
  showCreatePartyModal = signal(false);
  editingPartyId = signal<string | null>(null);

  showAddAccountModal = signal(false);
  editingAccountId = signal<string | null>(null);

  showAddItemModal = signal(false);
  editingItemId = signal<string | null>(null);

  showAddFundModal = signal(false);
  editingFundId = signal<string | null>(null);

  showCreateEventModal = signal(false);
  editingEventId = signal<string | null>(null);

  // Party form model
  newPartyName = '';
  newPartyPhone = '';
  newPartyType: 'Payable' | 'Receivable' = 'Payable';
  newPartyCategory = 'Family';
  newPartyInitialAmount: number | null = null;
  newPartyNotes = '';

  // Entry form in drawer
  entryFormType = signal<'IN' | 'OUT' | null>(null);
  editingEntryId = signal<string | null>(null);
  newEntryAmount: number | null = null;
  newEntryCategory = 'General';
  newEntryRemark = '';

  // Account form model
  newAccountName = '';
  newAccountType = 'Bank';
  newAccountBalance: number | null = null;
  newAccountNotes = '';

  // Event Item form model
  eventItemType = 'Shopping';
  newItemDesc = '';
  newItemAmount: number | null = null;
  newItemBeneficiary = '';

  // Event Fund form model
  newFundContributor = '';
  newFundAmount: number | null = null;

  // Event form model
  newEventTitle = '';
  newEventNotes = '';

  filteredParties = computed(() => {
    let list = this.parties();
    const filter = this.partyFilter();
    if (filter !== 'ALL') {
      list = list.filter(p => p.type === filter);
    }
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
      );
    }
    return list;
  });

  ngOnInit(): void {
    this.loadParties();
    this.loadLiquidity();
    this.loadEvents();
  }

  setActiveTab(tab: 'parties' | 'liquidity' | 'events'): void {
    this.activeTab.set(tab);
    if (tab === 'parties') this.loadParties();
    if (tab === 'liquidity') this.loadLiquidity();
    if (tab === 'events') this.loadEvents();
  }

  showAlert(message: string, type: 'success' | 'error' = 'success'): void {
    this.alertMessage.set(message);
    this.alertType.set(type);
    setTimeout(() => {
      this.alertMessage.set(null);
    }, 4500);
  }

  // Parties & Entries CRUD
  loadParties(): void {
    this.loading.set(true);
    this.khataService.getParties().subscribe({
      next: res => {
        this.parties.set(res.parties);
        this.summary.set(res.summary);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearchChange(val: string): void {
    this.searchQuery.set(val);
  }

  setPartyFilter(filter: 'ALL' | 'Payable' | 'Receivable'): void {
    this.partyFilter.set(filter);
  }

  openNewPartyModal(): void {
    this.editingPartyId.set(null);
    this.newPartyName = '';
    this.newPartyPhone = '';
    this.newPartyType = 'Payable';
    this.newPartyCategory = 'Family';
    this.newPartyInitialAmount = null;
    this.newPartyNotes = '';
    this.showCreatePartyModal.set(true);
  }

  openEditPartyModal(party: KhataParty | KhataPartyDetail): void {
    this.editingPartyId.set(party.id);
    this.newPartyName = party.name;
    this.newPartyPhone = party.phone || '';
    this.newPartyType = party.type;
    this.newPartyCategory = party.category || 'Family';
    this.newPartyNotes = party.notes || '';
    this.showCreatePartyModal.set(true);
  }

  closePartyModal(): void {
    this.showCreatePartyModal.set(false);
    this.editingPartyId.set(null);
  }

  submitPartyForm(): void {
    if (!this.newPartyName.trim()) {
      this.showAlert('Please enter person name.', 'error');
      return;
    }

    const editId = this.editingPartyId();
    if (editId) {
      // UPDATE Party
      this.khataService.updateParty(editId, {
        name: this.newPartyName.trim(),
        phone: this.newPartyPhone.trim(),
        type: this.newPartyType,
        category: this.newPartyCategory,
        notes: this.newPartyNotes
      }).subscribe({
        next: () => {
          this.closePartyModal();
          this.showAlert('Khata updated successfully!');
          this.loadParties();
          if (this.activePartyDetail()?.id === editId) {
            this.openPartyPassbook(editId);
          }
        },
        error: () => this.showAlert('Failed to update khata', 'error')
      });
    } else {
      // CREATE Party
      this.khataService.createParty({
        name: this.newPartyName.trim(),
        phone: this.newPartyPhone.trim(),
        type: this.newPartyType,
        category: this.newPartyCategory,
        notes: this.newPartyNotes,
        initialAmount: this.newPartyInitialAmount ?? undefined
      }).subscribe({
        next: () => {
          this.closePartyModal();
          this.showAlert('Khata created successfully!');
          this.loadParties();
        },
        error: () => this.showAlert('Failed to create khata', 'error')
      });
    }
  }

  deleteParty(party: KhataParty | KhataPartyDetail): void {
    if (!confirm(`Are you sure you want to delete khata for "${party.name}" and all its transaction entries?`)) return;
    this.khataService.deleteParty(party.id).subscribe({
      next: () => {
        this.showAlert(`Khata for ${party.name} deleted.`);
        if (this.activePartyDetail()?.id === party.id) {
          this.closePartyPassbook();
        }
        this.loadParties();
      },
      error: () => this.showAlert('Failed to delete party khata', 'error')
    });
  }

  openPartyPassbook(partyId: string): void {
    this.khataService.getPartyById(partyId).subscribe({
      next: res => {
        this.activePartyDetail.set(res);
        this.cancelEntryForm();
      },
      error: () => this.showAlert('Could not load party details', 'error')
    });
  }

  closePartyPassbook(): void {
    this.activePartyDetail.set(null);
    this.cancelEntryForm();
    this.loadParties();
  }

  toggleEntryForm(type: 'IN' | 'OUT'): void {
    if (this.entryFormType() === type && !this.editingEntryId()) {
      this.cancelEntryForm();
    } else {
      this.entryFormType.set(type);
      this.editingEntryId.set(null);
      this.newEntryAmount = null;
      this.newEntryRemark = '';
      this.newEntryCategory = type === 'IN' ? 'Fund Received' : 'General';
    }
  }

  openEditEntry(entry: KhataEntry): void {
    this.editingEntryId.set(entry.id);
    this.entryFormType.set(entry.entryType);
    this.newEntryAmount = entry.amount;
    this.newEntryCategory = entry.category || 'General';
    this.newEntryRemark = entry.remark || '';
  }

  cancelEntryForm(): void {
    this.entryFormType.set(null);
    this.editingEntryId.set(null);
    this.newEntryAmount = null;
    this.newEntryRemark = '';
  }

  submitEntry(partyId: string): void {
    const amt = Number(this.newEntryAmount);
    if (!amt || amt <= 0) {
      this.showAlert('Please enter a valid amount.', 'error');
      return;
    }
    const type = this.entryFormType()!;
    const editEntryId = this.editingEntryId();

    if (editEntryId) {
      // UPDATE Entry
      this.khataService.updateEntry(editEntryId, {
        entryType: type,
        amount: amt,
        category: this.newEntryCategory,
        remark: this.newEntryRemark
      }).subscribe({
        next: () => {
          this.showAlert(`Entry updated successfully!`);
          this.cancelEntryForm();
          this.openPartyPassbook(partyId);
        },
        error: () => this.showAlert('Failed to update entry', 'error')
      });
    } else {
      // ADD Entry
      this.khataService.addEntry(partyId, {
        entryType: type,
        amount: amt,
        category: this.newEntryCategory,
        remark: this.newEntryRemark
      }).subscribe({
        next: () => {
          this.showAlert(`${type} entry of ₹${amt} recorded!`);
          this.cancelEntryForm();
          this.openPartyPassbook(partyId);
        },
        error: () => this.showAlert('Failed to record entry', 'error')
      });
    }
  }

  deleteEntry(entryId: string, partyId: string): void {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    this.khataService.deleteEntry(entryId).subscribe({
      next: () => {
        this.showAlert('Entry deleted.');
        this.openPartyPassbook(partyId);
      },
      error: () => this.showAlert('Could not delete entry', 'error')
    });
  }

  shareWhatsApp(p: KhataPartyDetail): void {
    const text = `*Hisaab Statement for ${p.name}*\n` +
      `Total Received (IN): ₹${p.totalIn.toLocaleString('en-IN')}\n` +
      `Total Paid (OUT): ₹${p.totalOut.toLocaleString('en-IN')}\n` +
      `*Pending Balance (${p.type === 'Payable' ? 'Dena Hai' : 'Lena Hai'}): ₹${p.netPending.toLocaleString('en-IN')}*\n` +
      `Generated from Hisaab Platform.`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  // Liquidity CRUD
  loadLiquidity(): void {
    this.khataService.getLiquidity(this.userAdjustment()).subscribe({
      next: res => this.liquidityData.set(res)
    });
  }

  onAdjustmentChange(val: number): void {
    this.userAdjustment.set(val || 0);
    this.loadLiquidity();
  }

  openAddAccountModal(): void {
    this.editingAccountId.set(null);
    this.newAccountName = '';
    this.newAccountType = 'Bank';
    this.newAccountBalance = null;
    this.newAccountNotes = '';
    this.showAddAccountModal.set(true);
  }

  openEditAccountModal(acc: LiquidityAccount): void {
    this.editingAccountId.set(acc.id);
    this.newAccountName = acc.accountName;
    this.newAccountType = acc.accountType;
    this.newAccountBalance = acc.balance;
    this.newAccountNotes = acc.notes || '';
    this.showAddAccountModal.set(true);
  }

  submitAddAccount(): void {
    if (!this.newAccountName.trim() || this.newAccountBalance == null) {
      this.showAlert('Please enter account name and balance.', 'error');
      return;
    }
    this.khataService.saveLiquidityAccount({
      id: this.editingAccountId() ?? undefined,
      accountName: this.newAccountName.trim(),
      accountType: this.newAccountType,
      balance: Number(this.newAccountBalance),
      notes: this.newAccountNotes
    }).subscribe({
      next: () => {
        this.showAddAccountModal.set(false);
        this.showAlert(this.editingAccountId() ? 'Account updated.' : 'Account saved.');
        this.editingAccountId.set(null);
        this.loadLiquidity();
      },
      error: () => this.showAlert('Failed to save account', 'error')
    });
  }

  deleteLiquidityAccount(id: string): void {
    if (!confirm('Remove this account from liquidity calculation?')) return;
    this.khataService.deleteLiquidityAccount(id).subscribe({
      next: () => {
        this.showAlert('Account removed.');
        this.loadLiquidity();
      }
    });
  }

  // Events CRUD
  loadEvents(): void {
    this.khataService.getEvents().subscribe({
      next: res => {
        this.events.set(res);
        if (res.length > 0 && !this.selectedEventId()) {
          this.selectEvent(res[0].id);
        }
      }
    });
  }

  selectEvent(id: string): void {
    this.selectedEventId.set(id);
    this.khataService.getEventById(id).subscribe({
      next: res => this.currentEvent.set(res)
    });
  }

  getItemsByType(ev: KhataEventDetail, type: string) {
    return ev.items.filter(i => i.itemType === type);
  }

  openNewEventModal(): void {
    this.editingEventId.set(null);
    this.newEventTitle = '';
    this.newEventNotes = '';
    this.showCreateEventModal.set(true);
  }

  openEditEventModal(ev: KhataEventDetail): void {
    this.editingEventId.set(ev.id);
    this.newEventTitle = ev.title;
    this.newEventNotes = ev.notes || '';
    this.showCreateEventModal.set(true);
  }

  closeEventModal(): void {
    this.showCreateEventModal.set(false);
    this.editingEventId.set(null);
  }

  submitEventForm(): void {
    if (!this.newEventTitle.trim()) {
      this.showAlert('Please enter trip/event title.', 'error');
      return;
    }
    const editId = this.editingEventId();
    if (editId) {
      this.khataService.updateEvent(editId, {
        title: this.newEventTitle.trim(),
        notes: this.newEventNotes
      }).subscribe({
        next: () => {
          this.closeEventModal();
          this.showAlert('Trip updated successfully.');
          this.loadEvents();
          this.selectEvent(editId);
        }
      });
    } else {
      this.khataService.createEvent({
        title: this.newEventTitle.trim(),
        notes: this.newEventNotes
      }).subscribe({
        next: res => {
          this.closeEventModal();
          this.showAlert('Trip created successfully.');
          this.loadEvents();
          this.selectEvent(res.id);
        }
      });
    }
  }

  deleteCurrentEvent(): void {
    const evId = this.selectedEventId();
    if (!evId || !confirm('Are you sure you want to delete this entire trip/event project and all its expenses?')) return;
    this.khataService.deleteEvent(evId).subscribe({
      next: () => {
        this.showAlert('Trip project deleted.');
        this.selectedEventId.set(null);
        this.currentEvent.set(null);
        this.loadEvents();
      }
    });
  }

  // Items CRUD
  openAddItemModal(type: string): void {
    this.editingItemId.set(null);
    this.eventItemType = type;
    this.newItemDesc = '';
    this.newItemAmount = null;
    this.newItemBeneficiary = '';
    this.showAddItemModal.set(true);
  }

  openEditItemModal(item: KhataEventItem): void {
    this.editingItemId.set(item.id);
    this.eventItemType = item.itemType;
    this.newItemDesc = item.description;
    this.newItemAmount = item.amount;
    this.newItemBeneficiary = item.beneficiary || '';
    this.showAddItemModal.set(true);
  }

  submitEventItem(): void {
    const evId = this.selectedEventId();
    if (!evId || !this.newItemDesc.trim() || !this.newItemAmount) {
      this.showAlert('Please enter description and amount.', 'error');
      return;
    }
    const editItemId = this.editingItemId();
    if (editItemId) {
      // UPDATE Item
      this.khataService.updateEventItem(editItemId, {
        itemType: this.eventItemType,
        description: this.newItemDesc.trim(),
        amount: Number(this.newItemAmount),
        beneficiary: this.newItemBeneficiary
      }).subscribe({
        next: () => {
          this.showAddItemModal.set(false);
          this.editingItemId.set(null);
          this.showAlert('Expense item updated.');
          this.selectEvent(evId);
        }
      });
    } else {
      // ADD Item
      this.khataService.addEventItem(evId, {
        itemType: this.eventItemType,
        description: this.newItemDesc.trim(),
        amount: Number(this.newItemAmount),
        beneficiary: this.newItemBeneficiary
      }).subscribe({
        next: () => {
          this.showAddItemModal.set(false);
          this.showAlert('Expense saved.');
          this.selectEvent(evId);
        }
      });
    }
  }

  deleteEventItem(itemId: string): void {
    const evId = this.selectedEventId();
    if (!evId || !confirm('Delete this expense item?')) return;
    this.khataService.deleteEventItem(itemId).subscribe({
      next: () => {
        this.showAlert('Expense deleted.');
        this.selectEvent(evId);
      }
    });
  }

  // Fund CRUD
  openAddFundModal(): void {
    this.editingFundId.set(null);
    this.newFundContributor = '';
    this.newFundAmount = null;
    this.showAddFundModal.set(true);
  }

  openEditFundModal(fund: KhataEventFund): void {
    this.editingFundId.set(fund.id);
    this.newFundContributor = fund.contributorName;
    this.newFundAmount = fund.amount;
    this.showAddFundModal.set(true);
  }

  submitEventFund(): void {
    const evId = this.selectedEventId();
    if (!evId || !this.newFundContributor.trim() || !this.newFundAmount) {
      this.showAlert('Please enter contributor name and amount.', 'error');
      return;
    }
    const editFundId = this.editingFundId();
    if (editFundId) {
      this.khataService.updateEventFund(editFundId, {
        contributorName: this.newFundContributor.trim(),
        amount: Number(this.newFundAmount)
      }).subscribe({
        next: () => {
          this.showAddFundModal.set(false);
          this.editingFundId.set(null);
          this.showAlert('Contributor updated.');
          this.selectEvent(evId);
        }
      });
    } else {
      this.khataService.addEventFund(evId, {
        contributorName: this.newFundContributor.trim(),
        amount: Number(this.newFundAmount)
      }).subscribe({
        next: () => {
          this.showAddFundModal.set(false);
          this.showAlert('Contributor fund added.');
          this.selectEvent(evId);
        }
      });
    }
  }

  deleteFund(fundId: string): void {
    const evId = this.selectedEventId();
    if (!evId || !confirm('Delete this contributor fund?')) return;
    this.khataService.deleteEventFund(fundId).subscribe({
      next: () => {
        this.showAlert('Contributor removed.');
        this.selectEvent(evId);
      }
    });
  }

  // 1-Click Sheet Data Import
  importSampleSheetData(): void {
    if (!confirm('Import all sample data from your sheets (Junaid, Mosin, Shahid Khan, Baji, Bank A/Cs, Shares, and Pune Shopping Trip)?')) return;
    this.loading.set(true);
    this.khataService.seedSheetData().subscribe({
      next: res => {
        this.loading.set(false);
        this.showAlert(res.message);
        this.loadParties();
        this.loadLiquidity();
        this.loadEvents();
      },
      error: () => {
        this.loading.set(false);
        this.showAlert('Failed to import sheet data.', 'error');
      }
    });
  }

  // Clear / Reset All Khata Data
  confirmClearAllData(): void {
    if (!confirm('⚠️ Are you sure you want to RESET & CLEAR ALL Local Khata data (parties, transactions, accounts, and shopping projects)? This will let you start completely fresh.')) return;
    this.loading.set(true);
    this.khataService.clearAllKhataData().subscribe({
      next: res => {
        this.loading.set(false);
        this.showAlert(res.message);
        this.parties.set([]);
        this.summary.set(null);
        this.activePartyDetail.set(null);
        this.events.set([]);
        this.currentEvent.set(null);
        this.selectedEventId.set(null);
        this.loadParties();
        this.loadLiquidity();
        this.loadEvents();
      },
      error: () => {
        this.loading.set(false);
        this.showAlert('Failed to clear data.', 'error');
      }
    });
  }
}
