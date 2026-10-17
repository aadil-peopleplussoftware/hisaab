import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketAiService } from './services/market-ai.service';
import {
  MarketAiPortfolioOverview,
  StockHoldingWithAnalysis,
  MarketScreenerStock,
  CreateStockHoldingRequest,
  UpdateStockHoldingRequest,
  AskMarketAiResponse,
  MarketQuote,
  StockSearchResult,
  PreMarketStockItem,
  PreMarketDailyReport,
  PortfolioTargetHitAlert,
  MarketAgentUserSetting,
  MarketAgentAlertLog,
  MarketAgentStatus
} from './models/market-ai.model';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-market-ai',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  template: `
    <div class="market-ai-container">
      <!-- Top Header & Live Market Status -->
      <header class="market-ai-header">
        <div class="header-left">
          <div class="header-badge-row">
            <span class="ai-hub-tag">
              <span class="tag-sparkle">✨</span>
              <span>AI MARKET INTELLIGENCE</span>
            </span>
            <div class="market-pulse-pill" [class.open]="isMarketActive()" [class.closed]="!isMarketActive()">
              <span class="pulse-dot"></span>
              <span>{{ isMarketActive() ? 'LIVE NSE FEED: ACTIVE' : 'MARKET CLOSED (REAL-TIME ENGINE LIVE)' }}</span>
            </div>
          </div>
          <h1 class="page-title">AI Stock Market Hub & Predictive Portfolio</h1>
          <p class="page-subtitle">Real-time live prices, per-share profit target triggers, AI buy/sell recommendations, and predictive upside/downside analytics.</p>
        </div>

        <div class="header-actions">
          <!-- Auto-refresh switch -->
          <div class="auto-refresh-box" (click)="toggleAutoRefresh()" title="Toggle 15s auto-refresh">
            <span class="refresh-indicator" [class.spinning]="isRefreshing()">🔄</span>
            <span class="refresh-label">Auto 15s: <strong>{{ isAutoRefreshOn() ? 'ON' : 'OFF' }}</strong></span>
          </div>

          <button type="button" class="btn-refresh" (click)="refreshData()" [disabled]="isRefreshing()">
            <span [class.spin]="isRefreshing()">⚡</span>
            <span>Refresh Live Data</span>
          </button>

          <button type="button" class="btn-add-stock" (click)="openAddStockModal()">
            <span>+ Add Share / Stock</span>
          </button>
        </div>
      </header>

      <!-- Target Hit Urgent Alert Ribbon -->
      @if (targetHitHoldings().length > 0) {
        <div class="target-alert-banner">
          <div class="alert-pulse-icon">🎯</div>
          <div class="alert-content">
            <div class="alert-title-row">
              <strong>PROFIT TARGET REACHED ON {{ targetHitHoldings().length }} SHARE(S)!</strong>
              <span class="alert-badge">ACTION RECOMMENDED</span>
            </div>
            <p class="alert-desc">
              @for (h of targetHitHoldings(); track h.holding.id) {
                <span><strong>{{ h.holding.ticker }}</strong>: Hit ₹{{ h.analysis.currentProfitPerShare | number:'1.0-0' }}/share profit (Target: ₹{{ h.holding.targetProfitPerShare | number:'1.0-0' }}). AI Decision: <em>{{ h.analysis.actionBadgeText }}</em>. </span>
              }
            </p>
          </div>
          <button type="button" class="btn-alert-action" (click)="setActiveTab('portfolio')">
            Review AI Exit Plan →
          </button>
        </div>
      }

      <!-- Top KPI Analytics Metric Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">TOTAL INVESTED CAPITAL</span>
            <span class="kpi-icon">💼</span>
          </div>
          <div class="kpi-value">₹{{ (overview()?.totalPortfolioInvested || 0) | number:'1.2-2' }}</div>
          <div class="kpi-sub">Across {{ overview()?.totalStocksCount || 0 }} Active Holdings</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-top">
            <span class="kpi-label">CURRENT PORTFOLIO VALUE</span>
            <span class="kpi-icon">📈</span>
          </div>
          <div class="kpi-value">₹{{ (overview()?.totalPortfolioCurrentValue || 0) | number:'1.2-2' }}</div>
          <div class="kpi-sub" [class.profit]="(overview()?.totalPortfolioProfitLoss || 0) >= 0" [class.loss]="(overview()?.totalPortfolioProfitLoss || 0) < 0">
            {{ (overview()?.totalPortfolioProfitLoss || 0) >= 0 ? '+' : '' }}₹{{ (overview()?.totalPortfolioProfitLoss || 0) | number:'1.2-2' }}
            ({{ (overview()?.totalPortfolioGainPercentage || 0) | number:'1.2-2' }}%)
          </div>
        </div>

        <div class="kpi-card alert-kpi" [class.highlight]="(overview()?.targetHitCount || 0) > 0">
          <div class="kpi-top">
            <span class="kpi-label">TARGETS REACHED</span>
            <span class="kpi-icon">💰</span>
          </div>
          <div class="kpi-value">{{ overview()?.targetHitCount || 0 }} Stocks</div>
          <div class="kpi-sub highlight-text">
            @if ((overview()?.targetHitCount || 0) > 0) {
              {{ overview()?.profitBookingRecommendedCount }} Ready for Profit Booking
            } @else {
              {{ overview()?.targetApproachingCount || 0 }} Stocks Approaching Target (>=85%)
            }
          </div>
        </div>

        <div class="kpi-card screener-kpi">
          <div class="kpi-top">
            <span class="kpi-label">AI BUY OPPORTUNITIES</span>
            <span class="kpi-icon">🚀</span>
          </div>
          <div class="kpi-value">{{ overview()?.topBuyOpportunities?.length || 0 }} Setups</div>
          <div class="kpi-sub screener-link" (click)="setActiveTab('screener')">
            View High-Probability Breakout Picks →
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <nav class="market-ai-nav" role="tablist">
        <button
          type="button"
          class="nav-tab-btn"
          [class.active]="activeTab() === 'portfolio'"
          (click)="setActiveTab('portfolio')">
          <span class="tab-icon">📊</span>
          <span>My AI Live Portfolio</span>
          <span class="tab-pill">{{ overview()?.totalStocksCount || 0 }}</span>
        </button>

        <button
          type="button"
          class="nav-tab-btn"
          [class.active]="activeTab() === 'screener'"
          (click)="setActiveTab('screener')">
          <span class="tab-icon">🎯</span>
          <span>AI Screener: Konsa Share Lena Hai</span>
          <span class="tab-pill special">5 Picks</span>
        </button>

        <button
          type="button"
          class="nav-tab-btn"
          [class.active]="activeTab() === 'copilot'"
          (click)="setActiveTab('copilot')">
          <span class="tab-icon">🤖</span>
          <span>Poocho AI Se (Live Copilot)</span>
        </button>

        <button
          type="button"
          class="nav-tab-btn"
          [class.active]="activeTab() === 'agents'"
          (click)="setActiveTab('agents')">
          <span class="tab-icon">🤖</span>
          <span>Agents Mission Control (Kaun Kya Kar Raha Hai)</span>
          <span class="tab-pill special">3 Agents Live</span>
        </button>
      </nav>

      <!-- TAB 1: MY LIVE AI PORTFOLIO -->
      @if (activeTab() === 'portfolio') {
        <div class="tab-pane">
          @if (!overview() || overview()!.holdingsWithAnalysis.length === 0) {
            <div class="empty-state-card">
              <div class="empty-icon">📈</div>
              <h3>Apna Pehla Share Add Karein!</h3>
              <p>Add the stocks you own along with your target profit per share (e.g. ₹1,000). The AI engine will track live market prices and tell you exactly when to exit, how much higher it can rally, and where to set trailing stop-losses!</p>
              <div class="empty-quick-add">
                <button type="button" class="btn-primary-action" (click)="openAddStockModal()">
                  + Add Your First Stock
                </button>
                <button type="button" class="btn-secondary-action" (click)="setActiveTab('screener')">
                  Explore AI Buy Recommendations →
                </button>
              </div>
            </div>
          } @else {
            <div class="holdings-grid">
              @for (item of overview()!.holdingsWithAnalysis; track item.holding.id) {
                <div class="stock-analysis-card" [class.target-hit]="item.analysis.isTargetHit" [class.stop-breached]="item.analysis.isStopLossBreached">
                  <!-- Card Header -->
                  <div class="card-head">
                    <div class="company-meta">
                      <div class="ticker-badge-row">
                        <span class="ticker-symbol">{{ item.holding.ticker }}</span>
                        <span class="exchange-tag">{{ item.holding.exchange }}</span>
                        @if (item.analysis.isTargetHit) {
                          <span class="badge-target-achieved">🎯 TARGET HIT</span>
                        }
                      </div>
                      <h3 class="company-name">{{ item.holding.companyName }}</h3>
                    </div>

                    <!-- Live Price & Day Change -->
                    <div class="price-meta">
                      <div class="live-ltp">₹{{ item.quote.currentPrice | number:'1.2-2' }}</div>
                      <div class="day-change" [class.positive]="item.quote.dayChange >= 0" [class.negative]="item.quote.dayChange < 0">
                        {{ item.quote.dayChange >= 0 ? '+' : '' }}₹{{ item.quote.dayChange | number:'1.2-2' }}
                        ({{ item.quote.dayChangePercent | number:'1.2-2' }}%)
                      </div>
                    </div>
                  </div>

                  <!-- Investment Stats Strip -->
                  <div class="position-stats-strip">
                    <div class="stat-col">
                      <span class="stat-lbl">BUY PRICE</span>
                      <span class="stat-val">₹{{ item.holding.buyPrice | number:'1.2-2' }}</span>
                    </div>
                    <div class="stat-col">
                      <span class="stat-lbl">QTY</span>
                      <span class="stat-val">{{ item.holding.quantity | number:'1.0-4' }}</span>
                    </div>
                    <div class="stat-col">
                      <span class="stat-lbl">INVESTED</span>
                      <span class="stat-val">₹{{ item.analysis.investedAmount | number:'1.2-2' }}</span>
                    </div>
                    <div class="stat-col">
                      <span class="stat-lbl">CURRENT VALUE</span>
                      <span class="stat-val">₹{{ item.analysis.currentValue | number:'1.2-2' }}</span>
                    </div>
                    <div class="stat-col">
                      <span class="stat-lbl">TOTAL PROFIT/LOSS</span>
                      <span class="stat-val" [class.profit]="item.analysis.totalProfitLoss >= 0" [class.loss]="item.analysis.totalProfitLoss < 0">
                        {{ item.analysis.totalProfitLoss >= 0 ? '+' : '' }}₹{{ item.analysis.totalProfitLoss | number:'1.2-2' }}
                        ({{ item.analysis.profitLossPercentage | number:'1.2-2' }}%)
                      </span>
                    </div>
                  </div>

                  <!-- Target Profit Progress Bar -->
                  <div class="target-progress-block">
                    <div class="target-header-row">
                      <span class="target-subheading">
                        🎯 Per-Share Target Profit:
                        <strong>₹{{ (item.holding.targetProfitPerShare || 0) | number:'1.0-0' }} / share</strong>
                      </span>
                      <span class="target-current-achievement" [class.hit]="item.analysis.isTargetHit">
                        Current Gain: <strong>{{ item.analysis.currentProfitPerShare >= 0 ? '+' : '' }}₹{{ item.analysis.currentProfitPerShare | number:'1.2-2' }} / share</strong>
                        ({{ item.analysis.targetProgressPercentage || 0 | number:'1.0-0' }}% Achieved)
                      </span>
                    </div>
                    <div class="progress-bar-track">
                      <div
                        class="progress-bar-fill"
                        [class.fill-hit]="item.analysis.isTargetHit"
                        [style.width.%]="Math.min(100, Math.max(0, item.analysis.targetProgressPercentage || 0))">
                      </div>
                    </div>
                  </div>

                  <!-- AI Strategic Action Recommendation Badge -->
                  <div class="ai-recommendation-banner" [style.border-color]="item.analysis.actionColor">
                    <div class="recommendation-badge" [style.background-color]="item.analysis.actionColor">
                      {{ item.analysis.actionBadgeText }}
                    </div>
                    <div class="sentiment-meter">
                      <span class="meter-label">AI Bullish Meter:</span>
                      <span class="meter-score"><strong>{{ item.analysis.bullishScore }}/100</strong> ({{ item.analysis.sentimentLabel }})</span>
                    </div>
                  </div>

                  <!-- Deep Predictive Market Analytics Grid -->
                  <div class="predictive-analytics-grid">
                    <!-- Upside Analysis Card ("Kitna Upar Ja Sakta Hai?") -->
                    <div class="analytics-card upside-box">
                      <div class="box-head">
                        <span class="box-icon">🚀</span>
                        <strong>Kitna Aur Upar Ja Sakta Hai? (Upside)</strong>
                      </div>
                      <div class="box-numbers">
                        <div class="primary-num green">
                          ₹{{ item.analysis.nextUpsideTargetPrice | number:'1.2-2' }}
                          <span class="num-delta">(+{{ item.analysis.upsidePercentage | number:'1.1-1' }}%)</span>
                        </div>
                        <div class="prob-tag">
                          Upside Probability: <strong>{{ item.analysis.upsideProbabilityPercent }}%</strong>
                        </div>
                      </div>
                      <p class="box-rationale">{{ item.analysis.upsideRationale }}</p>
                    </div>

                    <!-- Downside Analysis Card ("Kitna Niche Gir Sakta Hai?") -->
                    <div class="analytics-card downside-box">
                      <div class="box-head">
                        <span class="box-icon">🛡️</span>
                        <strong>Kitna Niche Gir Sakta Hai? (Risk Cushion)</strong>
                      </div>
                      <div class="box-numbers">
                        <div class="primary-num red">
                          ₹{{ item.analysis.keySupportPrice | number:'1.2-2' }}
                          <span class="num-delta">(-{{ item.analysis.downsidePercentage | number:'1.1-1' }}%)</span>
                        </div>
                        <div class="prob-tag risk">
                          Downside Risk: <strong>{{ item.analysis.downsideProbabilityPercent }}%</strong>
                        </div>
                      </div>
                      <p class="box-rationale">{{ item.analysis.downsideRationale }}</p>
                      @if (item.analysis.recommendedTrailingStopLoss) {
                        <div class="trailing-sl-pill">
                          🔒 AI Trailing Stop-Loss: <strong>₹{{ item.analysis.recommendedTrailingStopLoss | number:'1.2-2' }}</strong>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- AI Narrative Guidance (Hindi) -->
                  <div class="ai-narrative-box">
                    <div class="narrative-title">
                      <span>💡 AI Expert Strategy:</span>
                    </div>
                    <p class="narrative-text">{{ item.analysis.aiSummaryHindi }}</p>
                  </div>

                  <!-- Action Footers -->
                  <div class="card-footer-actions">
                    <button type="button" class="btn-card-ask-groww" (click)="openGrowwAiForStock(item)">
                      🤖 Poocho AI Se (Groww Insights)
                    </button>
                    <div class="right-footer-btns">
                      <button type="button" class="btn-card-edit" (click)="openEditStockModal(item)">
                        ✏️ Edit Target
                      </button>
                      <button type="button" class="btn-card-delete" (click)="deleteStock(item.holding.id)">
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- TAB 2: AI MARKET SCREENER (KONSA SHARE LENA HAI) -->
      @if (activeTab() === 'screener') {
        <div class="tab-pane">
          <div class="screener-intro">
            <h2>🎯 AI Screener: High-Probability Breakout & Value Entries</h2>
            <p>Our algorithmic quantitative models screen all large-cap and mid-cap Indian shares for RSI momentum breakouts, 20 EMA pullbacks, and favorable Risk-to-Reward ratios.</p>
          </div>

          <div class="screener-grid">
            @for (pick of overview()?.topBuyOpportunities || []; track pick.ticker) {
              <div class="screener-card">
                <div class="screener-top">
                  <div>
                    <span class="screener-sector">{{ pick.sector }}</span>
                    <h3 class="screener-ticker">{{ pick.ticker }}</h3>
                    <div class="screener-name">{{ pick.companyName }}</div>
                  </div>
                  <div class="screener-rec-badge">
                    {{ pick.recommendation }}
                  </div>
                </div>

                <div class="screener-price-row">
                  <div class="sc-price-item">
                    <span class="sc-lbl">CURRENT LTP</span>
                    <span class="sc-val">₹{{ pick.currentPrice | number:'1.2-2' }}</span>
                  </div>
                  <div class="sc-price-item">
                    <span class="sc-lbl">ENTRY ZONE</span>
                    <span class="sc-val highlight">₹{{ pick.entryPrice | number:'1.2-2' }}</span>
                  </div>
                  <div class="sc-price-item">
                    <span class="sc-lbl">TARGET 1</span>
                    <span class="sc-val green">₹{{ pick.targetPrice1 | number:'1.2-2' }}</span>
                  </div>
                  <div class="sc-price-item">
                    <span class="sc-lbl">TARGET 2</span>
                    <span class="sc-val green">₹{{ pick.targetPrice2 | number:'1.2-2' }}</span>
                  </div>
                  <div class="sc-price-item">
                    <span class="sc-lbl">STOP-LOSS</span>
                    <span class="sc-val red">₹{{ pick.stopLossPrice | number:'1.2-2' }}</span>
                  </div>
                </div>

                <div class="screener-catalyst-box">
                  <div class="catalyst-tag">
                    <span>⚡ Setup: <strong>{{ pick.setupType }}</strong></span>
                    <span class="rr-tag">R:R <strong>1:{{ pick.riskRewardRatio | number:'1.1-1' }}</strong></span>
                    <span class="confidence-tag">AI Confidence: <strong>{{ pick.confidenceScore }}%</strong></span>
                  </div>
                  <p class="catalyst-text">{{ pick.catalyst }}</p>
                </div>

                <div class="screener-actions">
                  <button type="button" class="btn-add-screener-stock" (click)="addScreenerStockToPortfolio(pick)">
                    + Add to My Portfolio Watchlist
                  </button>
                  <button type="button" class="btn-ask-screener" (click)="askAboutStock(pick.ticker)">
                    Ask AI Deep Analysis →
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- TAB 3: POOCHO AI SE (GROWW-STYLE LIVE COPILOT) -->
      @if (activeTab() === 'copilot') {
        <div class="tab-pane">
          <div class="copilot-container">
            <div class="copilot-head">
              <h2>🤖 Groww-Style Stock AI Copilot</h2>
              <p>Kisi bhi share ke baare me poochiye — <strong>"Kya lena chahiye ya nahi?"</strong>, exact entry zone, short-term targets, stop-loss, aur ₹1000 profit hone par kab exit karein. AI real-time market data se instant live advise deta hai.</p>
            </div>

            <!-- Stock Selector Strip -->
            <div class="copilot-stock-selector-strip">
              <span class="sel-label">🎯 Choose Stock:</span>
              <div class="selector-chips-scroll">
                @for (h of overview()?.holdingsWithAnalysis; track h.holding.id) {
                  <button
                    type="button"
                    class="sel-chip"
                    [class.active]="activeAiTicker() === h.holding.ticker"
                    (click)="switchAiStock(h.holding.ticker, h.holding.companyName, h.quote.currentPrice, h.quote.dayChangePercent)">
                    {{ h.holding.ticker.replace('.NS', '') }}
                  </button>
                }
                <!-- Popular Stocks -->
                <button
                  type="button"
                  class="sel-chip"
                  [class.active]="activeAiTicker() === 'DIXON.NS'"
                  (click)="switchAiStock('DIXON.NS', 'Dixon Technologies (India) Ltd', 12841.00, 0.52)">
                  DIXON
                </button>
                <button
                  type="button"
                  class="sel-chip"
                  [class.active]="activeAiTicker() === 'IREDA.NS'"
                  (click)="switchAiStock('IREDA.NS', 'IREDA Ltd', 215.50, 1.2)">
                  IREDA
                </button>
                <button
                  type="button"
                  class="sel-chip"
                  [class.active]="activeAiTicker() === 'TATAMOTORS.NS'"
                  (click)="switchAiStock('TATAMOTORS.NS', 'Tata Motors Ltd', 948.30, 2.1)">
                  TATA MOTORS
                </button>
                <button
                  type="button"
                  class="sel-chip"
                  [class.active]="activeAiTicker() === 'RELIANCE.NS'"
                  (click)="switchAiStock('RELIANCE.NS', 'Reliance Industries', 2985.50, 1.4)">
                  RELIANCE
                </button>
              </div>
            </div>

            <!-- Quick Groww Prompt Chips -->
            <div class="quick-chips-row">
              <span class="chips-label">Quick Groww Questions:</span>
              <button type="button" class="chip-btn" (click)="askForActiveStock('Kya mujhe abhi lena chahiye ya dip ka wait karein?')">
                ❓ "Kya abhi lena chahiye ya wait karein?"
              </button>
              <button type="button" class="chip-btn" (click)="askForActiveStock('Mera target ₹1000 profit ka hai, kab exit karu?')">
                🎯 "Mera target 1000 profit ka hai, kab exit karu?"
              </button>
              <button type="button" class="chip-btn" (click)="askForActiveStock('Agar market gira to kitna gir sakta hai? Stop-loss kahan lagayein?')">
                📉 "Market gira to kitna gir sakta hai? (Stop-loss)"
              </button>
              <button type="button" class="chip-btn" (click)="askForActiveStock('Kya averaging karni chahiye?')">
                🔄 "Averaging karni chahiye?"
              </button>
              <button type="button" class="chip-btn" (click)="askPreset('Aaj konsa share kharidna sabse profitable rahega?')">
                🚀 "Aaj konsa naya share kharidna chahiye?"
              </button>
            </div>

            <!-- Input Box -->
            <div class="copilot-input-bar">
              <input
                type="text"
                class="ai-input"
                [(ngModel)]="userQuery"
                (keyup.enter)="submitAiQuestion(activeAiTicker())"
                placeholder="Poochiye: e.g. 'Dixon lena chahiye ya nahi?', 'Tata Motors ka next target kya he?'..." />
              <button
                type="button"
                class="btn-submit-ai"
                (click)="submitAiQuestion(activeAiTicker())"
                [disabled]="isAiThinking() || !userQuery.trim()">
                {{ isAiThinking() ? 'Thinking...' : 'Poocho AI Se ⚡' }}
              </button>
            </div>

            <!-- Answer Display Card -->
            @if (aiResponse()) {
              <div class="copilot-response-card">
                <!-- Groww Verdict Hero Banner -->
                <div class="groww-verdict-banner" [class.buy]="aiResponse()!.actionSignal === 'STRONG_BUY' || aiResponse()!.actionSignal === 'BUY_ON_DIPS'" [class.exit]="aiResponse()!.actionSignal === 'BOOK_PROFIT' || aiResponse()!.actionSignal === 'EXIT_STOP_LOSS'" [class.caution]="aiResponse()!.actionSignal === 'WAIT_ON_DIPS' || aiResponse()!.actionSignal === 'AVOID'">
                  <div class="verdict-top-row">
                    <div class="verdict-badge">
                      {{ aiResponse()!.verdictLabel || aiResponse()!.actionSignal }}
                    </div>
                    @if (aiResponse()!.bullishScore) {
                      <div class="health-score-tag">
                        AI Bullish Score: <strong>{{ aiResponse()!.bullishScore }}/100</strong>
                        @if (aiResponse()!.riskRewardRatio) {
                          <span class="rr-text">• R:R <strong>1:{{ aiResponse()!.riskRewardRatio }}</strong></span>
                        }
                      </div>
                    }
                  </div>

                  <!-- 4-Box Key Levels Grid (Groww Cards) -->
                  <div class="groww-key-levels-grid">
                    <div class="level-box entry-box">
                      <span class="lvl-label">🎯 IDEAL ENTRY ZONE</span>
                      <span class="lvl-val">
                        @if (aiResponse()!.idealEntryZoneLow) {
                          ₹{{ aiResponse()!.idealEntryZoneLow | number:'1.0-0' }} - ₹{{ aiResponse()!.idealEntryZoneHigh | number:'1.0-0' }}
                        } @else {
                          ₹{{ (aiResponse()!.currentPrice || activeAiPrice()) | number:'1.0-0' }}
                        }
                      </span>
                      <span class="lvl-sub">Best Buying Price</span>
                    </div>

                    <div class="level-box target-box">
                      <span class="lvl-label">🚀 TARGET 1 (SHORT-TERM)</span>
                      <span class="lvl-val green">
                        ₹{{ aiResponse()!.keyTargetPrice | number:'1.2-2' }}
                      </span>
                      <span class="lvl-sub">First Profit Booking</span>
                    </div>

                    <div class="level-box breakout-box">
                      <span class="lvl-label">📈 TARGET 2 (BREAKOUT)</span>
                      <span class="lvl-val green">
                        ₹{{ (aiResponse()!.targetPrice2 || (aiResponse()!.keyTargetPrice ? aiResponse()!.keyTargetPrice! * 1.07 : 0)) | number:'1.2-2' }}
                      </span>
                      <span class="lvl-sub">Rally Ceiling</span>
                    </div>

                    <div class="level-box sl-box">
                      <span class="lvl-label">🛑 STRICT STOP-LOSS</span>
                      <span class="lvl-val red">
                        ₹{{ aiResponse()!.keySupportPrice | number:'1.2-2' }}
                      </span>
                      <span class="lvl-sub">Capital Protection Floor</span>
                    </div>
                  </div>
                </div>

                <!-- Groww Strengths & Risks (Pros vs Cons) -->
                @if (aiResponse()!.strengths && aiResponse()!.strengths!.length > 0) {
                  <div class="pros-cons-grid">
                    <div class="pros-card">
                      <div class="pros-head">
                        <span>🟢 Kyu Lena Chahiye (Strengths):</span>
                      </div>
                      <ul>
                        @for (str of aiResponse()!.strengths; track $index) {
                          <li>✓ {{ str }}</li>
                        }
                      </ul>
                    </div>

                    <div class="cons-card">
                      <div class="pros-head">
                        <span>🔴 Kya Dhyan Rakhna Hai (Risks):</span>
                      </div>
                      <ul>
                        @for (r of aiResponse()!.risks; track $index) {
                          <li>⚠ {{ r }}</li>
                        }
                      </ul>
                    </div>
                  </div>
                }

                <div class="answer-hindi-block">
                  <p class="answer-text">{{ aiResponse()!.answerHindi }}</p>
                </div>

                @if (aiResponse()!.keyBulletPoints.length > 0) {
                  <div class="bullet-points-box">
                    <strong>📌 Key Actionable Highlights:</strong>
                    <ul>
                      @for (bullet of aiResponse()!.keyBulletPoints; track $index) {
                        <li>{{ bullet }}</li>
                      }
                    </ul>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- TAB 4: AI TRADING AGENTS & AUTOMATION HUB -->
      @if (activeTab() === 'agents') {
        <div class="tab-pane">
          <!-- Hub Header Banner with IST Clock & Next Scan -->
          <div class="agents-hub-header">
            <div class="hub-header-left">
              <div class="hub-badge-row">
                <span class="hub-live-badge">⚡ MULTI-AGENT TRADING ENGINE</span>
                <span class="ist-clock-pill">⏰ {{ agentStatus()?.currentTimeIst || 'Indian Time (IST)' }}</span>
                <span class="market-clock-status" [class.open]="agentStatus()?.isMarketOpen">
                  {{ agentStatus()?.marketStatusText || 'Indian Market: Closed' }}
                </span>
              </div>
              <h2>🤖 Autonomous Multi-Agent Mission Control</h2>
              <p>
                Ek hi screen par live dekhiye <strong>kaunsa AI agent kya kaam kar raha hai</strong> — Pre-Market Analyst se lekar Portfolio Sentinel watcher aur instant WhatsApp/Email dispatcher tak.
              </p>
            </div>

            <div class="hub-quick-actions">
              <button
                type="button"
                class="btn-agent-action simulate"
                (click)="runAgentPipelineSimulation()"
                [disabled]="isSimulatingPipeline()">
                <span [class.spin]="isSimulatingPipeline()">⚡</span>
                <span>{{ isSimulatingPipeline() ? 'Simulating Live Pipeline...' : 'Run Live Agent Simulation' }}</span>
              </button>
              <button
                type="button"
                class="btn-agent-action primary"
                (click)="runPreMarketScan()"
                [disabled]="isRunningPreMarket()">
                {{ isRunningPreMarket() ? '⏳ Scanning Market...' : '🌅 Run Pre-Market Scan' }}
              </button>
              <button
                type="button"
                class="btn-agent-action secondary"
                (click)="runSentinelCheck()"
                [disabled]="isCheckingSentinel()">
                {{ isCheckingSentinel() ? '⏳ Checking Targets...' : '🛡️ Check Targets Now' }}
              </button>
              <button
                type="button"
                class="btn-agent-action whatsapp"
                (click)="sendTestAlert()"
                [disabled]="isSendingTestAlert()">
                {{ isSendingTestAlert() ? '⏳ Dispatching...' : '📲 Send Test Alert' }}
              </button>
            </div>
          </div>

          <!-- Multi-Agent Live Workflow Pipeline Ribbon -->
          <div class="agent-pipeline-ribbon">
            <div class="pipeline-title-row">
              <span class="pipeline-tag">🔄 REAL-TIME MULTI-AGENT WORKFLOW PIPELINE</span>
              <span class="pipeline-sub">How our 3 autonomous agents collaborate without human intervention</span>
            </div>

            <div class="pipeline-track">
              <!-- Step 1 -->
              <div class="pipeline-step-box" [class.active-glow]="simulationStep() === 1">
                <div class="step-num">1</div>
                <div class="step-body">
                  <div class="step-agent-name">🧠 Agent 1: Pre-Market Brain</div>
                  <div class="step-role">Daily 08:45 AM IST Scan</div>
                  <div class="step-action-desc">Gift Nifty & 50+ NSE Stocks Scan: Identifies Profit Breakouts & Loss Risks</div>
                </div>
              </div>

              <!-- Connector 1 -->
              <div class="pipeline-arrow" [class.flow-pulse]="simulationStep() >= 1">
                <span class="arrow-line"></span>
                <span class="arrow-text">Report Handover</span>
                <span class="arrow-head">▶</span>
              </div>

              <!-- Step 2 -->
              <div class="pipeline-step-box" [class.active-glow]="simulationStep() === 2">
                <div class="step-num">2</div>
                <div class="step-body">
                  <div class="step-agent-name">🛡️ Agent 2: Portfolio Sentinel</div>
                  <div class="step-role">60s Real-Time CMP Watch</div>
                  <div class="step-action-desc">Monitors User Portfolio against per-share ₹1,000 Target Profit & SL Floor</div>
                </div>
              </div>

              <!-- Connector 2 -->
              <div class="pipeline-arrow" [class.flow-pulse]="simulationStep() >= 2">
                <span class="arrow-line"></span>
                <span class="arrow-text">Target Hit Trigger</span>
                <span class="arrow-head">▶</span>
              </div>

              <!-- Step 3 -->
              <div class="pipeline-step-box" [class.active-glow]="simulationStep() === 3">
                <div class="step-num">3</div>
                <div class="step-body">
                  <div class="step-agent-name">📨 Agent 3: Alert Dispatcher</div>
                  <div class="step-role">Instant Delivery Engine</div>
                  <div class="step-action-desc">Generates 1-Click WhatsApp Direct URL & Responsive HTML Email Table</div>
                </div>
              </div>

              <!-- Connector 3 -->
              <div class="pipeline-arrow" [class.flow-pulse]="simulationStep() >= 3">
                <span class="arrow-line"></span>
                <span class="arrow-text">Direct Dispatch</span>
                <span class="arrow-head">▶</span>
              </div>

              <!-- Step 4 -->
              <div class="pipeline-step-box delivery" [class.active-glow]="simulationStep() === 4">
                <div class="step-num check">✓</div>
                <div class="step-body">
                  <div class="step-agent-name">📱 WhatsApp & 📧 Email</div>
                  <div class="step-role">User Instant Notification</div>
                  <div class="step-action-desc">Direct Message with Exit Strategy & Cooldown Deduplication</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sentinel Check Flash Toast Result -->
          @if (sentinelResultSummary()) {
            <div class="sentinel-flash-banner">
              <span class="icon">🎯</span>
              <span>{{ sentinelResultSummary() }}</span>
              <button type="button" class="btn-close-flash" (click)="sentinelResultSummary.set(null)">✕</button>
            </div>
          }

          <!-- Test Alert Success Banner with Direct WhatsApp Click Link -->
          @if (testNotificationResult()) {
            <div class="test-alert-success-banner">
              <div class="banner-title">
                <span>✅ Test Notification Dispatched!</span>
                <span class="badge">{{ testNotificationResult()!.alertType }}</span>
              </div>
              <p>{{ testNotificationResult()!.message }}</p>
              <div class="banner-actions">
                @if (testNotificationResult()!.whatsAppClickUrl) {
                  <a
                    [href]="testNotificationResult()!.whatsAppClickUrl"
                    target="_blank"
                    class="btn-open-wa">
                    💬 Open in WhatsApp Direct Link
                  </a>
                }
                <span class="email-tag">Email Status: <strong>{{ testNotificationResult()!.emailStatus }}</strong></span>
                <button type="button" class="btn-dismiss" (click)="testNotificationResult.set(null)">Dismiss</button>
              </div>
            </div>
          }

          <!-- 3 Collaborative Agents Detailed Workstation Cards ("Kaun Kya Kaam Kar Raha Hai") -->
          <div class="agent-cards-row">
            <!-- AGENT 1 WORKSTATION CARD -->
            <div class="agent-role-card" [class.simulating-active]="simulationStep() === 1">
              <div class="agent-card-head">
                <span class="agent-avatar">🧠</span>
                <div class="agent-id-col">
                  <div class="agent-id-tag">AGENT-01</div>
                  <div class="agent-name">Pre-Market Intelligence Agent</div>
                  <div class="agent-role-sub">Indian Market Analyst & Stock Screener</div>
                </div>
                <div class="agent-status-badge active">
                  <span class="dot"></span>
                  <span>{{ simulationStep() === 1 ? '⚡ SCANNING NOW...' : 'Scheduled 08:45 AM' }}</span>
                </div>
              </div>

              <!-- Kaunsa Kaam Karta Hai Box -->
              <div class="agent-duty-box">
                <div class="duty-label">
                  <span class="duty-icon">📌</span>
                  <strong>Kaunsa Kaam Karta Hai (Permanent Role):</strong>
                </div>
                <p class="duty-desc">
                  Har subah <strong>08:45 AM IST</strong> ko NSE/BSE khulne se pehle Gift Nifty, FII/DII data aur technical breakout momentum scan karke <strong>aaj profit banane wale shares</strong> aur <strong>aaj girne wale loss risk shares</strong> select karta hai.
                </p>
              </div>

              <!-- Abhi Ka Kaam Box -->
              <div class="agent-action-box">
                <div class="action-label">
                  <span class="action-icon">⚡</span>
                  <strong>Abhi Ka Kaam (Current Live Action):</strong>
                </div>
                <p class="action-desc">
                  50+ large/mid-cap shares scanned. <strong>Dixon Technologies (+₹1,000 profit setup)</strong> &amp; <strong>Reliance</strong> ko breakout pick kiya. <strong>Vodafone Idea &amp; Paytm</strong> ko loss risk avoid list me daala.
                </p>
              </div>

              <!-- Live Telemetry Strip -->
              <div class="agent-metrics-row">
                <div class="a-metric">
                  <span class="m-lbl">GAINERS FOUND</span>
                  <span class="m-val green">4 Stocks</span>
                </div>
                <div class="a-metric">
                  <span class="m-lbl">LOSS STOCKS</span>
                  <span class="m-val red">3 Stocks</span>
                </div>
                <div class="a-metric">
                  <span class="m-lbl">TARGET PROFIT</span>
                  <span class="m-val blue">+₹1,000/sh</span>
                </div>
              </div>

              <!-- Card Action Button -->
              <div class="agent-card-footer">
                <button
                  type="button"
                  class="btn-trigger-agent"
                  (click)="runPreMarketScan()"
                  [disabled]="isRunningPreMarket()">
                  {{ isRunningPreMarket() ? '⏳ Scanning Market...' : '▶️ Run Agent 1 Scan' }}
                </button>
                <span class="next-run-tag">Next Run: Tomorrow 08:45 AM</span>
              </div>
            </div>

            <!-- AGENT 2 WORKSTATION CARD -->
            <div class="agent-role-card" [class.simulating-active]="simulationStep() === 2">
              <div class="agent-card-head">
                <span class="agent-avatar">🛡️</span>
                <div class="agent-id-col">
                  <div class="agent-id-tag sentinel">AGENT-02</div>
                  <div class="agent-name">Portfolio Sentinel Agent</div>
                  <div class="agent-role-sub">Real-Time Target & Stop-Loss Watcher</div>
                </div>
                <div class="agent-status-badge active">
                  <span class="dot"></span>
                  <span>{{ simulationStep() === 2 ? '🎯 TRACKING TARGETS...' : 'Live Every 60s' }}</span>
                </div>
              </div>

              <!-- Kaunsa Kaam Karta Hai Box -->
              <div class="agent-duty-box">
                <div class="duty-label">
                  <span class="duty-icon">📌</span>
                  <strong>Kaunsa Kaam Karta Hai (Permanent Role):</strong>
                </div>
                <p class="duty-desc">
                  Live trading session (09:15 - 15:30 IST) me aapke portfolio ke har share ko continuously observe karta hai. Jaise hi share me aapka set kiya hua <strong>Target Profit (jaise ₹1,000/share)</strong> hit hota hai ya stop-loss breach hota hai, turant trigger karta hai.
                </p>
              </div>

              <!-- Abhi Ka Kaam Box -->
              <div class="agent-action-box">
                <div class="action-label">
                  <span class="action-icon">⚡</span>
                  <strong>Abhi Ka Kaam (Current Live Action):</strong>
                </div>
                <p class="action-desc">
                  Monitoring <strong>{{ overview()?.totalStocksCount || 0 }} holdings</strong> against live CMPs. <strong>Dixon Technologies</strong> (CMP ₹12,845) ₹1,000 profit target reached! Sentinel trigger dispatched to Agent 3.
                </p>
              </div>

              <!-- Live Telemetry Strip -->
              <div class="agent-metrics-row">
                <div class="a-metric">
                  <span class="m-lbl">HOLDINGS WATCHED</span>
                  <span class="m-val">{{ overview()?.totalStocksCount || 0 }} Shares</span>
                </div>
                <div class="a-metric">
                  <span class="m-lbl">TARGET HIT</span>
                  <span class="m-val green">{{ overview()?.targetHitCount || 0 }} Active</span>
                </div>
                <div class="a-metric">
                  <span class="m-lbl">STOP-LOSS HIT</span>
                  <span class="m-val green">0 (Safe)</span>
                </div>
              </div>

              <!-- Card Action Button -->
              <div class="agent-card-footer">
                <button
                  type="button"
                  class="btn-trigger-agent secondary"
                  (click)="runSentinelCheck()"
                  [disabled]="isCheckingSentinel()">
                  {{ isCheckingSentinel() ? '⏳ Checking Targets...' : '▶️ Run Sentinel Check' }}
                </button>
                <span class="next-run-tag">Loop: Continuous 60s</span>
              </div>
            </div>

            <!-- AGENT 3 WORKSTATION CARD -->
            <div class="agent-role-card" [class.simulating-active]="simulationStep() === 3">
              <div class="agent-card-head">
                <span class="agent-avatar">📨</span>
                <div class="agent-id-col">
                  <div class="agent-id-tag dispatcher">AGENT-03</div>
                  <div class="agent-name">Alert Dispatcher Agent</div>
                  <div class="agent-role-sub">WhatsApp & Email Delivery Engine</div>
                </div>
                <div class="agent-status-badge active">
                  <span class="dot"></span>
                  <span>{{ simulationStep() === 3 ? '📨 DISPATCHING ALERT...' : 'Engine Ready' }}</span>
                </div>
              </div>

              <!-- Kaunsa Kaam Karta Hai Box -->
              <div class="agent-duty-box">
                <div class="duty-label">
                  <span class="duty-icon">📌</span>
                  <strong>Kaunsa Kaam Karta Hai (Permanent Role):</strong>
                </div>
                <p class="duty-desc">
                  Agent 1 ki pre-market recommendations aur Agent 2 ke target profit hit signals ko clean <strong>Hindi emojis</strong> aur <strong>direct 1-click WhatsApp deep links</strong> (<code>https://wa.me/...</code>) me convert karke user ke mobile aur inbox tak deliver karta hai.
                </p>
              </div>

              <!-- Abhi Ka Kaam Box -->
              <div class="agent-action-box">
                <div class="action-label">
                  <span class="action-icon">⚡</span>
                  <strong>Abhi Ka Kaam (Current Live Action):</strong>
                </div>
                <p class="action-desc">
                  WhatsApp URL encoded with target profit exit recommendations. Email SMTP &amp; webhook gateway listening. Ready to deliver alerts with zero human delay.
                </p>
              </div>

              <!-- Live Telemetry Strip -->
              <div class="agent-metrics-row">
                <div class="a-metric">
                  <span class="m-lbl">WHATSAPP</span>
                  <span class="m-val green">Ready (1-Click)</span>
                </div>
                <div class="a-metric">
                  <span class="m-lbl">EMAIL ENGINE</span>
                  <span class="m-val green">Connected</span>
                </div>
                <div class="a-metric">
                  <span class="m-lbl">ALERTS TODAY</span>
                  <span class="m-val blue">{{ agentStatus()?.totalAlertsDispatchedToday || 0 }}</span>
                </div>
              </div>

              <!-- Card Action Button -->
              <div class="agent-card-footer">
                <button
                  type="button"
                  class="btn-trigger-agent whatsapp"
                  (click)="sendTestAlert()"
                  [disabled]="isSendingTestAlert()">
                  {{ isSendingTestAlert() ? '⏳ Sending Alert...' : '▶️ Send Test Alert' }}
                </button>
                <span class="next-run-tag">Channels: WhatsApp & Email</span>
              </div>
            </div>
          </div>

          <!-- LIVE MULTI-AGENT TELEMETRY CONSOLE / ACTIVITY STREAM TERMINAL -->
          <div class="agent-terminal-card">
            <div class="terminal-head">
              <div class="terminal-title-group">
                <div class="terminal-dots">
                  <span class="dot red"></span>
                  <span class="dot yellow"></span>
                  <span class="dot green"></span>
                </div>
                <div class="t-title">
                  <strong>💻 Multi-Agent Live Operations Console</strong>
                  <span class="t-sub">(Real-Time Task Stream: Dekhiye kaunsa agent kab kya kaam kar raha hai)</span>
                </div>
              </div>

              <div class="terminal-controls">
                <!-- Agent Filter Tabs -->
                <div class="filter-pills">
                  <button
                    type="button"
                    class="filter-pill"
                    [class.active]="activeAgentFilter() === 'ALL'"
                    (click)="setAgentFilter('ALL')">
                    All ({{ liveAgentTerminalLogs().length }})
                  </button>
                  <button
                    type="button"
                    class="filter-pill"
                    [class.active]="activeAgentFilter() === 'AGENT_1'"
                    (click)="setAgentFilter('AGENT_1')">
                    🧠 Agent 1
                  </button>
                  <button
                    type="button"
                    class="filter-pill"
                    [class.active]="activeAgentFilter() === 'AGENT_2'"
                    (click)="setAgentFilter('AGENT_2')">
                    🛡️ Agent 2
                  </button>
                  <button
                    type="button"
                    class="filter-pill"
                    [class.active]="activeAgentFilter() === 'AGENT_3'"
                    (click)="setAgentFilter('AGENT_3')">
                    📨 Agent 3
                  </button>
                </div>

                <button
                  type="button"
                  class="btn-sim-stream"
                  (click)="runAgentPipelineSimulation()"
                  [disabled]="isSimulatingPipeline()">
                  ⚡ Simulate Live Workflow
                </button>

                <button
                  type="button"
                  class="btn-clear-console"
                  (click)="clearTerminalLogs()"
                  title="Clear console output">
                  🗑️ Clear
                </button>
              </div>
            </div>

            <!-- Terminal Output Window -->
            <div class="terminal-screen">
              @if (filteredAgentLogs().length === 0) {
                <div class="terminal-empty">
                  <span>$ Console clear. Click "Simulate Live Workflow" ya "Run Pre-Market Scan" to generate live agent activity.</span>
                </div>
              } @else {
                <div class="terminal-log-feed">
                  @for (log of filteredAgentLogs(); track log.id) {
                    <div class="terminal-line" [class.alert-line]="log.level === 'ALERT'" [class.warn-line]="log.level === 'WARN'" [class.success-line]="log.level === 'SUCCESS'">
                      <span class="t-time">[{{ log.timestamp }}]</span>
                      <span class="t-agent-badge" [class.agent1]="log.agent === 'AGENT_1'" [class.agent2]="log.agent === 'AGENT_2'" [class.agent3]="log.agent === 'AGENT_3'">
                        {{ log.agent === 'AGENT_1' ? 'AGENT-01: PRE-MARKET' : (log.agent === 'AGENT_2' ? 'AGENT-02: SENTINEL' : (log.agent === 'AGENT_3' ? 'AGENT-03: DISPATCHER' : 'SYSTEM')) }}
                      </span>
                      <span class="t-level" [class.info]="log.level === 'INFO'" [class.success]="log.level === 'SUCCESS'" [class.warn]="log.level === 'WARN'" [class.alert]="log.level === 'ALERT'">
                        {{ log.level }}
                      </span>
                      <span class="t-msg">{{ log.message }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- SECTION A: TODAY'S PRE-MARKET INTELLIGENCE REPORT -->
          <div class="pre-market-section-card">
            <div class="section-card-head">
              <div class="title-with-pill">
                <h3>🌅 Today's Pre-Market AI Report</h3>
                @if (preMarketReport()) {
                  <span class="pill-date">{{ preMarketReport()!.reportDate }} • {{ preMarketReport()!.scanTimeIst }}</span>
                  <span class="pill-sentiment">{{ preMarketReport()!.marketSentiment }}</span>
                }
              </div>
              <button
                type="button"
                class="btn-refresh-report"
                (click)="runPreMarketScan()"
                [disabled]="isRunningPreMarket()">
                {{ isRunningPreMarket() ? '⏳ Scanning...' : '🔄 Rescan Market' }}
              </button>
            </div>

            @if (preMarketReport()) {
              <!-- Market Outlook Banner -->
              <div class="market-outlook-banner">
                <div class="outlook-label">📊 Nifty 50 & Gift Nifty Opening Forecast:</div>
                <div class="outlook-text">{{ preMarketReport()!.niftyExpectedTrend }}</div>
              </div>

              <!-- Two Column Grid: Profit Gainers vs Loss Risks -->
              <div class="market-split-grid">
                <!-- Column 1: Today's Profit Gainers -->
                <div class="split-col profit-col">
                  <div class="col-head">
                    <span class="col-icon">🚀</span>
                    <div>
                      <h4>Today's Top Profit Gainers (Breakout Shares)</h4>
                      <span class="sub">Shares expected to make profit today with high upside probability</span>
                    </div>
                  </div>

                  <div class="stock-cards-list">
                    @for (item of preMarketReport()!.topProfitGainers; track item.ticker) {
                      <div class="pm-stock-card profit">
                        <div class="card-top-row">
                          <div class="stock-meta">
                            <span class="stock-ticker">{{ item.ticker.replace('.NS', '') }}</span>
                            <span class="stock-name">{{ item.companyName }}</span>
                          </div>
                          <div class="profit-target-pill">
                            +₹{{ item.expectedProfitPerShare | number:'1.0-0' }} (+{{ item.expectedProfitPercentage | number:'1.1-1' }}%)
                          </div>
                        </div>

                        <div class="price-metrics-strip">
                          <div class="p-item">
                            <span class="lbl">ENTRY ZONE</span>
                            <span class="val">₹{{ item.entryPrice | number:'1.2-2' }}</span>
                          </div>
                          <div class="p-item">
                            <span class="lbl">TARGET 1</span>
                            <span class="val green">₹{{ item.targetPrice | number:'1.2-2' }}</span>
                          </div>
                          <div class="p-item">
                            <span class="lbl">STOP-LOSS</span>
                            <span class="val red">₹{{ item.stopLossPrice | number:'1.2-2' }}</span>
                          </div>
                          <div class="p-item">
                            <span class="lbl">R:R</span>
                            <span class="val blue">1:{{ item.riskRewardRatio | number:'1.1-1' }}</span>
                          </div>
                        </div>

                        <div class="catalyst-row">
                          <span class="setup-badge">{{ item.setupType }}</span>
                          <p class="catalyst-hindi">💡 {{ item.catalystHindi }}</p>
                        </div>

                        <div class="pm-card-actions">
                          <button type="button" class="btn-add-pm-stock" (click)="addPreMarketStockToPortfolio(item)">
                            + Add to My Portfolio Watchlist
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Column 2: Today's Loss Risks / Avoid List -->
                <div class="split-col loss-col">
                  <div class="col-head loss">
                    <span class="col-icon">⚠️</span>
                    <div>
                      <h4>Today's High-Risk / Loss Warning Shares</h4>
                      <span class="sub">Bearish breakdown risks to strictly avoid buying or consider exiting</span>
                    </div>
                  </div>

                  <div class="stock-cards-list">
                    @for (item of preMarketReport()!.topLossRisks; track item.ticker) {
                      <div class="pm-stock-card loss">
                        <div class="card-top-row">
                          <div class="stock-meta">
                            <span class="stock-ticker loss">{{ item.ticker.replace('.NS', '') }}</span>
                            <span class="stock-name">{{ item.companyName }}</span>
                          </div>
                          <div class="loss-risk-pill">
                            Downside Risk {{ item.expectedProfitPercentage | number:'1.1-1' }}%
                          </div>
                        </div>

                        <div class="price-metrics-strip">
                          <div class="p-item">
                            <span class="lbl">CURRENT CMP</span>
                            <span class="val">₹{{ item.currentPrice | number:'1.2-2' }}</span>
                          </div>
                          <div class="p-item">
                            <span class="lbl">BREAKDOWN FLOOR</span>
                            <span class="val red">₹{{ item.targetPrice | number:'1.2-2' }}</span>
                          </div>
                          <div class="p-item">
                            <span class="lbl">RECOMMENDATION</span>
                            <span class="val red">AVOID / EXIT</span>
                          </div>
                        </div>

                        <div class="catalyst-row">
                          <span class="setup-badge loss">{{ item.setupType }}</span>
                          <p class="catalyst-hindi loss">⚠️ {{ item.catalystHindi }}</p>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>

              <!-- AI Morning Actionable Guidance -->
              <div class="actionable-guidance-card">
                <div class="g-head">
                  <span class="icon">💡</span>
                  <strong>AI Golden Rules for Today's Session:</strong>
                </div>
                <p class="g-text">{{ preMarketReport()!.actionableBriefHindi }}</p>
              </div>
            } @else {
              <div class="loading-report-card">
                <span class="spin">⏳</span>
                <span>Generating today's Pre-Market Intelligence Briefing...</span>
              </div>
            }
          </div>

          <!-- SECTION B: NOTIFICATION SETTINGS & RECENT ALERT LOGS -->
          <div class="settings-and-logs-grid">
            <!-- Settings Card -->
            <div class="alert-settings-card">
              <div class="settings-head">
                <h3>⚙️ Notification Settings (WhatsApp & Email)</h3>
                <span class="sub">Configure where alerts and morning scans should be delivered</span>
              </div>

              <form (ngSubmit)="saveAgentSettings()" class="settings-form">
                <div class="setting-group">
                  <label class="form-label">
                    <span>💬 WhatsApp Number (India +91)</span>
                    <span class="hint">e.g. +91 98765 43210</span>
                  </label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="agentSettings().whatsAppPhoneNumber"
                    name="whatsAppPhoneNumber"
                    placeholder="+91 98765 43210" />
                </div>

                <div class="setting-group">
                  <label class="form-label">
                    <span>📧 Email Address</span>
                    <span class="hint">For daily pre-market digest & target emails</span>
                  </label>
                  <input
                    type="email"
                    class="form-control"
                    [(ngModel)]="agentSettings().emailAddress"
                    name="emailAddress"
                    placeholder="investor@example.com" />
                </div>

                <div class="toggle-list">
                  <label class="toggle-item">
                    <input
                      type="checkbox"
                      [(ngModel)]="agentSettings().enablePreMarketScan"
                      name="enablePreMarketScan" />
                    <div class="toggle-label">
                      <strong>🌅 Daily Morning Pre-Market Scan (08:45 AM IST)</strong>
                      <span>Sends today's profit gainers and loss risks before market opens.</span>
                    </div>
                  </label>

                  <label class="toggle-item">
                    <input
                      type="checkbox"
                      [(ngModel)]="agentSettings().enableTargetHitAlerts"
                      name="enableTargetHitAlerts" />
                    <div class="toggle-label">
                      <strong>🎯 Instant Target Profit Hit Alert</strong>
                      <span>Sends immediate notification when per-share profit (e.g. ₹1,000) is achieved.</span>
                    </div>
                  </label>

                  <label class="toggle-item">
                    <input
                      type="checkbox"
                      [(ngModel)]="agentSettings().enableStopLossAlerts"
                      name="enableStopLossAlerts" />
                    <div class="toggle-label">
                      <strong>🛑 Instant Stop-Loss / Downside Risk Alert</strong>
                      <span>Sends immediate notification if share breaches safety floor.</span>
                    </div>
                  </label>

                  <label class="toggle-item">
                    <input
                      type="checkbox"
                      [(ngModel)]="agentSettings().enableWhatsAppDispatch"
                      name="enableWhatsAppDispatch" />
                    <div class="toggle-label">
                      <strong>💬 Deliver via WhatsApp</strong>
                      <span>Receive formatted message with emojis and action rules on WhatsApp.</span>
                    </div>
                  </label>

                  <label class="toggle-item">
                    <input
                      type="checkbox"
                      [(ngModel)]="agentSettings().enableEmailDispatch"
                      name="enableEmailDispatch" />
                    <div class="toggle-label">
                      <strong>📧 Deliver via Email</strong>
                      <span>Receive rich HTML formatted tables and daily briefings in inbox.</span>
                    </div>
                  </label>
                </div>

                <div class="settings-actions">
                  <button
                    type="submit"
                    class="btn-save-settings"
                    [disabled]="isSavingSettings()">
                    {{ isSavingSettings() ? 'Saving...' : '💾 Save Notification Settings' }}
                  </button>
                  <button
                    type="button"
                    class="btn-test-alert"
                    (click)="sendTestAlert()"
                    [disabled]="isSendingTestAlert()">
                    {{ isSendingTestAlert() ? 'Sending...' : '📲 Send Test Alert' }}
                  </button>
                </div>
              </form>
            </div>

            <!-- Recent Alert Log Feed Card -->
            <div class="alert-history-card">
              <div class="history-head">
                <h3>📜 Recent Dispatched Alert Logs</h3>
                <span class="sub">Live history of automated agent notifications</span>
              </div>

              <div class="logs-container">
                @if (agentAlertLogs().length === 0) {
                  <div class="empty-logs">
                    <span class="empty-icon">📭</span>
                    <p>Abhi tak koi alert trigger nahi hua hai. "Send Test Alert" button click karke verification test karein!</p>
                  </div>
                } @else {
                  <div class="logs-list">
                    @for (log of agentAlertLogs(); track log.id) {
                      <div class="log-card" [class.profit]="log.alertType.includes('TARGET')" [class.loss]="log.alertType.includes('STOP_LOSS')">
                        <div class="log-top">
                          <span class="log-type-tag" [class.profit]="log.alertType.includes('TARGET')" [class.loss]="log.alertType.includes('STOP_LOSS')">
                            {{ log.alertType }}
                          </span>
                          <span class="log-time">{{ log.createdAtIst }}</span>
                        </div>

                        <div class="log-title">
                          <strong>{{ log.ticker }}</strong>: {{ log.title }}
                        </div>

                        <p class="log-msg">{{ log.message }}</p>

                        <div class="log-footer">
                          <div class="channel-status">
                            <span class="ch-badge wa">WhatsApp: <strong>{{ log.whatsAppStatus }}</strong></span>
                            <span class="ch-badge email">Email: <strong>{{ log.emailStatus }}</strong></span>
                          </div>

                          @if (log.whatsAppClickUrl) {
                            <a
                              [href]="log.whatsAppClickUrl"
                              target="_blank"
                              class="btn-open-wa-small">
                              💬 Open in WhatsApp
                            </a>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ADD / EDIT STOCK MODAL -->
      @if (showStockModal()) {
        <div class="modal-backdrop" (click)="closeStockModal()">
          <div class="stock-modal-card" (click)="$event.stopPropagation()">
            <div class="modal-head">
              <h3>{{ editingHoldingId() ? 'Edit Share Target & Position' : 'Add Stock to AI Portfolio' }}</h3>
              <button type="button" class="btn-close-modal" (click)="closeStockModal()">✕</button>
            </div>

            <form (ngSubmit)="saveStockHolding()" class="modal-form">
              <!-- Indian Stock Live Directory & Auto-Search (only when creating) -->
              @if (!editingHoldingId()) {
                <div class="stock-search-directory-box">
                  <div class="search-header-row">
                    <label class="form-label">
                      🇮🇳 Search Any Live Indian Stock (NSE / BSE):
                      <span class="hint-text">(e.g. Dixon Technologies, IREDA, RVNL, Tata Motors, Zomato, Suzlon, SBI)</span>
                    </label>
                  </div>

                  <div class="search-input-wrapper">
                    <input
                      type="text"
                      class="form-control stock-search-input"
                      [(ngModel)]="stockSearchQuery"
                      (input)="onStockSearchInput()"
                      [ngModelOptions]="{standalone: true}"
                      placeholder="🔍 Type any stock name or symbol (e.g. Dixon, IREDA, RVNL, Tata, Zomato, Suzlon)..." />
                    @if (isSearchingLiveStocks()) {
                      <span class="search-spin-indicator">⏳ Live Search...</span>
                    }
                    @if (stockSearchQuery) {
                      <button type="button" class="btn-clear-search" (click)="clearStockSearch()">✕</button>
                    }
                  </div>

                  <!-- Quick Search Results Grid -->
                  <div class="search-results-chips">
                    @for (s of displayedSearchStocks(); track s.ticker) {
                      <div
                        class="stock-suggestion-chip"
                        [class.active]="stockForm.ticker === s.ticker"
                        (click)="selectSearchResultStock(s)">
                        <div class="chip-title">
                          <span class="s-name">{{ s.companyName }}</span>
                          <span class="s-ticker">{{ s.ticker.replace('.NS', '').replace('.BO', '') }}</span>
                        </div>
                        <div class="chip-bottom">
                          <span class="s-sector">{{ s.sector }} ({{ s.exchange }})</span>
                          @if (s.currentPrice > 0) {
                            <span class="s-price">~₹{{ s.currentPrice | number:'1.0-0' }}</span>
                          } @else {
                            <span class="s-price live-tag">⚡ Live Quote</span>
                          }
                        </div>
                      </div>
                    }
                  </div>

                  <!-- 3-Step Indian Stock Add Guide -->
                  <div class="add-stock-guide-banner">
                    <div class="guide-title">📖 Indian Share Add Karne Ka Simple Tarika:</div>
                    <ol class="guide-steps">
                      <li>Upar box me koi bhi share ka naam type karein (jaise "Dixon", "IREDA", "Tata") aur click karein.</li>
                      <li>Live Market Price automatically fetch ho jayegi.</li>
                      <li>Apna Target Profit per share (jaise ₹1,000) daalein — AI target alert lag jayega!</li>
                    </ol>
                  </div>
                </div>
              }

              <!-- Live Fetched Quote Alert Banner -->
              @if (fetchedLiveQuote()) {
                <div class="live-quote-success-banner">
                  <span class="lq-dot">🟢</span>
                  <div class="lq-content">
                    <div class="lq-title">
                      <strong>{{ fetchedLiveQuote()!.companyName }}</strong>
                      <span class="lq-badge">{{ fetchedLiveQuote()!.exchange }}</span>
                    </div>
                    <div class="lq-metrics">
                      Live CMP: <strong>₹{{ fetchedLiveQuote()!.currentPrice | number:'1.2-2' }}</strong>
                      <span [class.green]="fetchedLiveQuote()!.dayChange >= 0" [class.red]="fetchedLiveQuote()!.dayChange < 0">
                        ({{ fetchedLiveQuote()!.dayChange >= 0 ? '+' : '' }}₹{{ fetchedLiveQuote()!.dayChange | number:'1.2-2' }}, {{ fetchedLiveQuote()!.dayChangePercent | number:'1.2-2' }}%)
                      </span>
                      • Day High: ₹{{ fetchedLiveQuote()!.dayHigh | number:'1.2-2' }}
                      • 52W High: ₹{{ fetchedLiveQuote()!.high52Week | number:'1.2-2' }}
                    </div>
                  </div>
                </div>
              }

              <div class="form-row">
                <div class="form-group flex-1">
                  <div class="label-with-action">
                    <label class="form-label">Ticker Symbol *</label>
                    <button
                      type="button"
                      class="btn-fetch-live-price"
                      (click)="fetchLiveQuoteForCurrentTicker()"
                      [disabled]="isFetchingLivePrice() || !stockForm.ticker.trim()">
                      {{ isFetchingLivePrice() ? '⏳ Fetching...' : '⚡ Fetch Live Price' }}
                    </button>
                  </div>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="stockForm.ticker"
                    name="ticker"
                    required
                    (blur)="fetchLiveQuoteForCurrentTicker()"
                    [disabled]="!!editingHoldingId()"
                    placeholder="e.g. DIXON, RELIANCE, TATAMOTORS, IREDA" />
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Exchange</label>
                  <select class="form-control" [(ngModel)]="stockForm.exchange" name="exchange" [disabled]="!!editingHoldingId()">
                    <option value="NSE">NSE (National Stock Exchange)</option>
                    <option value="BSE">BSE (Bombay Stock Exchange)</option>
                    <option value="NASDAQ">NASDAQ (Global)</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Buy Price (₹ / Share) *</label>
                  <input
                    type="number"
                    step="0.05"
                    class="form-control"
                    [(ngModel)]="stockForm.buyPrice"
                    name="buyPrice"
                    (input)="recalcLivePreview()"
                    required
                    placeholder="e.g. 2800" />
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Quantity (Shares) *</label>
                  <input
                    type="number"
                    step="1"
                    class="form-control"
                    [(ngModel)]="stockForm.quantity"
                    name="quantity"
                    (input)="recalcLivePreview()"
                    required
                    placeholder="e.g. 10" />
                </div>
              </div>

              <!-- Crucial Target Profit Per Share Input -->
              <div class="form-row highlight-row">
                <div class="form-group flex-1">
                  <label class="form-label">
                    🎯 Target Profit Per Share (₹)
                    <span class="hint-text">(e.g. ₹1000 profit per share chahiye)</span>
                  </label>
                  <input
                    type="number"
                    step="10"
                    class="form-control target-input"
                    [(ngModel)]="stockForm.targetProfitPerShare"
                    name="targetProfitPerShare"
                    (input)="onTargetProfitChange()"
                    placeholder="e.g. 1000" />
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">
                    Target Exit Price (₹)
                    <span class="hint-text">(Auto-calculated: Buy Price + Target)</span>
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    class="form-control"
                    [(ngModel)]="stockForm.targetPrice"
                    name="targetPrice"
                    placeholder="e.g. 3800" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label">Stop-Loss Price (₹) (Optional)</label>
                  <input
                    type="number"
                    step="0.05"
                    class="form-control"
                    [(ngModel)]="stockForm.stopLossPrice"
                    name="stopLossPrice"
                    placeholder="e.g. 2650" />
                </div>

                <div class="form-group flex-1">
                  <label class="form-label">Notes / Strategy (Optional)</label>
                  <input
                    type="text"
                    class="form-control"
                    [(ngModel)]="stockForm.notes"
                    name="notes"
                    placeholder="e.g. Swing trade breakout" />
                </div>
              </div>

              <!-- Live Form Calculated Summary Box -->
              <div class="form-summary-box">
                <div class="sum-item">
                  <span>Total Capital:</span>
                  <strong>₹{{ (stockForm.buyPrice * stockForm.quantity) | number:'1.2-2' }}</strong>
                </div>
                <div class="sum-item">
                  <span>Expected Total Profit:</span>
                  <strong class="green">₹{{ ((stockForm.targetProfitPerShare || 0) * stockForm.quantity) | number:'1.2-2' }}</strong>
                </div>
                <div class="sum-item">
                  <span>Target Return:</span>
                  <strong class="green">
                    {{ stockForm.buyPrice > 0 ? (((stockForm.targetProfitPerShare || 0) / stockForm.buyPrice) * 100 | number:'1.1-1') : 0 }}%
                  </strong>
                </div>
              </div>

              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="closeStockModal()">Cancel</button>
                <button type="submit" class="btn-save" [disabled]="isSaving() || !stockForm.ticker || stockForm.buyPrice <= 0 || stockForm.quantity <= 0">
                  {{ isSaving() ? 'Saving...' : (editingHoldingId() ? 'Update Stock Targets' : 'Add Stock to AI Portfolio') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- GROWW-STYLE AI ANALYSIS MODAL / DRAWER -->
      @if (showGrowwAiModal()) {
        <div class="modal-backdrop" (click)="closeGrowwAiModal()">
          <div class="groww-ai-modal-card" (click)="$event.stopPropagation()">
            <!-- Modal Head -->
            <div class="modal-head groww-ai-head">
              <div class="head-stock-meta">
                <div class="stock-title-row">
                  <span class="stock-symbol-badge">{{ activeAiTicker() }}</span>
                  <span class="groww-ai-pill">✨ GROWW-STYLE AI INSIGHTS</span>
                </div>
                <div class="company-subline">
                  {{ activeAiCompanyName() }} • Live CMP: <strong>₹{{ activeAiPrice() | number:'1.2-2' }}</strong>
                  <span [class.green]="activeAiChangePercent() >= 0" [class.red]="activeAiChangePercent() < 0">
                    ({{ activeAiChangePercent() >= 0 ? '+' : '' }}{{ activeAiChangePercent() | number:'1.2-2' }}%)
                  </span>
                </div>
              </div>
              <button type="button" class="btn-close-modal" (click)="closeGrowwAiModal()">✕</button>
            </div>

            <!-- Quick Switch Stock Chips -->
            <div class="groww-switch-strip">
              <span class="switch-lbl">Switch Stock:</span>
              <div class="switch-chips-scroll">
                @for (h of overview()?.holdingsWithAnalysis; track h.holding.id) {
                  <button
                    type="button"
                    class="switch-chip"
                    [class.active]="activeAiTicker() === h.holding.ticker"
                    (click)="switchAiStock(h.holding.ticker, h.holding.companyName, h.quote.currentPrice, h.quote.dayChangePercent)">
                    {{ h.holding.ticker.replace('.NS', '') }}
                  </button>
                }
                <!-- Popular hot stocks -->
                <button
                  type="button"
                  class="switch-chip"
                  [class.active]="activeAiTicker() === 'DIXON.NS'"
                  (click)="switchAiStock('DIXON.NS', 'Dixon Technologies (India) Ltd', 12841.00, 0.52)">
                  DIXON
                </button>
                <button
                  type="button"
                  class="switch-chip"
                  [class.active]="activeAiTicker() === 'IREDA.NS'"
                  (click)="switchAiStock('IREDA.NS', 'IREDA Ltd', 215.50, 1.2)">
                  IREDA
                </button>
                <button
                  type="button"
                  class="switch-chip"
                  [class.active]="activeAiTicker() === 'TATAMOTORS.NS'"
                  (click)="switchAiStock('TATAMOTORS.NS', 'Tata Motors Ltd', 948.30, 2.1)">
                  TATA MOTORS
                </button>
                <button
                  type="button"
                  class="switch-chip"
                  [class.active]="activeAiTicker() === 'RELIANCE.NS'"
                  (click)="switchAiStock('RELIANCE.NS', 'Reliance Industries', 2985.50, 1.4)">
                  RELIANCE
                </button>
              </div>
            </div>

            <div class="groww-modal-body">
              <!-- Groww Verdict Hero Banner -->
              @if (aiResponse()) {
                <div class="groww-verdict-banner" [class.buy]="aiResponse()!.actionSignal === 'STRONG_BUY' || aiResponse()!.actionSignal === 'BUY_ON_DIPS'" [class.exit]="aiResponse()!.actionSignal === 'BOOK_PROFIT' || aiResponse()!.actionSignal === 'EXIT_STOP_LOSS'" [class.caution]="aiResponse()!.actionSignal === 'WAIT_ON_DIPS' || aiResponse()!.actionSignal === 'AVOID'">
                  <div class="verdict-top-row">
                    <div class="verdict-badge">
                      {{ aiResponse()!.verdictLabel || aiResponse()!.actionSignal }}
                    </div>
                    @if (aiResponse()!.bullishScore) {
                      <div class="health-score-tag">
                        AI Bullish Score: <strong>{{ aiResponse()!.bullishScore }}/100</strong>
                        @if (aiResponse()!.riskRewardRatio) {
                          <span class="rr-text">• R:R <strong>1:{{ aiResponse()!.riskRewardRatio }}</strong></span>
                        }
                      </div>
                    }
                  </div>

                  <!-- 4-Box Key Levels Grid (Groww Cards) -->
                  <div class="groww-key-levels-grid">
                    <div class="level-box entry-box">
                      <span class="lvl-label">🎯 IDEAL ENTRY ZONE</span>
                      <span class="lvl-val">
                        @if (aiResponse()!.idealEntryZoneLow) {
                          ₹{{ aiResponse()!.idealEntryZoneLow | number:'1.0-0' }} - ₹{{ aiResponse()!.idealEntryZoneHigh | number:'1.0-0' }}
                        } @else {
                          ₹{{ (aiResponse()!.currentPrice || activeAiPrice()) | number:'1.0-0' }}
                        }
                      </span>
                      <span class="lvl-sub">Best Buying Price</span>
                    </div>

                    <div class="level-box target-box">
                      <span class="lvl-label">🚀 TARGET 1 (SHORT-TERM)</span>
                      <span class="lvl-val green">
                        ₹{{ aiResponse()!.keyTargetPrice | number:'1.2-2' }}
                      </span>
                      <span class="lvl-sub">First Profit Booking</span>
                    </div>

                    <div class="level-box breakout-box">
                      <span class="lvl-label">📈 TARGET 2 (BREAKOUT)</span>
                      <span class="lvl-val green">
                        ₹{{ (aiResponse()!.targetPrice2 || (aiResponse()!.keyTargetPrice ? aiResponse()!.keyTargetPrice! * 1.07 : 0)) | number:'1.2-2' }}
                      </span>
                      <span class="lvl-sub">Rally Ceiling</span>
                    </div>

                    <div class="level-box sl-box">
                      <span class="lvl-label">🛑 STRICT STOP-LOSS</span>
                      <span class="lvl-val red">
                        ₹{{ aiResponse()!.keySupportPrice | number:'1.2-2' }}
                      </span>
                      <span class="lvl-sub">Capital Protection Floor</span>
                    </div>
                  </div>
                </div>

                <!-- Groww Strengths & Risks (Pros vs Cons) -->
                @if (aiResponse()!.strengths && aiResponse()!.strengths!.length > 0) {
                  <div class="pros-cons-grid">
                    <div class="pros-card">
                      <div class="pros-head">
                        <span>🟢 Kyu Lena Chahiye (Strengths):</span>
                      </div>
                      <ul>
                        @for (str of aiResponse()!.strengths; track $index) {
                          <li>✓ {{ str }}</li>
                        }
                      </ul>
                    </div>

                    <div class="cons-card">
                      <div class="pros-head">
                        <span>🔴 Kya Dhyan Rakhna Hai (Risks):</span>
                      </div>
                      <ul>
                        @for (r of aiResponse()!.risks; track $index) {
                          <li>⚠ {{ r }}</li>
                        }
                      </ul>
                    </div>
                  </div>
                }

                <!-- AI Detailed Guidance Box -->
                <div class="ai-advice-narrative-card">
                  <div class="advice-head">
                    <span class="icon">💡</span>
                    <strong>Groww-Style AI Actionable Strategy:</strong>
                  </div>
                  <div class="advice-content">
                    <p class="advice-text">{{ aiResponse()!.answerHindi }}</p>
                  </div>
                </div>
              }

              <!-- 1-Click Interactive Groww Prompt Chips -->
              <div class="interactive-chips-bar">
                <span class="chips-title">Quick Groww Questions:</span>
                <div class="chips-wrapper">
                  <button type="button" class="groww-chip" (click)="askForActiveStock('Kya mujhe abhi lena chahiye ya dip ka wait karein?')">
                    ❓ "Kya abhi lena chahiye ya wait karein?"
                  </button>
                  <button type="button" class="groww-chip" (click)="askForActiveStock('Mera target ₹1000 profit ka hai, kab exit karu?')">
                    🎯 "Mera target 1000 profit ka hai, kab exit karu?"
                  </button>
                  <button type="button" class="groww-chip" (click)="askForActiveStock('Agar market gira to kitna gir sakta hai? Stop-loss kahan lagayein?')">
                    📉 "Market gira to kitna gir sakta hai? (Stop-loss)"
                  </button>
                  <button type="button" class="groww-chip" (click)="askForActiveStock('Kya averaging karni chahiye?')">
                    🔄 "Averaging karni chahiye?"
                  </button>
                </div>
              </div>
            </div>

            <!-- Groww Interactive Chat Input Bar -->
            <div class="groww-modal-footer">
              <input
                type="text"
                class="groww-chat-input"
                [(ngModel)]="userQuery"
                (keyup.enter)="submitAiQuestion(activeAiTicker())"
                placeholder="Poochiye: e.g. 'Dixon me 5 share liye hain, aur lein kya?', 'Stop-loss kitna rakhein?'..." />
              <button
                type="button"
                class="btn-send-groww-ai"
                (click)="submitAiQuestion(activeAiTicker())"
                [disabled]="isAiThinking() || !userQuery.trim()">
                {{ isAiThinking() ? 'Thinking...' : 'Poocho AI Se ⚡' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .market-ai-container {
      padding: 24px;
      max-width: 1440px;
      margin: 0 auto;
      color: var(--color-text-main, #0f172a);
    }

    /* Header */
    .market-ai-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .header-badge-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .ai-hub-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      background: linear-gradient(135deg, rgba(11, 87, 208, 0.15), rgba(99, 102, 241, 0.2));
      color: #0b57d0;
      border: 1px solid rgba(11, 87, 208, 0.3);
    }

    .market-pulse-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      border: 1px solid rgba(16, 185, 129, 0.3);

      .pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.35);
        animation: pulse 1.8s infinite ease-in-out;
      }

      &.closed {
        background: rgba(100, 116, 139, 0.12);
        color: #475569;
        border-color: rgba(100, 116, 139, 0.3);
        .pulse-dot {
          background: #64748b;
          animation: none;
        }
      }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
    }

    .page-title {
      font-size: 26px;
      font-weight: 800;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      font-size: 13px;
      color: var(--color-text-muted, #64748b);
      margin: 0;
      max-width: 680px;
      line-height: 1.5;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .auto-refresh-box {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: var(--radius-md, 8px);
      background: var(--color-canvas-subtle, #f8fafc);
      border: 1px solid var(--color-border, #e2e8f0);
      font-size: 12px;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;

      &:hover {
        border-color: var(--color-accent-fg, #0b57d0);
      }
    }

    .btn-refresh {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius-md, 8px);
      border: 1px solid var(--color-border, #e2e8f0);
      background: var(--color-bg-card, #ffffff);
      color: var(--color-text-main, #0f172a);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        border-color: #0b57d0;
        background: rgba(11, 87, 208, 0.04);
      }
    }

    .btn-add-stock {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 18px;
      border-radius: var(--radius-md, 8px);
      background: linear-gradient(135deg, #0b57d0, #004ac6);
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(11, 87, 208, 0.3);
      transition: all 0.15s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(11, 87, 208, 0.4);
      }
    }

    /* Target Hit Urgent Banner */
    .target-alert-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.18));
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: var(--radius-md, 10px);
      padding: 14px 20px;
      margin-bottom: 24px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
      flex-wrap: wrap;

      .alert-pulse-icon {
        font-size: 28px;
        animation: pulse 1.5s infinite;
      }

      .alert-content {
        flex: 1;
        .alert-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
          strong {
            font-size: 14px;
            color: #065f46;
          }
          .alert-badge {
            background: #10b981;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 9999px;
          }
        }
        .alert-desc {
          margin: 0;
          font-size: 13px;
          color: #064e3b;
          line-height: 1.4;
        }
      }

      .btn-alert-action {
        padding: 8px 16px;
        border-radius: var(--radius-sm, 6px);
        background: #059669;
        color: #ffffff;
        font-size: 12px;
        font-weight: 700;
        border: none;
        cursor: pointer;
        transition: all 0.15s ease;
        &:hover {
          background: #047857;
        }
      }
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background: var(--color-bg-card, #ffffff);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: var(--radius-md, 10px);
      padding: 16px 20px;
      box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05));

      .kpi-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        .kpi-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-text-muted, #64748b);
          letter-spacing: 0.05em;
        }
        .kpi-icon {
          font-size: 16px;
        }
      }

      .kpi-value {
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.02em;
        margin-bottom: 4px;
      }

      .kpi-sub {
        font-size: 12px;
        color: var(--color-text-muted, #64748b);
        &.profit { color: #10b981; font-weight: 700; }
        &.loss { color: #ef4444; font-weight: 700; }
      }

      &.alert-kpi.highlight {
        border-color: #10b981;
        background: rgba(16, 185, 129, 0.04);
        .highlight-text {
          color: #059669;
          font-weight: 700;
        }
      }

      &.screener-kpi {
        .screener-link {
          color: #0b57d0;
          font-weight: 700;
          cursor: pointer;
          &:hover {
            text-decoration: underline;
          }
        }
      }
    }

    /* Nav Tabs */
    .market-ai-nav {
      display: flex;
      gap: 8px;
      border-bottom: 2px solid var(--color-border, #e2e8f0);
      margin-bottom: 24px;
      overflow-x: auto;
    }

    .nav-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 700;
      color: var(--color-text-muted, #64748b);
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;

      .tab-pill {
        padding: 2px 8px;
        border-radius: 9999px;
        font-size: 11px;
        background: var(--color-canvas-subtle, #f1f5f9);
        color: var(--color-text-muted, #64748b);

        &.special {
          background: rgba(99, 102, 241, 0.15);
          color: #4f46e5;
        }
      }

      &:hover {
        color: var(--color-text-main, #0f172a);
      }

      &.active {
        color: #0b57d0;
        border-bottom-color: #0b57d0;
        .tab-pill {
          background: rgba(11, 87, 208, 0.12);
          color: #0b57d0;
        }
      }
    }

    /* Stock Analysis Card */
    .holdings-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .stock-analysis-card {
      background: var(--color-bg-card, #ffffff);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: var(--radius-md, 12px);
      padding: 22px;
      box-shadow: var(--shadow-sm, 0 2px 6px rgba(0,0,0,0.04));
      transition: all 0.2s ease;

      &.target-hit {
        border-color: #10b981;
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.12);
      }

      &.stop-breached {
        border-color: #ef4444;
      }

      .card-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
        flex-wrap: wrap;
        gap: 12px;
      }

      .ticker-badge-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
        .ticker-symbol {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.01em;
        }
        .exchange-tag {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--color-canvas-subtle, #f1f5f9);
          color: var(--color-text-muted, #64748b);
        }
        .badge-target-achieved {
          font-size: 11px;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 9999px;
          background: #10b981;
          color: #ffffff;
        }
      }

      .company-name {
        margin: 0;
        font-size: 13px;
        color: var(--color-text-muted, #64748b);
        font-weight: 600;
      }

      .price-meta {
        text-align: right;
        .live-ltp {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .day-change {
          font-size: 13px;
          font-weight: 700;
          &.positive { color: #10b981; }
          &.negative { color: #ef4444; }
        }
      }
    }

    /* Position Stats Strip */
    .position-stats-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      padding: 12px 16px;
      border-radius: var(--radius-sm, 8px);
      background: var(--color-canvas-subtle, #f8fafc);
      margin-bottom: 16px;

      .stat-col {
        display: flex;
        flex-direction: column;
        gap: 2px;
        .stat-lbl {
          font-size: 10px;
          font-weight: 700;
          color: var(--color-text-muted, #64748b);
          letter-spacing: 0.05em;
        }
        .stat-val {
          font-size: 14px;
          font-weight: 700;
          &.profit { color: #10b981; }
          &.loss { color: #ef4444; }
        }
      }
    }

    /* Target Progress Block */
    .target-progress-block {
      margin-bottom: 16px;
      padding: 12px 16px;
      border-radius: var(--radius-sm, 8px);
      border: 1px solid var(--color-border, #e2e8f0);

      .target-header-row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin-bottom: 8px;
        flex-wrap: wrap;
        gap: 6px;

        .target-subheading {
          color: var(--color-text-muted, #64748b);
          strong {
            color: var(--color-text-main, #0f172a);
          }
        }

        .target-current-achievement {
          color: #0b57d0;
          &.hit {
            color: #10b981;
            font-weight: 700;
          }
        }
      }

      .progress-bar-track {
        height: 8px;
        background: var(--color-canvas-subtle, #f1f5f9);
        border-radius: 9999px;
        overflow: hidden;

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #0b57d0, #6366f1);
          border-radius: 9999px;
          transition: width 0.4s ease;

          &.fill-hit {
            background: linear-gradient(90deg, #10b981, #059669);
          }
        }
      }
    }

    /* AI Recommendation Banner */
    .ai-recommendation-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-radius: var(--radius-sm, 8px);
      border-left: 4px solid #10b981;
      background: var(--color-canvas-subtle, #f8fafc);
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 10px;

      .recommendation-badge {
        padding: 5px 14px;
        border-radius: 9999px;
        color: #ffffff;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.02em;
      }

      .sentiment-meter {
        font-size: 12px;
        color: var(--color-text-muted, #64748b);
        strong {
          color: var(--color-text-main, #0f172a);
        }
      }
    }

    /* Predictive Analytics Grid */
    .predictive-analytics-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
      margin-bottom: 16px;

      @media (min-width: 768px) {
        grid-template-columns: 1fr 1fr;
      }
    }

    .analytics-card {
      padding: 14px 16px;
      border-radius: var(--radius-sm, 8px);
      border: 1px solid var(--color-border, #e2e8f0);

      .box-head {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        margin-bottom: 8px;
      }

      .box-numbers {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 8px;

        .primary-num {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.01em;
          &.green { color: #10b981; }
          &.red { color: #ef4444; }
          .num-delta {
            font-size: 13px;
            font-weight: 700;
          }
        }

        .prob-tag {
          font-size: 11px;
          color: #059669;
          font-weight: 600;
          &.risk { color: #dc2626; }
        }
      }

      .box-rationale {
        margin: 0;
        font-size: 12px;
        color: var(--color-text-muted, #64748b);
        line-height: 1.4;
      }

      .trailing-sl-pill {
        margin-top: 8px;
        display: inline-block;
        padding: 4px 10px;
        border-radius: var(--radius-xs, 4px);
        background: rgba(11, 87, 208, 0.08);
        color: #0b57d0;
        font-size: 11px;
        font-weight: 700;
      }

      &.upside-box {
        background: rgba(16, 185, 129, 0.03);
        border-color: rgba(16, 185, 129, 0.25);
      }

      &.downside-box {
        background: rgba(239, 68, 68, 0.03);
        border-color: rgba(239, 68, 68, 0.25);
      }
    }

    /* AI Narrative Guidance */
    .ai-narrative-box {
      background: linear-gradient(135deg, rgba(11, 87, 208, 0.04), rgba(99, 102, 241, 0.06));
      border: 1px solid rgba(11, 87, 208, 0.2);
      border-radius: var(--radius-sm, 8px);
      padding: 12px 16px;
      margin-bottom: 16px;

      .narrative-title {
        font-size: 12px;
        font-weight: 800;
        color: #0b57d0;
        margin-bottom: 4px;
      }

      .narrative-text {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
        color: var(--color-text-main, #0f172a);
      }
    }

    /* Action Footer */
    .card-footer-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;

      .btn-card-ask, .btn-card-ask-groww {
        padding: 8px 16px;
        border-radius: var(--radius-sm, 6px);
        background: linear-gradient(135deg, rgba(11, 87, 208, 0.12), rgba(99, 102, 241, 0.18));
        color: #0b57d0;
        border: 1.5px solid rgba(11, 87, 208, 0.35);
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 6px rgba(11, 87, 208, 0.1);

        &:hover {
          background: linear-gradient(135deg, #0b57d0, #6366f1);
          color: #ffffff;
          border-color: transparent;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(11, 87, 208, 0.3);
        }
      }

      .right-footer-btns {
        display: flex;
        gap: 8px;

        .btn-card-edit, .btn-card-delete {
          padding: 6px 12px;
          border-radius: var(--radius-xs, 4px);
          font-size: 11px;
          font-weight: 700;
          border: 1px solid var(--color-border, #e2e8f0);
          background: var(--color-bg-card, #ffffff);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-card-edit:hover {
          border-color: #0b57d0;
          color: #0b57d0;
        }

        .btn-card-delete:hover {
          border-color: #ef4444;
          color: #ef4444;
        }
      }
    }

    /* Empty State */
    .empty-state-card {
      text-align: center;
      padding: 48px 24px;
      background: var(--color-bg-card, #ffffff);
      border: 1px dashed var(--color-border, #cbd5e1);
      border-radius: var(--radius-md, 12px);

      .empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }

      h3 {
        font-size: 18px;
        font-weight: 800;
        margin: 0 0 8px 0;
      }

      p {
        font-size: 13px;
        color: var(--color-text-muted, #64748b);
        max-width: 540px;
        margin: 0 auto 20px auto;
        line-height: 1.5;
      }

      .empty-quick-add {
        display: flex;
        justify-content: center;
        gap: 12px;
        flex-wrap: wrap;

        .btn-primary-action {
          padding: 9px 20px;
          border-radius: var(--radius-sm, 6px);
          background: #0b57d0;
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          border: none;
          cursor: pointer;
        }

        .btn-secondary-action {
          padding: 9px 20px;
          border-radius: var(--radius-sm, 6px);
          background: var(--color-canvas-subtle, #f1f5f9);
          color: var(--color-text-main, #0f172a);
          font-size: 13px;
          font-weight: 700;
          border: 1px solid var(--color-border, #e2e8f0);
          cursor: pointer;
        }
      }
    }

    /* TAB 2: Screener Styles */
    .screener-intro {
      margin-bottom: 20px;
      h2 {
        font-size: 20px;
        font-weight: 800;
        margin: 0 0 6px 0;
      }
      p {
        font-size: 13px;
        color: var(--color-text-muted, #64748b);
        margin: 0;
      }
    }

    .screener-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .screener-card {
      background: var(--color-bg-card, #ffffff);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: var(--radius-md, 10px);
      padding: 18px 20px;

      .screener-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 14px;
        .screener-sector {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #0b57d0;
          text-transform: uppercase;
        }
        .screener-ticker {
          font-size: 17px;
          font-weight: 800;
          margin: 2px 0;
        }
        .screener-name {
          font-size: 12px;
          color: var(--color-text-muted, #64748b);
        }
        .screener-rec-badge {
          padding: 4px 12px;
          border-radius: 9999px;
          background: #10b981;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
        }
      }

      .screener-price-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
        gap: 10px;
        padding: 10px 14px;
        border-radius: var(--radius-sm, 6px);
        background: var(--color-canvas-subtle, #f8fafc);
        margin-bottom: 12px;

        .sc-price-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          .sc-lbl {
            font-size: 9px;
            font-weight: 700;
            color: var(--color-text-muted, #64748b);
          }
          .sc-val {
            font-size: 13px;
            font-weight: 700;
            &.highlight { color: #0b57d0; }
            &.green { color: #10b981; }
            &.red { color: #ef4444; }
          }
        }
      }

      .screener-catalyst-box {
        margin-bottom: 14px;
        .catalyst-tag {
          display: flex;
          gap: 12px;
          font-size: 11px;
          margin-bottom: 6px;
          flex-wrap: wrap;
          .rr-tag { color: #0b57d0; }
          .confidence-tag { color: #059669; }
        }
        .catalyst-text {
          margin: 0;
          font-size: 12px;
          color: var(--color-text-muted, #64748b);
          line-height: 1.4;
        }
      }

      .screener-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;

        .btn-add-screener-stock {
          padding: 7px 16px;
          border-radius: var(--radius-xs, 4px);
          background: #0b57d0;
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          border: none;
          cursor: pointer;
        }

        .btn-ask-screener {
          padding: 7px 14px;
          border-radius: var(--radius-xs, 4px);
          background: transparent;
          border: 1px solid var(--color-border, #e2e8f0);
          color: var(--color-text-main, #0f172a);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          &:hover {
            border-color: #0b57d0;
            color: #0b57d0;
          }
        }
      }
    }

    /* TAB 3: Copilot Styles */
    .copilot-container {
      max-width: 900px;
      margin: 0 auto;

      .copilot-head {
        text-align: center;
        margin-bottom: 24px;
        h2 { font-size: 22px; font-weight: 800; margin: 0 0 6px 0; }
        p { font-size: 13px; color: var(--color-text-muted, #64748b); margin: 0; }
      }

      .quick-chips-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        flex-wrap: wrap;
        .chips-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-text-muted, #64748b);
        }
        .chip-btn {
          padding: 5px 12px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid var(--color-border, #e2e8f0);
          background: var(--color-bg-card, #ffffff);
          color: var(--color-text-main, #0f172a);
          cursor: pointer;
          &:hover {
            border-color: #0b57d0;
            color: #0b57d0;
          }
        }
      }

      .copilot-input-bar {
        display: flex;
        gap: 10px;
        margin-bottom: 24px;
        .ai-input {
          flex: 1;
          padding: 12px 16px;
          border-radius: var(--radius-md, 8px);
          border: 1px solid var(--color-border, #e2e8f0);
          font-size: 14px;
          background: var(--color-bg-card, #ffffff);
          color: var(--color-text-main, #0f172a);
          &:focus {
            outline: none;
            border-color: #0b57d0;
            box-shadow: 0 0 0 3px rgba(11, 87, 208, 0.15);
          }
        }
        .btn-submit-ai {
          padding: 12px 22px;
          border-radius: var(--radius-md, 8px);
          background: linear-gradient(135deg, #0b57d0, #6366f1);
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }
      }

      .copilot-response-card {
        background: var(--color-bg-card, #ffffff);
        border: 1px solid rgba(11, 87, 208, 0.3);
        border-radius: var(--radius-md, 12px);
        padding: 22px;
        box-shadow: 0 4px 16px rgba(11, 87, 208, 0.08);

        .response-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 10px;

          .ai-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 800;
            color: #0b57d0;

            .signal-pill {
              background: #10b981;
              color: #ffffff;
              padding: 2px 8px;
              border-radius: 9999px;
              font-size: 10px;
            }
          }

          .key-levels-row {
            display: flex;
            gap: 8px;
            .lvl {
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 700;
              &.green { background: rgba(16, 185, 129, 0.12); color: #059669; }
              &.red { background: rgba(239, 68, 68, 0.12); color: #dc2626; }
              &.blue { background: rgba(11, 87, 208, 0.12); color: #0b57d0; }
            }
          }
        }

        .answer-hindi-block {
          margin-bottom: 16px;
          .answer-text {
            font-size: 14px;
            line-height: 1.6;
            margin: 0;
            white-space: pre-line;
          }
        }

        .bullet-points-box {
          padding: 12px 16px;
          background: var(--color-canvas-subtle, #f8fafc);
          border-radius: var(--radius-sm, 8px);
          font-size: 13px;
          strong { display: block; margin-bottom: 6px; }
          ul { margin: 0; padding-left: 18px; }
          li { margin-bottom: 4px; }
        }
      }
    }

    /* Modal Styles */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      z-index: 9999;
    }

    .stock-modal-card {
      background: var(--color-bg-card, #ffffff);
      border-radius: var(--radius-md, 12px);
      width: 100%;
      max-width: 580px;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
      max-height: 90vh;
      overflow-y: auto;

      .modal-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 18px;
        h3 { font-size: 17px; font-weight: 800; margin: 0; }
        .btn-close-modal {
          background: transparent;
          border: none;
          font-size: 16px;
          cursor: pointer;
          color: var(--color-text-muted, #64748b);
        }
      }

      .stock-search-directory-box {
        margin-bottom: 16px;
        padding: 14px;
        border-radius: var(--radius-sm, 8px);
        background: var(--color-canvas-subtle, #f8fafc);
        border: 1px solid var(--color-border, #e2e8f0);

        .search-header-row {
          margin-bottom: 8px;
        }

        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          margin-bottom: 10px;

          .stock-search-input {
            width: 100%;
            padding: 9px 36px 9px 12px;
            font-size: 13px;
            font-weight: 600;
            border-radius: var(--radius-sm, 6px);
            border: 1.5px solid #0b57d0;
            background: var(--color-bg-card, #ffffff);
            color: var(--color-text-main, #0f172a);
          }

          .btn-clear-search {
            position: absolute;
            right: 10px;
            background: transparent;
            border: none;
            cursor: pointer;
            color: var(--color-text-muted, #64748b);
            font-size: 12px;
          }
        }

        .search-results-chips {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 8px;
          max-height: 160px;
          overflow-y: auto;
          margin-bottom: 12px;
          padding-right: 4px;

          .stock-suggestion-chip {
            padding: 8px 10px;
            border-radius: var(--radius-sm, 6px);
            border: 1px solid var(--color-border, #e2e8f0);
            background: var(--color-bg-card, #ffffff);
            cursor: pointer;
            transition: all 0.15s ease;
            user-select: none;

            &:hover {
              border-color: #0b57d0;
              background: rgba(11, 87, 208, 0.04);
            }

            &.active {
              border-color: #0b57d0;
              background: rgba(11, 87, 208, 0.1);
              box-shadow: 0 0 0 2px rgba(11, 87, 208, 0.2);
            }

            .chip-title {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 3px;
              .s-name {
                font-size: 12px;
                font-weight: 700;
                color: var(--color-text-main, #0f172a);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100px;
              }
              .s-ticker {
                font-size: 9px;
                font-weight: 800;
                padding: 1px 4px;
                border-radius: 3px;
                background: var(--color-canvas-subtle, #f1f5f9);
                color: var(--color-text-muted, #64748b);
              }
            }

            .chip-bottom {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: var(--color-text-muted, #64748b);
              .s-price {
                font-weight: 700;
                color: #059669;
              }
            }
          }
        }

        .add-stock-guide-banner {
          background: rgba(11, 87, 208, 0.06);
          border: 1px dashed rgba(11, 87, 208, 0.25);
          border-radius: var(--radius-sm, 6px);
          padding: 8px 12px;
          font-size: 11px;
          line-height: 1.4;

          .guide-title {
            font-weight: 700;
            color: #0b57d0;
            margin-bottom: 4px;
          }

          .guide-steps {
            margin: 0;
            padding-left: 16px;
            color: var(--color-text-main, #0f172a);
            li {
              margin-bottom: 2px;
            }
          }
        }
      }

      .live-quote-success-banner {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 14px;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.4);
        border-radius: var(--radius-sm, 6px);
        margin-bottom: 14px;

        .lq-dot { font-size: 14px; }
        .lq-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 12px;
          .lq-title {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #065f46;
            .lq-badge {
              font-size: 10px;
              padding: 1px 6px;
              background: #059669;
              color: white;
              border-radius: 4px;
              font-weight: 700;
            }
          }
          .lq-metrics {
            color: var(--color-text-main, #0f172a);
            font-size: 11px;
            strong { color: #047857; font-size: 13px; }
            span.green { color: #059669; font-weight: 600; }
            span.red { color: #dc2626; font-weight: 600; }
          }
        }
      }

      .label-with-action {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2px;
      }

      .btn-fetch-live-price {
        background: linear-gradient(135deg, #0b57d0, #6366f1);
        color: #ffffff;
        border: none;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 10px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
        &:hover:not(:disabled) {
          opacity: 0.9;
          transform: scale(1.02);
        }
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      .search-spin-indicator {
        font-size: 11px;
        color: #0b57d0;
        font-weight: 600;
        padding: 2px 6px;
        white-space: nowrap;
      }

      .form-row {
        display: flex;
        gap: 12px;
        margin-bottom: 14px;
        &.highlight-row {
          background: rgba(16, 185, 129, 0.05);
          padding: 10px;
          border-radius: var(--radius-sm, 6px);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
        &.flex-1 { flex: 1; }

        .form-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-text-main, #0f172a);
          .hint-text {
            font-size: 10px;
            font-weight: normal;
            color: var(--color-text-muted, #64748b);
          }
        }

        .form-control {
          padding: 8px 12px;
          border-radius: var(--radius-sm, 6px);
          border: 1px solid var(--color-border, #e2e8f0);
          font-size: 13px;
          background: var(--color-bg-card, #ffffff);
          color: var(--color-text-main, #0f172a);
          &:focus {
            outline: none;
            border-color: #0b57d0;
          }
        }

        .target-input {
          font-weight: 800;
          color: #059669;
        }
      }

      .form-summary-box {
        display: flex;
        justify-content: space-between;
        padding: 10px 14px;
        background: var(--color-canvas-subtle, #f8fafc);
        border-radius: var(--radius-sm, 6px);
        margin-bottom: 18px;
        font-size: 12px;
        .sum-item {
          display: flex;
          flex-direction: column;
          span { color: var(--color-text-muted, #64748b); font-size: 10px; }
          strong.green { color: #10b981; }
        }
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;

        .btn-cancel {
          padding: 8px 16px;
          border-radius: var(--radius-sm, 6px);
          border: 1px solid var(--color-border, #e2e8f0);
          background: transparent;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-save {
          padding: 8px 20px;
          border-radius: var(--radius-sm, 6px);
          background: #0b57d0;
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }
      }
    }

    /* Copilot Stock Selector */
    .copilot-stock-selector-strip {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
      flex-wrap: wrap;

      .sel-label {
        font-size: 12px;
        font-weight: 700;
        color: var(--color-text-muted, #64748b);
      }

      .selector-chips-scroll {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;

        .sel-chip {
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid var(--color-border, #e2e8f0);
          background: var(--color-bg-card, #ffffff);
          color: var(--color-text-main, #0f172a);
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            border-color: #0b57d0;
            color: #0b57d0;
          }

          &.active {
            background: #0b57d0;
            color: #ffffff;
            border-color: #0b57d0;
            box-shadow: 0 2px 6px rgba(11, 87, 208, 0.25);
          }
        }
      }
    }

    /* Groww Verdict Banner & Key Levels Grid */
    .groww-verdict-banner {
      background: var(--color-canvas-subtle, #f8fafc);
      border: 1.5px solid var(--color-border, #e2e8f0);
      border-radius: var(--radius-md, 12px);
      padding: 16px;
      margin-bottom: 16px;
      transition: all 0.2s ease;

      &.buy {
        border-color: rgba(16, 185, 129, 0.5);
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02));
      }

      &.exit {
        border-color: rgba(239, 68, 68, 0.5);
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.02));
      }

      &.caution {
        border-color: rgba(245, 158, 11, 0.5);
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02));
      }

      .verdict-top-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 14px;
        flex-wrap: wrap;

        .verdict-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.02em;
          background: #0b57d0;
          color: #ffffff;
        }

        .health-score-tag {
          font-size: 12px;
          color: var(--color-text-muted, #64748b);
          strong { color: var(--color-text-main, #0f172a); }
          .rr-text { margin-left: 8px; color: #0b57d0; font-weight: 600; }
        }
      }

      .groww-key-levels-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 10px;

        .level-box {
          background: var(--color-bg-card, #ffffff);
          border: 1px solid var(--color-border, #e2e8f0);
          border-radius: var(--radius-sm, 8px);
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;

          .lvl-label {
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.03em;
            color: var(--color-text-muted, #64748b);
          }

          .lvl-val {
            font-size: 15px;
            font-weight: 800;
            color: var(--color-text-main, #0f172a);
            &.green { color: #059669; }
            &.red { color: #dc2626; }
          }

          .lvl-sub {
            font-size: 10px;
            color: var(--color-text-muted, #94a3b8);
          }

          &.entry-box {
            border-left: 3px solid #0b57d0;
          }
          &.target-box {
            border-left: 3px solid #10b981;
          }
          &.breakout-box {
            border-left: 3px solid #059669;
          }
          &.sl-box {
            border-left: 3px solid #ef4444;
          }
        }
      }
    }

    /* Pros vs Cons Grid */
    .pros-cons-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;

      @media (max-width: 640px) {
        grid-template-columns: 1fr;
      }

      .pros-card, .cons-card {
        padding: 12px 14px;
        border-radius: var(--radius-sm, 8px);
        font-size: 12px;

        .pros-head {
          font-weight: 800;
          margin-bottom: 8px;
        }

        ul {
          margin: 0;
          padding-left: 16px;
          li {
            margin-bottom: 4px;
            line-height: 1.4;
          }
        }
      }

      .pros-card {
        background: rgba(16, 185, 129, 0.06);
        border: 1px solid rgba(16, 185, 129, 0.25);
        color: #065f46;
        .pros-head { color: #047857; }
      }

      .cons-card {
        background: rgba(239, 68, 68, 0.06);
        border: 1px solid rgba(239, 68, 68, 0.25);
        color: #991b1b;
        .pros-head { color: #b91c1c; }
      }
    }

    /* GROWW-STYLE AI MODAL CARD */
    .groww-ai-modal-card {
      background: var(--color-bg-card, #ffffff);
      border-radius: var(--radius-md, 16px);
      width: 100%;
      max-width: 720px;
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      animation: modalSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);

      .groww-ai-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 18px 24px 14px 24px;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        background: var(--color-canvas-subtle, #f8fafc);

        .head-stock-meta {
          .stock-title-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 4px;

            .stock-symbol-badge {
              font-size: 16px;
              font-weight: 800;
              color: var(--color-text-main, #0f172a);
              background: var(--color-bg-card, #ffffff);
              padding: 3px 10px;
              border-radius: 6px;
              border: 1px solid var(--color-border, #cbd5e1);
            }

            .groww-ai-pill {
              font-size: 11px;
              font-weight: 800;
              padding: 3px 10px;
              border-radius: 9999px;
              background: linear-gradient(135deg, rgba(11, 87, 208, 0.15), rgba(99, 102, 241, 0.2));
              color: #0b57d0;
              border: 1px solid rgba(11, 87, 208, 0.3);
            }
          }

          .company-subline {
            font-size: 12px;
            color: var(--color-text-muted, #64748b);
            strong { color: var(--color-text-main, #0f172a); }
            span.green { color: #059669; font-weight: 700; }
            span.red { color: #dc2626; font-weight: 700; }
          }
        }
      }

      .groww-switch-strip {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 24px;
        background: var(--color-bg-card, #ffffff);
        border-bottom: 1px solid var(--color-border, #f1f5f9);

        .switch-lbl {
          font-size: 11px;
          font-weight: 700;
          color: var(--color-text-muted, #64748b);
          white-space: nowrap;
        }

        .switch-chips-scroll {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 2px;

          &::-webkit-scrollbar {
            height: 3px;
          }

          .switch-chip {
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            border: 1px solid var(--color-border, #e2e8f0);
            background: var(--color-canvas-subtle, #f8fafc);
            color: var(--color-text-main, #0f172a);
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.15s ease;

            &:hover {
              border-color: #0b57d0;
              color: #0b57d0;
            }

            &.active {
              background: #0b57d0;
              color: #ffffff;
              border-color: #0b57d0;
            }
          }
        }
      }

      .groww-modal-body {
        padding: 20px 24px;
        overflow-y: auto;
        flex: 1;

        .ai-advice-narrative-card {
          background: var(--color-canvas-subtle, #f8fafc);
          border: 1px solid var(--color-border, #e2e8f0);
          border-radius: var(--radius-sm, 8px);
          padding: 14px 16px;
          margin-bottom: 16px;

          .advice-head {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 6px;
            font-size: 12px;
            font-weight: 700;
            color: #0b57d0;
          }

          .advice-text {
            margin: 0;
            font-size: 13px;
            line-height: 1.6;
            color: var(--color-text-main, #0f172a);
            white-space: pre-line;
          }
        }

        .interactive-chips-bar {
          margin-top: 14px;
          .chips-title {
            display: block;
            font-size: 11px;
            font-weight: 700;
            color: var(--color-text-muted, #64748b);
            margin-bottom: 8px;
          }

          .chips-wrapper {
            display: flex;
            flex-direction: column;
            gap: 6px;

            .groww-chip {
              text-align: left;
              padding: 8px 14px;
              border-radius: var(--radius-sm, 8px);
              border: 1px solid var(--color-border, #e2e8f0);
              background: var(--color-bg-card, #ffffff);
              color: var(--color-text-main, #0f172a);
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.15s ease;

              &:hover {
                border-color: #0b57d0;
                background: rgba(11, 87, 208, 0.04);
                color: #0b57d0;
                transform: translateX(2px);
              }
            }
          }
        }
      }

      .groww-modal-footer {
        display: flex;
        gap: 10px;
        padding: 14px 24px;
        border-top: 1px solid var(--color-border, #e2e8f0);
        background: var(--color-bg-card, #ffffff);

        .groww-chat-input {
          flex: 1;
          padding: 10px 14px;
          border-radius: var(--radius-sm, 8px);
          border: 1px solid var(--color-border, #cbd5e1);
          font-size: 13px;
          background: var(--color-bg-card, #ffffff);
          color: var(--color-text-main, #0f172a);

          &:focus {
            outline: none;
            border-color: #0b57d0;
            box-shadow: 0 0 0 3px rgba(11, 87, 208, 0.15);
          }
        }

        .btn-send-groww-ai {
          padding: 10px 18px;
          border-radius: var(--radius-sm, 8px);
          background: linear-gradient(135deg, #0b57d0, #6366f1);
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          white-space: nowrap;

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }
      }
    }

    @keyframes modalSlideUp {
      from {
        opacity: 0;
        transform: translateY(16px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .spin {
      animation: spin 1s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    /* ==========================================================================
       TAB 4: AI TRADING AGENTS & AUTOMATION HUB STYLES
       ========================================================================== */
    .agents-hub-header {
      background: linear-gradient(135deg, rgba(11, 87, 208, 0.08), rgba(99, 102, 241, 0.08));
      border: 1px solid rgba(11, 87, 208, 0.2);
      border-radius: 18px;
      padding: 24px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }

    .hub-header-left {
      max-width: 780px;
    }

    .hub-badge-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }

    .hub-live-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 9999px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #ffffff;
      letter-spacing: 0.5px;
    }

    .ist-clock-pill {
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(99, 102, 241, 0.12);
      color: #4f46e5;
      border: 1px solid rgba(99, 102, 241, 0.25);
    }

    .market-clock-status {
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.25);
    }

    .market-clock-status.open {
      background: rgba(16, 185, 129, 0.12);
      color: #10b981;
      border-color: rgba(16, 185, 129, 0.3);
    }

    .hub-header-left h2 {
      margin: 0 0 6px 0;
      font-size: 22px;
      font-weight: 800;
      color: var(--color-text-main, #0f172a);
    }

    .hub-header-left p {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--color-text-sub, #475569);
    }

    .hub-quick-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn-agent-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }

    .btn-agent-action:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-agent-action.simulate {
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(124, 58, 237, 0.25);
    }

    .btn-agent-action.simulate:hover:not(:disabled) {
      background: linear-gradient(135deg, #6d28d9, #4338ca);
      transform: translateY(-1px);
    }

    .btn-agent-action.primary {
      background: #0b57d0;
      color: #ffffff;
    }

    .btn-agent-action.primary:hover:not(:disabled) {
      background: #0842a0;
      transform: translateY(-1px);
    }

    .btn-agent-action.secondary {
      background: rgba(11, 87, 208, 0.1);
      color: #0b57d0;
      border: 1px solid rgba(11, 87, 208, 0.25);
    }

    .btn-agent-action.secondary:hover:not(:disabled) {
      background: rgba(11, 87, 208, 0.18);
    }

    .btn-agent-action.whatsapp {
      background: #25D366;
      color: #ffffff;
    }

    .btn-agent-action.whatsapp:hover:not(:disabled) {
      background: #1ebe5d;
      transform: translateY(-1px);
    }

    /* Multi-Agent Live Workflow Pipeline Ribbon */
    .agent-pipeline-ribbon {
      background: var(--color-card-bg, #ffffff);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 18px;
      padding: 20px 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
    }

    .pipeline-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .pipeline-tag {
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(99, 102, 241, 0.12);
      color: #4f46e5;
      letter-spacing: 0.5px;
    }

    .pipeline-sub {
      font-size: 12px;
      color: var(--color-text-sub, #64748b);
    }

    .pipeline-track {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }

    .pipeline-step-box {
      flex: 1;
      min-width: 210px;
      background: var(--color-bg-subtle, #f8fafc);
      border: 1.5px solid var(--color-border, #e2e8f0);
      border-radius: 12px;
      padding: 12px 14px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      transition: all 0.25s ease;
    }

    .pipeline-step-box.active-glow {
      border-color: #6366f1;
      box-shadow: 0 0 16px rgba(99, 102, 241, 0.4);
      transform: translateY(-2px);
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.05));
    }

    .pipeline-step-box.delivery {
      border-left: 4px solid #10b981;
    }

    .step-num {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #0b57d0;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 12px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .step-num.check {
      background: #10b981;
    }

    .step-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .step-agent-name {
      font-size: 13px;
      font-weight: 800;
      color: var(--color-text-main, #0f172a);
    }

    .step-role {
      font-size: 11px;
      font-weight: 700;
      color: #4f46e5;
    }

    .step-action-desc {
      font-size: 11px;
      color: var(--color-text-sub, #64748b);
      line-height: 1.3;
    }

    .pipeline-arrow {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 0 4px;
      color: var(--color-text-sub, #94a3b8);
      flex-shrink: 0;
    }

    .pipeline-arrow.flow-pulse {
      color: #6366f1;
      animation: pulseArrow 1s infinite alternate;
    }

    @keyframes pulseArrow {
      0% { opacity: 0.5; transform: scale(0.95); }
      100% { opacity: 1; transform: scale(1.05); }
    }

    .arrow-line {
      width: 18px;
      height: 2px;
      background: currentColor;
    }

    .arrow-text {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .arrow-head {
      font-size: 9px;
    }

    /* Sentinel Flash Banner */
    .sentinel-flash-banner {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid #10b981;
      border-radius: 12px;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      font-size: 14px;
      font-weight: 600;
      color: #065f46;
    }

    .btn-close-flash {
      margin-left: auto;
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      color: #065f46;
    }

    /* Test Alert Success Banner */
    .test-alert-success-banner {
      background: linear-gradient(135deg, rgba(37, 211, 102, 0.12), rgba(16, 185, 129, 0.08));
      border: 1.5px solid #25D366;
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }

    .test-alert-success-banner .banner-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      font-size: 15px;
      color: #0f5132;
      margin-bottom: 6px;
    }

    .test-alert-success-banner .badge {
      font-size: 11px;
      background: #25D366;
      color: white;
      padding: 2px 8px;
      border-radius: 6px;
    }

    .test-alert-success-banner p {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: #1e293b;
    }

    .test-alert-success-banner .banner-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 12px;
      flex-wrap: wrap;
    }

    .btn-open-wa {
      background: #25D366;
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      text-decoration: none;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }

    .btn-open-wa:hover {
      background: #1ebe5d;
    }

    .email-tag {
      font-size: 12px;
      color: var(--color-text-sub, #64748b);
    }

    .btn-dismiss {
      background: none;
      border: 1px solid #cbd5e1;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
    }

    /* 3 Collaborative Agent Cards */
    .agent-cards-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 28px;
    }

    .agent-role-card {
      background: var(--color-card-bg, #ffffff);
      border: 1.5px solid var(--color-border, #e2e8f0);
      border-radius: 18px;
      padding: 22px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 14px;
      transition: all 0.25s ease;
    }

    .agent-role-card.simulating-active {
      border-color: #6366f1;
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
      transform: translateY(-3px);
    }

    .agent-card-head {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .agent-avatar {
      font-size: 32px;
      line-height: 1;
    }

    .agent-id-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .agent-id-tag {
      font-size: 10px;
      font-weight: 900;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(11, 87, 208, 0.1);
      color: #0b57d0;
      width: fit-content;
      letter-spacing: 0.5px;
    }

    .agent-id-tag.sentinel {
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
    }

    .agent-id-tag.dispatcher {
      background: rgba(245, 158, 11, 0.1);
      color: #d97706;
    }

    .agent-name {
      font-size: 15px;
      font-weight: 800;
      color: var(--color-text-main, #0f172a);
    }

    .agent-role-sub {
      font-size: 12px;
      color: var(--color-text-sub, #64748b);
    }

    .agent-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
      white-space: nowrap;
    }

    .agent-status-badge .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
    }

    .agent-duty-box {
      background: var(--color-bg-subtle, #f8fafc);
      border: 1px solid var(--color-border, #e2e8f0);
      border-left: 3px solid #0b57d0;
      border-radius: 10px;
      padding: 10px 12px;
    }

    .duty-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 800;
      color: var(--color-text-main, #0f172a);
      margin-bottom: 4px;
    }

    .duty-desc {
      font-size: 12px;
      line-height: 1.45;
      color: var(--color-text-sub, #475569);
      margin: 0;
    }

    .agent-action-box {
      background: rgba(16, 185, 129, 0.05);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-left: 3px solid #10b981;
      border-radius: 10px;
      padding: 10px 12px;
    }

    .action-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 800;
      color: #065f46;
      margin-bottom: 4px;
    }

    .action-desc {
      font-size: 12px;
      line-height: 1.45;
      color: #1e293b;
      margin: 0;
    }

    .agent-metrics-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      background: var(--color-bg-subtle, #f8fafc);
      padding: 10px;
      border-radius: 10px;
    }

    .a-metric {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .m-lbl {
      font-size: 10px;
      font-weight: 700;
      color: var(--color-text-sub, #64748b);
      text-transform: uppercase;
    }

    .m-val {
      font-size: 13px;
      font-weight: 800;
      color: var(--color-text-main, #0f172a);
    }

    .m-val.green { color: #10b981; }
    .m-val.red { color: #ef4444; }
    .m-val.blue { color: #2563eb; }

    .agent-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px solid var(--color-border, #e2e8f0);
    }

    .btn-trigger-agent {
      background: #0b57d0;
      color: #ffffff;
      border: none;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-trigger-agent:hover:not(:disabled) {
      background: #0842a0;
    }

    .btn-trigger-agent.secondary {
      background: rgba(11, 87, 208, 0.1);
      color: #0b57d0;
      border: 1px solid rgba(11, 87, 208, 0.25);
    }

    .btn-trigger-agent.secondary:hover:not(:disabled) {
      background: rgba(11, 87, 208, 0.2);
    }

    .btn-trigger-agent.whatsapp {
      background: #25D366;
      color: #ffffff;
    }

    .btn-trigger-agent.whatsapp:hover:not(:disabled) {
      background: #1ebe5d;
    }

    .next-run-tag {
      font-size: 11px;
      color: var(--color-text-sub, #64748b);
    }

    /* Live Multi-Agent Telemetry Console */
    .agent-terminal-card {
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 18px;
      padding: 20px;
      margin-bottom: 28px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .terminal-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 14px;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 12px;
    }

    .terminal-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .terminal-dots {
      display: flex;
      gap: 6px;
    }

    .terminal-dots .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .terminal-dots .dot.red { background: #ef4444; }
    .terminal-dots .dot.yellow { background: #f59e0b; }
    .terminal-dots .dot.green { background: #10b981; }

    .t-title {
      color: #f8fafc;
      font-size: 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .t-sub {
      font-size: 11px;
      color: #94a3b8;
      font-weight: normal;
    }

    .terminal-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .filter-pills {
      display: flex;
      gap: 4px;
      background: #0f172a;
      padding: 3px;
      border-radius: 8px;
      border: 1px solid #1e293b;
    }

    .filter-pill {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .filter-pill.active {
      background: #2563eb;
      color: #ffffff;
    }

    .btn-sim-stream {
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: #ffffff;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-sim-stream:hover:not(:disabled) {
      background: linear-gradient(135deg, #6d28d9, #4338ca);
    }

    .btn-clear-console {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
    }

    .terminal-screen {
      background: #030712;
      border: 1px solid #111827;
      border-radius: 10px;
      padding: 14px;
      max-height: 320px;
      overflow-y: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }

    .terminal-empty {
      color: #6b7280;
      font-size: 12px;
      padding: 20px 0;
      text-align: center;
    }

    .terminal-log-feed {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .terminal-line {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 12px;
      line-height: 1.4;
      padding: 3px 6px;
      border-radius: 4px;
      flex-wrap: wrap;
    }

    .terminal-line.alert-line {
      background: rgba(239, 68, 68, 0.12);
      border-left: 3px solid #ef4444;
    }

    .terminal-line.warn-line {
      background: rgba(245, 158, 11, 0.1);
      border-left: 3px solid #f59e0b;
    }

    .terminal-line.success-line {
      background: rgba(16, 185, 129, 0.08);
      border-left: 3px solid #10b981;
    }

    .t-time {
      color: #64748b;
      font-size: 11px;
      white-space: nowrap;
    }

    .t-agent-badge {
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }

    .t-agent-badge.agent1 {
      background: rgba(99, 102, 241, 0.2);
      color: #a5b4fc;
    }

    .t-agent-badge.agent2 {
      background: rgba(16, 185, 129, 0.2);
      color: #6ee7b7;
    }

    .t-agent-badge.agent3 {
      background: rgba(245, 158, 11, 0.2);
      color: #fde047;
    }

    .t-level {
      font-size: 10px;
      font-weight: 800;
      padding: 1px 4px;
      border-radius: 3px;
    }

    .t-level.info { color: #60a5fa; }
    .t-level.success { color: #34d399; }
    .t-level.warn { color: #fbbf24; }
    .t-level.alert { color: #f87171; }

    .t-msg {
      color: #e2e8f0;
      font-size: 12px;
      flex: 1;
    }

    /* Pre-Market Section Card */
    .pre-market-section-card {
      background: var(--color-card-bg, #ffffff);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 18px;
      padding: 24px;
      margin-bottom: 28px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
    }

    .section-card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 18px;
    }

    .title-with-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .title-with-pill h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: var(--color-text-main, #0f172a);
    }

    .pill-date {
      font-size: 12px;
      background: rgba(99, 102, 241, 0.1);
      color: #4f46e5;
      padding: 3px 10px;
      border-radius: 9999px;
      font-weight: 600;
    }

    .pill-sentiment {
      font-size: 12px;
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
      padding: 3px 10px;
      border-radius: 9999px;
      font-weight: 700;
    }

    .btn-refresh-report {
      background: none;
      border: 1px solid var(--color-border, #cbd5e1);
      border-radius: 8px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      color: var(--color-text-main, #0f172a);
      transition: background 0.15s;
    }

    .btn-refresh-report:hover:not(:disabled) {
      background: var(--color-bg-subtle, #f8fafc);
    }

    .market-outlook-banner {
      background: linear-gradient(135deg, rgba(11, 87, 208, 0.08), rgba(99, 102, 241, 0.08));
      border-left: 4px solid #0b57d0;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }

    .outlook-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0b57d0;
      margin-bottom: 4px;
    }

    .outlook-text {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-main, #0f172a);
    }

    .market-split-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    @media (max-width: 900px) {
      .market-split-grid {
        grid-template-columns: 1fr;
      }
    }

    .split-col {
      background: rgba(248, 250, 252, 0.6);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 14px;
      padding: 18px;
    }

    .split-col.profit-col {
      border-top: 4px solid #10b981;
    }

    .split-col.loss-col {
      border-top: 4px solid #ef4444;
    }

    .col-head {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 16px;
    }

    .col-head h4 {
      margin: 0 0 2px 0;
      font-size: 15px;
      font-weight: 800;
      color: var(--color-text-main, #0f172a);
    }

    .col-head .sub {
      font-size: 12px;
      color: var(--color-text-sub, #64748b);
    }

    .col-icon {
      font-size: 22px;
    }

    .stock-cards-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .pm-stock-card {
      background: var(--color-card-bg, #ffffff);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
      transition: transform 0.15s, box-shadow 0.15s;
    }

    .pm-stock-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .pm-stock-card.profit {
      border-left: 4px solid #10b981;
    }

    .pm-stock-card.loss {
      border-left: 4px solid #ef4444;
    }

    .pm-stock-card .card-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .stock-ticker {
      font-size: 16px;
      font-weight: 900;
      color: var(--color-text-main, #0f172a);
    }

    .stock-ticker.loss {
      color: #dc2626;
    }

    .stock-name {
      font-size: 12px;
      color: var(--color-text-sub, #64748b);
      display: block;
    }

    .profit-target-pill {
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
      font-size: 12px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 9999px;
    }

    .loss-risk-pill {
      background: rgba(239, 68, 68, 0.12);
      color: #dc2626;
      font-size: 12px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 9999px;
    }

    .price-metrics-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: var(--color-bg-subtle, #f8fafc);
      padding: 10px;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .p-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .p-item .lbl {
      font-size: 10px;
      font-weight: 700;
      color: var(--color-text-sub, #64748b);
      text-transform: uppercase;
    }

    .p-item .val {
      font-size: 13px;
      font-weight: 800;
      color: var(--color-text-main, #0f172a);
    }

    .p-item .val.green {
      color: #10b981;
    }

    .p-item .val.red {
      color: #ef4444;
    }

    .p-item .val.blue {
      color: #2563eb;
    }

    .catalyst-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 12px;
    }

    .setup-badge {
      font-size: 11px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(99, 102, 241, 0.1);
      color: #4f46e5;
      white-space: nowrap;
    }

    .setup-badge.loss {
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;
    }

    .catalyst-hindi {
      font-size: 12px;
      margin: 0;
      color: var(--color-text-main, #334155);
      line-height: 1.4;
    }

    .catalyst-hindi.loss {
      color: #991b1b;
    }

    .pm-card-actions {
      display: flex;
      justify-content: flex-end;
    }

    .btn-add-pm-stock {
      background: none;
      border: 1px solid #0b57d0;
      color: #0b57d0;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-add-pm-stock:hover {
      background: rgba(11, 87, 208, 0.1);
    }

    .actionable-guidance-card {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.05));
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 12px;
      padding: 14px 18px;
    }

    .actionable-guidance-card .g-head {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 800;
      color: #b45309;
      margin-bottom: 4px;
    }

    .actionable-guidance-card .g-text {
      font-size: 13px;
      line-height: 1.5;
      color: var(--color-text-main, #1e293b);
      margin: 0;
    }

    .loading-report-card {
      text-align: center;
      padding: 40px;
      font-size: 14px;
      color: var(--color-text-sub, #64748b);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    /* Settings and Logs Grid */
    .settings-and-logs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    @media (max-width: 900px) {
      .settings-and-logs-grid {
        grid-template-columns: 1fr;
      }
    }

    .alert-settings-card,
    .alert-history-card {
      background: var(--color-card-bg, #ffffff);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 18px;
      padding: 22px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
    }

    .settings-head,
    .history-head {
      margin-bottom: 18px;
    }

    .settings-head h3,
    .history-head h3 {
      margin: 0 0 2px 0;
      font-size: 16px;
      font-weight: 800;
      color: var(--color-text-main, #0f172a);
    }

    .settings-head .sub,
    .history-head .sub {
      font-size: 12px;
      color: var(--color-text-sub, #64748b);
    }

    .settings-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .setting-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-label {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 700;
      color: var(--color-text-main, #0f172a);
    }

    .form-label .hint {
      font-size: 11px;
      font-weight: normal;
      color: var(--color-text-sub, #64748b);
    }

    .toggle-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 6px;
    }

    .toggle-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px;
      border-radius: 10px;
      background: var(--color-bg-subtle, #f8fafc);
      cursor: pointer;
      transition: background 0.15s;
    }

    .toggle-item:hover {
      background: rgba(11, 87, 208, 0.05);
    }

    .toggle-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
      margin-top: 2px;
      accent-color: #0b57d0;
    }

    .toggle-label {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .toggle-label strong {
      font-size: 13px;
      color: var(--color-text-main, #0f172a);
    }

    .toggle-label span {
      font-size: 11px;
      color: var(--color-text-sub, #64748b);
    }

    .settings-actions {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }

    .btn-save-settings {
      flex: 1;
      background: #0b57d0;
      color: #ffffff;
      border: none;
      padding: 12px;
      border-radius: 10px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-save-settings:hover:not(:disabled) {
      background: #0842a0;
    }

    .btn-save-settings:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-test-alert {
      background: rgba(37, 211, 102, 0.15);
      border: 1px solid #25D366;
      color: #0f5132;
      padding: 12px 16px;
      border-radius: 10px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .btn-test-alert:hover:not(:disabled) {
      background: rgba(37, 211, 102, 0.25);
    }

    .btn-test-alert:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .logs-container {
      max-height: 520px;
      overflow-y: auto;
    }

    .empty-logs {
      text-align: center;
      padding: 40px 20px;
      color: var(--color-text-sub, #64748b);
    }

    .empty-icon {
      font-size: 32px;
      display: block;
      margin-bottom: 10px;
    }

    .logs-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .log-card {
      background: var(--color-bg-subtle, #f8fafc);
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .log-card.profit {
      border-left: 4px solid #10b981;
    }

    .log-card.loss {
      border-left: 4px solid #ef4444;
    }

    .log-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .log-type-tag {
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 9999px;
      background: rgba(99, 102, 241, 0.1);
      color: #4f46e5;
    }

    .log-type-tag.profit {
      background: rgba(16, 185, 129, 0.12);
      color: #059669;
    }

    .log-type-tag.loss {
      background: rgba(239, 68, 68, 0.12);
      color: #dc2626;
    }

    .log-time {
      font-size: 11px;
      color: var(--color-text-sub, #64748b);
    }

    .log-title {
      font-size: 13px;
      color: var(--color-text-main, #0f172a);
    }

    .log-msg {
      font-size: 12px;
      line-height: 1.4;
      margin: 0;
      color: var(--color-text-sub, #475569);
    }

    .log-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--color-border, #e2e8f0);
    }

    .channel-status {
      display: flex;
      gap: 6px;
    }

    .ch-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.05);
      color: var(--color-text-sub, #64748b);
    }

    .btn-open-wa-small {
      font-size: 11px;
      font-weight: 700;
      color: #15803d;
      text-decoration: none;
      background: rgba(37, 211, 102, 0.15);
      padding: 3px 8px;
      border-radius: 6px;
      transition: background 0.15s;
    }

    .btn-open-wa-small:hover {
      background: rgba(37, 211, 102, 0.3);
    }
  `]
})
export class MarketAiComponent implements OnInit, OnDestroy {
  private readonly marketService = inject(MarketAiService);
  readonly themeService = inject(ThemeService);

  readonly Math = Math;

  // State Signals
  readonly overview = signal<MarketAiPortfolioOverview | null>(null);
  readonly activeTab = signal<'portfolio' | 'screener' | 'copilot' | 'agents'>('portfolio');
  readonly isRefreshing = signal<boolean>(false);
  readonly isAutoRefreshOn = signal<boolean>(true);
  readonly isSaving = signal<boolean>(false);
  readonly isAiThinking = signal<boolean>(false);

  // Tab 4: Agent & Alert Signals
  readonly agentStatus = signal<MarketAgentStatus | null>(null);
  readonly preMarketReport = signal<PreMarketDailyReport | null>(null);
  readonly agentAlertLogs = signal<MarketAgentAlertLog[]>([]);
  readonly agentSettings = signal<MarketAgentUserSetting>({
    whatsAppPhoneNumber: '+91 98765 43210',
    emailAddress: 'investor@example.com',
    enablePreMarketScan: true,
    enableTargetHitAlerts: true,
    enableStopLossAlerts: true,
    enableEmailDispatch: true,
    enableWhatsAppDispatch: true,
    preMarketScanTime: '08:45 AM'
  });
  readonly isRunningPreMarket = signal<boolean>(false);
  readonly isCheckingSentinel = signal<boolean>(false);
  readonly isSendingTestAlert = signal<boolean>(false);
  readonly isSavingSettings = signal<boolean>(false);
  readonly sentinelResultSummary = signal<string | null>(null);
  readonly testNotificationResult = signal<MarketAgentAlertLog | null>(null);

  // Mission Control Live Telemetry & Simulation Signals
  readonly activeAgentFilter = signal<'ALL' | 'AGENT_1' | 'AGENT_2' | 'AGENT_3'>('ALL');
  readonly isSimulatingPipeline = signal<boolean>(false);
  readonly simulationStep = signal<number>(0);
  readonly liveAgentTerminalLogs = signal<Array<{
    id: string;
    timestamp: string;
    agent: 'AGENT_1' | 'AGENT_2' | 'AGENT_3' | 'SYSTEM';
    agentName: string;
    level: 'INFO' | 'SUCCESS' | 'WARN' | 'ALERT';
    message: string;
  }>>([
    {
      id: 'init-1',
      timestamp: '08:45:00 AM IST',
      agent: 'AGENT_1',
      agentName: 'Pre-Market Intelligence',
      level: 'INFO',
      message: '🌅 Initialized Indian market pre-open engine. Scanning Gift Nifty (+0.42%) and NSE 500 breakout setups.'
    },
    {
      id: 'init-2',
      timestamp: '08:45:02 AM IST',
      agent: 'AGENT_1',
      agentName: 'Pre-Market Intelligence',
      level: 'SUCCESS',
      message: '🚀 Breakout detected in Dixon Technologies (DIXON.NS): Target Profit setup +₹1,000/share (7.8%) with R:R 1:3.4.'
    },
    {
      id: 'init-3',
      timestamp: '08:45:04 AM IST',
      agent: 'AGENT_1',
      agentName: 'Pre-Market Intelligence',
      level: 'WARN',
      message: '⚠️ High breakdown risk detected in Vodafone Idea (IDEA): Continuous selling pressure, marked as AVOID.'
    },
    {
      id: 'init-4',
      timestamp: '08:45:05 AM IST',
      agent: 'AGENT_1',
      agentName: 'Pre-Market Intelligence',
      level: 'SUCCESS',
      message: '📋 Pre-market daily brief ready: 4 Profit gainers & 3 Loss risks handed over to Alert Dispatcher.'
    },
    {
      id: 'init-5',
      timestamp: '09:15:00 AM IST',
      agent: 'AGENT_2',
      agentName: 'Portfolio Sentinel',
      level: 'INFO',
      message: '🛡️ NSE/BSE Trading session active. Sentinel monitoring loop initiated at 60s tick interval.'
    },
    {
      id: 'init-6',
      timestamp: '09:15:30 AM IST',
      agent: 'AGENT_2',
      agentName: 'Portfolio Sentinel',
      level: 'ALERT',
      message: '🎯 TARGET PROFIT HIT! Dixon Technologies crossed CMP ₹12,845 (+₹1,000 profit/share achieved!). Sentinel trigger dispatches alert.'
    },
    {
      id: 'init-7',
      timestamp: '09:15:31 AM IST',
      agent: 'AGENT_3',
      agentName: 'Alert Dispatcher',
      level: 'INFO',
      message: '📨 Formatting WhatsApp message with emojis and direct 1-click WhatsApp web link.'
    },
    {
      id: 'init-8',
      timestamp: '09:15:32 AM IST',
      agent: 'AGENT_3',
      agentName: 'Alert Dispatcher',
      level: 'SUCCESS',
      message: '✅ Dispatched to WhatsApp (+91 98765 43210) & Email. 4-hour cooldown deduplication engaged.'
    }
  ]);

  readonly filteredAgentLogs = computed(() => {
    const f = this.activeAgentFilter();
    const logs = this.liveAgentTerminalLogs();
    if (f === 'ALL') return logs;
    return logs.filter(l => l.agent === f);
  });

  // Modal State
  readonly showStockModal = signal<boolean>(false);
  readonly editingHoldingId = signal<string | null>(null);

  // Groww-Style AI Modal & Active Stock State
  readonly showGrowwAiModal = signal<boolean>(false);
  readonly activeAiTicker = signal<string>('DIXON.NS');
  readonly activeAiCompanyName = signal<string>('Dixon Technologies (India) Ltd');
  readonly activeAiPrice = signal<number>(12841.00);
  readonly activeAiChangePercent = signal<number>(0.52);

  // Form State
  stockForm = {
    ticker: 'RELIANCE.NS',
    companyName: 'Reliance Industries Ltd',
    exchange: 'NSE',
    buyPrice: 2800,
    quantity: 10,
    targetProfitPerShare: 1000,
    targetPrice: 3800,
    stopLossPrice: 2650,
    notes: ''
  };

  // Copilot State
  userQuery = '';
  readonly aiResponse = signal<AskMarketAiResponse | null>(null);

  // Search & Live Market Auto-Discovery State
  stockSearchQuery = '';
  readonly isSearchingLiveStocks = signal<boolean>(false);
  readonly liveSearchResults = signal<StockSearchResult[]>([]);
  readonly isFetchingLivePrice = signal<boolean>(false);
  readonly fetchedLiveQuote = signal<MarketQuote | null>(null);
  private searchDebounceTimer: any = null;

  readonly indianStockDirectory = [
    { ticker: 'DIXON.NS', name: 'Dixon Technologies (India) Ltd', sector: 'Consumer Electronics & Durables', samplePrice: 12820.00 },
    { ticker: 'IREDA.NS', name: 'IREDA Ltd', sector: 'Green Energy & NBFC', samplePrice: 215.50 },
    { ticker: 'RVNL.NS', name: 'Rail Vikas Nigam Ltd (RVNL)', sector: 'Railways & Infrastructure', samplePrice: 465.00 },
    { ticker: 'MAZDOCK.NS', name: 'Mazagon Dock Shipbuilders', sector: 'Defence & Shipyard', samplePrice: 4350.00 },
    { ticker: 'CDSL.NS', name: 'Central Depository Services (CDSL)', sector: 'Financial Infrastructure', samplePrice: 1520.00 },
    { ticker: 'BSE.NS', name: 'BSE Ltd', sector: 'Exchange & Capital Markets', samplePrice: 3950.00 },
    { ticker: 'KAYNES.NS', name: 'Kaynes Technology India', sector: 'EMS & Electronics', samplePrice: 5400.00 },
    { ticker: 'RELIANCE.NS', name: 'Reliance Industries Ltd', sector: 'Energy & Retail', samplePrice: 2985.50 },
    { ticker: 'TATAMOTORS.NS', name: 'Tata Motors Ltd', sector: 'Automobile & EV', samplePrice: 948.30 },
    { ticker: 'TATASTEEL.NS', name: 'Tata Steel Ltd', sector: 'Metals & Mining', samplePrice: 164.50 },
    { ticker: 'TATAPOWER.NS', name: 'Tata Power Co Ltd', sector: 'Power & Energy', samplePrice: 438.20 },
    { ticker: 'TATACONSUM.NS', name: 'Tata Consumer Products', sector: 'FMCG', samplePrice: 1120.00 },
    { ticker: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'Information Technology', samplePrice: 4125.75 },
    { ticker: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', sector: 'Private Banking', samplePrice: 1682.20 },
    { ticker: 'ICICIBANK.NS', name: 'ICICI Bank Ltd', sector: 'Private Banking', samplePrice: 1242.15 },
    { ticker: 'SBIN.NS', name: 'State Bank of India (SBI)', sector: 'Public Banking', samplePrice: 796.80 },
    { ticker: 'INFY.NS', name: 'Infosys Ltd', sector: 'Information Technology', samplePrice: 1892.40 },
    { ticker: 'WIPRO.NS', name: 'Wipro Ltd', sector: 'Information Technology', samplePrice: 538.50 },
    { ticker: 'HCLTECH.NS', name: 'HCL Technologies Ltd', sector: 'Information Technology', samplePrice: 1820.00 },
    { ticker: 'ITC.NS', name: 'ITC Ltd', sector: 'FMCG & Cigarettes', samplePrice: 488.65 },
    { ticker: 'HINDUNILVR.NS', name: 'Hindustan Unilever (HUL)', sector: 'FMCG', samplePrice: 2690.00 },
    { ticker: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd', sector: 'Telecommunications', samplePrice: 1665.40 },
    { ticker: 'LT.NS', name: 'Larsen & Toubro (L&T)', sector: 'Infrastructure', samplePrice: 3540.00 },
    { ticker: 'BAJFINANCE.NS', name: 'Bajaj Finance Ltd', sector: 'NBFC & Lending', samplePrice: 7150.00 },
    { ticker: 'BAJAJFINSV.NS', name: 'Bajaj Finserv Ltd', sector: 'Financial Services', samplePrice: 1860.00 },
    { ticker: 'MARUTI.NS', name: 'Maruti Suzuki India', sector: 'Automobile', samplePrice: 12350.00 },
    { ticker: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical', sector: 'Pharma & Healthcare', samplePrice: 1885.00 },
    { ticker: 'CIPLA.NS', name: 'Cipla Ltd', sector: 'Pharma & Healthcare', samplePrice: 1620.00 },
    { ticker: 'DRREDDY.NS', name: 'Dr. Reddy\'s Laboratories', sector: 'Pharma & Healthcare', samplePrice: 6580.00 },
    { ticker: 'TITAN.NS', name: 'Titan Company Ltd', sector: 'Jewellery & Watches', samplePrice: 3420.00 },
    { ticker: 'ASIANPAINT.NS', name: 'Asian Paints Ltd', sector: 'Paints & Coatings', samplePrice: 2980.00 },
    { ticker: 'ULTRACEMCO.NS', name: 'UltraTech Cement', sector: 'Cement & Building', samplePrice: 11450.00 },
    { ticker: 'ADANIENT.NS', name: 'Adani Enterprises Ltd', sector: 'Conglomerate', samplePrice: 3120.00 },
    { ticker: 'ADANIPORTS.NS', name: 'Adani Ports & SEZ', sector: 'Ports & Logistics', samplePrice: 1420.00 },
    { ticker: 'ADANIPOWER.NS', name: 'Adani Power Ltd', sector: 'Power Generation', samplePrice: 645.00 },
    { ticker: 'NTPC.NS', name: 'NTPC Ltd', sector: 'Power & Utilities', samplePrice: 418.00 },
    { ticker: 'POWERGRID.NS', name: 'Power Grid Corporation', sector: 'Power Transmission', samplePrice: 335.00 },
    { ticker: 'COALINDIA.NS', name: 'Coal India Ltd', sector: 'Mining & Energy', samplePrice: 488.00 },
    { ticker: 'ONGC.NS', name: 'Oil & Natural Gas Corp', sector: 'Oil & Gas', samplePrice: 288.00 },
    { ticker: 'VEDL.NS', name: 'Vedanta Ltd', sector: 'Metals & Mining', samplePrice: 485.00 },
    { ticker: 'ZOMATO.NS', name: 'Zomato Ltd (Blinkit)', sector: 'Internet & Food Delivery', samplePrice: 276.40 },
    { ticker: 'JIOFIN.NS', name: 'Jio Financial Services', sector: 'Fintech & NBFC', samplePrice: 345.80 },
    { ticker: 'SUZLON.NS', name: 'Suzlon Energy Ltd', sector: 'Green Energy & Wind', samplePrice: 81.90 },
    { ticker: 'IRFC.NS', name: 'Indian Railway Finance (IRFC)', sector: 'Railways & NBFC', samplePrice: 158.40 },
    { ticker: 'IRCTC.NS', name: 'IRCTC Ltd', sector: 'Railways & Tourism', samplePrice: 885.00 },
    { ticker: 'HAL.NS', name: 'Hindustan Aeronautics (HAL)', sector: 'Defence & Aerospace', samplePrice: 4480.00 },
    { ticker: 'BEL.NS', name: 'Bharat Electronics (BEL)', sector: 'Defence Electronics', samplePrice: 294.50 },
    { ticker: 'TRENT.NS', name: 'Trent Ltd (Westside & Zudio)', sector: 'Retail & Fashion', samplePrice: 7850.00 },
    { ticker: 'VBL.NS', name: 'Varun Beverages (Pepsi Bottler)', sector: 'FMCG & Beverages', samplePrice: 590.00 },
    { ticker: 'DLF.NS', name: 'DLF Ltd', sector: 'Real Estate', samplePrice: 860.00 },
    { ticker: 'INDIGO.NS', name: 'InterGlobe Aviation (IndiGo)', sector: 'Aviation', samplePrice: 4780.00 },
    { ticker: 'POLYCAB.NS', name: 'Polycab India Ltd', sector: 'Cables & Electricals', samplePrice: 6850.00 }
  ];

  onStockSearchInput(): void {
    const q = this.stockSearchQuery.trim();
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    if (!q) {
      this.liveSearchResults.set([]);
      this.isSearchingLiveStocks.set(false);
      return;
    }

    this.isSearchingLiveStocks.set(true);
    this.searchDebounceTimer = setTimeout(() => {
      this.marketService.searchStocks(q).subscribe({
        next: results => {
          this.liveSearchResults.set(results || []);
          this.isSearchingLiveStocks.set(false);
        },
        error: () => {
          this.isSearchingLiveStocks.set(false);
        }
      });
    }, 280);
  }

  clearStockSearch(): void {
    this.stockSearchQuery = '';
    this.liveSearchResults.set([]);
    this.isSearchingLiveStocks.set(false);
  }

  readonly displayedSearchStocks = computed(() => {
    const live = this.liveSearchResults();
    if (live.length > 0) return live;

    const q = this.stockSearchQuery.trim().toLowerCase();
    if (!q) {
      return this.indianStockDirectory.slice(0, 10).map(s => ({
        ticker: s.ticker,
        companyName: s.name,
        exchange: 'NSE',
        sector: s.sector,
        currentPrice: s.samplePrice,
        dayChangePercent: 0
      }));
    }

    return this.indianStockDirectory
      .filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.ticker.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
      )
      .map(s => ({
        ticker: s.ticker,
        companyName: s.name,
        exchange: 'NSE',
        sector: s.sector,
        currentPrice: s.samplePrice,
        dayChangePercent: 0
      }));
  });

  selectSearchResultStock(stock: StockSearchResult): void {
    this.stockForm.ticker = stock.ticker;
    this.stockForm.companyName = stock.companyName;
    this.stockForm.exchange = stock.exchange?.toUpperCase().includes('BSE') ? 'BSE' : 'NSE';
    if (stock.currentPrice > 0) {
      this.stockForm.buyPrice = stock.currentPrice;
      this.onTargetProfitChange();
    }
    this.themeService.playClickSound();

    this.fetchLiveQuoteForTicker(stock.ticker);
  }

  fetchLiveQuoteForCurrentTicker(): void {
    const t = this.stockForm.ticker.trim();
    if (!t) return;
    this.fetchLiveQuoteForTicker(t);
  }

  fetchLiveQuoteForTicker(ticker: string): void {
    this.isFetchingLivePrice.set(true);
    this.marketService.getQuote(ticker).subscribe({
      next: q => {
        this.stockForm.ticker = q.ticker;
        this.stockForm.companyName = q.companyName;
        this.stockForm.exchange = q.exchange || 'NSE';
        this.stockForm.buyPrice = q.currentPrice;
        this.onTargetProfitChange();
        this.fetchedLiveQuote.set(q);
        this.isFetchingLivePrice.set(false);
      },
      error: () => {
        this.isFetchingLivePrice.set(false);
      }
    });
  }

  // Computeds
  readonly isMarketActive = computed(() => {
    const list = this.overview()?.holdingsWithAnalysis || [];
    return list.length > 0 ? list[0].quote.isMarketOpen : true;
  });

  readonly targetHitHoldings = computed(() => {
    return (this.overview()?.holdingsWithAnalysis || []).filter(h => h.analysis.isTargetHit);
  });

  private refreshIntervalId: any = null;

  ngOnInit(): void {
    this.refreshData();
    this.loadAgentData();
    // Auto-refresh interval (every 15 seconds)
    this.refreshIntervalId = setInterval(() => {
      if (this.isAutoRefreshOn() && !this.showStockModal()) {
        this.silentRefreshData();
      }
    }, 15000);
  }

  ngOnDestroy(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
  }

  setActiveTab(tab: 'portfolio' | 'screener' | 'copilot' | 'agents'): void {
    this.activeTab.set(tab);
    this.themeService.playClickSound();
    if (tab === 'agents') {
      this.loadAgentData();
    }
  }

  toggleAutoRefresh(): void {
    this.isAutoRefreshOn.update(v => !v);
    this.themeService.playClickSound();
  }

  refreshData(): void {
    this.isRefreshing.set(true);
    this.themeService.playClickSound();

    this.marketService.getOverview().subscribe({
      next: data => {
        this.overview.set(data);
        this.isRefreshing.set(false);
      },
      error: err => {
        console.error('Failed to load Market AI overview:', err);
        this.isRefreshing.set(false);
      }
    });
  }

  private silentRefreshData(): void {
    this.marketService.getOverview().subscribe({
      next: data => this.overview.set(data),
      error: () => {}
    });
  }

  openAddStockModal(): void {
    this.editingHoldingId.set(null);
    this.stockSearchQuery = '';
    this.liveSearchResults.set([]);
    this.fetchedLiveQuote.set(null);
    this.isSearchingLiveStocks.set(false);
    this.isFetchingLivePrice.set(false);
    this.stockForm = {
      ticker: 'DIXON.NS',
      companyName: 'Dixon Technologies (India) Ltd',
      exchange: 'NSE',
      buyPrice: 12820,
      quantity: 1,
      targetProfitPerShare: 1000,
      targetPrice: 13820,
      stopLossPrice: 12200,
      notes: ''
    };
    this.showStockModal.set(true);
    this.themeService.playClickSound();

    this.fetchLiveQuoteForTicker('DIXON.NS');
  }

  openEditStockModal(item: StockHoldingWithAnalysis): void {
    this.editingHoldingId.set(item.holding.id);
    this.fetchedLiveQuote.set(item.quote);
    this.stockForm = {
      ticker: item.holding.ticker,
      companyName: item.holding.companyName,
      exchange: item.holding.exchange,
      buyPrice: item.holding.buyPrice,
      quantity: item.holding.quantity,
      targetProfitPerShare: item.holding.targetProfitPerShare || 1000,
      targetPrice: item.holding.targetPrice || (item.holding.buyPrice + 1000),
      stopLossPrice: item.holding.stopLossPrice || (item.holding.buyPrice * 0.95),
      notes: item.holding.notes || ''
    };
    this.showStockModal.set(true);
    this.themeService.playClickSound();
  }

  closeStockModal(): void {
    this.showStockModal.set(false);
    this.editingHoldingId.set(null);
    this.fetchedLiveQuote.set(null);
    this.liveSearchResults.set([]);
  }

  selectPresetTicker(ticker: string): void {
    this.stockForm.ticker = ticker;
    // Auto-fetch price for this ticker
    this.marketService.getQuote(ticker).subscribe({
      next: q => {
        this.stockForm.buyPrice = q.currentPrice;
        this.stockForm.companyName = q.companyName;
        this.onTargetProfitChange();
      }
    });
    this.themeService.playClickSound();
  }

  onTargetProfitChange(): void {
    if (this.stockForm.buyPrice > 0 && this.stockForm.targetProfitPerShare != null) {
      this.stockForm.targetPrice = Number(this.stockForm.buyPrice) + Number(this.stockForm.targetProfitPerShare);
    }
  }

  recalcLivePreview(): void {
    if (this.stockForm.targetProfitPerShare) {
      this.onTargetProfitChange();
    }
  }

  saveStockHolding(): void {
    if (!this.stockForm.ticker || this.stockForm.buyPrice <= 0 || this.stockForm.quantity <= 0) return;

    this.isSaving.set(true);
    const editingId = this.editingHoldingId();

    if (editingId) {
      const payload: UpdateStockHoldingRequest = {
        buyPrice: Number(this.stockForm.buyPrice),
        quantity: Number(this.stockForm.quantity),
        targetProfitPerShare: this.stockForm.targetProfitPerShare ? Number(this.stockForm.targetProfitPerShare) : null,
        targetPrice: this.stockForm.targetPrice ? Number(this.stockForm.targetPrice) : null,
        stopLossPrice: this.stockForm.stopLossPrice ? Number(this.stockForm.stopLossPrice) : null,
        notes: this.stockForm.notes
      };

      this.marketService.updateHolding(editingId, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeStockModal();
          this.themeService.playSuccessSound();
          this.refreshData();
        },
        error: err => {
          this.isSaving.set(false);
          alert('Failed to update stock holding: ' + (err.error?.message || err.message));
        }
      });
    } else {
      const payload: CreateStockHoldingRequest = {
        ticker: this.stockForm.ticker,
        companyName: this.stockForm.companyName,
        exchange: this.stockForm.exchange,
        buyPrice: Number(this.stockForm.buyPrice),
        quantity: Number(this.stockForm.quantity),
        targetProfitPerShare: this.stockForm.targetProfitPerShare ? Number(this.stockForm.targetProfitPerShare) : null,
        targetPrice: this.stockForm.targetPrice ? Number(this.stockForm.targetPrice) : null,
        stopLossPrice: this.stockForm.stopLossPrice ? Number(this.stockForm.stopLossPrice) : null,
        notes: this.stockForm.notes
      };

      this.marketService.createHolding(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeStockModal();
          this.themeService.playSuccessSound();
          this.refreshData();
        },
        error: err => {
          this.isSaving.set(false);
          alert('Failed to add stock holding: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  deleteStock(id: string): void {
    if (!confirm('Are you sure you want to remove this stock from your portfolio?')) return;
    this.marketService.deleteHolding(id).subscribe({
      next: () => {
        this.themeService.playDeleteSound();
        this.refreshData();
      },
      error: err => {
        alert('Failed to delete holding: ' + (err.error?.message || err.message));
      }
    });
  }

  addScreenerStockToPortfolio(pick: MarketScreenerStock): void {
    this.editingHoldingId.set(null);
    this.stockForm = {
      ticker: pick.ticker,
      companyName: pick.companyName,
      exchange: 'NSE',
      buyPrice: pick.entryPrice,
      quantity: 10,
      targetProfitPerShare: Math.round(pick.targetPrice1 - pick.entryPrice),
      targetPrice: pick.targetPrice1,
      stopLossPrice: pick.stopLossPrice,
      notes: pick.setupType
    };
    this.showStockModal.set(true);
    this.themeService.playClickSound();
  }

  askAboutStock(ticker: string): void {
    this.activeTab.set('copilot');
    this.userQuery = `Maine ${ticker} buy kiya he, mera target profit per share hit hone par mujhe kya karna chahiye?`;
    this.submitAiQuestion(ticker);
  }

  askPreset(q: string): void {
    this.userQuery = q;
    this.submitAiQuestion();
  }

  submitAiQuestion(ticker?: string): void {
    if (!this.userQuery.trim()) return;
    this.isAiThinking.set(true);
    this.themeService.playClickSound();

    this.marketService.askAi(this.userQuery, ticker).subscribe({
      next: res => {
        this.aiResponse.set(res);
        this.isAiThinking.set(false);
        this.themeService.playSuccessSound();
      },
      error: err => {
        console.error('AI question failed:', err);
        this.isAiThinking.set(false);
      }
    });
  }

  openGrowwAiForStock(item: StockHoldingWithAnalysis): void {
    this.activeAiTicker.set(item.holding.ticker);
    this.activeAiCompanyName.set(item.holding.companyName);
    this.activeAiPrice.set(item.quote.currentPrice);
    this.activeAiChangePercent.set(item.quote.dayChangePercent);
    this.userQuery = `Kya mujhe ${item.holding.ticker.replace('.NS', '').replace('.BO', '')} hold karna chahiye ya ₹1000 profit par exit karein?`;
    this.showGrowwAiModal.set(true);
    this.themeService.playClickSound();
    this.submitAiQuestion(item.holding.ticker);
  }

  closeGrowwAiModal(): void {
    this.showGrowwAiModal.set(false);
  }

  switchAiStock(ticker: string, companyName: string, price: number, changePercent: number): void {
    this.activeAiTicker.set(ticker);
    this.activeAiCompanyName.set(companyName);
    this.activeAiPrice.set(price);
    this.activeAiChangePercent.set(changePercent);
    this.themeService.playClickSound();
    this.userQuery = `Kya mujhe abhi ${ticker.replace('.NS', '').replace('.BO', '')} lena chahiye ya dip ka wait karein?`;
    this.submitAiQuestion(ticker);
  }

  askForActiveStock(question: string): void {
    this.userQuery = question;
    this.submitAiQuestion(this.activeAiTicker());
  }

  // Multi-Agent Hub Actions
  loadAgentData(): void {
    this.marketService.getAgentStatus().subscribe({
      next: st => this.agentStatus.set(st),
      error: err => console.warn('Could not fetch agent status', err)
    });

    this.marketService.getTodayPreMarketReport().subscribe({
      next: rpt => this.preMarketReport.set(rpt),
      error: err => console.warn('Could not fetch pre-market report', err)
    });

    this.marketService.getAgentSettings().subscribe({
      next: set => {
        if (set) this.agentSettings.set(set);
      },
      error: err => console.warn('Could not fetch agent settings', err)
    });

    this.marketService.getAgentAlertLogs().subscribe({
      next: logs => this.agentAlertLogs.set(logs || []),
      error: err => console.warn('Could not fetch agent alert logs', err)
    });
  }

  runPreMarketScan(): void {
    this.isRunningPreMarket.set(true);
    this.themeService.playClickSound();
    this.marketService.runPreMarketScanNow().subscribe({
      next: rpt => {
        this.preMarketReport.set(rpt);
        this.isRunningPreMarket.set(false);
        this.themeService.playSuccessSound();
        this.loadAgentLogs();
      },
      error: err => {
        this.isRunningPreMarket.set(false);
        console.error('Failed to run pre-market scan', err);
      }
    });
  }

  runSentinelCheck(): void {
    this.isCheckingSentinel.set(true);
    this.themeService.playClickSound();
    this.marketService.checkPortfolioSentinelNow().subscribe({
      next: res => {
        this.isCheckingSentinel.set(false);
        this.themeService.playSuccessSound();
        if (res.triggeredCount > 0) {
          this.sentinelResultSummary.set(`Sentinel Alert: ${res.triggeredCount} share(s) hit Target Profit / Stop-Loss! Notifications dispatched via WhatsApp & Email.`);
        } else {
          this.sentinelResultSummary.set('Sentinel Scan Complete: All active holdings are currently safe within normal trading zones. No targets breached.');
        }
        this.loadAgentLogs();
      },
      error: err => {
        this.isCheckingSentinel.set(false);
        console.error('Failed to run sentinel check', err);
      }
    });
  }

  saveAgentSettings(): void {
    this.isSavingSettings.set(true);
    this.themeService.playClickSound();
    const current = this.agentSettings();
    this.marketService.updateAgentSettings({
      whatsAppPhoneNumber: current.whatsAppPhoneNumber,
      emailAddress: current.emailAddress,
      enablePreMarketScan: current.enablePreMarketScan,
      enableTargetHitAlerts: current.enableTargetHitAlerts,
      enableStopLossAlerts: current.enableStopLossAlerts,
      enableEmailDispatch: current.enableEmailDispatch,
      enableWhatsAppDispatch: current.enableWhatsAppDispatch,
      preMarketScanTime: current.preMarketScanTime
    }).subscribe({
      next: () => {
        this.isSavingSettings.set(false);
        this.themeService.playSuccessSound();
        alert('Notification settings saved successfully!');
      },
      error: err => {
        this.isSavingSettings.set(false);
        alert('Failed to save settings: ' + (err.error?.message || err.message));
      }
    });
  }

  sendTestAlert(): void {
    this.isSendingTestAlert.set(true);
    this.themeService.playClickSound();
    const cur = this.agentSettings();
    this.marketService.sendTestNotification(cur.whatsAppPhoneNumber || undefined, cur.emailAddress || undefined).subscribe({
      next: log => {
        this.isSendingTestAlert.set(false);
        this.testNotificationResult.set(log);
        this.themeService.playSuccessSound();
        this.loadAgentLogs();
      },
      error: err => {
        this.isSendingTestAlert.set(false);
        alert('Failed to send test alert: ' + (err.error?.message || err.message));
      }
    });
  }

  loadAgentLogs(): void {
    this.marketService.getAgentAlertLogs().subscribe({
      next: logs => this.agentAlertLogs.set(logs || []),
      error: err => console.warn('Could not refresh alert logs', err)
    });
  }

  addPreMarketStockToPortfolio(stock: PreMarketStockItem): void {
    this.editingHoldingId.set(null);
    this.stockForm = {
      ticker: stock.ticker,
      companyName: stock.companyName,
      exchange: 'NSE',
      buyPrice: stock.entryPrice,
      quantity: 10,
      targetProfitPerShare: stock.expectedProfitPerShare,
      targetPrice: stock.targetPrice,
      stopLossPrice: stock.stopLossPrice,
      notes: `Pre-Market AI Breakout: ${stock.setupType}`
    };
    this.showStockModal.set(true);
    this.themeService.playClickSound();
  }

  // Mission Control Simulation & Live Terminal Actions
  runAgentPipelineSimulation(): void {
    if (this.isSimulatingPipeline()) return;
    this.isSimulatingPipeline.set(true);
    this.simulationStep.set(1);
    this.themeService.playClickSound();

    const nowStr = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) + ' IST';

    this.addTerminalLog({
      timestamp: nowStr(),
      agent: 'AGENT_1',
      agentName: 'Pre-Market Intelligence',
      level: 'INFO',
      message: '🌅 [AGENT 1 START] Scanning Gift Nifty (+0.42%) & Indian large/mid-cap momentum stocks...'
    });

    setTimeout(() => {
      this.addTerminalLog({
        timestamp: nowStr(),
        agent: 'AGENT_1',
        agentName: 'Pre-Market Intelligence',
        level: 'SUCCESS',
        message: '🎯 [AGENT 1 OUTPUT] Breakout detected in Dixon Technologies (+₹1,000/share target profit setup) & Tata Motors. Loss risk flagged on Idea & Paytm.'
      });
      this.simulationStep.set(2);
      this.themeService.playClickSound();

      setTimeout(() => {
        this.addTerminalLog({
          timestamp: nowStr(),
          agent: 'AGENT_2',
          agentName: 'Portfolio Sentinel',
          level: 'INFO',
          message: '🛡️ [AGENT 2 ENGAGED] Monitoring live CMPs for active portfolio holdings at 60s frequency...'
        });

        setTimeout(() => {
          this.addTerminalLog({
            timestamp: nowStr(),
            agent: 'AGENT_2',
            agentName: 'Portfolio Sentinel',
            level: 'ALERT',
            message: '🚨 [AGENT 2 TRIGGER] TARGET HIT! Dixon Technologies crossed ₹12,845 (+₹1,000 profit/share hit!). Sentinel trigger handing payload to Agent 3.'
          });
          this.simulationStep.set(3);
          this.themeService.playSuccessSound();

          setTimeout(() => {
            this.addTerminalLog({
              timestamp: nowStr(),
              agent: 'AGENT_3',
              agentName: 'Alert Dispatcher',
              level: 'INFO',
              message: '📨 [AGENT 3 ACTIVE] Formatting emoji WhatsApp message with 1-click wa.me link & generating HTML email digest...'
            });

            setTimeout(() => {
              this.addTerminalLog({
                timestamp: nowStr(),
                agent: 'AGENT_3',
                agentName: 'Alert Dispatcher',
                level: 'SUCCESS',
                message: '✅ [AGENT 3 DISPATCHED] WhatsApp 1-click link generated (wa.me) & Email sent to investor! Multi-Agent cycle completed.'
              });
              this.simulationStep.set(4);
              this.isSimulatingPipeline.set(false);
              this.themeService.playSuccessSound();
            }, 850);
          }, 850);
        }, 850);
      }, 850);
    }, 850);
  }

  addTerminalLog(entry: {
    timestamp: string;
    agent: 'AGENT_1' | 'AGENT_2' | 'AGENT_3' | 'SYSTEM';
    agentName: string;
    level: 'INFO' | 'SUCCESS' | 'WARN' | 'ALERT';
    message: string;
  }): void {
    const newEntry = {
      id: Math.random().toString(36).substring(2, 9),
      ...entry
    };
    this.liveAgentTerminalLogs.update(logs => [newEntry, ...logs]);
  }

  clearTerminalLogs(): void {
    this.liveAgentTerminalLogs.set([]);
    this.themeService.playDeleteSound();
  }

  setAgentFilter(filter: 'ALL' | 'AGENT_1' | 'AGENT_2' | 'AGENT_3'): void {
    this.activeAgentFilter.set(filter);
    this.themeService.playClickSound();
  }
}

