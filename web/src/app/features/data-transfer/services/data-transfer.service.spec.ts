import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { DataTransferService } from './data-transfer.service';
import { UploadResult, PreviewValidationResult, ImportResult } from '../models/data-transfer.model';

describe('DataTransferService', () => {
  let service: DataTransferService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DataTransferService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(DataTransferService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should download template for a module', () => {
    service.downloadTemplate('Transactions').subscribe((blob) => {
      expect(blob).toBeTruthy();
    });

    const req = httpMock.expectOne('/api/v1/import/templates/Transactions');
    expect(req.request.method).toBe('GET');
    req.flush(new Blob(['fake excel content']));
  });

  it('should upload file and return upload result', () => {
    const fakeFile = new File(['dummy'], 'test.csv', { type: 'text/csv' });
    const mockResult: UploadResult = {
      batchId: '123e4567-e89b-12d3-a456-426614174000',
      module: 'Transactions',
      fileName: 'test.csv',
      sheets: ['Sheet1'],
      selectedSheet: 'Sheet1',
      headers: ['Type', 'Amount'],
      sampleRows: [{ Type: 'Income', Amount: '5000' }],
      totalRows: 1,
      suggestedColumnMap: { Type: 'Type', Amount: 'Amount' }
    };

    service.uploadFile(fakeFile, 'Transactions').subscribe((res) => {
      expect(res.totalRows).toBe(1);
      expect(res.headers.length).toBe(2);
    });

    const req = httpMock.expectOne('/api/v1/import/upload');
    expect(req.request.method).toBe('POST');
    req.flush(mockResult);
  });

  it('should validate batch and return preview rows', () => {
    const mockPreview: PreviewValidationResult = {
      batchId: '123',
      totalRowsPreviewed: 1,
      validCount: 1,
      invalidCount: 0,
      duplicateCount: 0,
      rows: []
    };

    service.validateBatch('123').subscribe((res) => {
      expect(res.validCount).toBe(1);
    });

    const req = httpMock.expectOne('/api/v1/import/123/validate');
    expect(req.request.method).toBe('POST');
    req.flush(mockPreview);
  });

  it('should commit batch and return import summary', () => {
    const mockImport: ImportResult = {
      batchId: '123',
      status: 5,
      statusName: 'Completed',
      totalRows: 10,
      successRows: 10,
      failedRows: 0,
      skippedRows: 0
    };

    service.commitBatch('123').subscribe((res) => {
      expect(res.successRows).toBe(10);
    });

    const req = httpMock.expectOne('/api/v1/import/123/commit');
    expect(req.request.method).toBe('POST');
    req.flush(mockImport);
  });

  it('should rollback batch', () => {
    service.rollbackBatch('123').subscribe((res) => {
      expect(res.success).toBe(true);
    });

    const req = httpMock.expectOne('/api/v1/import/123/rollback');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, message: 'Rolled back' });
  });

  it('should export module data', () => {
    service.exportModule('Transactions', 'csv').subscribe((blob) => {
      expect(blob).toBeTruthy();
    });

    const req = httpMock.expectOne('/api/v1/export/Transactions?format=csv');
    expect(req.request.method).toBe('GET');
    req.flush(new Blob(['csv,content']));
  });
});
