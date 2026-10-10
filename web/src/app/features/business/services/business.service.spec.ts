import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BusinessService } from './business.service';
import {
  BusinessListResponse,
  BusinessPaymentStatus,
  BusinessTransactionType,
  BusinessType,
  CreateBusinessRequest,
  CreateBusinessTransactionRequest
} from '../models/business.model';

describe('BusinessService', () => {
  let service: BusinessService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BusinessService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(BusinessService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should query businesses and consolidated PnL summary', () => {
    const mockResponse: BusinessListResponse = {
      businesses: [
        {
          id: 'biz-1',
          name: 'Acme SaaS',
          legalName: 'Acme Inc',
          type: BusinessType.SaaS,
          typeName: 'SaaS',
          currency: 'INR',
          taxId: '27AABC1234F1Z5',
          description: 'SaaS product',
          isActive: true,
          color: '#2563eb',
          createdAtUtc: '2026-01-01T00:00:00Z',
          totalRevenue: 250000,
          totalExpenses: 80000,
          netProfit: 170000,
          profitMargin: 68,
          transactionCount: 5
        }
      ],
      consolidatedSummary: {
        grossRevenue: 250000,
        totalExpenses: 80000,
        netProfit: 170000,
        profitMarginPercent: 68,
        taxesCollected: 45000,
        taxesPaid: 14400,
        netTaxLiability: 30600,
        accountsReceivable: 50000,
        accountsPayable: 15000,
        pendingInvoicesCount: 1,
        overdueInvoicesCount: 0,
        categoryBreakdown: [],
        monthlyTrend: []
      }
    };

    service.getBusinesses(true).subscribe(res => {
      expect(res.businesses.length).toBe(1);
      expect(res.consolidatedSummary.netProfit).toBe(170000);
      expect(res.consolidatedSummary.profitMarginPercent).toBe(68);
    });

    const req = httpMock.expectOne('/api/v1/business?includeInactive=true');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should create new business venture via POST', () => {
    const payload: CreateBusinessRequest = {
      name: 'Studio Apex',
      legalName: 'Apex Creative LLP',
      type: BusinessType.Agency,
      currency: 'INR',
      taxId: 'GST1234',
      description: 'Design agency',
      color: '#8b5cf6'
    };

    service.createBusiness(payload).subscribe(res => {
      expect(res.id).toBe('biz-new');
    });

    const req = httpMock.expectOne('/api/v1/business');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'biz-new' });
  });

  it('should create business transaction via POST', () => {
    const payload: CreateBusinessTransactionRequest = {
      businessId: 'biz-1',
      type: BusinessTransactionType.Income,
      category: 'Client Retainer',
      amount: 100000,
      taxRatePercent: 18,
      taxAmount: 18000,
      transactionDate: '2026-10-10',
      counterparty: 'Acme Global Client',
      invoiceNumber: 'INV-001',
      dueDate: '2026-10-31',
      paymentStatus: BusinessPaymentStatus.Paid,
      paymentMethod: 'Bank Transfer (NEFT/IMPS)',
      description: 'Retainer for Q4'
    };

    service.createTransaction(payload).subscribe(res => {
      expect(res.id).toBe('txn-1');
    });

    const req = httpMock.expectOne('/api/v1/business/transactions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'txn-1' });
  });

  it('should update transaction status via PATCH', () => {
    service.updateStatus('txn-1', BusinessPaymentStatus.Paid).subscribe();

    const req = httpMock.expectOne('/api/v1/business/transactions/txn-1/status');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: BusinessPaymentStatus.Paid });
    req.flush(null);
  });
});
