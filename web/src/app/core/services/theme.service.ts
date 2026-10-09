import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly isDarkMode = signal<boolean>(false);

  constructor() {
    const saved = localStorage.getItem('hisaab_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved ? saved === 'dark' : prefersDark;
    this.isDarkMode.set(initial);

    effect(() => {
      const dark = this.isDarkMode();
      if (dark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('hisaab_theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('hisaab_theme', 'light');
      }
    });
  }

  toggleTheme(): void {
    this.isDarkMode.update(d => !d);
  }
}

