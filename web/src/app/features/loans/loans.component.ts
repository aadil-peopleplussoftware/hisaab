import { Component } from '@angular/core';

@Component({
  selector: 'app-loans',
  standalone: true,
  template: `<div class="feature-page"><h2>Loans (Given / Taken)</h2><p>Module 4: Counterparty ledger, interest calculations, running balance.</p></div>`,
  styles: [`.feature-page { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 1.5rem; }`]
})
export class LoansComponent {}

