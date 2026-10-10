import { Injectable, signal, computed, effect } from '@angular/core';

export type ThemeName = 'github-light' | 'github-dark' | 'nord' | 'midnight-emerald' | 'sepia-paper';
export type IconStyle = 'linear' | 'filled' | 'duotone' | 'monoline';
export type SidebarPosition = 'left' | 'right' | 'top' | 'collapsed';
export type DensityMode = 'comfortable' | 'compact';
export type DisplayCurrency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

export interface ThemeDefinition {
  id: ThemeName;
  name: string;
  category: 'light' | 'dark';
  description: string;
  previewColors: string[];
}

export interface IconStyleOption {
  id: IconStyle;
  name: string;
  description: string;
  badge: string;
}

export interface SidebarOption {
  id: SidebarPosition;
  name: string;
  description: string;
  badge: string;
}

export interface CurrencyOption {
  code: DisplayCurrency;
  symbol: string;
  name: string;
  rateToInr: number; // e.g. 1 INR = 0.0116 USD
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // Theme state
  readonly currentTheme = signal<ThemeName>('github-light');

  // Backwards-compatible isDarkMode computed signal
  readonly isDarkMode = computed(() => {
    const t = this.currentTheme();
    return t === 'github-dark' || t === 'nord' || t === 'midnight-emerald';
  });

  // Professional SVG Icon style state (Linear, Filled, Duotone, Monoline)
  readonly iconStyle = signal<IconStyle>('linear');

  // Sidebar position state
  readonly sidebarPosition = signal<SidebarPosition>('left');

  // Data density state
  readonly density = signal<DensityMode>('comfortable');

  // Privacy Eye mode state (Mask amounts in public)
  readonly privacyMode = signal<boolean>(false);

  // Sound effects / haptic feedback
  readonly soundEffects = signal<boolean>(false);

  // Multi-currency display preference
  readonly displayCurrency = signal<DisplayCurrency>('INR');

  // Modal dialog states
  readonly isCommandPaletteOpen = signal<boolean>(false);
  readonly isCustomizerOpen = signal<boolean>(false);
  readonly isShortcutsOpen = signal<boolean>(false);
  readonly isQuickAddOpen = signal<boolean>(false);

  // Audio Context (Lazy initialized on first user interaction)
  private audioCtx: AudioContext | null = null;

  readonly availableCurrencies: CurrencyOption[] = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee (Base)', rateToInr: 1.0 },
    { code: 'USD', symbol: '$', name: 'US Dollar', rateToInr: 0.0116 },
    { code: 'EUR', symbol: '€', name: 'Euro', rateToInr: 0.0108 },
    { code: 'GBP', symbol: '£', name: 'British Pound', rateToInr: 0.0092 },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rateToInr: 0.0425 }
  ];

  readonly availableThemes: ThemeDefinition[] = [
    {
      id: 'github-light',
      name: 'GitHub Primer Light',
      category: 'light',
      description: 'Clean high-contrast canvas with GitHub green accents and crisp 1px borders',
      previewColors: ['#ffffff', '#f6f8fa', '#1f883d', '#0969da']
    },
    {
      id: 'github-dark',
      name: 'GitHub Primer Dark',
      category: 'dark',
      description: 'GitHub dim/dark slate with high-contrast typography and subtle borders',
      previewColors: ['#0d1117', '#161b22', '#238636', '#4493f8']
    },
    {
      id: 'nord',
      name: 'Nordic Arctic Frost',
      category: 'dark',
      description: 'World-renowned polar night palette with icy cyan and frost accents',
      previewColors: ['#242933', '#2e3440', '#88c0d0', '#eceff4']
    },
    {
      id: 'midnight-emerald',
      name: 'Midnight Emerald Wealth',
      category: 'dark',
      description: 'Luxury financial terminal with deep obsidian and vibrant emerald',
      previewColors: ['#06090e', '#0b111e', '#10b981', '#38bdf8']
    },
    {
      id: 'sepia-paper',
      name: 'Warm Sepia & Paper',
      category: 'light',
      description: 'Comfortable, paper-warm parchment reducing eye fatigue in long sessions',
      previewColors: ['#f4eee1', '#fdfaf3', '#b85d19', '#2d2b28']
    }
  ];

  readonly availableIconStyles: IconStyleOption[] = [
    {
      id: 'linear',
      name: 'Linear Precision Stroke',
      description: '1.75px crisp modern outline vectors (Linear / Stripe fintech standard)',
      badge: 'OUTLINE'
    },
    {
      id: 'filled',
      name: 'Solid Silhouette',
      description: 'High-contrast solid geometric shapes (GitHub / Vercel style)',
      badge: 'SOLID'
    },
    {
      id: 'duotone',
      name: 'Modern Duotone Depth',
      description: 'Two-tone layered vectors with soft translucent depth accents',
      badge: 'DUOTONE'
    },
    {
      id: 'monoline',
      name: 'Minimal Monoline Hairline',
      description: '1.25px hairline precision strokes for high-density dashboards',
      badge: 'HAIRLINE'
    }
  ];

  readonly availableSidebarPositions: SidebarOption[] = [
    {
      id: 'left',
      name: 'Left Sidebar',
      description: 'Standard desktop sidebar on the left',
      badge: 'LEFT'
    },
    {
      id: 'right',
      name: 'Right Sidebar',
      description: 'Right-aligned navigation bar for multi-monitor setups',
      badge: 'RIGHT'
    },
    {
      id: 'top',
      name: 'Top Navigation',
      description: 'GitHub-style horizontal header bar across the top',
      badge: 'TOP'
    },
    {
      id: 'collapsed',
      name: 'Compact Mini-Bar',
      description: 'Slim 68px icon-only bar for maximal screen room',
      badge: 'SLIM'
    }
  ];

  constructor() {
    this.initFromStorage();

    // Sync all settings with document DOM attributes and localStorage
    effect(() => {
      const theme = this.currentTheme();
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('hisaab_theme', theme);
    });

    effect(() => {
      const icon = this.iconStyle();
      document.documentElement.setAttribute('data-icons', icon);
      localStorage.setItem('hisaab_icon_style', icon);
    });

    effect(() => {
      const pos = this.sidebarPosition();
      document.documentElement.setAttribute('data-sidebar', pos);
      localStorage.setItem('hisaab_sidebar_pos', pos);
    });

    effect(() => {
      const dens = this.density();
      document.documentElement.setAttribute('data-density', dens);
      localStorage.setItem('hisaab_density', dens);
    });

    effect(() => {
      const priv = this.privacyMode();
      document.documentElement.setAttribute('data-privacy', priv ? 'masked' : 'visible');
      localStorage.setItem('hisaab_privacy', priv ? 'true' : 'false');
    });

    effect(() => {
      const curr = this.displayCurrency();
      document.documentElement.setAttribute('data-currency', curr);
      localStorage.setItem('hisaab_currency', curr);
    });

    effect(() => {
      const sfx = this.soundEffects();
      localStorage.setItem('hisaab_sound_effects', sfx ? 'true' : 'false');
    });
  }

  private initFromStorage(): void {
    const savedTheme = localStorage.getItem('hisaab_theme') as ThemeName | null;
    if (savedTheme) {
      if ((savedTheme as string) === 'dark') {
        this.currentTheme.set('github-dark');
      } else if ((savedTheme as string) === 'light') {
        this.currentTheme.set('github-light');
      } else {
        this.currentTheme.set(savedTheme);
      }
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.currentTheme.set(prefersDark ? 'github-dark' : 'github-light');
    }

    const savedIcon = localStorage.getItem('hisaab_icon_style') as IconStyle | null;
    if (savedIcon) {
      // Map legacy values if present
      if ((savedIcon as string) === 'minimal-svg') this.iconStyle.set('linear');
      else if ((savedIcon as string) === 'emoji') this.iconStyle.set('filled');
      else if ((savedIcon as string) === 'classic-badge') this.iconStyle.set('monoline');
      else this.iconStyle.set(savedIcon);
    }

    const savedSidebar = localStorage.getItem('hisaab_sidebar_pos') as SidebarPosition | null;
    if (savedSidebar) this.sidebarPosition.set(savedSidebar);

    const savedDensity = localStorage.getItem('hisaab_density') as DensityMode | null;
    if (savedDensity) this.density.set(savedDensity);

    const savedPrivacy = localStorage.getItem('hisaab_privacy');
    if (savedPrivacy === 'true') this.privacyMode.set(true);

    const savedCurr = localStorage.getItem('hisaab_currency') as DisplayCurrency | null;
    if (savedCurr) this.displayCurrency.set(savedCurr);

    const savedSfx = localStorage.getItem('hisaab_sound_effects');
    if (savedSfx === 'true') this.soundEffects.set(true);
  }

  setTheme(theme: ThemeName): void {
    this.currentTheme.set(theme);
    this.playClickSound();
  }

  toggleTheme(): void {
    if (this.isDarkMode()) {
      this.setTheme('github-light');
    } else {
      this.setTheme('github-dark');
    }
  }

  setIconStyle(style: IconStyle): void {
    this.iconStyle.set(style);
    this.playClickSound();
  }

  setSidebarPosition(pos: SidebarPosition): void {
    this.sidebarPosition.set(pos);
    this.playClickSound();
  }

  toggleDensity(): void {
    this.density.update(d => (d === 'comfortable' ? 'compact' : 'comfortable'));
    this.playClickSound();
  }

  togglePrivacy(): void {
    this.privacyMode.update(p => !p);
    this.playClickSound();
  }

  setDisplayCurrency(curr: DisplayCurrency): void {
    this.displayCurrency.set(curr);
    this.playClickSound();
  }

  convertInr(amountInr: number): { value: number; symbol: string; code: DisplayCurrency } {
    const code = this.displayCurrency();
    const curr = this.availableCurrencies.find(c => c.code === code) || this.availableCurrencies[0];
    const converted = amountInr * curr.rateToInr;
    return { value: converted, symbol: curr.symbol, code };
  }

  toggleSoundEffects(): void {
    this.soundEffects.update(s => !s);
    if (this.soundEffects()) {
      this.playChimeSound();
    }
  }

  toggleCommandPalette(): void {
    this.isCommandPaletteOpen.update(o => !o);
    if (this.isCommandPaletteOpen()) {
      this.isCustomizerOpen.set(false);
      this.isShortcutsOpen.set(false);
      this.isQuickAddOpen.set(false);
    }
  }

  closeCommandPalette(): void {
    this.isCommandPaletteOpen.set(false);
  }

  toggleCustomizer(): void {
    this.isCustomizerOpen.update(o => !o);
    if (this.isCustomizerOpen()) {
      this.isCommandPaletteOpen.set(false);
      this.isShortcutsOpen.set(false);
      this.isQuickAddOpen.set(false);
    }
  }

  closeCustomizer(): void {
    this.isCustomizerOpen.set(false);
  }

  toggleShortcuts(): void {
    this.isShortcutsOpen.update(s => !s);
    if (this.isShortcutsOpen()) {
      this.isCommandPaletteOpen.set(false);
      this.isCustomizerOpen.set(false);
      this.isQuickAddOpen.set(false);
    }
  }

  closeShortcuts(): void {
    this.isShortcutsOpen.set(false);
  }

  openQuickAdd(): void {
    this.isQuickAddOpen.set(true);
    this.isCommandPaletteOpen.set(false);
    this.isCustomizerOpen.set(false);
    this.isShortcutsOpen.set(false);
  }

  closeQuickAdd(): void {
    this.isQuickAddOpen.set(false);
  }

  // --- Tasteful Web Audio Haptic Feedback Synthesizer ---
  playClickSound(): void {
    if (!this.soundEffects()) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.audioCtx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.04);
    } catch {
      // AudioContext unavailable or blocked by browser autoplay policy
    }
  }

  playChimeSound(): void {
    if (!this.soundEffects()) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.5, now + 0.08); // C6

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.3);
    } catch {
      // AudioContext unavailable
    }
  }
}
