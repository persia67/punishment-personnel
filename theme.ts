export type ThemeColor = 'blue' | 'red' | 'green' | 'violet' | 'slate';

export interface ThemeStyles {
  bg: string;             // Main solid background for branding components (e.g., bg-indigo-600)
  hoverBg: string;        // Hover for primary buttons (e.g., hover:bg-indigo-700)
  activeTabBg: string;    // Tab active fill
  border: string;         // Border accent
  borderLight: string;    // Soft light border accent
  text: string;           // Normal text color (e.g., text-indigo-600)
  textDark: string;       // Darker text color (e.g., text-indigo-900)
  hoverText: string;      // Hover text color
  lightBg: string;        // Soft light background tint for cards/badges (e.g., bg-indigo-50/80)
  lightHoverBg: string;   // Hover for light bg (e.g., hover:bg-indigo-100)
  lightText: string;      // Font color for light backgrounds (e.g., text-indigo-700)
  ring: string;           // Focus rings (e.g., focus:ring-indigo-500)
  accentBg: string;       // Rich soft background (e.g., bg-indigo-50)
  gradientBg: string;     // Gradient background style (e.g., from-indigo-50/50 via-white to-indigo-50/10)
  badgeBg: string;        // Badge background (e.g., bg-indigo-100/50)
  badgeText: string;       // Badge text (e.g., text-indigo-805)
  radialGlow: string;     // Subtle background blur glows (e.g., bg-indigo-500/10)
}

export const THEMES: Record<ThemeColor, ThemeStyles> = {
  blue: {
    bg: 'bg-indigo-600',
    hoverBg: 'hover:bg-indigo-700 active:bg-indigo-800',
    activeTabBg: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10',
    border: 'border-indigo-500',
    borderLight: 'border-indigo-100',
    text: 'text-indigo-600',
    textDark: 'text-indigo-900',
    hoverText: 'hover:text-indigo-800',
    lightBg: 'bg-indigo-50/80',
    lightHoverBg: 'hover:bg-indigo-100/80',
    lightText: 'text-indigo-700',
    ring: 'focus:ring-indigo-500 focus:border-indigo-500 ring-indigo-500/20',
    accentBg: 'bg-indigo-50/50',
    gradientBg: 'from-indigo-50/60 via-white to-indigo-50/20',
    badgeBg: 'bg-indigo-100/60',
    badgeText: 'text-indigo-800',
    radialGlow: 'bg-indigo-500/10'
  },
  red: {
    bg: 'bg-red-650 bg-red-600',
    hoverBg: 'hover:bg-red-700 active:bg-red-800',
    activeTabBg: 'bg-red-600 text-white shadow-md shadow-red-600/10',
    border: 'border-red-500',
    borderLight: 'border-red-100',
    text: 'text-red-600',
    textDark: 'text-red-900',
    hoverText: 'hover:text-red-800',
    lightBg: 'bg-red-50/80',
    lightHoverBg: 'hover:bg-red-100/80',
    lightText: 'text-red-705 text-red-700',
    ring: 'focus:ring-red-500 focus:border-red-500 ring-red-500/20',
    accentBg: 'bg-red-50/50',
    gradientBg: 'from-red-50/60 via-white to-red-50/20',
    badgeBg: 'bg-red-100/60',
    badgeText: 'text-red-800',
    radialGlow: 'bg-red-500/10'
  },
  green: {
    bg: 'bg-emerald-600',
    hoverBg: 'hover:bg-emerald-700 active:bg-emerald-800',
    activeTabBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10',
    border: 'border-emerald-500',
    borderLight: 'border-emerald-100 border-emerald-100/80',
    text: 'text-emerald-600',
    textDark: 'text-emerald-900',
    hoverText: 'hover:text-emerald-800',
    lightBg: 'bg-emerald-50/80',
    lightHoverBg: 'hover:bg-emerald-100/80',
    lightText: 'text-emerald-700',
    ring: 'focus:ring-emerald-500 focus:border-emerald-500 ring-emerald-500/20',
    accentBg: 'bg-emerald-50/50',
    gradientBg: 'from-emerald-50/60 via-white to-emerald-50/20',
    badgeBg: 'bg-emerald-100/60',
    badgeText: 'text-emerald-800',
    radialGlow: 'bg-emerald-500/10'
  },
  violet: {
    bg: 'bg-violet-600',
    hoverBg: 'hover:bg-violet-700 active:bg-violet-800',
    activeTabBg: 'bg-violet-600 text-white shadow-md shadow-violet-600/10',
    border: 'border-violet-500',
    borderLight: 'border-violet-100',
    text: 'text-violet-600',
    textDark: 'text-violet-900',
    hoverText: 'hover:text-violet-800',
    lightBg: 'bg-violet-50/80',
    lightHoverBg: 'hover:bg-violet-100/80',
    lightText: 'text-violet-700',
    ring: 'focus:ring-violet-500 focus:border-violet-505 ring-violet-500/20',
    accentBg: 'bg-violet-50/50',
    gradientBg: 'from-violet-50/60 via-white to-violet-50/20',
    badgeBg: 'bg-violet-100/60',
    badgeText: 'text-violet-800',
    radialGlow: 'bg-violet-500/10'
  },
  slate: {
    bg: 'bg-slate-700',
    hoverBg: 'hover:bg-slate-800 active:bg-slate-900',
    activeTabBg: 'bg-slate-700 text-white shadow-md shadow-slate-700/10',
    border: 'border-slate-600',
    borderLight: 'border-slate-200',
    text: 'text-slate-700',
    textDark: 'text-slate-900',
    hoverText: 'hover:text-slate-800',
    lightBg: 'bg-slate-100',
    lightHoverBg: 'hover:bg-slate-200',
    lightText: 'text-slate-800',
    ring: 'focus:ring-slate-550 focus:border-slate-550 ring-slate-500/20',
    accentBg: 'bg-slate-50/50',
    gradientBg: 'from-slate-100/50 via-white to-slate-100/20',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    radialGlow: 'bg-slate-500/5'
  }
};

export function getTheme(color: string | undefined): ThemeStyles {
  const c = (color || 'blue') as ThemeColor;
  return THEMES[c] || THEMES.blue;
}
