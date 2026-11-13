import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MyAssistantService } from './services/my-assistant.service';
import {
  MarketAgentAlertLog,
  MarketAgentUserSetting,
  MarketCloseDailyReport,
  MarketOpenDailyReport,
  MyAssistantOverview,
  MyAssistantStockItem,
  StockSearchResult
} from './models/my-assistant.model';
import { InrCurrencyPipe } from '../../shared/pipes/inr-currency.pipe';

@Component({
  selector: 'app-my-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, InrCurrencyPipe],
  templateUrl: './my-assistant.component.html',
  styleUrls: ['./my-assistant.component.scss']
})
export class MyAssistantComponent implements OnInit {
  private readonly assistantService = inject(MyAssistantService);
  private readonly fb = inject(FormBuilder);

  // Reactive state signals
  readonly overview = signal<MyAssistantOverview | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isActionBusy = signal<boolean>(false);
  readonly activeTab = signal<'stocks' | 'alerts' | 'settings'>('stocks');
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'warning' | 'error'>('success');

  // Modals & Panels
  readonly isAddStockModalOpen = signal<boolean>(false);
  readonly isEditingStock = signal<MyAssistantStockItem | null>(null);
  readonly isMarketOpenModalOpen = signal<boolean>(false);
  readonly isMarketCloseModalOpen = signal<boolean>(false);
  readonly openReportData = signal<MarketOpenDailyReport | null>(null);
  readonly closeReportData = signal<MarketCloseDailyReport | null>(null);

  // Forms
  stockForm!: FormGroup;
  settingsForm!: FormGroup;

  // Search autocomplete & suggestion tooltips
  readonly stockSearchQuery = signal<string>('');
  readonly stockSearchResults = signal<StockSearchResult[]>([]);
  readonly isSearchingStocks = signal<boolean>(false);
  readonly showStockSuggestions = signal<boolean>(false);
  readonly hoveredStock = signal<StockSearchResult | null>(null);
  private searchDebounceTimer: any = null;

  // Common Indian Stocks quick picks
  readonly popularStocks = [
    { ticker: 'RELIANCE.NS', name: 'Reliance Industries', price: 2985.50 },
    { ticker: 'TCS.NS', name: 'Tata Consultancy Services', price: 4125.75 },
    { ticker: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', price: 1682.20 },
    { ticker: 'INFY.NS', name: 'Infosys Ltd', price: 1892.40 },
    { ticker: 'TATAMOTORS.NS', name: 'Tata Motors Ltd', price: 948.30 },
    { ticker: 'ITC.NS', name: 'ITC Ltd', price: 488.65 },
    { ticker: 'SBIN.NS', name: 'State Bank of India', price: 796.80 },
    { ticker: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd', price: 1665.40 },
    { ticker: 'ZOMATO.NS', name: 'Zomato Ltd', price: 276.40 },
    { ticker: 'DIXON.NS', name: 'Dixon Technologies Ltd', price: 12820.00 }
  ];

  ngOnInit(): void {
    this.initForms();
    this.loadOverview();
  }

  private initForms(): void {
    this.stockForm = this.fb.group({
      ticker: ['', [Validators.required]],
      companyName: [''],
      buyPrice: [null, [Validators.required, Validators.min(0.01)]],
      quantity: [null, [Validators.required, Validators.min(1)]],
      targetPrice: [null],
      targetProfitPerShare: [null],
      stopLossPrice: [null],
      notes: ['']
    });

    this.settingsForm = this.fb.group({
      whatsAppPhoneNumber: [''],
      whatsAppProvider: ['CallMeBot'],
      whatsAppApiKey: [''],
      whatsAppInstanceId: [''],
      whatsAppWebhookUrl: [''],
      emailAddress: ['', [Validators.email]],
      enableMarketOpenAlerts: [true],
      enableMarketCloseAlerts: [true],
      enableTargetHitAlerts: [true],
      enableStopLossAlerts: [true],
      enableWhatsAppDispatch: [true],
      enableEmailDispatch: [true],
      preMarketScanTime: ['08:45'],
      enableTelegramDispatch: [false],
      telegramBotToken: [''],
      telegramChatId: [''],
      enableDiscordDispatch: [false],
      discordWebhookUrl: [''],
      enableNtfyDispatch: [false],
      ntfyTopic: [''],
      ntfyServerUrl: ['https://ntfy.sh']
    });
  }

  loadOverview(): void {
    this.isLoading.set(true);
    this.assistantService.getOverview().subscribe({
      next: (res) => {
        this.overview.set(res);
        if (res.settings) {
          this.settingsForm.patchValue({
            whatsAppPhoneNumber: res.settings.whatsAppPhoneNumber || '',
            whatsAppProvider: res.settings.whatsAppProvider || 'CallMeBot',
            whatsAppApiKey: res.settings.whatsAppApiKey || '',
            whatsAppInstanceId: res.settings.whatsAppInstanceId || '',
            whatsAppWebhookUrl: res.settings.whatsAppWebhookUrl || '',
            emailAddress: res.settings.emailAddress || '',
            enableMarketOpenAlerts: res.settings.enableMarketOpenAlerts ?? true,
            enableMarketCloseAlerts: res.settings.enableMarketCloseAlerts ?? true,
            enableTargetHitAlerts: res.settings.enableTargetHitAlerts ?? true,
            enableStopLossAlerts: res.settings.enableStopLossAlerts ?? true,
            enableWhatsAppDispatch: res.settings.enableWhatsAppDispatch ?? true,
            enableEmailDispatch: res.settings.enableEmailDispatch ?? true,
            preMarketScanTime: res.settings.preMarketScanTime || '08:45',
            enableTelegramDispatch: res.settings.enableTelegramDispatch ?? false,
            telegramBotToken: res.settings.telegramBotToken || '',
            telegramChatId: res.settings.telegramChatId || '',
            enableDiscordDispatch: res.settings.enableDiscordDispatch ?? false,
            discordWebhookUrl: res.settings.discordWebhookUrl || '',
            enableNtfyDispatch: res.settings.enableNtfyDispatch ?? false,
            ntfyTopic: res.settings.ntfyTopic || '',
            ntfyServerUrl: res.settings.ntfyServerUrl || 'https://ntfy.sh'
          });
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load My Assistant overview', err);
        this.showToast('Failed to load My Assistant details.', 'error');
        this.isLoading.set(false);
      }
    });
  }

  // --- Instant Action Triggers ---
  triggerTargetAndStopLossCheck(): void {
    this.isActionBusy.set(true);
    this.showToast('Checking live market prices against your Targets & Stop-Losses...', 'warning');
    this.assistantService.checkTargetAndStopLossNow().subscribe({
      next: (res) => {
        this.isActionBusy.set(false);
        if (res.triggeredCount > 0) {
          this.showToast(`🎯 Sentinel Alert! ${res.triggeredCount} stock(s) breached Target or Stop-Loss! Notification dispatched.`, 'success');
        } else {
          this.showToast('✅ All tracked shares are currently safe within normal price bands.', 'success');
        }
        this.loadOverview();
      },
      error: (err) => {
        this.isActionBusy.set(false);
        this.showToast('Error executing Target/Stop-loss check.', 'error');
      }
    });
  }

  triggerMarketOpenScan(): void {
    this.isActionBusy.set(true);
    this.showToast('Generating 09:15 AM Market Opening Bell Report...', 'warning');
    this.assistantService.runMarketOpenScanNow().subscribe({
      next: (report) => {
        this.isActionBusy.set(false);
        this.openReportData.set(report);
        this.isMarketOpenModalOpen.set(true);
        this.showToast('🔔 Market Open Report generated! WhatsApp & Email alert ready.', 'success');
        this.loadOverview();
      },
      error: (err) => {
        this.isActionBusy.set(false);
        this.showToast('Error running Market Open routine.', 'error');
      }
    });
  }

  triggerMarketCloseScan(): void {
    this.isActionBusy.set(true);
    this.showToast('Generating 03:30 PM Market Closing Bell Summary...', 'warning');
    this.assistantService.runMarketCloseScanNow().subscribe({
      next: (report) => {
        this.isActionBusy.set(false);
        this.closeReportData.set(report);
        this.isMarketCloseModalOpen.set(true);
        this.showToast('🌆 Market Close Summary generated! WhatsApp & Email alert ready.', 'success');
        this.loadOverview();
      },
      error: (err) => {
        this.isActionBusy.set(false);
        this.showToast('Error running Market Close routine.', 'error');
      }
    });
  }

  triggerTestAlert(): void {
    this.isActionBusy.set(true);
    const form = this.settingsForm.value;
    this.showToast('Multi-channel test alert generate kiya ja raha hai...', 'warning');
    this.assistantService.sendTestAlert(
      form.whatsAppPhoneNumber,
      form.emailAddress,
      form.telegramBotToken,
      form.telegramChatId,
      form.discordWebhookUrl,
      form.ntfyTopic,
      form.ntfyServerUrl
    ).subscribe({
      next: (res) => {
        this.isActionBusy.set(false);
        this.showToast('📲 Multi-channel test alert sabhi active channels par send ho gaya!', 'success');
        this.loadOverview();
      },
      error: (err) => {
        this.isActionBusy.set(false);
        this.showToast('Failed to dispatch test notification.', 'error');
      }
    });
  }

  testTelegram(): void {
    const token = this.settingsForm.value.telegramBotToken;
    const chatId = this.settingsForm.value.telegramChatId;
    if (!token || !chatId) {
      this.showToast('Telegram Bot Token aur Chat ID dono enter karein test karne ke liye.', 'warning');
      return;
    }
    this.isActionBusy.set(true);
    this.showToast('Telegram bot test message bheja ja raha hai...', 'warning');
    this.assistantService.testTelegramChannel(token, chatId).subscribe({
      next: (res) => {
        this.isActionBusy.set(false);
        if (res.success) {
          this.showToast('🤖 Telegram test message successfully sent! Telegram app check karein.', 'success');
          this.loadOverview();
        } else {
          this.showToast(`Telegram test failed: ${res.errorMessage || res.status}`, 'error');
        }
      },
      error: (err) => {
        this.isActionBusy.set(false);
        this.showToast('Telegram dispatch failed: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  testDiscord(): void {
    const webhookUrl = this.settingsForm.value.discordWebhookUrl;
    if (!webhookUrl) {
      this.showToast('Discord Webhook URL enter karein test karne ke liye.', 'warning');
      return;
    }
    this.isActionBusy.set(true);
    this.showToast('Discord webhook test embed bheja ja raha hai...', 'warning');
    this.assistantService.testDiscordChannel(webhookUrl).subscribe({
      next: (res) => {
        this.isActionBusy.set(false);
        if (res.success) {
          this.showToast('🎮 Discord test embed sent! Apna Discord server/channel check karein.', 'success');
          this.loadOverview();
        } else {
          this.showToast(`Discord test failed: ${res.errorMessage || res.status}`, 'error');
        }
      },
      error: (err) => {
        this.isActionBusy.set(false);
        this.showToast('Discord dispatch failed: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  testNtfy(): void {
    const topic = this.settingsForm.value.ntfyTopic;
    const serverUrl = this.settingsForm.value.ntfyServerUrl || 'https://ntfy.sh';
    if (!topic) {
      this.showToast('ntfy.sh Topic name enter karein test karne ke liye.', 'warning');
      return;
    }
    this.isActionBusy.set(true);
    this.showToast('ntfy.sh Mobile Push test bheja ja raha hai...', 'warning');
    this.assistantService.testNtfyChannel(topic, serverUrl).subscribe({
      next: (res) => {
        this.isActionBusy.set(false);
        if (res.success) {
          this.showToast('🔔 ntfy Mobile Push notification sent! Phone notification bar check karein.', 'success');
          this.loadOverview();
        } else {
          this.showToast(`ntfy test failed: ${res.errorMessage || res.status}`, 'error');
        }
      },
      error: (err) => {
        this.isActionBusy.set(false);
        this.showToast('ntfy dispatch failed: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  // --- Add & Edit Stock ---
  openAddModal(): void {
    this.isEditingStock.set(null);
    this.stockForm.reset();
    this.stockSearchQuery.set('');
    this.stockSearchResults.set([]);
    this.showStockSuggestions.set(false);
    this.hoveredStock.set(null);
    this.isAddStockModalOpen.set(true);
  }

  openEditModal(stock: MyAssistantStockItem): void {
    this.isEditingStock.set(stock);
    this.stockForm.patchValue({
      ticker: stock.ticker,
      companyName: stock.companyName,
      buyPrice: stock.buyPrice,
      quantity: stock.quantity,
      targetPrice: stock.targetPrice || null,
      targetProfitPerShare: stock.targetProfitPerShare || null,
      stopLossPrice: stock.stopLossPrice || null,
      notes: stock.notes || ''
    });
    this.showStockSuggestions.set(false);
    this.isAddStockModalOpen.set(true);
  }

  closeModal(): void {
    this.isAddStockModalOpen.set(false);
    this.isEditingStock.set(null);
    this.showStockSuggestions.set(false);
    this.hoveredStock.set(null);
  }

  selectPopularStock(stock: { ticker: string; name: string; price: number }): void {
    this.stockForm.patchValue({
      ticker: stock.ticker,
      companyName: stock.name,
      buyPrice: stock.price,
      targetPrice: Math.round(stock.price * 1.1 * 100) / 100,
      targetProfitPerShare: Math.round(stock.price * 0.1 * 100) / 100,
      stopLossPrice: Math.round(stock.price * 0.95 * 100) / 100,
      quantity: 10
    });
    this.showStockSuggestions.set(false);
  }

  onTickerInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = (input?.value || '').trim();
    this.stockSearchQuery.set(query);

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.isSearchingStocks.set(true);
      this.showStockSuggestions.set(true);
      this.assistantService.searchStocks(query).subscribe({
        next: (results) => {
          this.stockSearchResults.set(results || []);
          this.isSearchingStocks.set(false);
        },
        error: (err) => {
          console.warn('Stock search failed', err);
          this.stockSearchResults.set([]);
          this.isSearchingStocks.set(false);
        }
      });
    }, 200);
  }

  onTickerFocus(): void {
    if (!this.isEditingStock()) {
      const currentVal = (this.stockForm.get('ticker')?.value || '').trim();
      this.isSearchingStocks.set(true);
      this.showStockSuggestions.set(true);
      this.assistantService.searchStocks(currentVal).subscribe({
        next: (results) => {
          this.stockSearchResults.set(results || []);
          this.isSearchingStocks.set(false);
        },
        error: () => {
          this.isSearchingStocks.set(false);
        }
      });
    }
  }

  clearTickerInput(): void {
    this.stockForm.patchValue({
      ticker: '',
      companyName: ''
    });
    this.stockSearchQuery.set('');
    this.stockSearchResults.set([]);
    this.showStockSuggestions.set(false);
    this.hoveredStock.set(null);
  }

  selectSearchResult(item: StockSearchResult): void {
    const cmp = item.currentPrice && item.currentPrice > 0 ? item.currentPrice : null;
    const target = cmp ? Math.round(cmp * 1.10 * 100) / 100 : null;
    const stopLoss = cmp ? Math.round(cmp * 0.95 * 100) / 100 : null;
    const targetProfit = cmp ? Math.round((cmp * 0.10) * 100) / 100 : null;

    this.stockForm.patchValue({
      ticker: item.ticker,
      companyName: item.companyName,
      buyPrice: cmp,
      targetPrice: target,
      targetProfitPerShare: targetProfit,
      stopLossPrice: stopLoss,
      quantity: this.stockForm.get('quantity')?.value || 10
    });

    this.showStockSuggestions.set(false);
    this.stockSearchResults.set([]);
    this.hoveredStock.set(null);
    this.stockSearchQuery.set(item.ticker);
  }

  saveStock(): void {
    if (this.stockForm.invalid) {
      this.stockForm.markAllAsTouched();
      return;
    }

    const val = this.stockForm.value;
    const editing = this.isEditingStock();

    if (editing) {
      this.assistantService.updateStock(editing.id, {
        buyPrice: val.buyPrice,
        quantity: val.quantity,
        targetPrice: val.targetPrice,
        targetProfitPerShare: val.targetProfitPerShare,
        stopLossPrice: val.stopLossPrice,
        notes: val.notes
      }).subscribe({
        next: () => {
          this.closeModal();
          this.showToast(`Updated targets for ${editing.companyName}!`, 'success');
          this.loadOverview();
        },
        error: () => this.showToast('Failed to update stock.', 'error')
      });
    } else {
      this.assistantService.addStock({
        ticker: val.ticker,
        companyName: val.companyName,
        buyPrice: val.buyPrice,
        quantity: val.quantity,
        targetPrice: val.targetPrice,
        targetProfitPerShare: val.targetProfitPerShare,
        stopLossPrice: val.stopLossPrice,
        notes: val.notes
      }).subscribe({
        next: () => {
          this.closeModal();
          this.showToast(`Stock ${val.ticker} added to My Assistant!`, 'success');
          this.loadOverview();
        },
        error: () => this.showToast('Failed to add stock.', 'error')
      });
    }
  }

  deleteStock(stock: MyAssistantStockItem): void {
    if (!confirm(`Are you sure you want to stop tracking ${stock.companyName} (${stock.ticker})?`)) {
      return;
    }
    this.assistantService.deleteStock(stock.id).subscribe({
      next: () => {
        this.showToast(`Removed ${stock.ticker} from assistant.`, 'success');
        this.loadOverview();
      },
      error: () => this.showToast('Failed to delete stock.', 'error')
    });
  }

  // --- Settings Save ---
  saveSettings(): void {
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }
    this.assistantService.updateSettings(this.settingsForm.value).subscribe({
      next: () => {
        this.showToast('Assistant Bot & Notification settings saved successfully!', 'success');
        this.loadOverview();
      },
      error: () => this.showToast('Failed to save settings.', 'error')
    });
  }

  // --- WhatsApp Deep Link Helper ---
  openWhatsAppDeepLink(url?: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  shareStockToWhatsApp(stock: MyAssistantStockItem): void {
    const pnlSign = stock.totalProfitLoss >= 0 ? '+' : '';
    const phone = this.overview()?.settings?.whatsAppPhoneNumber?.replace(/[^0-9]/g, '') || '919876543210';
    const msg =
      `🤖 *Hisaab My Assistant Update*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• *Company:* ${stock.companyName} (${stock.ticker.replace('.NS', '')})\n` +
      `• *Live CMP:* ₹${stock.currentPrice.toFixed(2)}\n` +
      `• *Open Price:* ₹${stock.openPrice.toFixed(2)}\n` +
      `• *Buy Price:* ₹${stock.buyPrice.toFixed(2)}\n` +
      `• *Total P&L:* ${pnlSign}₹${stock.totalProfitLoss.toFixed(2)} (${pnlSign}${stock.profitPercentage.toFixed(2)}%)\n` +
      `• *Target:* ₹${stock.targetPrice?.toFixed(2) || 'Not Set'}\n` +
      `• *Stop Loss:* ₹${stock.stopLossPrice?.toFixed(2) || 'Not Set'}\n` +
      `• *Status:* ${stock.status}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `_Real-Time Stock Assistant Sentinel_`;

    const encoded = encodeURIComponent(msg);
    const cleanPhone = phone.length === 10 ? '91' + phone : phone;
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Copied WhatsApp message text to clipboard!', 'success');
    });
  }

  private showToast(msg: string, type: 'success' | 'warning' | 'error'): void {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4500);
  }
}
