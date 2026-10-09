import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'inrCurrency',
  standalone: true
})
export class InrCurrencyPipe implements PipeTransform {
  transform(value: number | string | null | undefined, showSymbol: boolean = true): string {
    if (value === null || value === undefined || value === '') {
      return showSymbol ? '₹0.00' : '0.00';
    }

    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) {
      return showSymbol ? '₹0.00' : '0.00';
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
}

