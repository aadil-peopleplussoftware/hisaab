export enum InvestmentType {
  MutualFund = 1,
  Stock = 2,
  FixedDeposit = 3,
  RecurringDeposit = 4,
  PPF = 5,
  NPS = 6,
  Gold = 7,
  Other = 8
}

export enum InvestmentTransactionKind {
  Buy = 1,
  Sell = 2,
  Dividend = 3
}

export interface Holding {
  id: string;
  name: string;
  type: InvestmentType;
  typeName: string;
  currentValue: number;
  formattedCurrentValue: string;
  valueUpdatedAtUtc: string;
  totalInvested: number;
  formattedTotalInvested: string;
  totalUnits: number;
  absoluteGainLoss: number;
  formattedAbsoluteGainLoss: string;
  gainLossPercentage: number;
  totalDividend: number;
  formattedTotalDividend: string;
  note: string | null;
  transactionCount: number;
  createdAtUtc: string;
}

export interface InvestmentTransaction {
  id: string;
  holdingId: string;
  kind: InvestmentTransactionKind;
  kindName: string;
  amount: number;
  formattedAmount: string;
  units: number | null;
  transactionDate: string;
  note: string | null;
}

export interface HoldingDetail {
  holding: Holding;
  transactions: InvestmentTransaction[];
}

export interface AssetAllocation {
  type: InvestmentType;
  typeName: string;
  totalValue: number;
  formattedTotalValue: string;
  percentageOfPortfolio: number;
  holdingCount: number;
}

export interface PortfolioSummary {
  totalInvested: number;
  formattedTotalInvested: string;
  totalCurrentValue: number;
  formattedTotalCurrentValue: string;
  totalGainLoss: number;
  formattedTotalGainLoss: string;
  overallGainLossPercentage: number;
  totalDividendEarned: number;
  formattedTotalDividendEarned: string;
  totalHoldingsCount: number;
}

export interface InvestmentsResponse {
  holdings: Holding[];
  summary: PortfolioSummary;
  allocations: AssetAllocation[];
}

export interface CreateHoldingRequest {
  name: string;
  type: InvestmentType;
  initialInvestedAmount: number;
  initialUnits?: number | null;
  currentValue?: number | null;
  transactionDate?: string | null;
  note?: string | null;
}

export interface UpdateHoldingRequest {
  name: string;
  type: InvestmentType;
  currentValue: number;
  note?: string | null;
}

export interface CreateInvestmentTransactionRequest {
  kind: InvestmentTransactionKind;
  amount: number;
  transactionDate: string;
  units?: number | null;
  note?: string | null;
  updatedCurrentValue?: number | null;
}
