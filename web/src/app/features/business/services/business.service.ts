import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Business,
  BusinessListResponse,
  BusinessPaymentStatus,
  BusinessPnLSummary,
  BusinessTransaction,
  BusinessTransactionType,
  CreateBusinessRequest,
  CreateBusinessTransactionRequest,
  UpdateBusinessRequest,
  UpdateBusinessTransactionRequest
} from '../models/business.model';

@Injectable({
  providedIn: 'root'
})
export class BusinessService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/business';

  getBusinesses(includeInactive: boolean = true): Observable<BusinessListResponse> {
    const params = new HttpParams().set('includeInactive', includeInactive.toString());
    return this.http.get<BusinessListResponse>(this.baseUrl, { params });
  }

  createBusiness(payload: CreateBusinessRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.baseUrl, payload);
  }

  updateBusiness(id: string, payload: UpdateBusinessRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, payload);
  }

  deleteBusiness(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getBusinessPnL(id: string): Observable<BusinessPnLSummary> {
    return this.http.get<BusinessPnLSummary>(`${this.baseUrl}/${id}/pnl`);
  }

  getTransactions(params?: {
    businessId?: string | null;
    type?: BusinessTransactionType | null;
    paymentStatus?: BusinessPaymentStatus | null;
    category?: string | null;
    searchTerm?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  }): Observable<BusinessTransaction[]> {
    let httpParams = new HttpParams();

    if (params?.businessId) {
      httpParams = httpParams.set('businessId', params.businessId);
    }
    if (params?.type != null) {
      httpParams = httpParams.set('type', params.type.toString());
    }
    if (params?.paymentStatus != null) {
      httpParams = httpParams.set('paymentStatus', params.paymentStatus.toString());
    }
    if (params?.category) {
      httpParams = httpParams.set('category', params.category);
    }
    if (params?.searchTerm) {
      httpParams = httpParams.set('searchTerm', params.searchTerm);
    }
    if (params?.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }
    if (params?.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }

    return this.http.get<BusinessTransaction[]>(`${this.baseUrl}/transactions`, { params: httpParams });
  }

  createTransaction(payload: CreateBusinessTransactionRequest): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.baseUrl}/transactions`, payload);
  }

  updateTransaction(id: string, payload: UpdateBusinessTransactionRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/transactions/${id}`, payload);
  }

  deleteTransaction(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/transactions/${id}`);
  }

  updateStatus(id: string, status: BusinessPaymentStatus): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/transactions/${id}/status`, { status });
  }
}
