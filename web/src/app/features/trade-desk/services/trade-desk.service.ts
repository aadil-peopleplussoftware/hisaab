import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CloseTradePayload,
  CreateIpoPayload,
  CreateTradePayload,
  LiveIpo,
  StockSearchResult,
  TradeDeskDashboard,
  TradeDeskOverview,
  UpdateIpoStatusPayload
} from '../models/trade-desk.model';

@Injectable({
  providedIn: 'root'
})
export class TradeDeskService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/trade-desk';

  getOverview(): Observable<TradeDeskOverview> {
    return this.http.get<TradeDeskOverview>(`${this.baseUrl}/overview`);
  }

  getDashboard(): Observable<TradeDeskDashboard> {
    return this.http.get<TradeDeskDashboard>(`${this.baseUrl}/dashboard`);
  }

  searchStocks(query: string): Observable<StockSearchResult[]> {
    return this.http.get<StockSearchResult[]>(`${this.baseUrl}/search-stocks`, {
      params: { query }
    });
  }

  getQuote(ticker: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/quote/${encodeURIComponent(ticker)}`);
  }

  getLiveIpos(query?: string): Observable<LiveIpo[]> {
    const params: any = {};
    if (query) params.query = query;
    return this.http.get<LiveIpo[]>(`${this.baseUrl}/live-ipos`, { params });
  }

  createTrade(payload: CreateTradePayload): Observable<{ id: string; message: string }> {
    return this.http.post<{ id: string; message: string }>(`${this.baseUrl}/trades`, payload);
  }

  closeTrade(id: string, payload: CloseTradePayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/trades/${id}/close`, payload);
  }

  updateClosedTrade(id: string, payload: CloseTradePayload): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/trades/${id}/close`, payload);
  }

  reopenTrade(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/trades/${id}/reopen`, {});
  }

  deleteTrade(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/trades/${id}`);
  }

  createIpo(payload: CreateIpoPayload): Observable<{ id: string; message: string }> {
    return this.http.post<{ id: string; message: string }>(`${this.baseUrl}/ipos`, payload);
  }

  updateIpoStatus(id: string, payload: UpdateIpoStatusPayload): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/ipos/${id}/status`, payload);
  }

  deleteIpo(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/ipos/${id}`);
  }
}

