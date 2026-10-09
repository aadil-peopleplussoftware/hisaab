import { Component } from '@angular/core';

@Component({
  selector: 'app-investments',
  standalone: true,
  template: `<div class="feature-page"><h2>Investments & Holdings</h2><p>Module 6: Stocks, Mutual Funds, FD, PPF, NPS, Gold portfolio tracker.</p></div>`,
  styles: [`.feature-page { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 1.5rem; }`]
})
export class InvestmentsComponent {}

