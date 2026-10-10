import { Injectable, signal, computed, effect } from '@angular/core';

export type ThemeName = 'github-light' | 'github-dark' | 'nord' | 'midnight-emerald' | 'sepia-paper';
export type IconStyle = 'minimal-svg' | 'emoji' | 'duotone' | 'classic-badge';
export type SidebarPosition = 'left' | 'right' | 'top' | 'collapsed';
export type DensityMode = 'comfortable' | 'compact';

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
  sampleIcon: string;
}

export interface SidebarOption {
  id: SidebarPosition;
  name: string;
  description: string;
  icon: string;
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

  // Icon style state
  readonly iconStyle = signal<IconStyle>('minimal-svg');

  // Sidebar position state
  readonly sidebarPosition = signal<SidebarPosition>('left');

  // Data density state
  readonly density = signal<DensityMode>('comfortable');

  // Privacy Eye mode state
  readonly privacyMode = signal<boolean>(false);

  // Command Palette open state
  readonly isCommandPaletteOpen = signal<boolean>(false);

  // Quick Customizer Drawer state
  readonly isCustomizerOpen = signal<boolean>(false);

  readonly availableThemes: ThemeDefinition[] = [
    {
      id: 'github-light',
      name: 'GitHub Primer Light',
      category: 'light',
      description: 'Clean crisp canvas with GitHub green accents and subtle borders',
      previewColors: ['#ffffff', '#f6f8fa', '#1f883d', '#0969da']
    },
    {
      id: 'github-dark',
      name: 'GitHub Primer Dark',
      category: 'dark',
      description: 'GitHub dim/dark slate with high-contrast text and green accents',
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
      description: 'Comfortable, paper-warm parchment reducing eye fatigue',
      previewColors: ['#f4eee1', '#fdfaf3', '#b85d19', '#2d2b28']
    }
  ];

  readonly availableIconStyles: IconStyleOption[] = [
    {
      id: 'minimal-svg',
      name: 'Minimal Primer SVG',
      description: 'Clean vector outline strokes (GitHub default)',
      sampleIcon: '◇'
    },
    {
      id: 'emoji',
      name: 'Vibrant Financial Emoji',
      description: 'Expressive, colorful visual indicators',
      sampleIcon: '📊'
    },
    {
      id: 'duotone',
      name: 'Modern Duotone',
      description: 'Two-tone layered glyphs with visual depth',
      sampleIcon: '◈'
    },
    {
      id: 'classic-badge',
      name: 'Monospace Badges',
      description: 'Terminal-grade 3-letter developer tags',
      sampleIcon: '[DSH]'
    }
  ];

  readonly availableSidebarPositions: SidebarOption[] = [
    {
      id: 'left',
      name: 'Left Sidebar',
      description: 'Standard desktop sidebar on the left',
      icon: '◀'
    },
    {
      id: 'right',
      name: 'Right Sidebar',
      description: 'Right-aligned navigation bar',
      icon: '▶'
    },
    {
      id: 'top',
      name: 'Top Navigation',
      description: 'GitHub-style horizontal header bar',
      icon: '▲'
    },
    {
      id: 'collapsed',
      name: 'Compact Mini-Bar',
      description: 'Slim icon-only bar for maximal screen room',
      icon: '▪'
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
    if (savedIcon) this.iconStyle.set(savedIcon);

    const savedSidebar = localStorage.getItem('hisaab_sidebar_pos') as SidebarPosition | null;
    if (savedSidebar) this.sidebarPosition.set(savedSidebar);

    const savedDensity = localStorage.getItem('hisaab_density') as DensityMode | null;
    if (savedDensity) this.density.set(savedDensity);

    const savedPrivacy = localStorage.getItem('hisaab_privacy');
    if (savedPrivacy === 'true') this.privacyMode.set(true);
  }

  setTheme(theme: ThemeName): void {
    this.currentTheme.set(theme);
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
  }

  setSidebarPosition(pos: SidebarPosition): void {
    this.sidebarPosition.set(pos);
  }

  toggleDensity(): void {
    this.density.update(d => (d === 'comfortable' ? 'compact' : 'comfortable'));
  }

  togglePrivacy(): void {
    this.privacyMode.update(p => !p);
  }

  toggleCommandPalette(): void {
    this.isCommandPaletteOpen.update(o => !o);
  }

  closeCommandPalette(): void {
    this.isCommandPaletteOpen.set(false);
  }

  toggleCustomizer(): void {
    this.isCustomizerOpen.update(o => !o);
  }

  closeCustomizer(): void {
    this.isCustomizerOpen.set(false);
  }
}
