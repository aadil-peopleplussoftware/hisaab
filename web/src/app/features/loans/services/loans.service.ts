import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateLoanRequest,
  CreateLoanTransactionRequest,
  InterestCalculation,
  LoanAccountDetail,
  LoanDirection,
  LoanListResponse,
  LoanPriority,
  LoanStatus,
  UpdateLoanRequest
} from '../models/loan.model';

@Injectable({
  providedIn: 'root'
})
export class LoansService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/loans';

  getLoans(params?: {
    direction?: LoanDirection | null;
    status?: LoanStatus | null;
    priority?: LoanPriority | null;
    sortBy?: string | null;
    search?: string;
  }): Observable<LoanListResponse> {
    let httpParams = new HttpParams();

    if (params?.direction != null) {
      httpParams = httpParams.set('direction', params.direction.toString());
    }
    if (params?.status != null) {
      httpParams = httpParams.set('status', params.status.toString());
    }
    if (params?.priority != null) {
      httpParams = httpParams.set('priority', params.priority.toString());
    }
    if (params?.sortBy) {
      httpParams = httpParams.set('sortBy', params.sortBy);
    }
    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }

    return this.http.get<LoanListResponse>(this.baseUrl, { params: httpParams });
  }

  getLoanById(id: string): Observable<LoanAccountDetail> {
    return this.http.get<LoanAccountDetail>(`${this.baseUrl}/${id}`);
  }

  createLoan(payload: CreateLoanRequest): Observable<LoanAccountDetail> {
    return this.http.post<LoanAccountDetail>(this.baseUrl, payload);
  }

  updateLoan(id: string, payload: UpdateLoanRequest): Observable<LoanAccountDetail> {
    return this.http.put<LoanAccountDetail>(`${this.baseUrl}/${id}`, payload);
  }

  changeStatus(id: string, status: LoanStatus): Observable<LoanAccountDetail> {
    return this.http.patch<LoanAccountDetail>(`${this.baseUrl}/${id}/status`, { status });
  }

  changePriority(id: string, priority: LoanPriority): Observable<LoanAccountDetail> {
    return this.http.patch<LoanAccountDetail>(`${this.baseUrl}/${id}/priority`, { priority });
  }

  deleteLoan(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  createTransaction(loanId: string, payload: CreateLoanTransactionRequest): Observable<LoanAccountDetail> {
    return this.http.post<LoanAccountDetail>(`${this.baseUrl}/${loanId}/transactions`, payload);
  }

  deleteTransaction(loanId: string, transactionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${loanId}/transactions/${transactionId}`);
  }

  deleteAllTransactions(loanId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${loanId}/transactions`);
  }

  getInterestPreview(id: string, asOfDate?: string): Observable<InterestCalculation> {
    let params = new HttpParams();
    if (asOfDate) {
      params = params.set('asOfDate', asOfDate);
    }
    return this.http.get<InterestCalculation>(`${this.baseUrl}/${id}/interest-preview`, { params });
  }
}

