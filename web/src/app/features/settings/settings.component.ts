import { Component } from '@angular/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: `<div class="feature-page"><h2>Settings & Preferences</h2><p>Module 9: Categories, currency format, theme, data export, account deletion.</p></div>`,
  styles: [`.feature-page { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 1.5rem; }`]
})
export class SettingsComponent {}

