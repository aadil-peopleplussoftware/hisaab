export interface MarketAgentUserSetting {
  whatsAppPhoneNumber?: string;
  emailAddress?: string;
  whatsAppProvider?: string;
  whatsAppApiKey?: string;
  whatsAppInstanceId?: string;
  whatsAppWebhookUrl?: string;
  enablePreMarketScan: boolean;
  enableMarketOpenAlerts: boolean;
  enableMarketCloseAlerts: boolean;
  enableTargetHitAlerts: boolean;
  enableStopLossAlerts: boolean;
  enableEmailDispatch: boolean;
  enableWhatsAppDispatch: boolean;
  preMarketScanTime: string;
  lastPreMarketReportDate?: string;
  lastMarketOpenReportDate?: string;
  lastMarketCloseReportDate?: string;
  enableTelegramDispatch?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  enableDiscordDispatch?: boolean;
  discordWebhookUrl?: string;
  enableNtfyDispatch?: boolean;
  ntfyTopic?: string;
  ntfyServerUrl?: string;
}

export interface MyAssistantStockItem {
  id: string;
  ticker: string;
  companyName: string;
  exchange: string;
  buyPrice: number;
  quantity: number;
  currentPrice: number;
  openPrice: number;
  previousClose: number;
  dayChange: number;
  dayChangePercent: number;
  dayHigh: number;
  dayLow: number;
  targetPrice?: number;
  targetProfitPerShare?: number;
  stopLossPrice?: number;
  currentProfitPerShare: number;
  totalProfitLoss: number;
  profitPercentage: number;
  distanceToTarget: number;
  distanceToTargetPct: number;
  distanceToStopLoss: number;
  distanceToStopLossPct: number;
  status: 'SAFE' | 'TARGET_HIT' | 'STOP_LOSS_BREACHED' | 'NEAR_TARGET' | 'NEAR_STOP_LOSS' | string;
  notes?: string;
  purchaseDate: string;
}

export interface MarketAgentAlertLog {
  id: string;
  ticker: string;
  companyName: string;
  alertType: string;
  title: string;
  message: string;
  triggerPrice: number;
  targetPrice?: number;
  profitOrLossAmount?: number;
  whatsAppStatus: string;
  emailStatus: string;
  telegramStatus?: string;
  discordStatus?: string;
  ntfyStatus?: string;
  whatsAppClickUrl?: string;
  createdAtUtc: string;
  createdAtIst: string;
}

export interface MyAssistantOverview {
  currentTimeIst: string;
  isMarketOpen: boolean;
  marketStatusText: string;
  nextScheduledEventIst: string;
  totalInvested: number;
  totalCurrentValue: number;
  totalUnrealizedProfit: number;
  totalDayGainLoss: number;
  totalStocksTracked: number;
  targetsHitCount: number;
  stopLossHitCount: number;
  alertsDispatchedToday: number;
  holdings: MyAssistantStockItem[];
  settings: MarketAgentUserSetting;
  recentLogs: MarketAgentAlertLog[];
}

export interface AddStockPayload {
  ticker: string;
  companyName?: string;
  buyPrice: number;
  quantity: number;
  targetPrice?: number;
  targetProfitPerShare?: number;
  stopLossPrice?: number;
  notes?: string;
}

export interface UpdateStockPayload {
  buyPrice: number;
  quantity: number;
  targetPrice?: number;
  targetProfitPerShare?: number;
  stopLossPrice?: number;
  notes?: string;
}

export interface StockSearchResult {
  ticker: string;
  companyName: string;
  exchange: string;
  sector?: string;
  currentPrice: number;
  dayChangePercent?: number;
}

export interface MarketOpenDailyReport {
  reportDate: string;
  scanTimeIst: string;
  totalHoldingsTracked: number;
  stocks: {
    ticker: string;
    companyName: string;
    buyPrice: number;
    quantity: number;
    openPrice: number;
    previousClose: number;
    gapPercentage: number;
    currentPrice: number;
    targetPrice?: number;
    stopLossPrice?: number;
    gapStatus: string;
  }[];
  actionableBriefHindi: string;
  formattedWhatsAppMessage: string;
  formattedHtmlEmail: string;
}

export interface MarketCloseDailyReport {
  reportDate: string;
  scanTimeIst: string;
  totalHoldingsTracked: number;
  dayTotalGainLoss: number;
  overallTotalGainLoss: number;
  stocks: {
    ticker: string;
    companyName: string;
    buyPrice: number;
    quantity: number;
    closePrice: number;
    dayChange: number;
    dayChangePercent: number;
    totalProfitLoss: number;
    totalProfitLossPct: number;
    dayGainLoss: number;
  }[];
  actionableBriefHindi: string;
  formattedWhatsAppMessage: string;
  formattedHtmlEmail: string;
}
