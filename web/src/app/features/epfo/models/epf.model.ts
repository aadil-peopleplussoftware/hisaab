export interface EpfEntry {
  id: string;
  month: string;
  monthLabel: string;
  employeeShare: number;
  formattedEmployeeShare: string;
  employerShare: number;
  formattedEmployerShare: string;
  pensionShare: number;
  formattedPensionShare: string;
  interest: number;
  formattedInterest: string;
  withdrawal: number;
  formattedWithdrawal: string;
  netInflow: number;
  formattedNetInflow: string;
  runningBalance: number;
  formattedRunningBalance: string;
  runningPensionBalance: number;
  formattedRunningPensionBalance: string;
  note: string | null;
  createdAtUtc: string;
}

export interface EpfYearlySummary {
  year: number;
  openingBalance: number;
  formattedOpeningBalance: string;
  totalEmployeeShare: number;
  formattedTotalEmployeeShare: string;
  totalEmployerShare: number;
  formattedTotalEmployerShare: string;
  totalPensionShare: number;
  formattedTotalPensionShare: string;
  totalInterest: number;
  formattedTotalInterest: string;
  totalWithdrawals: number;
  formattedTotalWithdrawals: string;
  closingBalance: number;
  formattedClosingBalance: string;
  totalPensionBalance: number;
  formattedTotalPensionBalance: string;
  entryCount: number;
}

export interface EpfResponse {
  entries: EpfEntry[];
  summary: EpfYearlySummary;
  availableYears: number[];
  allTimeEpfBalance: number;
  formattedAllTimeEpfBalance: string;
  allTimePensionBalance: number;
  formattedAllTimePensionBalance: string;
}

export interface CreateEpfRequest {
  month: string;
  employeeShare: number;
  employerShare: number;
  pensionShare: number;
  interest?: number;
  withdrawal?: number;
  note?: string | null;
}

export interface UpdateEpfRequest {
  month: string;
  employeeShare: number;
  employerShare: number;
  pensionShare: number;
  interest?: number;
  withdrawal?: number;
  note?: string | null;
}

