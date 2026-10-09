export enum LoanDirection {
  Given = 1,
  Taken = 2
}

export enum LoanInterestType {
  None = 0,
  Simple = 1,
  Compound = 2
}

export enum LoanStatus {
  Active = 1,
  Closed = 2
}

export enum LoanTransactionKind {
  Disburse = 1,
  Repayment = 2,
  Interest = 3,
  Penalty = 4
}

export interface LoanAccount {
  id: string;
  name: string;
  counterparty: string;
  direction: LoanDirection;
  directionName: string;
  principal: number;
  formattedPrincipal: string;
  interestRate: number;
  interestType: LoanInterestType;
  interestTypeName: string;
  startDate: string;
  dueDate: string | null;
  status: LoanStatus;
  statusName: string;
  note: string | null;
  totalDisbursed: number;
  totalRepaid: number;
  totalInterest: number;
  totalPenalty: number;
  outstandingBalance: number;
  formattedOutstandingBalance: string;
  accruedInterest: number;
  formattedAccruedInterest: string;
  createdAtUtc: string;
  transactionCount: number;
}

export interface LoanTransaction {
  id: string;
  loanAccountId: string;
  kind: LoanTransactionKind;
  kindName: string;
  amount: number;
  formattedAmount: string;
  transactionDate: string;
  note: string | null;
  attachmentId: string | null;
  runningBalance: number;
  formattedRunningBalance: string;
}

export interface LoanAccountDetail {
  account: LoanAccount;
  transactions: LoanTransaction[];
  projectedPayoffAmount: number;
  formattedProjectedPayoffAmount: string;
  dailyInterest: number;
  formattedDailyInterest: string;
  daysElapsed: number;
}

export interface LoanSummary {
  totalGivenPrincipal: number;
  totalGivenOutstanding: number;
  formattedTotalGivenOutstanding: string;
  totalTakenPrincipal: number;
  totalTakenOutstanding: number;
  formattedTotalTakenOutstanding: string;
  netPosition: number;
  formattedNetPosition: string;
  activeGivenCount: number;
  activeTakenCount: number;
  closedCount: number;
}

export interface LoanListResponse {
  accounts: LoanAccount[];
  summary: LoanSummary;
}

export interface CreateLoanRequest {
  name: string;
  counterparty: string;
  direction: LoanDirection;
  principal: number;
  interestRate: number;
  interestType: LoanInterestType;
  startDate: string;
  dueDate?: string | null;
  note?: string | null;
}

export interface UpdateLoanRequest {
  name: string;
  counterparty: string;
  interestRate: number;
  interestType: LoanInterestType;
  dueDate?: string | null;
  note?: string | null;
}

export interface CreateLoanTransactionRequest {
  kind: LoanTransactionKind;
  amount: number;
  transactionDate: string;
  note?: string | null;
  attachmentId?: string | null;
}

export interface InterestCalculation {
  principal: number;
  annualRate: number;
  interestType: LoanInterestType;
  interestTypeName: string;
  startDate: string;
  asOfDate: string;
  daysElapsed: number;
  accruedInterest: number;
  formattedAccruedInterest: string;
  totalPayable: number;
  formattedTotalPayable: string;
  dailyInterest: number;
  formattedDailyInterest: string;
}

