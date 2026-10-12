import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface RecycleBinItem {
  id: string;
  module: string; // 'Transactions' | 'Categories' | 'Loans' | 'Epfo' | 'Investments' | 'Business'
  subType: string;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  deletedAtUtc: string;
  originalDate?: string;
}

export interface RecycleBinModuleCounts {
  all: number;
  transactions: number;
  categories: number;
  loans: number;
  epfo: number;
  investments: number;
  business: number;
}

export interface RecycleBinResponse {
  items: RecycleBinItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  moduleCounts: RecycleBinModuleCounts;
}

@Injectable({
  providedIn: 'root'
})
export class RecycleBinService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/recycle-bin';

  public items = signal<RecycleBinItem[]>([]);
  public totalCount = signal<number>(0);
  public moduleCounts = signal<RecycleBinModuleCounts>({
    all: 0,
    transactions: 0,
    categories: 0,
    loans: 0,
    epfo: 0,
    investments: 0,
    business: 0
  });
  public loading = signal<boolean>(false);

  constructor() {
    this.refreshCounts();
  }

  public getItems(
    module: string = 'all',
    search: string = '',
    page: number = 1,
    pageSize: number = 20
  ): Observable<RecycleBinResponse> {
    this.loading.set(true);
    let params = new HttpParams()
      .set('module', module)
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<RecycleBinResponse>(this.apiUrl, { params }).pipe(
      tap({
        next: res => {
          this.items.set(res.items);
          this.totalCount.set(res.totalCount);
          if (res.moduleCounts) {
            this.moduleCounts.set(res.moduleCounts);
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      })
    );
  }

  public refreshCounts(): void {
    let params = new HttpParams().set('module', 'all').set('page', '1').set('pageSize', '1');
    this.http.get<RecycleBinResponse>(this.apiUrl, { params }).subscribe({
      next: res => {
        if (res.moduleCounts) {
          this.moduleCounts.set(res.moduleCounts);
        }
      },
      error: () => {}
    });
  }

  public restoreItem(module: string, id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${module.toLowerCase()}/${id}/restore`, {}).pipe(
      tap(() => this.refreshCounts())
    );
  }

  public permanentDelete(module: string, id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${module.toLowerCase()}/${id}/permanent`).pipe(
      tap(() => this.refreshCounts())
    );
  }

  public emptyRecycleBin(module?: string): Observable<{ message: string; purgedCount: number }> {
    let params = new HttpParams();
    if (module && module !== 'all') {
      params = params.set('module', module);
    }
    return this.http.delete<{ message: string; purgedCount: number }>(`${this.apiUrl}/empty`, { params }).pipe(
      tap(() => this.refreshCounts())
    );
  }
}

