import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InrCurrencyPipe } from '../../pipes/inr-currency.pipe';

export type StatVariant = 'income' | 'expense' | 'loan' | 'epf' | 'investment' | 'neutral';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, InrCurrencyPipe],
  template: `
    <div class="stat-card" [class]="'variant-' + variant()">
      <div class="stat-header">
        <span class="stat-title">{{ title() }}</span>
        @if (subtitle()) {
          <span class="stat-subtitle">{{ subtitle() }}</span>
        }
      </div>
      <div class="stat-amount amount">
        {{ amount() | inrCurrency }}
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      position: relative;
      overflow: hidden;
      transition: transform 0.15s ease, box-shadow 0.15s ease;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
      }

      &.variant-income::before { background: var(--color-income); }
      &.variant-expense::before { background: var(--color-expense); }
      &.variant-loan::before { background: var(--color-loan); }
      &.variant-epf::before { background: var(--color-epf); }
      &.variant-investment::before { background: var(--color-investment); }
      &.variant-neutral::before { background: var(--color-primary); }

      &.variant-income .stat-amount { color: var(--color-income); }
      &.variant-expense .stat-amount { color: var(--color-expense); }
    }

    .stat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .stat-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .stat-subtitle {
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .stat-amount {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.2;
      color: var(--color-text-main);
    }
  `]
})
export class StatCardComponent {
  readonly title = input.required<string>();
  readonly amount = input.required<number>();
  readonly subtitle = input<string>();
  readonly variant = input<StatVariant>('neutral');
}

