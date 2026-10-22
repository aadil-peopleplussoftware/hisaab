import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MarketAiPortfolioOverview,
  CreateStockHoldingRequest,
  UpdateStockHoldingRequest,
  MarketScreenerStock,
  MarketQuote,
  AskMarketAiRequest,
  AskMarketAiResponse,
  StockSearchResult
} from '../models/market-ai.model';

@Injectable({
  providedIn: 'root'
})
export class MarketAiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/market-ai';

  getOverview(): Observable<MarketAiPortfolioOverview> {
    return this.http.get<MarketAiPortfolioOverview>(`${this.baseUrl}/overview`);
  }

  createHolding(request: CreateStockHoldingRequest): Observable<string> {
    return this.http.post<string>(`${this.baseUrl}/holdings`, request);
  }

  updateHolding(id: string, request: UpdateStockHoldingRequest): Observable<{ success: boolean; id: string }> {
    return this.http.put<{ success: boolean; id: string }>(`${this.baseUrl}/holdings/${id}`, request);
  }

  deleteHolding(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/holdings/${id}`);
  }

  getScreener(): Observable<MarketScreenerStock[]> {
    return this.http.get<MarketScreenerStock[]>(`${this.baseUrl}/screener`);
  }

  getQuote(ticker: string): Observable<MarketQuote> {
    return this.http.get<MarketQuote>(`${this.baseUrl}/quote/${encodeURIComponent(ticker)}`);
  }

  askAi(question: string, selectedTicker?: string | null): Observable<AskMarketAiResponse> {
    const payload: AskMarketAiRequest = { question, selectedTicker };
    return this.http.post<AskMarketAiResponse>(`${this.baseUrl}/ask`, payload);
  }

  searchStocks(query: string): Observable<StockSearchResult[]> {
    return this.http.get<StockSearchResult[]>(`${this.baseUrl}/search`, {
      params: { query }
    });
  }

  // Multi-Agent Market AI Hub & Alert Endpoints
  getAgentStatus(): Observable<import('../models/market-ai.model').MarketAgentStatus> {
    return this.http.get<import('../models/market-ai.model').MarketAgentStatus>(`${this.baseUrl}/agents/status`);
  }

  getTodayPreMarketReport(): Observable<import('../models/market-ai.model').PreMarketDailyReport> {
    return this.http.get<import('../models/market-ai.model').PreMarketDailyReport>(`${this.baseUrl}/agents/pre-market/today`);
  }

  runPreMarketScanNow(): Observable<import('../models/market-ai.model').PreMarketDailyReport> {
    return this.http.post<import('../models/market-ai.model').PreMarketDailyReport>(`${this.baseUrl}/agents/pre-market/run-now`, {});
  }

  checkPortfolioSentinelNow(): Observable<{ success: boolean; triggeredCount: number; alerts: import('../models/market-ai.model').PortfolioTargetHitAlert[] }> {
    return this.http.post<{ success: boolean; triggeredCount: number; alerts: import('../models/market-ai.model').PortfolioTargetHitAlert[] }>(`${this.baseUrl}/agents/sentinel/check-now`, {});
  }

  getAgentSettings(): Observable<import('../models/market-ai.model').MarketAgentUserSetting> {
    return this.http.get<import('../models/market-ai.model').MarketAgentUserSetting>(`${this.baseUrl}/agents/settings`);
  }

  updateAgentSettings(request: import('../models/market-ai.model').UpdateMarketAgentUserSettingRequest): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseUrl}/agents/settings`, request);
  }

  sendTestNotification(whatsAppPhoneNumber?: string, emailAddress?: string): Observable<import('../models/market-ai.model').MarketAgentAlertLog> {
    return this.http.post<import('../models/market-ai.model').MarketAgentAlertLog>(`${this.baseUrl}/agents/test-notification`, {
      whatsAppPhoneNumber,
      emailAddress
    });
  }

  getAgentAlertLogs(): Observable<import('../models/market-ai.model').MarketAgentAlertLog[]> {
    return this.http.get<import('../models/market-ai.model').MarketAgentAlertLog[]>(`${this.baseUrl}/agents/logs`);
  }
}


