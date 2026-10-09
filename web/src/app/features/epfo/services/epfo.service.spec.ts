import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { EpfoService } from './epfo.service';
import { CreateEpfRequest, EpfResponse, UpdateEpfRequest } from '../models/epf.model';

describe('EpfoService', () => {
  let service: EpfoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EpfoService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(EpfoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should query EPF entries with year parameter', () => {
    const mockResponse: EpfResponse = {
      entries: [],
      summary: {
        year: 2026,
        openingBalance: 0,
        formattedOpeningBalance: '₹0.00',
        totalEmployeeShare: 21600,
        formattedTotalEmployeeShare: '₹21,600.00',
        totalEmployerShare: 6600,
        formattedTotalEmployerShare: '₹6,600.00',
        totalPensionShare: 15000,
        formattedTotalPensionShare: '₹15,000.00',
        totalInterest: 1200,
        formattedTotalInterest: '₹1,200.00',
        totalWithdrawals: 0,
        formattedTotalWithdrawals: '₹0.00',
        closingBalance: 29400,
        formattedClosingBalance: '₹29,400.00',
        totalPensionBalance: 15000,
        formattedTotalPensionBalance: '₹15,000.00',
        entryCount: 12
      },
      availableYears: [2026],
      allTimeEpfBalance: 29400,
      formattedAllTimeEpfBalance: '₹29,400.00',
      allTimePensionBalance: 15000,
      formattedAllTimePensionBalance: '₹15,000.00'
    };

    service.getEpfEntries(2026).subscribe(res => {
      expect(res.summary.year).toBe(2026);
      expect(res.allTimeEpfBalance).toBe(29400);
    });

    const req = httpMock.expectOne(r => r.url === '/api/v1/epf' && r.params.get('year') === '2026');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should post new monthly EPF entry', () => {
    const payload: CreateEpfRequest = {
      month: '2026-10-01',
      employeeShare: 1800,
      employerShare: 550,
      pensionShare: 1250,
      interest: 0,
      withdrawal: 0,
      note: 'October salary'
    };

    service.createEpfEntry(payload).subscribe();

    const req = httpMock.expectOne('/api/v1/epf');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({} as EpfResponse);
  });

  it('should update existing EPF entry', () => {
    const payload: UpdateEpfRequest = {
      month: '2026-10-01',
      employeeShare: 2000,
      employerShare: 600,
      pensionShare: 1250
    };

    service.updateEpfEntry('epf-1', payload).subscribe();

    const req = httpMock.expectOne('/api/v1/epf/epf-1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({} as EpfResponse);
  });

  it('should delete EPF entry', () => {
    service.deleteEpfEntry('epf-1').subscribe();

    const req = httpMock.expectOne('/api/v1/epf/epf-1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});

