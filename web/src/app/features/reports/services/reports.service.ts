import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/reports';

  getPdfReport(type: string, params?: { month?: string; year?: number; loanId?: string }): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params?.month) httpParams = httpParams.set('month', params.month);
    if (params?.year) httpParams = httpParams.set('year', params.year.toString());
    if (params?.loanId) httpParams = httpParams.set('loanId', params.loanId);

    return this.http.get(`${this.baseUrl}/${type}/pdf`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  getExcelReport(type: string, params?: { month?: string; year?: number }): Observable<Blob> {
    let httpParams = new HttpParams();
    if (params?.month) httpParams = httpParams.set('month', params.month);
    if (params?.year) httpParams = httpParams.set('year', params.year.toString());

    return this.http.get(`${this.baseUrl}/${type}/excel`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}

