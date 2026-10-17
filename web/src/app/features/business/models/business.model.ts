export enum BusinessType {
  Freelance = 1,
  Agency = 2,
  SaaS = 3,
  ECommerce = 4,
  Consulting = 5,
  Retail = 6,
  Services = 7,
  Manufacturing = 8,
  Other = 9
}

export enum BusinessTransactionType {
  Income = 1,
  Expense = 2
}

export enum BusinessPaymentStatus {
  Paid = 1,
  Pending = 2,
  Overdue = 3,
  Cancelled = 4
}

export interface Business {
  id: string;
  name: string;
  legalName?: string | null;
  type: BusinessType;
  typeName: string;
  currency: string;
  taxId?: string | null;
  description?: string | null;
  isActive: boolean;
  color?: string | null;
  createdAtUtc: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  transactionCount: number;
}

export interface BusinessTransaction {
  id: string;
  businessId: string;
  businessName: string;
  type: BusinessTransactionType;
  typeName: string;
  category: string;
  amount: number;
  taxRatePercent: number;
  taxAmount: number;
  totalAmount: number;
  transactionDate: string;
  counterparty: string;
  invoiceNumber?: string | null;
  dueDate?: string | null;
  paymentStatus: BusinessPaymentStatus;
  paymentStatusName: string;
  paymentMethod?: string | null;
  description?: string | null;
  attachmentUrl?: string | null;
  createdAtUtc: string;
}

export interface BusinessCategoryBreakdown {
  category: string;
  type: BusinessTransactionType;
  amount: number;
  percentage: number;
}

export interface BusinessMonthlyTrend {
  monthKey: string;
  monthLabel: string;
  revenue: number;
  expense: number;
  netProfit: number;
}

export interface BusinessPnLSummary {
  grossRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPercent: number;
  taxesCollected: number;
  taxesPaid: number;
  netTaxLiability: number;
  accountsReceivable: number;
  accountsPayable: number;
  pendingInvoicesCount: number;
  overdueInvoicesCount: number;
  categoryBreakdown: BusinessCategoryBreakdown[];
  monthlyTrend: BusinessMonthlyTrend[];
}

export interface BusinessListResponse {
  businesses: Business[];
  consolidatedSummary: BusinessPnLSummary;
}

export interface CreateBusinessRequest {
  name: string;
  legalName?: string | null;
  type: BusinessType;
  currency: string;
  taxId?: string | null;
  description?: string | null;
  color?: string | null;
}

export interface UpdateBusinessRequest {
  name: string;
  legalName?: string | null;
  type: BusinessType;
  currency: string;
  taxId?: string | null;
  description?: string | null;
  isActive: boolean;
  color?: string | null;
}

export interface CreateBusinessTransactionRequest {
  businessId: string;
  type: BusinessTransactionType;
  category: string;
  amount: number;
  taxRatePercent: number;
  taxAmount?: number | null;
  transactionDate: string;
  counterparty: string;
  invoiceNumber?: string | null;
  dueDate?: string | null;
  paymentStatus: BusinessPaymentStatus;
  paymentMethod?: string | null;
  description?: string | null;
  attachmentUrl?: string | null;
}

export interface UpdateBusinessTransactionRequest {
  businessId: string;
  type: BusinessTransactionType;
  category: string;
  amount: number;
  taxRatePercent: number;
  taxAmount?: number | null;
  transactionDate: string;
  counterparty: string;
  invoiceNumber?: string | null;
  dueDate?: string | null;
  paymentStatus: BusinessPaymentStatus;
  paymentMethod?: string | null;
  description?: string | null;
  attachmentUrl?: string | null;
}

