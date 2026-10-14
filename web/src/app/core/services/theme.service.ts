import { Injectable, signal, computed, effect } from '@angular/core';

export type ThemeName =
  | 'google-play-light'
  | 'apple-cupertino'
  | 'linear-slate'
  | 'emerald-mint'
  | 'nord-light'
  | 'github-light'
  | 'sepia-paper'
  | 'github-dark'
  | 'nord'
  | 'midnight-emerald';
export type IconStyle = 'linear' | 'filled' | 'duotone' | 'monoline';
export type SidebarPosition = 'left' | 'right' | 'top' | 'collapsed';
export type DensityMode = 'comfortable' | 'compact';
export type DisplayCurrency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';
export type FontFamily = 'jakarta' | 'inter' | 'system';
export type RadiusPreset = 'sharp' | 'modern' | 'rounded' | 'pill';

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

export interface FontOption {
  id: FontFamily;
  name: string;
  description: string;
  sample: string;
}

export interface RadiusOption {
  id: RadiusPreset;
  name: string;
  description: string;
  samplePx: string;
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

  // Typography and Corner Radius Presets
  readonly fontFamily = signal<FontFamily>('jakarta');
  readonly radiusPreset = signal<RadiusPreset>('modern');

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
      id: 'google-play-light',
      name: 'Google Play Console',
      category: 'light',
      description: 'Material 3 clean white canvas with Google Play blue accents and soft pill navigation',
      previewColors: ['#ffffff', '#f8fafd', '#0b57d0', '#137333']
    },
    {
      id: 'apple-cupertino',
      name: 'Apple Cupertino Clean',
      category: 'light',
      description: 'San Francisco minimal pure white with iOS system surfaces and Cupertino system blue',
      previewColors: ['#ffffff', '#f5f5f7', '#0071e3', '#34c759']
    },
    {
      id: 'linear-slate',
      name: 'Linear Minimalist Slate',
      category: 'light',
      description: 'Modern fintech slate canvas with crisp indigo accents and high-legibility typography',
      previewColors: ['#ffffff', '#f8fafc', '#6366f1', '#10b981']
    },
    {
      id: 'emerald-mint',
      name: 'Emerald Prosperity Mint',
      category: 'light',
      description: 'Refreshing wealth & prosperity palette with vibrant mint tones and emerald accents',
      previewColors: ['#ffffff', '#f0fdf4', '#10b981', '#059669']
    },
    {
      id: 'nord-light',
      name: 'Nordic Polar Snow',
      category: 'light',
      description: 'Clean Arctic polar snow surface with icy glacier cyan and cool steel slate',
      previewColors: ['#ffffff', '#eceff4', '#5e81ac', '#88c0d0']
    },
    {
      id: 'github-light',
      name: 'GitHub Primer Light',
      category: 'light',
      description: 'Clean high-contrast canvas with GitHub green accents and crisp 1px borders',
      previewColors: ['#ffffff', '#f6f8fa', '#1f883d', '#0969da']
    },
    {
      id: 'sepia-paper',
      name: 'Warm Sepia & Paper',
      category: 'light',
      description: 'Comfortable, paper-warm parchment reducing eye fatigue in long sessions',
      previewColors: ['#fdfaf3', '#f4eee1', '#b85d19', '#2d2b28']
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
      previewColors: ['#2e3440', '#242933', '#88c0d0', '#eceff4']
    },
    {
      id: 'midnight-emerald',
      name: 'Midnight Emerald Wealth',
      category: 'dark',
      description: 'Luxury financial terminal with deep obsidian and vibrant emerald',
      previewColors: ['#0b111e', '#06090e', '#10b981', '#38bdf8']
    }
  ];

  readonly availableFonts: FontOption[] = [
    {
      id: 'jakarta',
      name: 'Plus Jakarta Sans',
      description: 'Clean, modern geometric sans-serif built for fintech dashboards',
      sample: '₹1,45,280.00 — Hisaab Financial'
    },
    {
      id: 'inter',
      name: 'Inter Display',
      description: 'World standard computer font designed specifically for user interfaces',
      sample: '₹1,45,280.00 — Hisaab Financial'
    },
    {
      id: 'system',
      name: 'Native System UI',
      description: 'Zero-latency system font stack (San Francisco on macOS, Segoe UI on Windows)',
      sample: '₹1,45,280.00 — Hisaab Financial'
    }
  ];

  readonly availableRadii: RadiusOption[] = [
    {
      id: 'sharp',
      name: 'Sharp Enterprise',
      description: '4px compact corners — financial terminal style',
      samplePx: '4px'
    },
    {
      id: 'modern',
      name: 'Modern Precision',
      description: '8px balanced corners — GitHub & Stripe standard',
      samplePx: '8px'
    },
    {
      id: 'rounded',
      name: 'Smooth Rounded',
      description: '14px soft contours — Linear & Apple design',
      samplePx: '14px'
    },
    {
      id: 'pill',
      name: 'Pill / Bubble',
      description: '22px organic capsules — Material 3 standard',
      samplePx: '22px'
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

    effect(() => {
      const font = this.fontFamily();
      document.documentElement.setAttribute('data-font', font);
      localStorage.setItem('hisaab_font', font);
    });

    effect(() => {
      const rad = this.radiusPreset();
      document.documentElement.setAttribute('data-radius', rad);
      localStorage.setItem('hisaab_radius', rad);
    });

    this.initGlobalSoundListener();
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
      this.currentTheme.set(prefersDark ? 'github-dark' : 'google-play-light');
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

    const savedFont = localStorage.getItem('hisaab_font') as FontFamily | null;
    if (savedFont) this.fontFamily.set(savedFont);

    const savedRadius = localStorage.getItem('hisaab_radius') as RadiusPreset | null;
    if (savedRadius) this.radiusPreset.set(savedRadius);
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

  setFontFamily(font: FontFamily): void {
    this.fontFamily.set(font);
    this.playClickSound();
  }

  setRadiusPreset(rad: RadiusPreset): void {
    this.radiusPreset.set(rad);
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

  setSoundEffects(enabled: boolean): void {
    this.soundEffects.set(enabled);
    if (enabled) {
      this.playChimeSound();
    }
  }

  /**
   * Preview a sound directly in the settings soundboard even if master audio is currently muted,
   * without toggling or altering the user's persistent soundEffects preference.
   */
  previewSound(type: 'click' | 'success' | 'delete' | 'nav'): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(820, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.025);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.025);
      } else if (type === 'success') {
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          const startTime = now + idx * 0.06;
          const endTime = startTime + 0.22;
          gain.gain.setValueAtTime(0.07, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, endTime);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(endTime);
        });
      } else if (type === 'delete') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } else if (type === 'nav') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(620, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.035);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.035);
      }
    } catch {
      // AudioContext unavailable
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
  private lastClickTime = 0;

  /**
   * Global capture-phase click listener that guarantees audio feedback on every
   * screen, page, modal, and control, even if child components call stopPropagation().
   */
  private initGlobalSoundListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener(
      'click',
      (event: MouseEvent) => {
        if (!this.soundEffects()) return;

        const target = event.target as HTMLElement | null;
        if (!target) return;

        // Skip typing click in standard text inputs
        if (
          (target.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'date', 'month'].includes((target as HTMLInputElement).type)) ||
          target.tagName === 'TEXTAREA'
        ) {
          return;
        }

        // Check interactive selector match
        const interactive = target.closest(
          'button, a, select, input[type="checkbox"], input[type="radio"], input[type="button"], input[type="submit"], input[type="date"], input[type="month"], [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="menuitem"], [role="option"], ' +
          '.btn, .btn-primary, .btn-outline, .btn-secondary, .btn-danger, .btn-console-pill, .btn-action, .btn-table-action, .btn-nav, .btn-icon, .btn-today-action, .btn-retry, .btn-analytics-shortcut, ' +
          '.seg-btn, .mode-btn, .module-segment-btn, .pill-btn, .status-btn, .nav-item, .bottom-nav-item, .drawer-link, .tab-item, .tab-btn, .chip, .balance-pill, ' +
          '.setting-switch-card, .toggle-pill, .badge-item, .category-filter-item, .table-row-clickable, .theme-card, .icon-style-card, .sidebar-pos-card, .sidebar-select-card, .currency-select-card, ' +
          '.user-chip, .stepper-box, .stat-card, .command-item, .quick-action-btn, .card-clickable, .dropdown-item, .close-btn, .btn-close, .period-pill'
        );

        if (interactive) {
          this.playClickSound();
          return;
        }

        // Fallback: check if target or immediate parent has cursor pointer
        try {
          const style = window.getComputedStyle(target);
          if (style && style.cursor === 'pointer') {
            this.playClickSound();
            return;
          }
          if (target.parentElement) {
            const parentStyle = window.getComputedStyle(target.parentElement);
            if (parentStyle && parentStyle.cursor === 'pointer') {
              this.playClickSound();
            }
          }
        } catch {
          // ignore computedStyle issues
        }
      },
      { capture: true }
    );
  }

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /** Subtle tactile UI click feedback for buttons, pills, toggles, and controls */
  playClickSound(): void {
    if (!this.soundEffects()) return;

    // Throttle clicks within 30ms to prevent double-firing
    const nowMs = performance.now();
    if (nowMs - this.lastClickTime < 30) return;
    this.lastClickTime = nowMs;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(820, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.025);

      gain.gain.setValueAtTime(0.045, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.025);
    } catch {
      // AudioContext unavailable or blocked by browser policy
    }
  }

  /** Soft smooth transition tap when navigating between screens or routes */
  playNavSound(): void {
    if (!this.soundEffects()) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.035);

      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } catch {
      // AudioContext unavailable
    }
  }

  /** Harmonious ascending chime on successful record creation, import, or update */
  playSuccessSound(): void {
    this.playChimeSound();
  }

  playChimeSound(): void {
    if (!this.soundEffects()) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        const startTime = now + idx * 0.06;
        const endTime = startTime + 0.22;

        gain.gain.setValueAtTime(0.06, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, endTime);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(endTime);
      });
    } catch {
      // AudioContext unavailable
    }
  }

  /** Low-pitch descending feedback when trashing, deleting, or canceling an item */
  playDeleteSound(): void {
    if (!this.soundEffects()) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // AudioContext unavailable
    }
  }
}
