export interface MonthlyOverview {
  month: string;
  totalIncome: number;
  formattedTotalIncome: string;
  totalExpense: number;
  formattedTotalExpense: string;
  netSavings: number;
  formattedNetSavings: string;
  savingsRatePercentage: number;
  transactionCount: number;
}

export interface NetWorthBreakdown {
  totalNetWorth: number;
  formattedTotalNetWorth: string;
  liquidCash: number;
  formattedLiquidCash: string;
  investmentsValue: number;
  formattedInvestmentsValue: string;
  epfBalance: number;
  formattedEpfBalance: string;
  loansReceivable: number;
  formattedLoansReceivable: string;
  loansPayable: number;
  formattedLoansPayable: string;
  totalAssets: number;
  formattedTotalAssets: string;
  totalLiabilities: number;
  formattedTotalLiabilities: string;
}

export interface MonthlyTrend {
  month: string;
  monthLabel: string;
  income: number;
  expense: number;
  netSavings: number;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  formattedAmount: string;
  percentage: number;
}

export interface ActiveLoanDue {
  id: string;
  name: string;
  counterparty: string;
  direction: number; // 1 = Given, 2 = Taken
  directionName: string;
  outstandingBalance: number;
  formattedOutstandingBalance: string;
  dueDate: string | null;
  isOverdue: boolean;
  daysUntilDue: number | null;
}

export interface DashboardRecentTransaction {
  id: string;
  type: number; // 1 = Income, 2 = Expense
  amount: number;
  formattedAmount: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  transactionDate: string;
  note: string | null;
}

export interface DashboardResponse {
  selectedMonth: string;
  monthlyOverview: MonthlyOverview;
  netWorth: NetWorthBreakdown;
  monthlyTrends: MonthlyTrend[];
  topExpenseCategories: CategoryBreakdownItem[];
  topIncomeCategories: CategoryBreakdownItem[];
  upcomingLoanDues: ActiveLoanDue[];
  recentTransactions: DashboardRecentTransaction[];
}

