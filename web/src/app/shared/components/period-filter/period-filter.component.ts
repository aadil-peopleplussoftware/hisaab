import { Component, OnInit, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeriodFilterParams, PeriodType } from '../../../features/dashboard/services/dashboard.service';

@Component({
  selector: 'app-period-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './period-filter.component.html',
  styleUrls: ['./period-filter.component.scss']
})
export class PeriodFilterComponent implements OnInit {
  readonly initialFilter = input<PeriodFilterParams | null>(null);
  readonly filterChange = output<PeriodFilterParams>();

  // Modes
  readonly activeMode = signal<PeriodType>('month');

  // Values
  readonly selectedMonth = signal<string>(new Date().toISOString().substring(0, 7));
  readonly selectedYear = signal<number>(new Date().getFullYear());
  readonly selectedDate = signal<string>(new Date().toISOString().substring(0, 10));
  readonly customStartDate = signal<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  );
  readonly customEndDate = signal<string>(new Date().toISOString().substring(0, 10));

  // Available Years
  readonly availableYears: number[] = [];

  constructor() {
    const curYear = new Date().getFullYear();
    for (let y = curYear + 1; y >= curYear - 8; y--) {
      this.availableYears.push(y);
    }
  }

  ngOnInit(): void {
    const init = this.initialFilter();
    if (init) {
      if (init.periodType) this.activeMode.set(init.periodType);
      if (init.month) this.selectedMonth.set(init.month);
      if (init.year) this.selectedYear.set(init.year);
      if (init.date) this.selectedDate.set(init.date);
      if (init.startDate) this.customStartDate.set(init.startDate);
      if (init.endDate) this.customEndDate.set(init.endDate);
    }
  }

  setMode(mode: PeriodType): void {
    this.activeMode.set(mode);
    this.emitChange();
  }

  // --- Year Controls ---
  prevYear(): void {
    this.selectedYear.update(y => y - 1);
    this.emitChange();
  }

  nextYear(): void {
    this.selectedYear.update(y => y + 1);
    this.emitChange();
  }

  onYearSelect(yearVal: any): void {
    const y = parseInt(yearVal, 10);
    if (!isNaN(y)) {
      this.selectedYear.set(y);
      this.emitChange();
    }
  }

  // --- Month Controls ---
  prevMonth(): void {
    const parts = this.selectedMonth().split('-');
    let y = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    m--;
    if (m < 1) {
      m = 12;
      y--;
    }
    const newMonth = `${y}-${m.toString().padStart(2, '0')}`;
    this.selectedMonth.set(newMonth);
    this.emitChange();
  }

  nextMonth(): void {
    const parts = this.selectedMonth().split('-');
    let y = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    const newMonth = `${y}-${m.toString().padStart(2, '0')}`;
    this.selectedMonth.set(newMonth);
    this.emitChange();
  }

  onMonthInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      this.selectedMonth.set(input.value);
      this.emitChange();
    }
  }

  formatMonthLabel(monthIso: string): string {
    const [y, m] = monthIso.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // --- Day Controls ---
  prevDay(): void {
    const cur = new Date(this.selectedDate());
    cur.setDate(cur.getDate() - 1);
    this.selectedDate.set(cur.toISOString().substring(0, 10));
    this.emitChange();
  }

  nextDay(): void {
    const cur = new Date(this.selectedDate());
    cur.setDate(cur.getDate() + 1);
    this.selectedDate.set(cur.toISOString().substring(0, 10));
    this.emitChange();
  }

  setToday(): void {
    this.selectedDate.set(new Date().toISOString().substring(0, 10));
    this.emitChange();
  }

  onDateInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      this.selectedDate.set(input.value);
      this.emitChange();
    }
  }

  formatDateLabel(dateIso: string): string {
    const todayIso = new Date().toISOString().substring(0, 10);
    const d = new Date(dateIso + 'T00:00:00');
    const formatted = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    return dateIso === todayIso ? `Today (${formatted})` : formatted;
  }

  // --- Custom Controls ---
  applyCustom(): void {
    this.emitChange();
  }

  // --- Event Emitter ---
  private emitChange(): void {
    const mode = this.activeMode();
    const payload: PeriodFilterParams = {
      periodType: mode
    };

    switch (mode) {
      case 'all':
        // Lifetime
        break;
      case 'year':
        payload.year = this.selectedYear();
        break;
      case 'month':
        payload.month = this.selectedMonth();
        break;
      case 'day':
        payload.date = this.selectedDate();
        break;
      case 'custom':
        payload.startDate = this.customStartDate();
        payload.endDate = this.customEndDate();
        break;
    }

    this.filterChange.emit(payload);
  }
}

