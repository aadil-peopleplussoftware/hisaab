import { Component } from '@angular/core';

@Component({
  selector: 'app-reports',
  standalone: true,
  template: `<div class="feature-page"><h2>Reports, Print & PDF</h2><p>Module 8: Monthly / yearly statements, QuestPDF exports, ClosedXML Excel downloads.</p></div>`,
  styles: [`.feature-page { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 1.5rem; }`]
})
export class ReportsComponent {}

