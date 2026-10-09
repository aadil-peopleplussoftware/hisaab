import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AdminUser,
  AuditLogsResponse,
  SystemHealth,
  UpdatePreferencesRequest,
  UserProfile
} from '../models/settings.model';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/settings';
  private readonly adminUrl = '/api/v1/admin';

  getPreferences(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/preferences`);
  }

  updatePreferences(payload: UpdatePreferencesRequest): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.baseUrl}/preferences`, payload);
  }

  exportJson(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export/json`, { responseType: 'blob' });
  }

  exportExcel(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export/excel`, { responseType: 'blob' });
  }

  deleteAccount(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/account/delete`, {});
  }

  // Admin APIs
  getAdminUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.adminUrl}/users`);
  }

  getAuditLogs(action?: string, page = 1, pageSize = 50): Observable<AuditLogsResponse> {
    let params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
    if (action) {
      params = params.set('action', action);
    }
    return this.http.get<AuditLogsResponse>(`${this.adminUrl}/audit-logs`, { params });
  }

  getSystemHealth(): Observable<SystemHealth> {
    return this.http.get<SystemHealth>(`${this.adminUrl}/system-health`);
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

