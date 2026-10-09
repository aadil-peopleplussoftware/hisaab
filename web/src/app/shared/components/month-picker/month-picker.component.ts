import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-month-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="month-picker">
      <button type="button" class="btn-nav" (click)="previousMonth()" aria-label="Previous Month">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div class="current-month">
        <span class="month-label">{{ formattedMonth() }}</span>
      </div>

      <button type="button" class="btn-nav" (click)="nextMonth()" aria-label="Next Month">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      <button type="button" class="btn-today" (click)="goToCurrentMonth()">
        Current
      </button>
    </div>
  `,
  styles: [`
    .month-picker {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 0.25rem 0.5rem;
      box-shadow: var(--shadow-sm);
    }
    .btn-nav {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: var(--min-touch-target);
      min-height: var(--min-touch-target);
      background: transparent;
      border: none;
      color: var(--color-text-main);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: background-color 0.15s ease;
      &:hover {
        background-color: var(--color-bg-subtle);
      }
    }
    .current-month {
      padding: 0 0.5rem;
      font-weight: 600;
      font-size: 0.95rem;
      white-space: nowrap;
      color: var(--color-text-main);
    }
    .btn-today {
      min-height: calc(var(--min-touch-target) - 8px);
      padding: 0 0.75rem;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--color-primary);
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      cursor: pointer;
      &:hover {
        background: var(--color-primary);
        color: #ffffff;
      }
    }
  `]
})
export class MonthPickerComponent {
  readonly currentDate = signal<Date>(new Date());
  readonly monthChange = output<string>(); // Emits 'YYYY-MM'

  formattedMonth(): string {
    return this.currentDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  previousMonth(): void {
    const d = new Date(this.currentDate());
    d.setMonth(d.getMonth() - 1);
    this.updateDate(d);
  }

  nextMonth(): void {
    const d = new Date(this.currentDate());
    d.setMonth(d.getMonth() + 1);
    this.updateDate(d);
  }

  goToCurrentMonth(): void {
    this.updateDate(new Date());
  }

  private updateDate(date: Date): void {
    this.currentDate.set(date);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    this.monthChange.emit(`${yyyy}-${mm}`);
  }
}

