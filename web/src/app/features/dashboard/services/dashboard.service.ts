import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardResponse } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/dashboard';

  getDashboard(month?: string, trendMonths = 6): Observable<DashboardResponse> {
    let params = new HttpParams().set('trendMonths', trendMonths.toString());
    if (month) {
      params = params.set('month', month);
    }
    return this.http.get<DashboardResponse>(this.baseUrl, { params });
  }
}

