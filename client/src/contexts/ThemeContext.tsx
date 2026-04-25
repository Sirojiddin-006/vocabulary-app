import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark";

export type ThemePaletteId =
  | "day-ocean"
  | "day-forest"
  | "day-sand"
  | "day-rose"
  | "day-slate"
  | "night-aurora"
  | "night-midnight"
  | "night-graphite";

export type ThemePalette = {
  id: ThemePaletteId;
  mode: ThemeMode;
  name: string;
  description: string;
  preview: [string, string, string];
};

const LIGHT_PALETTES: ThemePalette[] = [
  {
    id: "day-ocean",
    mode: "light",
    name: "Ocean Mist",
    description: "Cool blue and aqua",
    preview: ["#0EA5FF", "#7DD3FC", "#DFF5FF"],
  },
  {
    id: "day-forest",
    mode: "light",
    name: "Forest Mint",
    description: "Green and clean",
    preview: ["#10B981", "#34D399", "#DCFCE7"],
  },
  {
    id: "day-sand",
    mode: "light",
    name: "Sand Dune",
    description: "Warm beige and amber",
    preview: ["#D97706", "#F59E0B", "#FEF3C7"],
  },
  {
    id: "day-rose",
    mode: "light",
    name: "Rose Blush",
    description: "Soft pink accents",
    preview: ["#E11D48", "#FB7185", "#FFE4E6"],
  },
  {
    id: "day-slate",
    mode: "light",
    name: "Slate Sky",
    description: "Neutral blue-gray",
    preview: ["#475569", "#64748B", "#E2E8F0"],
  },
];

const DARK_PALETTES: ThemePalette[] = [
  {
    id: "night-aurora",
    mode: "dark",
    name: "Aurora",
    description: "Teal neon on deep navy",
    preview: ["#06B6D4", "#22D3EE", "#0B1120"],
  },
  {
    id: "night-midnight",
    mode: "dark",
    name: "Midnight Blue",
    description: "Blue and indigo",
    preview: ["#3B82F6", "#6366F1", "#0B1020"],
  },
  {
    id: "night-graphite",
    mode: "dark",
    name: "Graphite",
    description: "Muted mono contrast",
    preview: ["#94A3B8", "#CBD5E1", "#0F1115"],
  },
];

const PALETTE_MAP: Record<ThemePaletteId, ThemePalette> = [
  ...LIGHT_PALETTES,
  ...DARK_PALETTES,
].reduce((acc, palette) => {
  acc[palette.id] = palette;
  return acc;
}, {} as Record<ThemePaletteId, ThemePalette>);

const DEFAULT_LIGHT_PALETTE: ThemePaletteId = "day-ocean";
const DEFAULT_DARK_PALETTE: ThemePaletteId = "night-aurora";

const STORAGE_THEME_MODE_KEY = "theme";
const STORAGE_LIGHT_PALETTE_KEY = "theme-palette-light";
const STORAGE_DARK_PALETTE_KEY = "theme-palette-dark";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme?: (theme: ThemeMode) => void;
  toggleTheme?: () => void;
  switchable: boolean;
  palette: ThemePaletteId;
  setPalette?: (palette: ThemePaletteId) => void;
  lightPalettes: ThemePalette[];
  darkPalettes: ThemePalette[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  switchable?: boolean;
}

function isValidTheme(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

function isValidPalette(value: string | null): value is ThemePaletteId {
  return Boolean(value && PALETTE_MAP[value as ThemePaletteId]);
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (!switchable) return defaultTheme;
    const stored = localStorage.getItem(STORAGE_THEME_MODE_KEY);
    return isValidTheme(stored) ? stored : defaultTheme;
  });

  const [paletteByMode, setPaletteByMode] = useState<Record<ThemeMode, ThemePaletteId>>(() => {
    const storedLight = localStorage.getItem(STORAGE_LIGHT_PALETTE_KEY);
    const storedDark = localStorage.getItem(STORAGE_DARK_PALETTE_KEY);

    const lightPalette =
      isValidPalette(storedLight) && PALETTE_MAP[storedLight].mode === "light"
        ? storedLight
        : DEFAULT_LIGHT_PALETTE;

    const darkPalette =
      isValidPalette(storedDark) && PALETTE_MAP[storedDark].mode === "dark"
        ? storedDark
        : DEFAULT_DARK_PALETTE;

    return {
      light: lightPalette,
      dark: darkPalette,
    };
  });

  const activePalette = paletteByMode[theme];

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.themeMode = theme;
    root.dataset.themePalette = activePalette;

    if (switchable) {
      localStorage.setItem(STORAGE_THEME_MODE_KEY, theme);
      localStorage.setItem(STORAGE_LIGHT_PALETTE_KEY, paletteByMode.light);
      localStorage.setItem(STORAGE_DARK_PALETTE_KEY, paletteByMode.dark);
    }
  }, [theme, activePalette, paletteByMode, switchable]);

  const toggleTheme = switchable
    ? () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
      }
    : undefined;

  const handleSetTheme = switchable
    ? (nextTheme: ThemeMode) => {
        setTheme(nextTheme);
      }
    : undefined;

  const handleSetPalette = switchable
    ? (paletteId: ThemePaletteId) => {
        const palette = PALETTE_MAP[paletteId];
        setPaletteByMode(prev => ({
          ...prev,
          [palette.mode]: palette.id,
        }));
        setTheme(palette.mode);
      }
    : undefined;

  const value = useMemo(
    () => ({
      theme,
      setTheme: handleSetTheme,
      toggleTheme,
      switchable,
      palette: activePalette,
      setPalette: handleSetPalette,
      lightPalettes: LIGHT_PALETTES,
      darkPalettes: DARK_PALETTES,
    }),
    [theme, handleSetTheme, toggleTheme, switchable, activePalette, handleSetPalette]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
