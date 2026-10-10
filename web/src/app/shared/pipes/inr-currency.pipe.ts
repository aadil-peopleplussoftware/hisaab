import { Pipe, PipeTransform, inject } from '@angular/core';
import { ThemeService } from '../../core/services/theme.service';

@Pipe({
  name: 'inrCurrency',
  standalone: true,
  pure: false
})
export class InrCurrencyPipe implements PipeTransform {
  private readonly themeService?: ThemeService;

  constructor() {
    try {
      this.themeService = inject(ThemeService, { optional: true }) ?? undefined;
    } catch {
      this.themeService = undefined;
    }
  }

  transform(value: number | string | null | undefined, showSymbol: boolean = true): string {
    const code = this.themeService?.displayCurrency() || 'INR';
    const sym = this.getCurrencySymbol(code);

    if (value === null || value === undefined || value === '') {
      return showSymbol ? `${sym}0.00` : '0.00';
    }

    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) {
      return showSymbol ? `${sym}0.00` : '0.00';
    }

    if (code !== 'INR' && this.themeService) {
      const conv = this.themeService.convertInr(num);
      const isNegative = conv.value < 0;
      const absVal = Math.abs(conv.value);
      const formatted = absVal.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      const prefix = isNegative ? '-' : '';
      const symbol = showSymbol ? conv.symbol : '';
      return `${prefix}${symbol}${formatted}`;
    }

    const isNegative = num < 0;
    const absolute = Math.abs(num);
    const [integerPart, decimalPartRaw] = absolute.toFixed(2).split('.');
    const decimalPart = decimalPartRaw || '00';

    // Format Indian Numbering: last 3 digits, then groups of 2 digits
    let formattedInteger = '';
    if (integerPart.length <= 3) {
      formattedInteger = integerPart;
    } else {
      const lastThree = integerPart.substring(integerPart.length - 3);
      const remaining = integerPart.substring(0, integerPart.length - 3);
      const groupedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      formattedInteger = `${groupedRemaining},${lastThree}`;
    }

    const result = `${formattedInteger}.${decimalPart}`;
    const prefix = isNegative ? '-' : '';
    const symbol = showSymbol ? '₹' : '';

    return `${prefix}${symbol}${result}`;
  }

  private getCurrencySymbol(code: string): string {
    if (code === 'USD') return '$';
    if (code === 'EUR') return '€';
    if (code === 'GBP') return '£';
    if (code === 'AED') return 'د.إ';
    return '₹';
  }
}

