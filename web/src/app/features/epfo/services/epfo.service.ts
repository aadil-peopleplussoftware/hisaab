import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateEpfRequest,
  EpfResponse,
  UpdateEpfRequest
} from '../models/epf.model';

@Injectable({
  providedIn: 'root'
})
export class EpfoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/epf';

  getEpfEntries(year?: number): Observable<EpfResponse> {
    let params = new HttpParams();
    if (year != null) {
      params = params.set('year', year.toString());
    }
    return this.http.get<EpfResponse>(this.baseUrl, { params });
  }

  createEpfEntry(payload: CreateEpfRequest): Observable<EpfResponse> {
    return this.http.post<EpfResponse>(this.baseUrl, payload);
  }

  updateEpfEntry(id: string, payload: UpdateEpfRequest): Observable<EpfResponse> {
    return this.http.put<EpfResponse>(`${this.baseUrl}/${id}`, payload);
  }

  deleteEpfEntry(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

