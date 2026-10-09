import { Component } from '@angular/core';

@Component({
  selector: 'app-epfo',
  standalone: true,
  template: `<div class="feature-page"><h2>EPFO (Provident Fund)</h2><p>Module 5: Monthly PF breakdown, interest, withdrawals, cumulative balance.</p></div>`,
  styles: [`.feature-page { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 1.5rem; }`]
})
export class EpfoComponent {}

