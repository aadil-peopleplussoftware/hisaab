export type TransactionType = 1 | 2; // 1 = Income, 2 = Expense

export interface Category {
  id: string;
  type: TransactionType;
  name: string;
  icon: string;
  color: string;
  isSystem: boolean;
}

export interface AttachmentMetadata {
  id: string;
  fileName: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  fileUrl: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  formattedAmount: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  transactionDate: string;
  note?: string;
  attachmentId?: string;
  attachmentUrl?: string;
  attachmentFileName?: string;
  attachmentFileType?: string;
  attachmentFileSize?: number;
}

export interface MonthlySummary {
  month: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRatePercentage: number;
}

export interface PaginatedList<T> {
  items: T[];
  pageIndex: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface TransactionsResponse {
  transactions: PaginatedList<Transaction>;
  summary: MonthlySummary;
}

export interface CreateTransactionPayload {
  type: TransactionType;
  amount: number;
  categoryId: string;
  transactionDate: string;
  note?: string;
  attachmentId?: string;
  attachmentUrl?: string;
  attachmentFileName?: string;
  attachmentFileType?: string;
  attachmentFileSize?: number;
}

export interface UpdateTransactionPayload {
  type: TransactionType;
  amount: number;
  categoryId: string;
  transactionDate: string;
  note?: string;
  attachmentId?: string;
  attachmentUrl?: string;
  attachmentFileName?: string;
  attachmentFileType?: string;
  attachmentFileSize?: number;
}

export interface CreateCategoryPayload {
  type: TransactionType;
  name: string;
  icon?: string;
  color?: string;
}

