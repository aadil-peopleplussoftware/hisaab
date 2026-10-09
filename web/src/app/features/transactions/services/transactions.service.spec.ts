import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TransactionsService } from './transactions.service';
import { TransactionsResponse } from '../models/transaction.model';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TransactionsService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(TransactionsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should get transactions with month query parameter', () => {
    const mockResponse: TransactionsResponse = {
      transactions: {
        items: [],
        pageIndex: 1,
        totalPages: 1,
        totalCount: 0,
        pageSize: 20,
        hasPreviousPage: false,
        hasNextPage: false
      },
      summary: {
        month: '2026-10',
        totalIncome: 125000,
        totalExpense: 42350,
        netSavings: 82650,
        savingsRatePercentage: 66.12
      }
    };

    service.getTransactions({ month: '2026-10' }).subscribe(res => {
      expect(res.summary.netSavings).toBe(82650);
      expect(res.summary.month).toBe('2026-10');
    });

    const req = httpMock.expectOne(r => r.url === '/api/v1/transactions' && r.params.get('month') === '2026-10');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should post new transaction', () => {
    const payload = {
      type: 2 as const,
      amount: 1500,
      categoryId: 'cat-123',
      transactionDate: '2026-10-09'
    };

    service.createTransaction(payload).subscribe(res => {
      expect(res.amount).toBe(1500);
    });

    const req = httpMock.expectOne('/api/v1/transactions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'txn-1', ...payload, formattedAmount: '₹1,500.00', categoryName: 'Food', categoryIcon: 'tag', categoryColor: '#4f46e5' });
  });
});
