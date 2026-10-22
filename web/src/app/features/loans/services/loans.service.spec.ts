import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LoansService } from './loans.service';
import {
  CreateLoanRequest,
  CreateLoanTransactionRequest,
  LoanAccountDetail,
  LoanDirection,
  LoanInterestType,
  LoanListResponse,
  LoanPriority,
  LoanStatus,
  LoanTransactionKind
} from '../models/loan.model';

describe('LoansService', () => {
  let service: LoansService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LoansService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(LoansService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should query loans with direction and status filters', () => {
    const mockResponse: LoanListResponse = {
      accounts: [],
      summary: {
        totalGivenPrincipal: 50000,
        totalGivenOutstanding: 35000,
        formattedTotalGivenOutstanding: '₹35,000.00',
        totalTakenPrincipal: 0,
        totalTakenOutstanding: 0,
        formattedTotalTakenOutstanding: '₹0.00',
        netPosition: 35000,
        formattedNetPosition: '₹35,000.00',
        activeGivenCount: 1,
        activeTakenCount: 0,
        closedCount: 0
      }
    };

    service.getLoans({ direction: LoanDirection.Given, status: LoanStatus.Active }).subscribe(res => {
      expect(res.summary.totalGivenOutstanding).toBe(35000);
      expect(res.summary.netPosition).toBe(35000);
    });

    const req = httpMock.expectOne(r =>
      r.url === '/api/v1/loans' &&
      r.params.get('direction') === '1' &&
      r.params.get('status') === '1'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fetch loan detail with transaction ledger', () => {
    const mockDetail: LoanAccountDetail = {
      account: {
        id: 'loan-123',
        name: 'Friend Loan',
        counterparty: 'Ramesh',
        direction: LoanDirection.Given,
        directionName: 'Given',
        principal: 50000,
        formattedPrincipal: '₹50,000.00',
        interestRate: 10,
        interestType: LoanInterestType.Simple,
        interestTypeName: 'Simple',
        startDate: '2026-01-01',
        dueDate: '2026-12-31',
        status: LoanStatus.Active,
        statusName: 'Active',
        priority: LoanPriority.Medium,
        priorityName: 'Medium',
        note: 'Personal',
        totalDisbursed: 50000,
        totalRepaid: 15000,
        totalInterest: 0,
        totalPenalty: 0,
        outstandingBalance: 35000,
        formattedOutstandingBalance: '₹35,000.00',
        accruedInterest: 1250,
        formattedAccruedInterest: '₹1,250.00',
        createdAtUtc: '2026-01-01T00:00:00Z',
        transactionCount: 2
      },
      transactions: [],
      projectedPayoffAmount: 36250,
      formattedProjectedPayoffAmount: '₹36,250.00',
      dailyInterest: 9.59,
      formattedDailyInterest: '₹9.59',
      daysElapsed: 90
    };

    service.getLoanById('loan-123').subscribe(res => {
      expect(res.account.outstandingBalance).toBe(35000);
      expect(res.account.name).toBe('Friend Loan');
    });

    const req = httpMock.expectOne('/api/v1/loans/loan-123');
    expect(req.request.method).toBe('GET');
    req.flush(mockDetail);
  });

  it('should post new loan transaction', () => {
    const payload: CreateLoanTransactionRequest = {
      kind: LoanTransactionKind.Repayment,
      amount: 10000,
      transactionDate: '2026-10-09',
      note: 'EMI Repayment'
    };

    service.createTransaction('loan-123', payload).subscribe();

    const req = httpMock.expectOne('/api/v1/loans/loan-123/transactions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({} as LoanAccountDetail);
  });

  it('should change loan status via PATCH', () => {
    service.changeStatus('loan-123', LoanStatus.Closed).subscribe();

    const req = httpMock.expectOne('/api/v1/loans/loan-123/status');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: LoanStatus.Closed });
    req.flush({} as LoanAccountDetail);
  });
});

