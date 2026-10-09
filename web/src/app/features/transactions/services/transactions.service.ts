import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Category,
  CreateCategoryPayload,
  CreateTransactionPayload,
  Transaction,
  TransactionsResponse,
  TransactionType,
  UpdateTransactionPayload
} from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class TransactionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/transactions';
  private readonly categoriesUrl = '/api/v1/categories';

  getTransactions(params: {
    month?: string;
    type?: TransactionType;
    categoryId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Observable<TransactionsResponse> {
    let httpParams = new HttpParams();

    if (params.month) httpParams = httpParams.set('month', params.month);
    if (params.type) httpParams = httpParams.set('type', params.type.toString());
    if (params.categoryId) httpParams = httpParams.set('categoryId', params.categoryId);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize.toString());

    return this.http.get<TransactionsResponse>(this.baseUrl, { params: httpParams });
  }

  createTransaction(payload: CreateTransactionPayload): Observable<Transaction> {
    return this.http.post<Transaction>(this.baseUrl, payload);
  }

  updateTransaction(id: string, payload: UpdateTransactionPayload): Observable<Transaction> {
    return this.http.put<Transaction>(`${this.baseUrl}/${id}`, payload);
  }

  deleteTransaction(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getCategories(type?: TransactionType): Observable<Category[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type.toString());
    return this.http.get<Category[]>(this.categoriesUrl, { params });
  }

  createCategory(payload: CreateCategoryPayload): Observable<Category> {
    return this.http.post<Category>(this.categoriesUrl, payload);
  }
}

