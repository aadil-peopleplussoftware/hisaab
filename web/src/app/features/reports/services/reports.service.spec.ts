import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ReportsService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ReportsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should query PDF report with query parameters', () => {
    const mockBlob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });

    service.getPdfReport('transactions', { month: '2026-10' }).subscribe(res => {
      expect(res.size).toBeGreaterThan(0);
      expect(res.type).toBe('application/pdf');
    });

    const req = httpMock.expectOne(r =>
      r.url === '/api/v1/reports/transactions/pdf' &&
      r.params.get('month') === '2026-10'
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(mockBlob);
  });

  it('should query Excel report with query parameters', () => {
    const mockBlob = new Blob(['excel-content'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    service.getExcelReport('epf', { year: 2026 }).subscribe(res => {
      expect(res.size).toBeGreaterThan(0);
    });

    const req = httpMock.expectOne(r =>
      r.url === '/api/v1/reports/epf/excel' &&
      r.params.get('year') === '2026'
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(mockBlob);
  });
});

