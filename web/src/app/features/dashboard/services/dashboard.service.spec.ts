import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { DashboardResponse } from '../models/dashboard.model';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should get dashboard data with month parameter', () => {
    const mockResponse: DashboardResponse = {
      selectedMonth: '2026-10',
      monthlyOverview: {
        month: '2026-10',
        totalIncome: 125000,
        formattedTotalIncome: '₹1,25,000.00',
        totalExpense: 45000,
        formattedTotalExpense: '₹45,000.00',
        netSavings: 80000,
        formattedNetSavings: '₹80,000.00',
        savingsRatePercentage: 64.0,
        transactionCount: 15
      },
      netWorth: {
        totalNetWorth: 1850000,
        formattedTotalNetWorth: '₹18,50,000.00',
        liquidCash: 150000,
        formattedLiquidCash: '₹1,50,000.00',
        investmentsValue: 1200000,
        formattedInvestmentsValue: '₹12,00,000.00',
        epfBalance: 450000,
        formattedEpfBalance: '₹4,50,000.00',
        loansReceivable: 50000,
        formattedLoansReceivable: '₹50,000.00',
        loansPayable: 0,
        formattedLoansPayable: '₹0.00',
        totalAssets: 1850000,
        formattedTotalAssets: '₹18,50,000.00',
        totalLiabilities: 0,
        formattedTotalLiabilities: '₹0.00'
      },
      monthlyTrends: [],
      topExpenseCategories: [],
      topIncomeCategories: [],
      upcomingLoanDues: [],
      recentTransactions: []
    };

    service.getDashboard('2026-10', 6).subscribe(res => {
      expect(res.selectedMonth).toBe('2026-10');
      expect(res.netWorth.totalNetWorth).toBe(1850000);
      expect(res.monthlyOverview.netSavings).toBe(80000);
    });

    const req = httpMock.expectOne(r =>
      r.url === '/api/v1/dashboard' &&
      r.params.get('month') === '2026-10' &&
      r.params.get('trendMonths') === '6'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should query dashboard without explicit month', () => {
    service.getDashboard().subscribe();

    const req = httpMock.expectOne(r =>
      r.url === '/api/v1/dashboard' &&
      !r.params.has('month') &&
      r.params.get('trendMonths') === '6'
    );
    expect(req.request.method).toBe('GET');
    req.flush({} as DashboardResponse);
  });
});

