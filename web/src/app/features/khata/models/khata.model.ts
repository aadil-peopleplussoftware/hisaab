export interface KhataParty {
  id: string;
  name: string;
  phone?: string;
  type: 'Payable' | 'Receivable';
  category?: string;
  notes?: string;
  isSettled: boolean;
  isArchived: boolean;
  createdAtUtc: string;
  totalIn: number;
  totalOut: number;
  netPending: number;
  entriesCount: number;
  lastTransactionDate: string;
}

export interface KhataEntry {
  id: string;
  partyId: string;
  entryType: 'IN' | 'OUT';
  amount: number;
  date: string;
  category?: string;
  remark?: string;
  paymentMode?: string;
  runningBalance: number;
}

export interface KhataPartyDetail {
  id: string;
  name: string;
  phone?: string;
  type: 'Payable' | 'Receivable';
  category?: string;
  notes?: string;
  isSettled: boolean;
  isArchived: boolean;
  createdAtUtc: string;
  totalIn: number;
  totalOut: number;
  netPending: number;
  entries: KhataEntry[];
}

export interface KhataPartiesResponse {
  parties: KhataParty[];
  summary: {
    totalParties: number;
    totalDenaHai: number;
    totalLenaHai: number;
    netBalance: number;
  };
}

export interface LiquidityAccount {
  id: string;
  accountName: string;
  accountType: 'Bank' | 'Share' | 'Cash' | 'Other';
  balance: number;
  notes?: string;
}

export interface LiquiditySummary {
  totalDenaHai: number;
  totalLenaHai: number;
  debtsBreakdown: Array<{ id: string; name: string; type: string; pending: number }>;
  accounts: LiquidityAccount[];
  totalBank: number;
  totalShare: number;
  totalCash: number;
  totalBalance: number;
  bakiAc: number;
  adjustments: number;
  finalInHand: number;
}

export interface KhataEventItem {
  id: string;
  itemType: 'Shopping' | 'LocalKharch' | 'CashHandover' | 'Other';
  description: string;
  amount: number;
  beneficiary?: string;
  date: string;
}

export interface KhataEventFund {
  id: string;
  contributorName: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface KhataEventDetail {
  id: string;
  title: string;
  date: string;
  notes?: string;
  status: string;
  totalFunds: number;
  shoppingTotal: number;
  localKharchTotal: number;
  cashHandoverTotal: number;
  totalSpent: number;
  remainingBalance: number;
  funds: KhataEventFund[];
  items: KhataEventItem[];
}

export interface KhataEventSummary {
  id: string;
  title: string;
  date: string;
  notes?: string;
  status: string;
  totalFunds: number;
  shoppingTotal: number;
  localKharchTotal: number;
  cashHandoverTotal: number;
  totalSpent: number;
  remainingBalance: number;
  fundsCount: number;
  itemsCount: number;
}
