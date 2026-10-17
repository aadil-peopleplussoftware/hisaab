export interface MarketQuote {
  ticker: string;
  companyName: string;
  exchange: string;
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  dayHigh: number;
  dayLow: number;
  high52Week: number;
  low52Week: number;
  volume: number;
  lastUpdatedUtc: string;
  isMarketOpen: boolean;
}

export interface StockHolding {
  id: string;
  ticker: string;
  companyName: string;
  exchange: string;
  buyPrice: number;
  quantity: number;
  purchaseDate: string;
  targetProfitPerShare: number | null;
  targetPrice: number | null;
  stopLossPrice: number | null;
  notes: string | null;
  isArchived: boolean;
  createdAtUtc: string;
}

export interface StockAiAnalysis {
  holdingId: string;
  ticker: string;
  companyName: string;
  buyPrice: number;
  quantity: number;
  investedAmount: number;
  currentPrice: number;
  currentValue: number;
  currentProfitPerShare: number;
  totalProfitLoss: number;
  profitLossPercentage: number;
  targetProfitPerShare: number | null;
  targetPrice: number | null;
  targetProgressPercentage: number | null;
  isTargetHit: boolean;
  isTargetApproaching: boolean;
  stopLossPrice: number | null;
  isStopLossBreached: boolean;
  actionRecommendation: string;
  actionBadgeText: string;
  actionColor: string;
  bullishScore: number;
  sentimentLabel: string;
  nextUpsideTargetPrice: number | null;
  maxExpectedUpsideAmount: number | null;
  upsidePercentage: number | null;
  upsideProbabilityPercent: number;
  upsideRationale: string;
  keySupportPrice: number | null;
  maxExpectedDownsideAmount: number | null;
  downsidePercentage: number | null;
  downsideProbabilityPercent: number;
  recommendedTrailingStopLoss: number | null;
  downsideRationale: string;
  aiSummaryHindi: string;
  aiSummaryEnglish: string;
  riskRewardRatio: number;
}

export interface StockHoldingWithAnalysis {
  holding: StockHolding;
  quote: MarketQuote;
  analysis: StockAiAnalysis;
}

export interface MarketScreenerStock {
  ticker: string;
  companyName: string;
  sector: string;
  currentPrice: number;
  dayChangePercent: number;
  recommendation: string;
  entryPrice: number;
  targetPrice1: number;
  targetPrice2: number;
  stopLossPrice: number;
  riskRewardRatio: number;
  setupType: string;
  catalyst: string;
  confidenceScore: number;
}

export interface MarketAiPortfolioOverview {
  totalPortfolioInvested: number;
  totalPortfolioCurrentValue: number;
  totalPortfolioProfitLoss: number;
  totalPortfolioGainPercentage: number;
  totalStocksCount: number;
  targetHitCount: number;
  targetApproachingCount: number;
  profitBookingRecommendedCount: number;
  holdingsWithAnalysis: StockHoldingWithAnalysis[];
  topBuyOpportunities: MarketScreenerStock[];
}

export interface CreateStockHoldingRequest {
  ticker: string;
  companyName?: string | null;
  exchange: string;
  buyPrice: number;
  quantity: number;
  purchaseDate?: string | null;
  targetProfitPerShare?: number | null;
  targetPrice?: number | null;
  stopLossPrice?: number | null;
  notes?: string | null;
}

export interface UpdateStockHoldingRequest {
  buyPrice: number;
  quantity: number;
  targetProfitPerShare?: number | null;
  targetPrice?: number | null;
  stopLossPrice?: number | null;
  notes?: string | null;
}

export interface AskMarketAiRequest {
  question: string;
  selectedTicker?: string | null;
}

export interface AskMarketAiResponse {
  answerHindi: string;
  answerEnglish: string;
  actionSignal: string;
  keyTargetPrice: number | null;
  keySupportPrice: number | null;
  trailingStopLoss: number | null;
  keyBulletPoints: string[];
  ticker?: string | null;
  companyName?: string | null;
  currentPrice?: number | null;
  idealEntryZoneLow?: number | null;
  idealEntryZoneHigh?: number | null;
  targetPrice2?: number | null;
  riskRewardRatio?: number | null;
  bullishScore?: number | null;
  verdictLabel?: string | null;
  strengths?: string[] | null;
  risks?: string[] | null;
}

export interface StockSearchResult {
  ticker: string;
  companyName: string;
  exchange: string;
  sector: string;
  currentPrice: number;
  dayChangePercent: number;
}

export interface PreMarketStockItem {
  ticker: string;
  companyName: string;
  sector: string;
  currentPrice: number;
  entryPrice: number;
  targetPrice: number;
  expectedProfitPerShare: number;
  expectedProfitPercentage: number;
  stopLossPrice: number;
  riskRewardRatio: number;
  setupType: string;
  catalystHindi: string;
  isBullishGainer: boolean;
}

export interface PreMarketDailyReport {
  reportDate: string;
  scanTimeIst: string;
  marketSentiment: string;
  niftyExpectedTrend: string;
  topProfitGainers: PreMarketStockItem[];
  topLossRisks: PreMarketStockItem[];
  actionableBriefHindi: string;
  formattedWhatsAppMessage: string;
  formattedHtmlEmail: string;
}

export interface PortfolioTargetHitAlert {
  holdingId: string;
  userId: string;
  ticker: string;
  companyName: string;
  buyPrice: number;
  quantity: number;
  currentPrice: number;
  targetProfitPerShare?: number | null;
  currentProfitPerShare: number;
  totalProfit: number;
  profitPercentage: number;
  targetPrice?: number | null;
  stopLossPrice?: number | null;
  alertType: string;
  verdictLabel: string;
  recommendedActionHindi: string;
  formattedWhatsAppMessage: string;
  formattedHtmlEmail: string;
}

export interface MarketAgentUserSetting {
  whatsAppPhoneNumber?: string | null;
  emailAddress?: string | null;
  enablePreMarketScan: boolean;
  enableTargetHitAlerts: boolean;
  enableStopLossAlerts: boolean;
  enableEmailDispatch: boolean;
  enableWhatsAppDispatch: boolean;
  preMarketScanTime: string;
  lastPreMarketReportDate?: string | null;
}

export interface UpdateMarketAgentUserSettingRequest {
  whatsAppPhoneNumber?: string | null;
  emailAddress?: string | null;
  enablePreMarketScan: boolean;
  enableTargetHitAlerts: boolean;
  enableStopLossAlerts: boolean;
  enableEmailDispatch: boolean;
  enableWhatsAppDispatch: boolean;
  preMarketScanTime?: string | null;
}

export interface MarketAgentAlertLog {
  id: string;
  ticker: string;
  companyName: string;
  alertType: string;
  title: string;
  message: string;
  triggerPrice: number;
  targetPrice?: number | null;
  profitOrLossAmount?: number | null;
  whatsAppStatus: string;
  emailStatus: string;
  whatsAppClickUrl?: string | null;
  createdAtUtc: string;
  createdAtIst: string;
}

export interface MarketAgentStatus {
  currentTimeIst: string;
  isMarketOpen: boolean;
  marketStatusText: string;
  preMarketAgentStatus: string;
  portfolioSentinelAgentStatus: string;
  alertDispatcherAgentStatus: string;
  nextPreMarketRunTimeIst: string;
  totalAlertsDispatchedToday: number;
  recentAlerts: MarketAgentAlertLog[];
}


