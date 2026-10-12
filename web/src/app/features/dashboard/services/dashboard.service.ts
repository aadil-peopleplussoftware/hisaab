import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardResponse } from '../models/dashboard.model';

export type PeriodType = 'all' | 'year' | 'month' | 'day' | 'custom';

export interface PeriodFilterParams {
  periodType?: PeriodType;
  month?: string;
  year?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
  trendMonths?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/dashboard';

  getDashboard(filter?: string | PeriodFilterParams, trendMonths = 6): Observable<DashboardResponse> {
    let params = new HttpParams().set('trendMonths', trendMonths.toString());

    if (typeof filter === 'string') {
      if (filter.trim().length > 0) {
        params = params.set('month', filter.trim());
      }
    } else if (filter) {
      if (filter.periodType) params = params.set('periodType', filter.periodType);
      if (filter.month) params = params.set('month', filter.month);
      if (filter.year != null) params = params.set('year', filter.year.toString());
      if (filter.date) params = params.set('date', filter.date);
      if (filter.startDate) params = params.set('startDate', filter.startDate);
      if (filter.endDate) params = params.set('endDate', filter.endDate);
      if (filter.trendMonths) params = params.set('trendMonths', filter.trendMonths.toString());
    }

    return this.http.get<DashboardResponse>(this.baseUrl, { params });
  }
}
