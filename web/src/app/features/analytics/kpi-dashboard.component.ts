import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { DashboardService, PeriodFilterParams } from '../dashboard/services/dashboard.service';
import { DashboardResponse } from '../dashboard/models/dashboard.model';
import { BusinessService } from '../business/services/business.service';
import { BusinessListResponse, BusinessPnLSummary, Business } from '../business/models/business.model';
import { LoansService } from '../loans/services/loans.service';
import { LoanListResponse, LoanSummary, LoanAccount } from '../loans/models/loan.model';
import { InvestmentsService } from '../investments/services/investments.service';
import { InvestmentsResponse, PortfolioSummary, Holding, AssetAllocation } from '../investments/models/investment.model';
import { EpfoService } from '../epfo/services/epfo.service';
import { EpfResponse, EpfYearlySummary } from '../epfo/models/epf.model';

import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';
import { PeriodFilterComponent } from '../../shared/components/period-filter/period-filter.component';
import { ThemeService } from '../../core/services/theme.service';

export type KpiModuleId = 'all' | 'cashflow' | 'business' | 'loans' | 'investments' | 'epfo';

export interface ModuleTab {
  id: KpiModuleId;
  label: string;
  badge: string;
  icon: string;
}

@Component({
  selector: 'app-kpi-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, InrCurrencyPipe, PeriodFilterComponent],
  templateUrl: './kpi-dashboard.component.html',
  styleUrls: ['./kpi-dashboard.component.scss']
})
export class KpiDashboardComponent implements OnInit {
  readonly Math = Math;
  private readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);
  private readonly businessService = inject(BusinessService);
  private readonly loansService = inject(LoansService);
  private readonly investmentsService = inject(InvestmentsService);
  private readonly epfoService = inject(EpfoService);
  readonly themeService = inject(ThemeService);

  // State Signals
  readonly activeModule = signal<KpiModuleId>('all');
  readonly selectedMonth = signal<string>(new Date().toISOString().substring(0, 7));
  readonly periodFilter = signal<PeriodFilterParams>({
    periodType: 'month',
    month: new Date().toISOString().substring(0, 7)
  });
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  // Data Signals
  readonly dashboardData = signal<DashboardResponse | null>(null);
  readonly businessData = signal<BusinessListResponse | null>(null);
  readonly loansData = signal<LoanListResponse | null>(null);
  readonly investmentsData = signal<InvestmentsResponse | null>(null);
  readonly epfoData = signal<EpfResponse | null>(null);

  // Module Tabs Configuration
  readonly moduleTabs: ModuleTab[] = [
    { id: 'all', label: 'All Modules (360°)', badge: 'Executive', icon: 'grid' },
    { id: 'cashflow', label: 'Cashflow & Txns', badge: 'Personal', icon: 'cashflow' },
    { id: 'business', label: 'Business & Ventures', badge: 'Commercial', icon: 'business' },
    { id: 'loans', label: 'Loans & Credit', badge: 'Credit Book', icon: 'loans' },
    { id: 'investments', label: 'Investments', badge: 'Wealth', icon: 'investments' },
    { id: 'epfo', label: 'EPFO Passbook', badge: 'Retirement', icon: 'epfo' }
  ];

  // ==========================================
  // COMPUTED DIAGNOSTICS & FINANCIAL SCORES
  // ==========================================

  /** Financial Health Score: 0 - 100 based on savings, net position, debt ratio, runway */
  readonly overallHealthScore = computed(() => {
    let score = 50;
    const dash = this.dashboardData();
    const inv = this.investmentsData();
    const loans = this.loansData();

    if (dash) {
      // Savings rate points (up to +20)
      const sr = dash.monthlyOverview.savingsRatePercentage;
      if (sr >= 30) score += 20;
      else if (sr >= 15) score += 12;
      else if (sr > 0) score += 5;
      else score -= 15;

      // Net worth positive
      if (dash.netWorth.totalNetWorth > 0) score += 10;
      if (dash.netWorth.liquidCash > 0) score += 10;
    }

    if (inv && inv.summary.overallGainLossPercentage > 0) {
      score += 5;
    }

    if (loans && loans.summary.netPosition >= 0) {
      score += 5;
    }

    return Math.min(100, Math.max(10, score));
  });

  /** Runway in Months = Liquid Cash / Monthly Expenses (fallback 1 month) */
  readonly runwayMonths = computed(() => {
    const dash = this.dashboardData();
    if (!dash || dash.monthlyOverview.totalExpense <= 0) return 0;
    const runway = dash.netWorth.liquidCash / dash.monthlyOverview.totalExpense;
    return runway > 0 ? parseFloat(runway.toFixed(1)) : 0;
  });

  /** Daily Burn Rate = Monthly Expenses / 30 */
  readonly dailyBurnRate = computed(() => {
    const dash = this.dashboardData();
    if (!dash) return 0;
    return dash.monthlyOverview.totalExpense / 30;
  });

  /** Loan Health Status */
  readonly loanHealthStatus = computed(() => {
    const loans = this.loansData();
    if (!loans) return { label: 'Optimal', type: 'success', message: 'No active debt liabilities.' };
    const net = loans.summary.netPosition;
    if (net >= 0) {
      return {
        label: 'Credit Surplus',
        type: 'success',
        message: `Receivables exceed payables by ₹${Math.abs(net).toLocaleString('en-IN')}. Healthy liquidity.`
      };
    } else {
      return {
        label: 'Net Borrowing',
        type: 'warning',
        message: `Outstanding payables of ₹${Math.abs(net).toLocaleString('en-IN')}. Maintain scheduled repayments.`
      };
    }
  });

  /** Business Health Status */
  readonly businessHealthStatus = computed(() => {
    const b = this.businessData();
    if (!b || !b.consolidatedSummary) {
      return { label: 'Inactive / No Ledger', type: 'neutral', message: 'Add a business to track operational revenue.' };
    }
    const s = b.consolidatedSummary;
    if (s.overdueInvoicesCount > 0) {
      return {
        label: 'Overdue Invoices Alert',
        type: 'warning',
        message: `${s.overdueInvoicesCount} overdue invoice(s) pending collection. Receivables: ₹${s.accountsReceivable.toLocaleString('en-IN')}.`
      };
    }
    if (s.netProfit > 0 && s.profitMarginPercent >= 20) {
      return {
        label: 'High Margin Profitable',
        type: 'success',
        message: `Operating at strong ${s.profitMarginPercent.toFixed(1)}% profit margin. ₹${s.netProfit.toLocaleString('en-IN')} net earnings.`
      };
    } else if (s.netProfit >= 0) {
      return {
        label: 'Stable Operations',
        type: 'info',
        message: `Positive net profit of ₹${s.netProfit.toLocaleString('en-IN')}. Margins within normal range.`
      };
    } else {
      return {
        label: 'Operating Loss',
        type: 'danger',
        message: `Expenses exceed revenues by ₹${Math.abs(s.netProfit).toLocaleString('en-IN')}. Review cost centers.`
      };
    }
  });

  /** Investment Health Status */
  readonly investmentHealthStatus = computed(() => {
    const inv = this.investmentsData();
    if (!inv || !inv.summary || inv.summary.totalInvested === 0) {
      return { label: 'Not Initiated', type: 'neutral', message: 'Record holdings to track wealth growth and asset allocation.' };
    }
    const gainPct = inv.summary.overallGainLossPercentage;
    if (gainPct >= 12) {
      return {
        label: 'High Capital Growth',
        type: 'success',
        message: `Portfolio up +${gainPct.toFixed(2)}% (+₹${inv.summary.totalGainLoss.toLocaleString('en-IN')}). Outperforming inflation benchmark.`
      };
    } else if (gainPct >= 0) {
      return {
        label: 'Positive Return',
        type: 'info',
        message: `Portfolio in green +${gainPct.toFixed(2)}% with healthy equity/debt allocation.`
      };
    } else {
      return {
        label: 'Unrealized Contraction',
        type: 'warning',
        message: `Portfolio down ${gainPct.toFixed(2)}%. Review sector allocation and dollar-cost averaging.`
      };
    }
  });

  /** Cashflow Health Status */
  readonly cashflowHealthStatus = computed(() => {
    const dash = this.dashboardData();
    if (!dash) return { label: 'Syncing', type: 'info', message: 'Fetching ledger data...' };
    const sr = dash.monthlyOverview.savingsRatePercentage;
    if (sr >= 35) {
      return {
        label: 'Elite Accumulator',
        type: 'success',
        message: `Saving ${sr.toFixed(1)}% of total income. Surplus of ₹${dash.monthlyOverview.netSavings.toLocaleString('en-IN')} this month.`
      };
    } else if (sr >= 15) {
      return {
        label: 'Healthy Cashflow',
        type: 'info',
        message: `Savings rate of ${sr.toFixed(1)}% satisfies standard 50/30/20 guidelines.`
      };
    } else if (sr > 0) {
      return {
        label: 'Low Margin Buffer',
        type: 'warning',
        message: `Savings rate is ${sr.toFixed(1)}%. Identify non-essential discretionary expenses to improve margin.`
      };
    } else {
      return {
        label: 'Cashflow Deficit',
        type: 'danger',
        message: `Outflows exceed inflows by ₹${Math.abs(dash.monthlyOverview.netSavings).toLocaleString('en-IN')}. Immediate budget review recommended.`
      };
    }
  });

  /** EPFO Health Status */
  readonly epfoHealthStatus = computed(() => {
    const epf = this.epfoData();
    if (!epf || epf.allTimeEpfBalance === 0) {
      return { label: 'Not Configured', type: 'neutral', message: 'Import or log EPFO entries for long-term compound retirement tracking.' };
    }
    return {
      label: 'Compounding at 8.25%',
      type: 'success',
      message: `Statutory retirement corpus stands at ₹${epf.allTimeEpfBalance.toLocaleString('en-IN')} with active employee/employer match.`
    };
  });

  ngOnInit(): void {
    this.loadAllKpiData();
  }

  selectModule(moduleId: KpiModuleId): void {
    this.activeModule.set(moduleId);
  }

  onMonthPickerChange(month: string): void {
    this.selectedMonth.set(month);
    this.periodFilter.set({ periodType: 'month', month });
    this.loadAllKpiData();
  }

  onPeriodFilterChange(filter: PeriodFilterParams): void {
    this.periodFilter.set(filter);
    if (filter.month) {
      this.selectedMonth.set(filter.month);
    }
    this.loadAllKpiData();
  }

  loadAllKpiData(): void {
    this.loading.set(true);
    this.error.set(null);

    const filter = this.periodFilter();
    const epfoYear = filter.periodType === 'year' && filter.year ? filter.year : undefined;

    forkJoin({
      dashboard: this.dashboardService.getDashboard(filter).pipe(catchError(() => of(null))),
      businesses: this.businessService.getBusinesses().pipe(catchError(() => of(null))),
      loans: this.loansService.getLoans().pipe(catchError(() => of(null))),
      investments: this.investmentsService.getInvestments().pipe(catchError(() => of(null))),
      epfo: this.epfoService.getEpfEntries(epfoYear).pipe(catchError(() => of(null)))
    }).subscribe({
      next: (res) => {
        this.dashboardData.set(res.dashboard);
        this.businessData.set(res.businesses);
        this.loansData.set(res.loans);
        this.investmentsData.set(res.investments);
        this.epfoData.set(res.epfo);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to calculate KPI metrics across modules. Please retry.');
        this.loading.set(false);
      }
    });
  }

  navigateToLedger(route: string): void {
    this.router.navigate([route]);
  }
}
