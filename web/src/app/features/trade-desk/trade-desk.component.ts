import { Component, ElementRef, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TradeDeskService } from './services/trade-desk.service';
import {
  CloseTradePayload,
  CreateIpoPayload,
  CreateTradePayload,
  IpoApplication,
  IpoApplicationStatus,
  IpoIssueType,
  LiveIpo,
  StockSearchResult,
  TradeDeskOverview,
  TradeOrder,
  TradeStatus,
  TradeType,
  UpdateIpoStatusPayload
} from './models/trade-desk.model';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-trade-desk',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, InrCurrencyPipe],
  template: `
    <div class="trade-desk-page">
      <!-- Zerodha Kite Pro Header -->
      <div class="page-header no-print">
        <div class="header-left">
          <div class="title-row">
            <h1 class="page-title">Trade & IPO Desk</h1>
            <span class="pulse-pill">
              <span class="pulse-dot"></span>
              <span>Swing & IPO Portfolio</span>
            </span>
          </div>
          <p class="subtitle">Track short-term swing trades, planned holding days, realized P&L, and IPO allotments with listing gains.</p>
        </div>

        <div class="header-actions">
          <button type="button" class="btn-outline" (click)="loadOverview()" [disabled]="loading()">
            <span>⚡ Refresh</span>
          </button>
          <button type="button" class="btn-outline" (click)="openCreateIpoModal()">
            <span>🎯 Apply IPO</span>
          </button>
          <button type="button" class="btn-primary" (click)="openCreateTradeModal()">
            <span>+ New Swing Trade</span>
          </button>
        </div>
      </div>

      <!-- Zerodha Kite Compact Summary Strip -->
      @if (overview()?.summary; as s) {
        <div class="summary-strip card">
          <div class="summary-col">
            <span class="sum-label">ACTIVE INVESTED CAPITAL</span>
            <span class="sum-val">{{ s.totalCapitalInTrades | inrCurrency }}</span>
            <span class="sum-sub">Current Val: <strong>{{ s.totalCurrentValueInTrades | inrCurrency }}</strong></span>
          </div>

          <div class="summary-divider"></div>

          <div class="summary-col">
            <span class="sum-label">LIVE UNREALIZED P&L</span>
            <div class="sum-val" [class.profit]="s.totalUnrealizedProfitLoss >= 0" [class.loss]="s.totalUnrealizedProfitLoss < 0">
              {{ s.totalUnrealizedProfitLoss >= 0 ? '+' : '' }}{{ s.totalUnrealizedProfitLoss | inrCurrency }}
              <span class="sum-badge" [class.profit]="s.totalUnrealizedProfitLoss >= 0" [class.loss]="s.totalUnrealizedProfitLoss < 0">
                {{ s.totalUnrealizedProfitLossPercentage >= 0 ? '+' : '' }}{{ s.totalUnrealizedProfitLossPercentage }}%
              </span>
            </div>
            <span class="sum-sub">{{ s.activeTradesCount }} Active Swing Trades</span>
          </div>

          <div class="summary-divider"></div>

          <div class="summary-col">
            <span class="sum-label">NET REALIZED P&L (AFTER CHARGES)</span>
            <div class="sum-val" [class.profit]="s.totalNetRealizedProfitLoss >= 0" [class.loss]="s.totalNetRealizedProfitLoss < 0">
              {{ s.totalNetRealizedProfitLoss >= 0 ? '+' : '' }}{{ s.totalNetRealizedProfitLoss | inrCurrency }}
              <span class="sum-badge" [class.profit]="s.totalNetRealizedProfitLoss >= 0" [class.loss]="s.totalNetRealizedProfitLoss < 0">
                {{ s.totalNetRealizedProfitLossPercentage >= 0 ? '+' : '' }}{{ s.totalNetRealizedProfitLossPercentage }}%
              </span>
            </div>
            <span class="sum-sub">
              Total Charges Paid: <strong>-{{ s.totalChargesPaidOnTrades | inrCurrency }}</strong> • {{ s.closedTradesCount }} Closed
            </span>
          </div>

          <div class="summary-divider"></div>

          <div class="summary-col">
            <span class="sum-label">BLOCKED IN IPOS</span>
            <span class="sum-val">{{ s.totalCapitalBlockedInIpos | inrCurrency }}</span>
            <span class="sum-sub">{{ s.totalIpoApplicationsCount }} Applications ({{ s.allottedIposCount }} Allotted)</span>
          </div>
        </div>
      }

      <!-- Main Navigation Tabs -->
      <div class="tabs-nav-bar no-print">
        <div class="desk-tabs">
          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab() === 'trades'"
            (click)="setActiveTab('trades')">
            <span>📈 Swing & Short-Term Trades</span>
            <span class="tab-badge">{{ (overview()?.activeTrades?.length || 0) + (overview()?.closedTrades?.length || 0) }}</span>
          </button>

          <button
            type="button"
            class="tab-btn"
            [class.active]="activeTab() === 'ipos'"
            (click)="setActiveTab('ipos')">
            <span>🎯 IPO Applications Desk</span>
            <span class="tab-badge special">{{ overview()?.ipos?.length || 0 }}</span>
          </button>
        </div>

        @if (activeTab() === 'trades') {
          <div class="trade-sub-pills">
            <button
              type="button"
              class="sub-pill"
              [class.active]="tradeSubFilter() === 'open'"
              (click)="tradeSubFilter.set('open')">
              <span>Active Open ({{ overview()?.activeTrades?.length || 0 }})</span>
            </button>
            <button
              type="button"
              class="sub-pill"
              [class.active]="tradeSubFilter() === 'closed'"
              (click)="tradeSubFilter.set('closed')">
              <span>Closed History ({{ overview()?.closedTrades?.length || 0 }})</span>
            </button>
          </div>
        }
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-state">
          <div class="skeleton-bar"></div>
          <div class="skeleton-table"></div>
        </div>
      }

      <!-- TAB 1: SWING TRADES DESK -->
      @if (!loading() && activeTab() === 'trades') {
        @if (tradeSubFilter() === 'open') {
          @if (!overview()?.activeTrades || overview()!.activeTrades.length === 0) {
            <div class="empty-state card">
              <div class="empty-icon">📈</div>
              <h3>No Active Swing Trades</h3>
              <p>Add the shares you bought for 10-15 days or swing targets. Track holding duration and sell them directly with one click!</p>
              <button type="button" class="btn-primary mt-3" (click)="openCreateTradeModal()">
                + Record New Swing Trade
              </button>
            </div>
          } @else {
            <div class="table-container card">
              <table class="desk-table">
                <thead>
                  <tr>
                    <th>Stock / Ticker</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Buy Price</th>
                    <th class="text-right">Live CMP</th>
                    <th class="text-right">Invested vs Current</th>
                    <th class="text-right">Live P&L</th>
                    <th>Holding Status</th>
                    <th>Target & SL</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of overview()!.activeTrades; track t.id) {
                    <tr>
                      <td>
                        <div class="inst-cell">
                          <span class="ticker-bold">{{ t.ticker }}</span>
                          <span class="badge-exchange">{{ t.exchange }}</span>
                          <span class="badge-trade-type">{{ t.tradeTypeName }}</span>
                        </div>
                        <div class="company-sub">{{ t.companyName }}</div>
                      </td>

                      <td class="text-right font-mono">{{ t.quantity }}</td>

                      <td class="text-right font-mono">{{ t.buyPrice | inrCurrency }}</td>

                      <!-- Live CMP -->
                      <td class="text-right font-mono">
                        <strong class="live-cmp-price">{{ (t.currentMarketPrice || t.buyPrice) | inrCurrency }}</strong>
                        @if (t.dayChangePercent !== 0) {
                          <div class="day-change-tag" [class.profit]="t.dayChangePercent > 0" [class.loss]="t.dayChangePercent < 0">
                            {{ t.dayChangePercent > 0 ? '+' : '' }}{{ t.dayChangePercent }}%
                          </div>
                        } @else {
                          <div class="day-change-tag text-muted">LIVE</div>
                        }
                      </td>

                      <!-- Invested vs Current -->
                      <td class="text-right font-mono">
                        <div><strong>{{ (t.currentValue || t.investedAmount) | inrCurrency }}</strong></div>
                        <div class="text-xs text-muted">Cost: {{ t.investedAmount | inrCurrency }}</div>
                      </td>

                      <!-- Live Unrealized P&L -->
                      <td class="text-right font-mono">
                        <strong [class.profit]="t.unrealizedProfitLoss >= 0" [class.loss]="t.unrealizedProfitLoss < 0">
                          {{ t.unrealizedProfitLoss >= 0 ? '+' : '' }}{{ t.unrealizedProfitLoss | inrCurrency }}
                        </strong>
                        <div>
                          <span class="pnl-pill" [class.profit]="t.unrealizedProfitLossPercentage >= 0" [class.loss]="t.unrealizedProfitLossPercentage < 0">
                            {{ t.unrealizedProfitLossPercentage >= 0 ? '+' : '' }}{{ t.unrealizedProfitLossPercentage }}%
                          </span>
                        </div>
                      </td>

                      <td>
                        <div class="duration-cell">
                          <span class="days-badge" [class.warning]="t.currentHoldingDays > t.plannedHoldingDays">
                            ⏱️ {{ t.currentHoldingDays }} / {{ t.plannedHoldingDays }}d
                          </span>
                          @if (t.currentHoldingDays > t.plannedHoldingDays) {
                            <span class="text-xs loss">Overdue by {{ t.currentHoldingDays - t.plannedHoldingDays }}d</span>
                          }
                        </div>
                      </td>

                      <td>
                        <div class="targets-cell font-mono">
                          @if (t.targetPrice) {
                            <span class="profit text-xs">🎯 {{ t.targetPrice | inrCurrency }}</span>
                          }
                          @if (t.stopLossPrice) {
                            <span class="loss text-xs">🛡️ {{ t.stopLossPrice | inrCurrency }}</span>
                          }
                        </div>
                      </td>

                      <td class="text-right">
                        <div class="action-btn-group">
                          <button type="button" class="btn-sell-action" (click)="openCloseTradeModal(t)" title="Sell shares at market price and record profit/loss">
                            💰 Sell & Close
                          </button>
                          <button type="button" class="btn-icon-del" (click)="deleteTrade(t.id)" title="Delete Trade">
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
        } @else {
          <!-- Closed Trades History -->
          @if (!overview()?.closedTrades || overview()!.closedTrades.length === 0) {
            <div class="empty-state card">
              <div class="empty-icon">💰</div>
              <h3>No Closed Trades Yet</h3>
              <p>When you sell shares from your active open trades, their complete holding period, realized profit, and exit details will appear here.</p>
            </div>
          } @else {
            <div class="table-container card">
              <table class="desk-table">
                <thead>
                  <tr>
                    <th>Stock / Ticker</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Buy Price</th>
                    <th class="text-right">Sell Price</th>
                    <th>Holding Period</th>
                    <th class="text-right">Invested</th>
                    <th class="text-right">Gross P&L</th>
                    <th class="text-right">Charges & Taxes</th>
                    <th class="text-right">Net In-Hand P&L</th>
                    <th class="text-right">Net Return %</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of overview()!.closedTrades; track t.id) {
                    <tr>
                      <td>
                        <div class="inst-cell">
                          <span class="ticker-bold">{{ t.ticker }}</span>
                          <span class="badge-closed">CLOSED</span>
                        </div>
                        <div class="company-sub">{{ t.companyName }}</div>
                      </td>

                      <td class="text-right font-mono">{{ t.quantity }}</td>

                      <td class="text-right font-mono">{{ t.buyPrice | inrCurrency }}</td>

                      <td class="text-right font-mono">
                        <strong>{{ (t.sellPrice || 0) | inrCurrency }}</strong>
                        <div class="text-xs text-muted">{{ t.sellDate | date:'mediumDate' }}</div>
                      </td>

                      <td>
                        <span class="holding-badge">
                          🗓️ {{ t.actualHoldingDays || t.currentHoldingDays }} days
                        </span>
                      </td>

                      <td class="text-right font-mono">{{ t.investedAmount | inrCurrency }}</td>

                      <!-- Gross P&L -->
                      <td class="text-right font-mono">
                        <span [class.profit]="(t.realizedProfitLoss || 0) >= 0" [class.loss]="(t.realizedProfitLoss || 0) < 0">
                          {{ (t.realizedProfitLoss || 0) >= 0 ? '+' : '' }}{{ (t.realizedProfitLoss || 0) | inrCurrency }}
                        </span>
                      </td>

                      <!-- Charges & Taxes -->
                      <td class="text-right font-mono">
                        @if ((t.totalCharges || 0) > 0) {
                          <span class="charges-badge">-{{ (t.totalCharges || 0) | inrCurrency }}</span>
                        } @else {
                          <span class="text-xs text-muted">₹0.00</span>
                        }
                      </td>

                      <!-- Net Realized P&L -->
                      <td class="text-right font-mono">
                        <strong [class.profit]="(t.netProfitLoss || t.realizedProfitLoss || 0) >= 0" [class.loss]="(t.netProfitLoss || t.realizedProfitLoss || 0) < 0">
                          {{ (t.netProfitLoss || t.realizedProfitLoss || 0) >= 0 ? '+' : '' }}{{ (t.netProfitLoss || t.realizedProfitLoss || 0) | inrCurrency }}
                        </strong>
                      </td>

                      <td class="text-right font-mono">
                        <span class="pnl-pill" [class.profit]="(t.netProfitLossPercentage || t.realizedProfitLossPercentage || 0) >= 0" [class.loss]="(t.netProfitLossPercentage || t.realizedProfitLossPercentage || 0) < 0">
                          {{ (t.netProfitLossPercentage || t.realizedProfitLossPercentage || 0) >= 0 ? '+' : '' }}{{ (t.netProfitLossPercentage || t.realizedProfitLossPercentage || 0) }}%
                        </span>
                      </td>

                      <td class="text-right">
                        <div class="action-btn-group">
                          <button type="button" class="btn-table-edit" (click)="openEditClosedTradeModal(t)" title="Update Charges or Sell Details">
                            ✏️ Edit Charges
                          </button>
                          <button type="button" class="btn-table-reopen" (click)="confirmReopenTrade(t)" title="Reopen Trade (Move back to Active Open Trades)">
                            🔄 Reopen
                          </button>
                          <button type="button" class="btn-icon-del" (click)="deleteTrade(t.id)" title="Delete Trade Record">
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
        }
      }

      <!-- TAB 2: IPO APPLICATIONS DESK -->
      @if (!loading() && activeTab() === 'ipos') {
        @if (!overview()?.ipos || overview()!.ipos.length === 0) {
          <div class="empty-state card">
            <div class="empty-icon">🎯</div>
            <h3>No IPO Applications Recorded</h3>
            <p>Keep track of all your Mainboard and SME IPO bids, allotment status, and listing gains in one single dashboard!</p>
            <button type="button" class="btn-primary mt-3" (click)="openCreateIpoModal()">
              + Apply & Record IPO
            </button>
          </div>
        } @else {
          <div class="table-container card">
            <table class="desk-table">
              <thead>
                <tr>
                  <th>IPO Company</th>
                  <th>Type</th>
                  <th>Applied Date</th>
                  <th class="text-right">Lots & Shares</th>
                  <th class="text-right">Bid Price</th>
                  <th class="text-right">Amount Blocked</th>
                  <th>Status</th>
                  <th class="text-right">Allotted / P&L</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (ipo of overview()!.ipos; track ipo.id) {
                  <tr>
                    <td>
                      <div class="ticker-bold">{{ ipo.companyName }}</div>
                      <div class="company-sub">Symbol: {{ ipo.symbol }}</div>
                    </td>

                    <td>
                      <span class="issue-type-badge" [class.sme]="ipo.issueType === 2">
                        {{ ipo.issueTypeName }}
                      </span>
                    </td>

                    <td>
                      <div class="text-sm font-mono">{{ ipo.applicationDate | date:'mediumDate' }}</div>
                    </td>

                    <td class="text-right font-mono">
                      <div>{{ ipo.lotsApplied }} lot ({{ ipo.totalShares }} sh)</div>
                      <div class="text-xs text-muted">Lot: {{ ipo.lotSize }}</div>
                    </td>

                    <td class="text-right font-mono">{{ ipo.bidPrice | inrCurrency }}</td>

                    <td class="text-right font-mono">
                      <strong>{{ ipo.totalAmountBlocked | inrCurrency }}</strong>
                    </td>

                    <td>
                      <span class="status-pill status-{{ ipo.status }}">
                        {{ ipo.statusName }}
                      </span>
                    </td>

                    <td class="text-right font-mono">
                      @if (ipo.status === 2 || ipo.status === 4) {
                        <div>{{ ipo.sharesAllotted }} sh Allotted</div>
                        @if (ipo.realizedProfitLoss) {
                          <div class="profit text-xs font-bold">+{{ ipo.realizedProfitLoss | inrCurrency }} ({{ ipo.realizedProfitLossPercentage }}%)</div>
                        }
                      } @else if (ipo.status === 3) {
                        <span class="text-muted text-xs">Refund Processed</span>
                      } @else {
                        <span class="text-muted text-xs">Awaiting Result</span>
                      }
                    </td>

                    <td class="text-right">
                      <div class="action-btn-group">
                        <button type="button" class="btn-sm btn-outline" (click)="openUpdateIpoModal(ipo)">
                          ✏️ Update
                        </button>
                        <button type="button" class="btn-icon-del" (click)="deleteIpo(ipo.id)">
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
      }

      <!-- MODAL 1: CREATE SWING TRADE -->
      @if (showCreateTradeModal()) {
        <div class="modal-backdrop" (click)="closeCreateTradeModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Record New Swing / Short-Term Trade</h3>
              <button type="button" class="btn-close" (click)="closeCreateTradeModal()">&times;</button>
            </div>

            <form [formGroup]="tradeForm" (ngSubmit)="submitCreateTrade()">
              <div class="modal-body">
                <div class="form-row">
                  <div class="form-group col-half search-relative" (click)="$event.stopPropagation()">
                    <label class="form-label">
                      Stock Ticker / Search Share *
                      <span class="live-tag">⚡ Live Market</span>
                    </label>
                    <div class="input-with-icon">
                      <input
                        type="text"
                        class="form-control"
                        formControlName="ticker"
                        placeholder="Type share name (e.g. TATA, RELIANCE)..."
                        (input)="onStockSearchInput($event)"
                        (focus)="onStockSearchFocus()"
                        autocomplete="off"
                      />
                      @if (searchingStocks()) {
                        <span class="input-spinner">⏳</span>
                      }
                    </div>

                    <!-- Live Stock Autocomplete Dropdown -->
                    @if (showStockSuggestions() && stockSuggestions().length > 0) {
                      <div class="autocomplete-dropdown card shadow-lg">
                        <div class="dropdown-header">
                          <span>⚡ Indian Stocks (NSE / BSE)</span>
                          <button type="button" class="btn-tiny-close" (click)="showStockSuggestions.set(false)">&times;</button>
                        </div>
                        <div class="dropdown-list">
                          @for (s of stockSuggestions(); track s.ticker) {
                            <div class="suggestion-item" (click)="selectStock(s)">
                              <div class="item-left">
                                <div class="ticker-row">
                                  <strong class="item-ticker">{{ s.ticker }}</strong>
                                  <span class="badge-exchange">{{ s.exchange }}</span>
                                </div>
                                <div class="item-name">{{ s.companyName }}</div>
                              </div>
                              <div class="item-right">
                                @if (s.currentPrice > 0) {
                                  <div class="item-price">₹{{ s.currentPrice | number:'1.2-2' }}</div>
                                  <div class="item-cmp">Live CMP</div>
                                } @else {
                                  <div class="item-cmp text-muted">Select</div>
                                }
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>

                  <div class="form-group col-half">
                    <label class="form-label">Company Name</label>
                    <input type="text" class="form-control" formControlName="companyName" placeholder="Auto-filled or manual" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label">Buy Price (₹) *</label>
                    <input type="number" step="0.05" class="form-control" formControlName="buyPrice" placeholder="Auto-filled from CMP" />
                  </div>
                  <div class="form-group col-half">
                    <label class="form-label">Quantity *</label>
                    <input type="number" class="form-control" formControlName="quantity" placeholder="100" />
                  </div>
                </div>

                @if (tradeForm.get('buyPrice')?.value && tradeForm.get('quantity')?.value) {
                  <div class="calc-preview-strip">
                    <span>Total Invested Capital:</span>
                    <strong>₹{{ ((tradeForm.get('buyPrice')?.value || 0) * (tradeForm.get('quantity')?.value || 0)) | number:'1.2-2' }}</strong>
                  </div>
                }

                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label">Buy Date *</label>
                    <input type="date" class="form-control" formControlName="buyDate" />
                  </div>
                  <div class="form-group col-half">
                    <label class="form-label">Planned Holding Period (Days)</label>
                    <input type="number" class="form-control" formControlName="plannedHoldingDays" placeholder="10" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label">
                      Target Price (₹)
                      <span class="text-xs text-muted">(Suggested +8%)</span>
                    </label>
                    <input type="number" step="0.05" class="form-control" formControlName="targetPrice" placeholder="Target level" />
                  </div>
                  <div class="form-group col-half">
                    <label class="form-label">
                      Stop-Loss (₹)
                      <span class="text-xs text-muted">(Suggested -3%)</span>
                    </label>
                    <input type="number" step="0.05" class="form-control" formControlName="stopLossPrice" placeholder="Stop-loss level" />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Strategy / Notes</label>
                  <input type="text" class="form-control" formControlName="notes" placeholder="e.g. 20 EMA Bounce setup, selling in 10 days" />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-outline" (click)="closeCreateTradeModal()" [disabled]="submitting()">
                  Cancel
                </button>
                <button type="submit" class="btn-primary" [disabled]="tradeForm.invalid || submitting()">
                  {{ submitting() ? 'Saving...' : 'Add Trade' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL 2: CLOSE / SELL TRADE -->
      @if (selectedTradeToClose(); as trade) {
        <div class="modal-backdrop" (click)="closeCloseTradeModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ isEditingClosedTrade() ? '✏️ Edit Charges & Exit Details: ' + trade.ticker : '💰 Sell & Close Trade: ' + trade.ticker }}</h3>
              <button type="button" class="btn-close" (click)="closeCloseTradeModal()">&times;</button>
            </div>

            <form [formGroup]="closeTradeForm" (ngSubmit)="submitCloseTrade()">
              <div class="modal-body">
                <div class="trade-summary-card">
                  <div><strong>Buy Price:</strong> ₹{{ trade.buyPrice }} | <strong>Qty:</strong> {{ trade.quantity }}</div>
                  <div><strong>Total Invested:</strong> ₹{{ trade.investedAmount }}</div>
                  <div><strong>Days in Trade:</strong> {{ trade.currentHoldingDays }} days</div>
                </div>

                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label">Sell / Exit Price (₹) *</label>
                    <input type="number" step="0.05" class="form-control" formControlName="sellPrice" placeholder="e.g. 162.50" />
                  </div>
                  <div class="form-group col-half">
                    <label class="form-label">Sell Date *</label>
                    <input type="date" class="form-control" formControlName="sellDate" />
                  </div>
                </div>

                <div class="form-group">
                  <div class="charges-label-row">
                    <label class="form-label">Brokerage & Charges / Taxes (₹)</label>
                    <button type="button" class="btn-calc-charges" (click)="autoEstimateCharges(trade)" title="Auto calculate estimated Indian charges: STT (0.1%) + DP charges (₹15.34) + Exch/GST (0.02%)">
                      ⚡ Auto-Estimate Indian Charges
                    </button>
                  </div>
                  <input type="number" step="0.05" min="0" class="form-control font-mono" formControlName="totalCharges" placeholder="e.g. 25.50 or 0" />
                  <span class="text-xs text-muted">STT, DP charges (₹15.34), Exchange fees, Stamp duty & GST charges.</span>
                </div>

                @if (closeTradeForm.get('sellPrice')?.value; as sp) {
                  @if (sp > 0) {
                    @let gross = sp * trade.quantity - trade.investedAmount;
                    @let charges = closeTradeForm.get('totalCharges')?.value || 0;
                    @let net = gross - charges;
                    @let netPct = trade.investedAmount > 0 ? (net / trade.investedAmount * 100) : 0;

                    <div class="preview-pnl-card" [class.profit]="net >= 0" [class.loss]="net < 0">
                      <div class="pnl-breakdown-row">
                        <span>Gross P&L (Bina charges):</span>
                        <strong [class.profit]="gross >= 0" [class.loss]="gross < 0">
                          {{ gross >= 0 ? '+' : '' }}₹{{ gross | number:'1.2-2' }}
                        </strong>
                      </div>
                      <div class="pnl-breakdown-row">
                        <span>Total Brokerage & Taxes:</span>
                        <span class="loss">-₹{{ charges | number:'1.2-2' }}</span>
                      </div>
                      <div class="pnl-breakdown-divider"></div>
                      <div class="pnl-breakdown-row net-row">
                        <strong>Net In-Hand Profit / Loss:</strong>
                        <strong class="net-val" [class.profit]="net >= 0" [class.loss]="net < 0">
                          {{ net >= 0 ? '+' : '' }}₹{{ net | number:'1.2-2' }} ({{ netPct | number:'1.2-2' }}%)
                        </strong>
                      </div>
                    </div>
                  }
                }

                <div class="form-group">
                  <label class="form-label">Exit Reason / Notes</label>
                  <input type="text" class="form-control" formControlName="notes" placeholder="e.g. Target reached at 8th day, booked profit" />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-outline" (click)="closeCloseTradeModal()" [disabled]="submitting()">
                  Cancel
                </button>
                <button type="submit" class="btn-primary" [disabled]="closeTradeForm.invalid || submitting()">
                  {{ submitting() ? 'Saving...' : (isEditingClosedTrade() ? 'Update Charges & Settle' : 'Confirm Sell & Settle') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL 3: APPLY / RECORD IPO -->
      @if (showCreateIpoModal()) {
        <div class="modal-backdrop" (click)="closeCreateIpoModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Apply / Record IPO Bid</h3>
              <button type="button" class="btn-close" (click)="closeCreateIpoModal()">&times;</button>
            </div>

            <form [formGroup]="ipoForm" (ngSubmit)="submitCreateIpo()">
              <div class="modal-body">
                <div class="form-row">
                  <div class="form-group col-half search-relative" (click)="$event.stopPropagation()">
                    <label class="form-label">
                      IPO Company / Search Live IPO *
                      <span class="live-tag">🎯 Active IPOs</span>
                    </label>
                    <div class="input-with-icon">
                      <input
                        type="text"
                        class="form-control"
                        formControlName="companyName"
                        placeholder="Type IPO name (e.g. Swiggy, NTPC, Hyundai)..."
                        (input)="onIpoSearchInput($event)"
                        (focus)="onIpoSearchFocus()"
                        autocomplete="off"
                      />
                      @if (searchingIpos()) {
                        <span class="input-spinner">⏳</span>
                      }
                    </div>

                    <!-- Live IPO Autocomplete Dropdown -->
                    @if (showIpoSuggestions() && ipoSuggestions().length > 0) {
                      <div class="autocomplete-dropdown card shadow-lg ipo-dropdown">
                        <div class="dropdown-header">
                          <span>🎯 Live & Upcoming Indian IPOs</span>
                          <button type="button" class="btn-tiny-close" (click)="showIpoSuggestions.set(false)">&times;</button>
                        </div>
                        <div class="dropdown-list">
                          @for (ipo of ipoSuggestions(); track ipo.symbol) {
                            <div class="suggestion-item ipo-suggestion-item" (click)="selectIpo(ipo)">
                              <div class="item-left">
                                <div class="ticker-row">
                                  <strong class="item-ticker">{{ ipo.companyName }}</strong>
                                  <span class="issue-type-badge" [class.sme]="ipo.issueType === 'Sme'">{{ ipo.issueType }}</span>
                                  <span class="status-pill-mini" [class.open]="ipo.status === 'Open'" [class.upcoming]="ipo.status === 'Upcoming'" [class.listed]="ipo.status === 'Listed'">
                                    {{ ipo.status }}
                                  </span>
                                </div>
                                <div class="item-name text-xs text-muted">
                                  Price Band: ₹{{ ipo.minPrice }} - ₹{{ ipo.maxPrice }} • Lot: {{ ipo.lotSize }} sh
                                </div>
                              </div>
                              <div class="item-right">
                                <div class="item-price">₹{{ ipo.maxPrice }}</div>
                                <div class="item-cmp">Cut-off</div>
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>

                  <div class="form-group col-half">
                    <label class="form-label">Symbol / Short Code</label>
                    <input type="text" class="form-control" formControlName="symbol" placeholder="e.g. SWIGGY" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label">Issue Type</label>
                    <select class="form-control" formControlName="issueType">
                      <option [value]="1">Mainboard IPO</option>
                      <option [value]="2">SME IPO</option>
                    </select>
                  </div>
                  <div class="form-group col-half">
                    <label class="form-label">Application Date *</label>
                    <input type="date" class="form-control" formControlName="applicationDate" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label">Lot Size (Shares per lot) *</label>
                    <input type="number" class="form-control" formControlName="lotSize" placeholder="15" />
                  </div>
                  <div class="form-group col-half">
                    <label class="form-label">Lots Applied *</label>
                    <input type="number" class="form-control" formControlName="lotsApplied" placeholder="1" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group col-half">
                    <label class="form-label">Cut-off / Bid Price (₹) *</label>
                    <input type="number" step="0.05" class="form-control" formControlName="bidPrice" placeholder="Cutoff price" />
                  </div>
                  <div class="form-group col-half">
                    <label class="form-label">UPI / Bank App</label>
                    <input type="text" class="form-control" formControlName="upiId" placeholder="e.g. GPay / HDFC ASBA" />
                  </div>
                </div>

                @if (ipoForm.get('lotSize')?.value && ipoForm.get('bidPrice')?.value) {
                  <div class="calc-preview-strip ipo-calc">
                    <div>
                      <span>Total Applied Shares:</span>
                      <strong>{{ ((ipoForm.get('lotSize')?.value || 0) * (ipoForm.get('lotsApplied')?.value || 1)) }} shares</strong>
                    </div>
                    <div>
                      <span>Total Amount Blocked:</span>
                      <strong>₹{{ (((ipoForm.get('lotSize')?.value || 0) * (ipoForm.get('lotsApplied')?.value || 1) * (ipoForm.get('bidPrice')?.value || 0))) | number:'1.2-2' }}</strong>
                    </div>
                  </div>
                }

                <div class="form-group">
                  <label class="form-label">Notes / Expected Listing Date</label>
                  <input type="text" class="form-control" formControlName="notes" placeholder="e.g. GMP is +25%, Allotment on 24th Oct" />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-outline" (click)="closeCreateIpoModal()" [disabled]="submitting()">
                  Cancel
                </button>
                <button type="submit" class="btn-primary" [disabled]="ipoForm.invalid || submitting()">
                  {{ submitting() ? 'Saving...' : 'Record IPO Bid' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL 4: UPDATE IPO STATUS -->
      @if (selectedIpoToUpdate(); as ipo) {
        <div class="modal-backdrop" (click)="closeUpdateIpoModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Update IPO: {{ ipo.companyName }}</h3>
              <button type="button" class="btn-close" (click)="closeUpdateIpoModal()">&times;</button>
            </div>

            <form [formGroup]="updateIpoForm" (ngSubmit)="submitUpdateIpoStatus()">
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">Allotment Status *</label>
                  <select class="form-control" formControlName="status">
                    <option [value]="1">Applied (Pending)</option>
                    <option [value]="2">Allotted (Shares Received 🎉)</option>
                    <option [value]="3">Not Allotted (Refunded ❌)</option>
                    <option [value]="4">Sold on Listing / Post-Listing 💰</option>
                  </select>
                </div>

                @if (updateIpoForm.get('status')?.value == 2 || updateIpoForm.get('status')?.value == 4) {
                  <div class="form-row">
                    <div class="form-group col-half">
                      <label class="form-label">Shares Allotted</label>
                      <input type="number" class="form-control" formControlName="sharesAllotted" [placeholder]="ipo.totalShares" />
                    </div>
                    <div class="form-group col-half">
                      <label class="form-label">Listing Day Price (₹)</label>
                      <input type="number" step="0.05" class="form-control" formControlName="listingPrice" placeholder="e.g. 2100" />
                    </div>
                  </div>
                }

                @if (updateIpoForm.get('status')?.value == 4) {
                  <div class="form-row">
                    <div class="form-group col-half">
                      <label class="form-label">Sell / Exit Price (₹) *</label>
                      <input type="number" step="0.05" class="form-control" formControlName="sellPrice" placeholder="e.g. 2150" />
                    </div>
                    <div class="form-group col-half">
                      <label class="form-label">Sell Date</label>
                      <input type="date" class="form-control" formControlName="sellDate" />
                    </div>
                  </div>
                }

                <div class="form-group">
                  <label class="form-label">Notes</label>
                  <input type="text" class="form-control" formControlName="notes" placeholder="e.g. Booked listing gain of 18%" />
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn-outline" (click)="closeUpdateIpoModal()" [disabled]="submitting()">
                  Cancel
                </button>
                <button type="submit" class="btn-primary" [disabled]="submitting()">
                  {{ submitting() ? 'Saving...' : 'Update Status' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .trade-desk-page {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      font-size: 13px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .page-title {
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0;
      color: var(--color-text-main);
    }

    .subtitle {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      margin: 0.2rem 0 0;
    }

    .pulse-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(11, 87, 208, 0.1);
      color: var(--color-primary, #0b57d0);
      border: 1px solid rgba(11, 87, 208, 0.25);
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-primary, #0b57d0);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    /* Zerodha Summary Strip */
    .summary-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.25rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .summary-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sum-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--color-text-muted);
      letter-spacing: 0.05em;
    }

    .sum-val {
      font-size: 14.5px;
      font-weight: 700;
      color: var(--color-text-main);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .sum-sub {
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .summary-divider {
      width: 1px;
      height: 28px;
      background: var(--color-border);
    }

    .profit { color: #059669 !important; }
    .loss { color: #dc2626 !important; }
    .accent { color: var(--color-primary, #0b57d0); }

    .sum-badge {
      font-size: 10.5px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      &.profit { background: #ecfdf5; color: #059669; }
      &.loss { background: #fef2f2; color: #dc2626; }
    }

    /* Tabs */
    .tabs-nav-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--color-border);
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .desk-tabs {
      display: flex;
      gap: 4px;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--color-text-muted);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      margin-bottom: -1px;

      &.active {
        color: var(--color-primary, #0b57d0);
        border-bottom-color: var(--color-primary, #0b57d0);
      }
    }

    .tab-badge {
      padding: 1px 6px;
      border-radius: 9999px;
      font-size: 10px;
      background: var(--color-bg-subtle);
      color: var(--color-text-muted);
      &.special {
        background: rgba(11, 87, 208, 0.12);
        color: var(--color-primary, #0b57d0);
      }
    }

    .trade-sub-pills {
      display: inline-flex;
      gap: 2px;
      background: var(--color-bg-subtle);
      padding: 2px;
      border-radius: 6px;
      border: 1px solid var(--color-border);
    }

    .sub-pill {
      padding: 4px 10px;
      font-size: 11.5px;
      font-weight: 500;
      border: none;
      background: transparent;
      color: var(--color-text-muted);
      border-radius: 4px;
      cursor: pointer;
      &.active {
        background: var(--color-bg-card);
        color: var(--color-text-main);
        font-weight: 600;
        box-shadow: 0 1px 2px rgba(0,0,0,0.06);
      }
    }

    /* Table Styles */
    .table-container {
      overflow-x: auto;
      border-radius: 8px;
    }

    .desk-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 12.5px;

      thead th {
        background: var(--color-bg-subtle);
        color: var(--color-text-muted);
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        padding: 9px 12px;
        border-bottom: 1px solid var(--color-border);
        white-space: nowrap;
      }

      tbody td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--color-border-subtle);
        vertical-align: middle;
      }

      tbody tr:hover {
        background-color: var(--color-bg-subtle);
      }
    }

    .inst-cell {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .ticker-bold {
      font-weight: 700;
      color: var(--color-text-main);
    }

    .badge-exchange, .badge-trade-type, .issue-type-badge {
      font-size: 9.5px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 3px;
      background: var(--color-bg-subtle);
      color: var(--color-text-muted);
    }

    .badge-closed {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      background: #f1f5f9;
      color: #64748b;
    }

    .issue-type-badge.sme {
      background: #fef3c7;
      color: #92400e;
    }

    .company-sub {
      font-size: 11px;
      color: var(--color-text-muted);
      margin-top: 1px;
    }

    .live-cmp-price {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-text-main);
    }

    .day-change-tag {
      font-size: 10px;
      font-weight: 600;
      &.profit { color: #059669; }
      &.loss { color: #dc2626; }
    }

    .duration-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .days-badge {
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-main);
      &.warning {
        color: #d97706;
      }
    }

    .plan-sub {
      font-size: 10px;
      color: var(--color-text-muted);
    }

    .holding-badge {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .pnl-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      &.profit { background: #ecfdf5; color: #059669; }
      &.loss { background: #fef2f2; color: #dc2626; }
    }

    .status-pill {
      font-size: 10.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      &.status-1 { background: #e0f2fe; color: #0369a1; } /* Applied */
      &.status-2 { background: #ecfdf5; color: #059669; } /* Allotted */
      &.status-3 { background: #fef2f2; color: #dc2626; } /* Not Allotted */
      &.status-4 { background: #fef3c7; color: #b45309; } /* Sold */
    }

    .action-btn-group {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }

    .btn-sell-action {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      cursor: pointer;
      &:hover {
        background: #059669;
        color: white;
      }
    }

    .btn-table-edit {
      background: var(--color-canvas-default, #ffffff);
      color: var(--color-accent-fg, #0b57d0);
      border: 1px solid var(--color-border-default, #cbd5e1);
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      transition: all 0.15s ease;
      white-space: nowrap;
      &:hover {
        background: #eff6ff;
        border-color: #93c5fd;
        color: #1d4ed8;
      }
    }

    .btn-table-reopen {
      background: #fefce8;
      color: #a16207;
      border: 1px solid #fde047;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      transition: all 0.15s ease;
      white-space: nowrap;
      &:hover {
        background: #fef08a;
        color: #854d0e;
        border-color: #eab308;
      }
    }

    .btn-icon-del {
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      width: 24px;
      height: 24px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      &:hover {
        background: #fef2f2;
        border-color: #fca5a5;
      }
    }

    .trade-summary-card {
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 12px;
    }

    .charges-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .btn-calc-charges {
      background: rgba(11, 87, 208, 0.08);
      border: 1px solid rgba(11, 87, 208, 0.25);
      color: var(--color-primary, #0b57d0);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s ease;
      &:hover {
        background: var(--color-primary, #0b57d0);
        color: #fff;
      }
    }

    .pnl-breakdown-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      margin-bottom: 3px;

      &.net-row {
        font-size: 13px;
        margin-top: 5px;
      }

      .net-val {
        font-size: 13px;
        font-family: monospace;
      }
    }

    .pnl-breakdown-divider {
      height: 1px;
      background: var(--color-border);
      margin: 5px 0;
    }

    .charges-badge {
      font-size: 11px;
      font-weight: 600;
      color: #b45309;
      background: #fef3c7;
      padding: 1px 6px;
      border-radius: 4px;
      display: inline-block;
    }

    .preview-pnl-card {
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 12px;
      &.profit {
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        color: #059669;
      }
      &.loss {
        background: #fef2f2;
        border: 1px solid #fca5a5;
        color: #dc2626;
      }
    }

    .search-relative {
      position: relative;
    }

    .live-tag {
      font-size: 10px;
      font-weight: 700;
      color: #059669;
      background: rgba(16, 185, 129, 0.12);
      padding: 1px 5px;
      border-radius: 3px;
      margin-left: 6px;
    }

    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .input-spinner {
      position: absolute;
      right: 8px;
      font-size: 11px;
    }

    .autocomplete-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 9999;
      max-height: 250px;
      overflow-y: auto;
      background: var(--color-bg-surface, #ffffff);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25);

      &.ipo-dropdown {
        min-width: 320px;
      }
    }

    .dropdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 8px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
      background: var(--color-bg-secondary, #f8fafc);
    }

    .btn-tiny-close {
      background: none;
      border: none;
      font-size: 14px;
      cursor: pointer;
      color: var(--color-text-muted);
      line-height: 1;
      padding: 0 4px;
      &:hover { color: var(--color-text-main); }
    }

    .dropdown-list {
      display: flex;
      flex-direction: column;
    }

    .suggestion-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px;
      border-bottom: 1px solid var(--color-border);
      cursor: pointer;
      transition: background 0.15s ease;

      &:last-child {
        border-bottom: none;
      }

      &:hover {
        background: rgba(11, 87, 208, 0.08);
      }

      .item-left {
        display: flex;
        flex-direction: column;
        gap: 1px;
        overflow: hidden;
      }

      .ticker-row {
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .item-ticker {
        font-size: 12px;
        font-weight: 700;
        color: var(--color-text-main);
      }

      .badge-exchange {
        font-size: 9px;
        font-weight: 700;
        padding: 1px 4px;
        border-radius: 3px;
        background: #f1f5f9;
        color: #475569;
        border: 1px solid #cbd5e1;
      }

      .item-name {
        font-size: 11px;
        color: var(--color-text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
      }

      .item-right {
        text-align: right;
        flex-shrink: 0;
      }

      .item-price {
        font-size: 12px;
        font-weight: 700;
        color: #059669;
        font-family: monospace;
      }

      .item-cmp {
        font-size: 9px;
        color: var(--color-text-muted);
        text-transform: uppercase;
      }
    }

    .status-pill-mini {
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 3px;
      font-weight: 700;
      text-transform: uppercase;
      &.open { background: #dcfce7; color: #15803d; }
      &.upcoming { background: #e0f2fe; color: #0369a1; }
      &.listed { background: #f1f5f9; color: #475569; }
    }

    .calc-preview-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px;
      border-radius: 5px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #059669;
      font-size: 11px;
      margin-bottom: 8px;

      strong {
        font-size: 12px;
        font-family: monospace;
      }

      &.ipo-calc {
        flex-direction: column;
        align-items: flex-start;
        gap: 3px;
        > div {
          display: flex;
          justify-content: space-between;
          width: 100%;
        }
      }
    }

    .form-row {
      display: flex;
      gap: 10px;
    }

    .col-half {
      flex: 1;
    }

    .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
      .empty-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
      h3 { font-size: 1rem; font-weight: 700; margin: 0 0 0.25rem; }
      p { color: var(--color-text-muted); font-size: 0.8125rem; max-width: 440px; margin: 0 auto; }
    }
  `]
})
export class TradeDeskComponent implements OnInit, OnDestroy {
  private readonly tradeDeskService = inject(TradeDeskService);
  private readonly fb = inject(FormBuilder);
  readonly themeService = inject(ThemeService);

  readonly overview = signal<TradeDeskOverview | null>(null);
  readonly loading = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  private autoRefreshTimer: any = null;

  readonly activeTab = signal<'trades' | 'ipos'>('trades');
  readonly tradeSubFilter = signal<'open' | 'closed'>('open');

  // Modals
  readonly showCreateTradeModal = signal<boolean>(false);
  readonly selectedTradeToClose = signal<TradeOrder | null>(null);
  readonly isEditingClosedTrade = signal<boolean>(false);
  readonly showCreateIpoModal = signal<boolean>(false);
  readonly selectedIpoToUpdate = signal<IpoApplication | null>(null);

  // Live Search States
  readonly stockSearchQuery = signal<string>('');
  readonly stockSuggestions = signal<StockSearchResult[]>([]);
  readonly searchingStocks = signal<boolean>(false);
  readonly showStockSuggestions = signal<boolean>(false);
  private stockSearchDebounceTimer: any = null;

  readonly ipoSearchQuery = signal<string>('');
  readonly ipoSuggestions = signal<LiveIpo[]>([]);
  readonly searchingIpos = signal<boolean>(false);
  readonly showIpoSuggestions = signal<boolean>(false);
  private ipoSearchDebounceTimer: any = null;

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showStockSuggestions.set(false);
    this.showIpoSuggestions.set(false);
  }

  // Forms
  readonly tradeForm = this.fb.group({
    ticker: ['', [Validators.required]],
    companyName: [''],
    exchange: ['NSE'],
    tradeType: [1, [Validators.required]],
    buyPrice: [null as number | null, [Validators.required, Validators.min(0.01)]],
    quantity: [null as number | null, [Validators.required, Validators.min(1)]],
    buyDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
    plannedHoldingDays: [10, [Validators.required, Validators.min(1)]],
    targetPrice: [null as number | null],
    stopLossPrice: [null as number | null],
    notes: ['']
  });

  readonly closeTradeForm = this.fb.group({
    sellPrice: [null as number | null, [Validators.required, Validators.min(0.01)]],
    sellDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
    totalCharges: [0 as number, [Validators.min(0)]],
    notes: ['']
  });

  readonly ipoForm = this.fb.group({
    companyName: ['', [Validators.required]],
    symbol: [''],
    issueType: [1, [Validators.required]],
    applicationDate: [new Date().toISOString().substring(0, 10), [Validators.required]],
    lotSize: [1, [Validators.required, Validators.min(1)]],
    lotsApplied: [1, [Validators.required, Validators.min(1)]],
    bidPrice: [null as number | null, [Validators.required, Validators.min(0.01)]],
    applicationNumber: [''],
    upiId: [''],
    notes: ['']
  });

  readonly updateIpoForm = this.fb.group({
    status: [2 as number, [Validators.required]],
    sharesAllotted: [null as number | null],
    listingPrice: [null as number | null],
    sellPrice: [null as number | null],
    sellDate: [new Date().toISOString().substring(0, 10)],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadOverview();
    // Auto-refresh live market quotes every 30 seconds
    this.autoRefreshTimer = setInterval(() => {
      this.loadOverview(true);
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
    }
  }

  loadOverview(silent = false): void {
    if (!silent) this.loading.set(true);
    this.tradeDeskService.getOverview().subscribe({
      next: (data) => {
        this.overview.set(data);
        if (!silent) this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load trade desk overview:', err);
        if (!silent) this.loading.set(false);
      }
    });
  }

  setActiveTab(tab: 'trades' | 'ipos'): void {
    this.activeTab.set(tab);
  }

  onStockSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value || '';
    this.stockSearchQuery.set(query);
    clearTimeout(this.stockSearchDebounceTimer);

    if (!query.trim()) {
      this.loadDefaultStockSuggestions();
      return;
    }

    this.searchingStocks.set(true);
    this.stockSearchDebounceTimer = setTimeout(() => {
      this.tradeDeskService.searchStocks(query.trim()).subscribe({
        next: (results) => {
          this.stockSuggestions.set(results || []);
          this.searchingStocks.set(false);
          this.showStockSuggestions.set(true);
        },
        error: () => {
          this.searchingStocks.set(false);
        }
      });
    }, 200);
  }

  onStockSearchFocus(): void {
    const query = this.tradeForm.get('ticker')?.value || '';
    if (!query.trim()) {
      this.loadDefaultStockSuggestions();
    } else {
      this.showStockSuggestions.set(true);
    }
  }

  loadDefaultStockSuggestions(): void {
    this.searchingStocks.set(true);
    this.tradeDeskService.searchStocks('').subscribe({
      next: (results) => {
        this.stockSuggestions.set(results || []);
        this.searchingStocks.set(false);
        this.showStockSuggestions.set(true);
      },
      error: () => {
        this.searchingStocks.set(false);
      }
    });
  }

  selectStock(stock: StockSearchResult): void {
    const cleanTicker = stock.ticker;
    const cmp = Number(stock.currentPrice || 0);

    this.tradeForm.patchValue({
      ticker: cleanTicker,
      companyName: stock.companyName,
      exchange: stock.exchange || 'NSE'
    });

    if (cmp > 0) {
      const buyPrice = cmp;
      const targetPrice = Math.round(buyPrice * 1.08 * 100) / 100;
      const stopLossPrice = Math.round(buyPrice * 0.97 * 100) / 100;
      this.tradeForm.patchValue({
        buyPrice,
        targetPrice,
        stopLossPrice
      });
    } else {
      this.tradeDeskService.getQuote(cleanTicker).subscribe({
        next: (q) => {
          if (q && q.currentPrice > 0) {
            const buyPrice = q.currentPrice;
            const targetPrice = Math.round(buyPrice * 1.08 * 100) / 100;
            const stopLossPrice = Math.round(buyPrice * 0.97 * 100) / 100;
            this.tradeForm.patchValue({
              buyPrice,
              targetPrice,
              stopLossPrice
            });
          }
        }
      });
    }

    this.showStockSuggestions.set(false);
  }

  onIpoSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value || '';
    this.ipoSearchQuery.set(query);
    clearTimeout(this.ipoSearchDebounceTimer);

    this.searchingIpos.set(true);
    this.ipoSearchDebounceTimer = setTimeout(() => {
      this.tradeDeskService.getLiveIpos(query.trim()).subscribe({
        next: (results) => {
          this.ipoSuggestions.set(results || []);
          this.searchingIpos.set(false);
          this.showIpoSuggestions.set(true);
        },
        error: () => {
          this.searchingIpos.set(false);
        }
      });
    }, 150);
  }

  onIpoSearchFocus(): void {
    const query = this.ipoForm.get('companyName')?.value || '';
    this.searchingIpos.set(true);
    this.tradeDeskService.getLiveIpos(query.trim()).subscribe({
      next: (results) => {
        this.ipoSuggestions.set(results || []);
        this.searchingIpos.set(false);
        this.showIpoSuggestions.set(true);
      },
      error: () => {
        this.searchingIpos.set(false);
      }
    });
  }

  selectIpo(ipo: LiveIpo): void {
    const issueTypeVal = ipo.issueType === 'Sme' ? 2 : 1;
    this.ipoForm.patchValue({
      companyName: ipo.companyName,
      symbol: ipo.symbol,
      issueType: issueTypeVal,
      lotSize: ipo.lotSize,
      lotsApplied: 1,
      bidPrice: ipo.maxPrice,
      notes: `Issue: ${ipo.issueType} | Price Band: ₹${ipo.minPrice}-₹${ipo.maxPrice} | Closes: ${ipo.closeDate}`
    });
    this.showIpoSuggestions.set(false);
  }

  openCreateTradeModal(): void {
    this.showStockSuggestions.set(false);
    this.tradeForm.reset({
      ticker: '',
      companyName: '',
      exchange: 'NSE',
      tradeType: 1,
      buyPrice: null,
      quantity: null,
      buyDate: new Date().toISOString().substring(0, 10),
      plannedHoldingDays: 10,
      targetPrice: null,
      stopLossPrice: null,
      notes: ''
    });
    this.loadDefaultStockSuggestions();
    this.showCreateTradeModal.set(true);
  }

  closeCreateTradeModal(): void {
    this.showCreateTradeModal.set(false);
  }

  submitCreateTrade(): void {
    if (this.tradeForm.invalid) return;

    this.submitting.set(true);
    const formVal = this.tradeForm.value;

    const payload: CreateTradePayload = {
      ticker: formVal.ticker!,
      companyName: formVal.companyName || formVal.ticker!,
      exchange: formVal.exchange || 'NSE',
      tradeType: Number(formVal.tradeType) as TradeType,
      buyPrice: Number(formVal.buyPrice),
      quantity: Number(formVal.quantity),
      buyDate: formVal.buyDate!,
      plannedHoldingDays: Number(formVal.plannedHoldingDays || 10),
      targetPrice: formVal.targetPrice ? Number(formVal.targetPrice) : null,
      stopLossPrice: formVal.stopLossPrice ? Number(formVal.stopLossPrice) : null,
      notes: formVal.notes || null
    };

    this.tradeDeskService.createTrade(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeCreateTradeModal();
        this.loadOverview();
      },
      error: (err) => {
        console.error('Failed to create trade:', err);
        this.submitting.set(false);
      }
    });
  }

  openCloseTradeModal(trade: TradeOrder): void {
    this.isEditingClosedTrade.set(false);
    this.selectedTradeToClose.set(trade);
    const suggestedPrice = trade.currentMarketPrice > 0 ? trade.currentMarketPrice : trade.buyPrice;

    // Auto-calculate estimated standard Indian delivery charges
    const buyTurnover = trade.investedAmount;
    const sellTurnover = suggestedPrice * trade.quantity;
    const totalTurnover = buyTurnover + sellTurnover;
    const stt = totalTurnover * 0.001; // 0.1% STT
    const dpCharges = 15.34; // CDSL DP Charge
    const exchAndGovt = totalTurnover * 0.00025; // Exch + SEBI + Stamp + GST
    const estimatedCharges = Math.round((stt + dpCharges + exchAndGovt) * 100) / 100;

    this.closeTradeForm.reset({
      sellPrice: suggestedPrice,
      sellDate: new Date().toISOString().substring(0, 10),
      totalCharges: estimatedCharges,
      notes: ''
    });
  }

  openEditClosedTradeModal(trade: TradeOrder): void {
    this.isEditingClosedTrade.set(true);
    this.selectedTradeToClose.set(trade);
    const existingSellPrice = trade.sellPrice ?? trade.buyPrice;
    const existingDate = trade.sellDate ? trade.sellDate.substring(0, 10) : new Date().toISOString().substring(0, 10);
    const existingCharges = trade.totalCharges ?? 0;

    this.closeTradeForm.reset({
      sellPrice: existingSellPrice,
      sellDate: existingDate,
      totalCharges: existingCharges,
      notes: trade.notes ?? ''
    });
  }

  confirmReopenTrade(trade: TradeOrder): void {
    const ok = confirm(
      `Are you sure you want to REOPEN the trade for "${trade.ticker}"?\n\nThis will remove it from Closed History and move it back into Active Open Trades with live market tracking.`
    );
    if (!ok) return;

    this.tradeDeskService.reopenTrade(trade.id).subscribe({
      next: () => {
        this.themeService.playSuccessSound();
        this.loadOverview();
      },
      error: (err) => {
        console.error('Failed to reopen trade:', err);
        alert('Failed to reopen trade. Please try again.');
      }
    });
  }

  autoEstimateCharges(trade: TradeOrder): void {
    const sp = Number(this.closeTradeForm.get('sellPrice')?.value) || trade.buyPrice;
    const qty = trade.quantity;
    const buyTurnover = trade.investedAmount;
    const sellTurnover = sp * qty;
    const totalTurnover = buyTurnover + sellTurnover;

    const stt = totalTurnover * 0.001;
    const dpCharges = 15.34;
    const exchAndGovt = totalTurnover * 0.00025;
    const estimatedTotal = Math.round((stt + dpCharges + exchAndGovt) * 100) / 100;
    this.closeTradeForm.patchValue({ totalCharges: estimatedTotal });
  }

  closeCloseTradeModal(): void {
    this.selectedTradeToClose.set(null);
  }

  submitCloseTrade(): void {
    const trade = this.selectedTradeToClose();
    if (!trade || this.closeTradeForm.invalid) return;

    this.submitting.set(true);
    const formVal = this.closeTradeForm.value;

    const payload: CloseTradePayload = {
      sellPrice: Number(formVal.sellPrice),
      sellDate: formVal.sellDate!,
      totalCharges: Number(formVal.totalCharges || 0),
      notes: formVal.notes || null
    };

    const action$ = this.isEditingClosedTrade()
      ? this.tradeDeskService.updateClosedTrade(trade.id, payload)
      : this.tradeDeskService.closeTrade(trade.id, payload);

    action$.subscribe({
      next: () => {
        this.themeService.playSuccessSound();
        this.submitting.set(false);
        this.closeCloseTradeModal();
        this.loadOverview();
      },
      error: (err) => {
        console.error('Failed to process trade close/update action:', err);
        this.submitting.set(false);
        alert('Failed to update trade. Please check inputs and try again.');
      }
    });
  }

  deleteTrade(id: string): void {
    if (!confirm('Are you sure you want to delete this trade record?')) return;

    this.tradeDeskService.deleteTrade(id).subscribe({
      next: () => this.loadOverview(),
      error: (err) => console.error('Failed to delete trade:', err)
    });
  }

  openCreateIpoModal(): void {
    this.showIpoSuggestions.set(false);
    this.ipoForm.reset({
      companyName: '',
      symbol: '',
      issueType: 1,
      applicationDate: new Date().toISOString().substring(0, 10),
      lotSize: 1,
      lotsApplied: 1,
      bidPrice: null,
      applicationNumber: '',
      upiId: '',
      notes: ''
    });
    this.onIpoSearchFocus();
    this.showCreateIpoModal.set(true);
  }

  closeCreateIpoModal(): void {
    this.showCreateIpoModal.set(false);
  }

  submitCreateIpo(): void {
    if (this.ipoForm.invalid) return;

    this.submitting.set(true);
    const formVal = this.ipoForm.value;

    const payload: CreateIpoPayload = {
      companyName: formVal.companyName!,
      symbol: formVal.symbol || formVal.companyName!,
      issueType: Number(formVal.issueType) as IpoIssueType,
      applicationDate: formVal.applicationDate!,
      lotSize: Number(formVal.lotSize),
      lotsApplied: Number(formVal.lotsApplied),
      bidPrice: Number(formVal.bidPrice),
      applicationNumber: formVal.applicationNumber || null,
      upiId: formVal.upiId || null,
      notes: formVal.notes || null
    };

    this.tradeDeskService.createIpo(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeCreateIpoModal();
        this.loadOverview();
      },
      error: (err) => {
        console.error('Failed to create IPO application:', err);
        this.submitting.set(false);
      }
    });
  }

  openUpdateIpoModal(ipo: IpoApplication): void {
    this.selectedIpoToUpdate.set(ipo);
    this.updateIpoForm.patchValue({
      status: ipo.status,
      sharesAllotted: ipo.sharesAllotted || ipo.totalShares,
      listingPrice: ipo.listingPrice || null,
      sellPrice: ipo.sellPrice || null,
      sellDate: ipo.sellDate ? ipo.sellDate.substring(0, 10) : new Date().toISOString().substring(0, 10),
      notes: ipo.notes || ''
    });
  }

  closeUpdateIpoModal(): void {
    this.selectedIpoToUpdate.set(null);
  }

  submitUpdateIpoStatus(): void {
    const ipo = this.selectedIpoToUpdate();
    if (!ipo || this.updateIpoForm.invalid) return;

    this.submitting.set(true);
    const formVal = this.updateIpoForm.value;

    const payload: UpdateIpoStatusPayload = {
      status: Number(formVal.status) as IpoApplicationStatus,
      sharesAllotted: formVal.sharesAllotted ? Number(formVal.sharesAllotted) : null,
      listingPrice: formVal.listingPrice ? Number(formVal.listingPrice) : null,
      sellPrice: formVal.sellPrice ? Number(formVal.sellPrice) : null,
      sellDate: formVal.sellDate || null,
      notes: formVal.notes || null
    };

    this.tradeDeskService.updateIpoStatus(ipo.id, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeUpdateIpoModal();
        this.loadOverview();
      },
      error: (err) => {
        console.error('Failed to update IPO status:', err);
        this.submitting.set(false);
      }
    });
  }

  deleteIpo(id: string): void {
    if (!confirm('Are you sure you want to delete this IPO application record?')) return;

    this.tradeDeskService.deleteIpo(id).subscribe({
      next: () => this.loadOverview(),
      error: (err) => console.error('Failed to delete IPO:', err)
    });
  }
}

