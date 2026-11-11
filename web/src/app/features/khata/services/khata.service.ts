import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  KhataEventDetail,
  KhataEventSummary,
  KhataPartiesResponse,
  KhataPartyDetail,
  LiquiditySummary
} from '../models/khata.model';

@Injectable({
  providedIn: 'root'
})
export class KhataService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/khata';

  getParties(search?: string, type?: string): Observable<KhataPartiesResponse> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (type) params = params.set('type', type);
    return this.http.get<KhataPartiesResponse>(`${this.baseUrl}/parties`, { params });
  }

  getPartyById(id: string): Observable<KhataPartyDetail> {
    return this.http.get<KhataPartyDetail>(`${this.baseUrl}/parties/${id}`);
  }

  createParty(dto: {
    name: string;
    phone?: string;
    type?: string;
    category?: string;
    notes?: string;
    initialAmount?: number;
    initialType?: string;
    initialRemark?: string;
  }): Observable<{ message: string; id: string }> {
    return this.http.post<{ message: string; id: string }>(`${this.baseUrl}/parties`, dto);
  }

  updateParty(id: string, dto: {
    name: string;
    phone?: string;
    type?: string;
    category?: string;
    notes?: string;
    isSettled?: boolean;
  }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/parties/${id}`, dto);
  }

  deleteParty(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/parties/${id}`);
  }

  addEntry(partyId: string, dto: {
    entryType: 'IN' | 'OUT';
    amount: number;
    date?: string;
    category?: string;
    remark?: string;
    paymentMode?: string;
  }): Observable<{ message: string; id: string }> {
    return this.http.post<{ message: string; id: string }>(`${this.baseUrl}/parties/${partyId}/entries`, dto);
  }

  deleteEntry(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/entries/${id}`);
  }

  updateEntry(id: string, dto: {
    entryType?: 'IN' | 'OUT';
    amount?: number;
    date?: string;
    category?: string;
    remark?: string;
    paymentMode?: string;
  }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/entries/${id}`, dto);
  }

  getLiquidity(adjustments?: number): Observable<LiquiditySummary> {
    let params = new HttpParams();
    if (adjustments != null) params = params.set('adjustments', adjustments.toString());
    return this.http.get<LiquiditySummary>(`${this.baseUrl}/liquidity`, { params });
  }

  saveLiquidityAccount(dto: {
    id?: string;
    accountName: string;
    accountType: string;
    balance: number;
    notes?: string;
  }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/liquidity/accounts`, dto);
  }

  deleteLiquidityAccount(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/liquidity/accounts/${id}`);
  }

  getEvents(): Observable<KhataEventSummary[]> {
    return this.http.get<KhataEventSummary[]>(`${this.baseUrl}/events`);
  }

  getEventById(id: string): Observable<KhataEventDetail> {
    return this.http.get<KhataEventDetail>(`${this.baseUrl}/events/${id}`);
  }

  createEvent(dto: { title: string; date?: string; notes?: string }): Observable<{ message: string; id: string }> {
    return this.http.post<{ message: string; id: string }>(`${this.baseUrl}/events`, dto);
  }

  addEventFund(eventId: string, dto: {
    contributorName: string;
    amount: number;
    date?: string;
    notes?: string;
  }): Observable<{ message: string; id: string }> {
    return this.http.post<{ message: string; id: string }>(`${this.baseUrl}/events/${eventId}/funds`, dto);
  }

  addEventItem(eventId: string, dto: {
    itemType: string;
    description: string;
    amount: number;
    beneficiary?: string;
    date?: string;
  }): Observable<{ message: string; id: string }> {
    return this.http.post<{ message: string; id: string }>(`${this.baseUrl}/events/${eventId}/items`, dto);
  }

  deleteEventItem(itemId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/events/items/${itemId}`);
  }

  deleteEvent(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/events/${id}`);
  }

  updateEvent(id: string, dto: { title?: string; date?: string; notes?: string; status?: string }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/events/${id}`, dto);
  }

  updateEventItem(itemId: string, dto: {
    itemType?: string;
    description?: string;
    amount?: number;
    beneficiary?: string;
    date?: string;
  }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/events/items/${itemId}`, dto);
  }

  updateEventFund(fundId: string, dto: {
    contributorName?: string;
    amount?: number;
    date?: string;
    notes?: string;
  }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/events/funds/${fundId}`, dto);
  }

  deleteEventFund(fundId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/events/funds/${fundId}`);
  }

  clearAllKhataData(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/clear-all`, {});
  }

  seedSheetData(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/seed-sheet-data`, {});
  }
}
