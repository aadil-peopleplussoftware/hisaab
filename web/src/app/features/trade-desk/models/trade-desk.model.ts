export enum TradeType {
  Swing = 1,
  ShortTerm = 2,
  Positional = 3,
  Intraday = 4
}

export enum TradeStatus {
  Open = 1,
  Closed = 2
}

export enum IpoIssueType {
  Mainboard = 1,
  Sme = 2
}

export enum IpoApplicationStatus {
  Applied = 1,
  Allotted = 2,
  NotAllotted = 3,
  Sold = 4
}

export interface TradeOrder {
  id: string;
  ticker: string;
  companyName: string;
  exchange: string;
  tradeType: TradeType;
  tradeTypeName: string;
  status: TradeStatus;
  statusName: string;
  buyPrice: number;
  quantity: number;
  investedAmount: number;
  buyDate: string;
  plannedHoldingDays: number;
  targetPrice?: number | null;
  stopLossPrice?: number | null;
  notes?: string | null;
  sellDate?: string | null;
  sellPrice?: number | null;
  totalCharges?: number | null;
  realizedProfitLoss?: number | null;
  realizedProfitLossPercentage?: number | null;
  netProfitLoss?: number | null;
  netProfitLossPercentage?: number | null;
  actualHoldingDays?: number | null;
  currentHoldingDays: number;
  // Live Market Fields
  currentMarketPrice: number;
  currentValue: number;
  unrealizedProfitLoss: number;
  unrealizedProfitLossPercentage: number;
  dayChange: number;
  dayChangePercent: number;
}

export interface IpoApplication {
  id: string;
  companyName: string;
  symbol: string;
  issueType: IpoIssueType;
  issueTypeName: string;
  status: IpoApplicationStatus;
  statusName: string;
  applicationDate: string;
  allotmentDate?: string | null;
  listingDate?: string | null;
  lotSize: number;
  lotsApplied: number;
  totalShares: number;
  bidPrice: number;
  totalAmountBlocked: number;
  applicationNumber?: string | null;
  upiId?: string | null;
  sharesAllotted: number;
  listingPrice?: number | null;
  sellPrice?: number | null;
  sellDate?: string | null;
  realizedProfitLoss?: number | null;
  realizedProfitLossPercentage?: number | null;
  notes?: string | null;
}

export interface TradeDeskSummary {
  totalCapitalInTrades: number;
  totalCurrentValueInTrades: number;
  totalUnrealizedProfitLoss: number;
  totalUnrealizedProfitLossPercentage: number;
  totalCapitalBlockedInIpos: number;
  activeTradesCount: number;
  closedTradesCount: number;
  totalRealizedProfitLoss: number;
  totalRealizedProfitLossPercentage: number;
  totalChargesPaidOnTrades: number;
  totalNetRealizedProfitLoss: number;
  totalNetRealizedProfitLossPercentage: number;
  totalIpoApplicationsCount: number;
  allottedIposCount: number;
  ipoAllotmentRatePercentage: number;
  totalIpoProfitLoss: number;
}

export interface TradeDeskOverview {
  summary: TradeDeskSummary;
  activeTrades: TradeOrder[];
  closedTrades: TradeOrder[];
  ipos: IpoApplication[];
}

export interface CreateTradePayload {
  ticker: string;
  companyName: string;
  exchange: string;
  tradeType: TradeType;
  buyPrice: number;
  quantity: number;
  buyDate: string;
  plannedHoldingDays: number;
  targetPrice?: number | null;
  stopLossPrice?: number | null;
  notes?: string | null;
}

export interface CloseTradePayload {
  sellPrice: number;
  sellDate: string;
  totalCharges?: number;
  notes?: string | null;
}

export interface CreateIpoPayload {
  companyName: string;
  symbol: string;
  issueType: IpoIssueType;
  applicationDate: string;
  allotmentDate?: string | null;
  listingDate?: string | null;
  lotSize: number;
  lotsApplied: number;
  bidPrice: number;
  applicationNumber?: string | null;
  upiId?: string | null;
  notes?: string | null;
}

export interface UpdateIpoStatusPayload {
  status: IpoApplicationStatus;
  sharesAllotted?: number | null;
  listingPrice?: number | null;
  sellPrice?: number | null;
  sellDate?: string | null;
  notes?: string | null;
}

export interface StockSearchResult {
  ticker: string;
  companyName: string;
  exchange: string;
  sector: string;
  currentPrice: number;
  dayChangePercent: number;
}

export interface LiveIpo {
  companyName: string;
  symbol: string;
  issueType: 'Mainboard' | 'Sme';
  minPrice: number;
  maxPrice: number;
  lotSize: number;
  issueSizeCr: number;
  status: 'Open' | 'Upcoming' | 'Closed' | 'Listed';
  openDate: string;
  closeDate: string;
  listingDate?: string;
}

