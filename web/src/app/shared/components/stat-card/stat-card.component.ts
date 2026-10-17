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
        <span class="stat-title" [title]="title()">{{ title() }}</span>
      </div>
      <div class="stat-amount amount">
        {{ amount() | inrCurrency }}
      </div>
      @if (subtitle()) {
        <div class="stat-subtitle" [title]="subtitle()">{{ subtitle() }}</div>
      }
    </div>
  `,
  styles: [`
    .stat-card {
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 1rem 1.15rem;
      box-shadow: var(--shadow-xs);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      position: relative;
      overflow: hidden;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;

      &:hover {
        box-shadow: var(--shadow-md);
        border-color: var(--color-border-subtle);
        transform: translateY(-1px);
      }

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
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
      justify-content: flex-start;
      width: 100%;
    }

    .stat-title {
      font-size: 0.725rem;
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
    }

    .stat-amount {
      font-size: 1.35rem;
      font-weight: 700;
      line-height: 1.25;
      color: var(--color-text-main);
      letter-spacing: -0.02em;
      white-space: nowrap;
    }

    .stat-subtitle {
      font-size: 0.725rem;
      color: var(--color-text-muted);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
    }
  `]
})
export class StatCardComponent {
  readonly title = input.required<string>();
  readonly amount = input.required<number>();
  readonly subtitle = input<string>();
  readonly variant = input<StatVariant>('neutral');
}
