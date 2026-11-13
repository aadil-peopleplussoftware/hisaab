import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AddStockPayload,
  MarketAgentAlertLog,
  MarketAgentUserSetting,
  MarketCloseDailyReport,
  MarketOpenDailyReport,
  MyAssistantOverview,
  StockSearchResult,
  UpdateStockPayload
} from '../models/my-assistant.model';

@Injectable({
  providedIn: 'root'
})
export class MyAssistantService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/my-assistant';
  private readonly marketAiUrl = '/api/v1/market-ai';

  getOverview(): Observable<MyAssistantOverview> {
    return this.http.get<MyAssistantOverview>(`${this.baseUrl}/overview`);
  }

  addStock(payload: AddStockPayload): Observable<string> {
    return this.http.post<string>(`${this.baseUrl}/stocks`, payload);
  }

  updateStock(id: string, payload: UpdateStockPayload): Observable<{ success: boolean; id: string }> {
    return this.http.put<{ success: boolean; id: string }>(`${this.baseUrl}/stocks/${id}`, payload);
  }

  deleteStock(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/stocks/${id}`);
  }

  getSettings(): Observable<MarketAgentUserSetting> {
    return this.http.get<MarketAgentUserSetting>(`${this.baseUrl}/settings`);
  }

  updateSettings(settings: Partial<MarketAgentUserSetting>): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseUrl}/settings`, settings);
  }

  checkTargetAndStopLossNow(): Observable<{ success: boolean; triggeredCount: number; alerts: any[] }> {
    return this.http.post<{ success: boolean; triggeredCount: number; alerts: any[] }>(`${this.baseUrl}/agent/check-now`, {});
  }

  runMarketOpenScanNow(): Observable<MarketOpenDailyReport> {
    return this.http.post<MarketOpenDailyReport>(`${this.baseUrl}/agent/open-scan-now`, {});
  }

  runMarketCloseScanNow(): Observable<MarketCloseDailyReport> {
    return this.http.post<MarketCloseDailyReport>(`${this.baseUrl}/agent/close-scan-now`, {});
  }

  sendTestAlert(
    whatsAppPhoneNumber?: string,
    emailAddress?: string,
    telegramBotToken?: string,
    telegramChatId?: string,
    discordWebhookUrl?: string,
    ntfyTopic?: string,
    ntfyServerUrl?: string
  ): Observable<MarketAgentAlertLog> {
    return this.http.post<MarketAgentAlertLog>(`${this.baseUrl}/agent/test-alert`, {
      whatsAppPhoneNumber,
      emailAddress,
      telegramBotToken,
      telegramChatId,
      discordWebhookUrl,
      ntfyTopic,
      ntfyServerUrl
    });
  }

  testTelegramChannel(botToken: string, chatId: string): Observable<{ success: boolean; status: string; errorMessage?: string }> {
    return this.http.post<{ success: boolean; status: string; errorMessage?: string }>(`${this.baseUrl}/channels/test-telegram`, {
      botToken,
      chatId
    });
  }

  testDiscordChannel(webhookUrl: string): Observable<{ success: boolean; status: string; errorMessage?: string }> {
    return this.http.post<{ success: boolean; status: string; errorMessage?: string }>(`${this.baseUrl}/channels/test-discord`, {
      webhookUrl
    });
  }

  testNtfyChannel(topic: string, serverUrl?: string): Observable<{ success: boolean; status: string; errorMessage?: string }> {
    return this.http.post<{ success: boolean; status: string; errorMessage?: string }>(`${this.baseUrl}/channels/test-ntfy`, {
      topic,
      serverUrl
    });
  }

  getLogs(): Observable<MarketAgentAlertLog[]> {
    return this.http.get<MarketAgentAlertLog[]>(`${this.baseUrl}/logs`);
  }

  searchStocks(query: string): Observable<StockSearchResult[]> {
    return this.http.get<StockSearchResult[]>(`${this.baseUrl}/search-stocks?query=${encodeURIComponent(query)}`);
  }
}
