import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  UploadResult,
  MappingRequest,
  PreviewValidationResult,
  ImportResult,
  ImportBatchDetail,
  MappingProfile
} from '../models/data-transfer.model';

@Injectable({
  providedIn: 'root'
})
export class DataTransferService {
  private readonly http = inject(HttpClient);
  private readonly importApi = '/api/v1/import';
  private readonly exportApi = '/api/v1/export';

  downloadTemplate(module: string): Observable<Blob> {
    return this.http.get(`${this.importApi}/templates/${module}`, {
      responseType: 'blob'
    });
  }

  uploadFile(file: File, module: string): Observable<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module', module);
    return this.http.post<UploadResult>(`${this.importApi}/upload`, formData);
  }

  saveMapping(batchId: string, mapping: MappingRequest): Observable<any> {
    return this.http.post(`${this.importApi}/${batchId}/mapping`, mapping);
  }

  validateBatch(batchId: string): Observable<PreviewValidationResult> {
    return this.http.post<PreviewValidationResult>(`${this.importApi}/${batchId}/validate`, {});
  }

  commitBatch(batchId: string): Observable<ImportResult> {
    return this.http.post<ImportResult>(`${this.importApi}/${batchId}/commit`, {});
  }

  getBatch(batchId: string): Observable<ImportBatchDetail> {
    return this.http.get<ImportBatchDetail>(`${this.importApi}/${batchId}`);
  }

  downloadErrorsExcel(batchId: string): Observable<Blob> {
    return this.http.get(`${this.importApi}/${batchId}/errors.xlsx`, {
      responseType: 'blob'
    });
  }

  rollbackBatch(batchId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.importApi}/${batchId}/rollback`, {});
  }

  getHistory(): Observable<ImportBatchDetail[]> {
    return this.http.get<ImportBatchDetail[]>(`${this.importApi}/history`);
  }

  getMappingProfiles(module?: string): Observable<MappingProfile[]> {
    let params = new HttpParams();
    if (module) {
      params = params.set('module', module);
    }
    return this.http.get<MappingProfile[]>(`${this.importApi}/mapping-profiles`, { params });
  }

  saveMappingProfile(req: any): Observable<MappingProfile> {
    return this.http.post<MappingProfile>(`${this.importApi}/mapping-profiles`, req);
  }

  deleteMappingProfile(id: string): Observable<void> {
    return this.http.delete<void>(`${this.importApi}/mapping-profiles/${id}`);
  }

  exportModule(module: string, format: string = 'xlsx', from?: string, to?: string): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);

    return this.http.get(`${this.exportApi}/${module}`, {
      params,
      responseType: 'blob'
    });
  }

  exportAll(): Observable<Blob> {
    return this.http.get(`${this.exportApi}/all`, {
      responseType: 'blob'
    });
  }
}
