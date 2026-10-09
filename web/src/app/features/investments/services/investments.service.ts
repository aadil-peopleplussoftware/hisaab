import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateHoldingRequest,
  CreateInvestmentTransactionRequest,
  HoldingDetail,
  InvestmentsResponse,
  InvestmentType,
  UpdateHoldingRequest
} from '../models/investment.model';

@Injectable({
  providedIn: 'root'
})
export class InvestmentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/investments';

  getInvestments(type?: InvestmentType | null, search?: string): Observable<InvestmentsResponse> {
    let params = new HttpParams();
    if (type != null) {
      params = params.set('type', type.toString());
    }
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<InvestmentsResponse>(this.baseUrl, { params });
  }

  getHoldingById(id: string): Observable<HoldingDetail> {
    return this.http.get<HoldingDetail>(`${this.baseUrl}/${id}`);
  }

  createHolding(payload: CreateHoldingRequest): Observable<HoldingDetail> {
    return this.http.post<HoldingDetail>(this.baseUrl, payload);
  }

  updateHolding(id: string, payload: UpdateHoldingRequest): Observable<HoldingDetail> {
    return this.http.put<HoldingDetail>(`${this.baseUrl}/${id}`, payload);
  }

  deleteHolding(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  createTransaction(holdingId: string, payload: CreateInvestmentTransactionRequest): Observable<HoldingDetail> {
    return this.http.post<HoldingDetail>(`${this.baseUrl}/${holdingId}/transactions`, payload);
  }

  deleteTransaction(holdingId: string, transactionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${holdingId}/transactions/${transactionId}`);
  }
}

