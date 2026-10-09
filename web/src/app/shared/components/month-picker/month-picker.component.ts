import { Component, input, output, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-month-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="month-picker">
      <button
        type="button"
        class="btn-nav"
        (click)="previousMonth()"
        aria-label="Previous Month"
        title="Previous Month">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div class="current-month-wrap" title="Click to pick month">
        <span class="month-label">{{ formattedMonth() }}</span>
        <input
          type="month"
          [value]="isoMonth()"
          (change)="onNativeMonthChange($event)"
          class="native-month-input"
          aria-label="Select month"
        />
      </div>

      <button
        type="button"
        class="btn-nav"
        (click)="nextMonth()"
        aria-label="Next Month"
        title="Next Month">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      <button
        type="button"
        class="btn-today"
        (click)="goToCurrentMonth()"
        title="Go to current month">
        Current
      </button>
    </div>
  `,
  styles: [`
    .month-picker {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: var(--color-bg-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 0.25rem 0.375rem;
      box-shadow: var(--shadow-xs);
    }

    .btn-nav {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: transparent;
      border: none;
      color: var(--color-text-secondary);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover {
        background-color: var(--color-bg-subtle);
        color: var(--color-text-main);
      }

      &:active {
        transform: scale(0.95);
      }
    }

    .current-month-wrap {
      position: relative;
      padding: 0.25rem 0.625rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      transition: background-color 0.15s ease;

      &:hover {
        background-color: var(--color-bg-subtle);
      }
    }

    .month-label {
      font-weight: 700;
      font-size: 0.875rem;
      color: var(--color-text-main);
      white-space: nowrap;
      letter-spacing: -0.01em;
    }

    .native-month-input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
      width: 100%;
      height: 100%;
    }

    .btn-today {
      height: 30px;
      padding: 0 0.65rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--color-primary);
      background: var(--color-bg-subtle);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;

      &:hover {
        background: var(--color-primary);
        color: #ffffff;
        border-color: var(--color-primary);
      }
    }
  `]
})
export class MonthPickerComponent implements OnInit {
  readonly initialMonth = input<string>(); // 'YYYY-MM'
  readonly currentDate = signal<Date>(new Date());
  readonly monthChange = output<string>(); // Emits 'YYYY-MM'

  ngOnInit(): void {
    if (this.initialMonth()) {
      const parts = this.initialMonth()!.split('-');
      if (parts.length === 2) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
        this.currentDate.set(d);
      }
    }
  }

  formattedMonth(): string {
    return this.currentDate().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  isoMonth(): string {
    const d = this.currentDate();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
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

  onNativeMonthChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      const parts = input.value.split('-');
      if (parts.length === 2) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
        this.updateDate(d);
      }
    }
  }

  private updateDate(date: Date): void {
    this.currentDate.set(date);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    this.monthChange.emit(`${yyyy}-${mm}`);
  }
}
