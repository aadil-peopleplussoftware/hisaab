import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { InvestmentsService } from './investments.service';
import {
  CreateHoldingRequest,
  CreateInvestmentTransactionRequest,
  HoldingDetail,
  InvestmentsResponse,
  InvestmentTransactionKind,
  InvestmentType,
  UpdateHoldingRequest
} from '../models/investment.model';

describe('InvestmentsService', () => {
  let service: InvestmentsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InvestmentsService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(InvestmentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should query investments with optional type and search params', () => {
    const mockResponse: InvestmentsResponse = {
      holdings: [],
      summary: {
        totalInvested: 50000,
        formattedTotalInvested: '₹50,000.00',
        totalCurrentValue: 60000,
        formattedTotalCurrentValue: '₹60,000.00',
        totalGainLoss: 10000,
        formattedTotalGainLoss: '₹10,000.00',
        overallGainLossPercentage: 20.0,
        totalDividendEarned: 500,
        formattedTotalDividendEarned: '₹500.00',
        totalHoldingsCount: 1
      },
      allocations: []
    };

    service.getInvestments(InvestmentType.MutualFund, 'Parag').subscribe(res => {
      expect(res.summary.totalCurrentValue).toBe(60000);
      expect(res.summary.overallGainLossPercentage).toBe(20.0);
    });

    const req = httpMock.expectOne(r =>
      r.url === '/api/v1/investments' &&
      r.params.get('type') === InvestmentType.MutualFund.toString() &&
      r.params.get('search') === 'Parag'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should get holding by id', () => {
    const mockDetail: HoldingDetail = {
      holding: {
        id: 'h-1',
        name: 'Nifty 50 Index Fund',
        type: InvestmentType.MutualFund,
        typeName: 'Mutual Fund',
        currentValue: 25000,
        formattedCurrentValue: '₹25,000.00',
        valueUpdatedAtUtc: '2026-10-10T00:00:00Z',
        totalInvested: 20000,
        formattedTotalInvested: '₹20,000.00',
        totalUnits: 100,
        absoluteGainLoss: 5000,
        formattedAbsoluteGainLoss: '₹5,000.00',
        gainLossPercentage: 25.0,
        totalDividend: 0,
        formattedTotalDividend: '₹0.00',
        note: null,
        transactionCount: 1,
        createdAtUtc: '2026-10-10T00:00:00Z'
      },
      transactions: []
    };

    service.getHoldingById('h-1').subscribe(res => {
      expect(res.holding.id).toBe('h-1');
      expect(res.holding.name).toBe('Nifty 50 Index Fund');
    });

    const req = httpMock.expectOne('/api/v1/investments/h-1');
    expect(req.request.method).toBe('GET');
    req.flush(mockDetail);
  });

  it('should create new holding', () => {
    const payload: CreateHoldingRequest = {
      name: 'HDFC Bank',
      type: InvestmentType.Stock,
      initialInvestedAmount: 15000,
      initialUnits: 10,
      currentValue: 16000,
      note: 'Long term hold'
    };

    const mockDetail: HoldingDetail = {
      holding: {
        id: 'h-2',
        name: 'HDFC Bank',
        type: InvestmentType.Stock,
        typeName: 'Stock',
        currentValue: 16000,
        formattedCurrentValue: '₹16,000.00',
        valueUpdatedAtUtc: '2026-10-10T00:00:00Z',
        totalInvested: 15000,
        formattedTotalInvested: '₹15,000.00',
        totalUnits: 10,
        absoluteGainLoss: 1000,
        formattedAbsoluteGainLoss: '₹1,000.00',
        gainLossPercentage: 6.67,
        totalDividend: 0,
        formattedTotalDividend: '₹0.00',
        note: 'Long term hold',
        transactionCount: 1,
        createdAtUtc: '2026-10-10T00:00:00Z'
      },
      transactions: []
    };

    service.createHolding(payload).subscribe(res => {
      expect(res.holding.id).toBe('h-2');
    });

    const req = httpMock.expectOne('/api/v1/investments');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockDetail);
  });

  it('should update existing holding', () => {
    const payload: UpdateHoldingRequest = {
      name: 'HDFC Bank Ltd',
      type: InvestmentType.Stock,
      currentValue: 17000,
      note: 'Updated target'
    };

    const mockDetail: HoldingDetail = {
      holding: {
        id: 'h-2',
        name: 'HDFC Bank Ltd',
        type: InvestmentType.Stock,
        typeName: 'Stock',
        currentValue: 17000,
        formattedCurrentValue: '₹17,000.00',
        valueUpdatedAtUtc: '2026-10-10T00:00:00Z',
        totalInvested: 15000,
        formattedTotalInvested: '₹15,000.00',
        totalUnits: 10,
        absoluteGainLoss: 2000,
        formattedAbsoluteGainLoss: '₹2,000.00',
        gainLossPercentage: 13.33,
        totalDividend: 0,
        formattedTotalDividend: '₹0.00',
        note: 'Updated target',
        transactionCount: 1,
        createdAtUtc: '2026-10-10T00:00:00Z'
      },
      transactions: []
    };

    service.updateHolding('h-2', payload).subscribe(res => {
      expect(res.holding.currentValue).toBe(17000);
    });

    const req = httpMock.expectOne('/api/v1/investments/h-2');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush(mockDetail);
  });

  it('should delete holding', () => {
    service.deleteHolding('h-2').subscribe();

    const req = httpMock.expectOne('/api/v1/investments/h-2');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should create transaction on holding', () => {
    const payload: CreateInvestmentTransactionRequest = {
      kind: InvestmentTransactionKind.Buy,
      amount: 8000,
      transactionDate: '2026-10-10',
      units: 5,
      note: 'SIP addition'
    };

    const mockDetail: HoldingDetail = {
      holding: {
        id: 'h-2',
        name: 'HDFC Bank',
        type: InvestmentType.Stock,
        typeName: 'Stock',
        currentValue: 24000,
        formattedCurrentValue: '₹24,000.00',
        valueUpdatedAtUtc: '2026-10-10T00:00:00Z',
        totalInvested: 23000,
        formattedTotalInvested: '₹23,000.00',
        totalUnits: 15,
        absoluteGainLoss: 1000,
        formattedAbsoluteGainLoss: '₹1,000.00',
        gainLossPercentage: 4.35,
        totalDividend: 0,
        formattedTotalDividend: '₹0.00',
        note: null,
        transactionCount: 2,
        createdAtUtc: '2026-10-10T00:00:00Z'
      },
      transactions: []
    };

    service.createTransaction('h-2', payload).subscribe(res => {
      expect(res.holding.totalInvested).toBe(23000);
    });

    const req = httpMock.expectOne('/api/v1/investments/h-2/transactions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockDetail);
  });

  it('should delete transaction from holding', () => {
    service.deleteTransaction('h-2', 'tx-1').subscribe();

    const req = httpMock.expectOne('/api/v1/investments/h-2/transactions/tx-1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
