import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { hexToHsl } from "../theme";

export type DynamicPreset = "deep-vibrant" | "muted-pastel" | "monochromatic" | "high-contrast-dark";

export interface WallpaperPalette {
  primary_accent: string;
  secondary_accent: string;
  dominant_background: string;
  surfaces: string;
  high_contrast_text: string;
  wallpaper_path?: string | null;
}

export interface DynamicThemeConfig {
  syncWithWallpaper: boolean;
  preset: DynamicPreset;
  hueShift: number; // -180 to 180 degrees
  saturationMultiplier: number; // 0.0 to 2.0 (1.0 = normal)
  lightnessOffset: number; // -0.5 to 0.5 (0.0 = normal)
}

export interface DynamicColors {
  primaryAccent: string;
  secondaryAccent: string;
  dominantBackground: string;
  surfaces: string;
  highContrastText: string;
  textMuted: string;
  border: string;
  shadow: string;
}

export interface DynamicThemeContextType {
  config: DynamicThemeConfig;
  rawPalette: WallpaperPalette;
  computedColors: DynamicColors;
  isLoading: boolean;
  setSyncWithWallpaper: (sync: boolean) => void;
  setPreset: (preset: DynamicPreset) => void;
  setHueShift: (hue: number) => void;
  setSaturationMultiplier: (sat: number) => void;
  setLightnessOffset: (lightness: number) => void;
  resetAdjustments: () => void;
  refreshPalette: () => Promise<void>;
  cycleWallpaperMock?: () => Promise<void>;
}

const DEFAULT_PALETTE: WallpaperPalette = {
  primary_accent: "#007AFF",
  secondary_accent: "#5856D6",
  dominant_background: "#0F172A",
  surfaces: "#1E293B",
  high_contrast_text: "#F8FAFC",
  wallpaper_path: null,
};

// Helper: HSL to Hex
function hslToHex(h: number, s: number, l: number): string {
  // Normalize
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (val: number) => {
    const hexVal = Math.round((val + m) * 255).toString(16);
    return hexVal.length === 1 ? "0" + hexVal : hexVal;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert Hex to RGBA string
function hexToRgba(hex: string, alpha: number): string {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
}

// Transform a base hex with preset + linear sliders
function transformColor(
  baseHex: string,
  role: "primary" | "secondary" | "bg" | "surface" | "text",
  preset: DynamicPreset,
  hueShift: number,
  satMultiplier: number,
  lightnessOffset: number,
  anchorHue: number
): string {
  if (role === "text") {
    // Preserve high contrast legibility
    const hsl = hexToHsl(baseHex);
    // Apply slight lightness offset if needed
    const finalL = Math.max(10, Math.min(98, hsl.l + lightnessOffset * 50));
    return hslToHex(hsl.h, hsl.s, finalL);
  }

  const hsl = hexToHsl(baseHex);
  let h = hsl.h;
  let s = hsl.s;
  let l = hsl.l;

  // 1. Preset rules
  switch (preset) {
    case "deep-vibrant":
      if (role === "primary" || role === "secondary") {
        s = Math.min(100, s * 1.35 + 15);
        l = Math.max(45, Math.min(65, l));
      } else if (role === "bg") {
        s = Math.min(60, s * 0.9);
        l = Math.max(4, Math.min(12, l * 0.6));
      } else if (role === "surface") {
        s = Math.min(65, s * 0.95);
        l = Math.max(10, Math.min(20, l * 0.8 + 4));
      }
      break;

    case "muted-pastel":
      if (role === "primary" || role === "secondary") {
        s = Math.max(25, Math.min(60, s * 0.6));
        l = Math.max(60, Math.min(80, l * 1.1 + 10));
      } else if (role === "bg") {
        s = Math.max(8, Math.min(25, s * 0.4));
        l = Math.max(12, Math.min(22, l * 0.9 + 5));
      } else if (role === "surface") {
        s = Math.max(10, Math.min(30, s * 0.45));
        l = Math.max(18, Math.min(28, l * 0.95 + 8));
      }
      break;

    case "monochromatic":
      // Lock hue to dominant anchor hue
      h = anchorHue;
      if (role === "primary") {
        s = Math.min(50, s * 0.5);
        l = 65;
      } else if (role === "secondary") {
        s = Math.min(40, s * 0.4);
        l = 48;
      } else if (role === "bg") {
        s = Math.min(20, s * 0.25);
        l = 8;
      } else if (role === "surface") {
        s = Math.min(25, s * 0.3);
        l = 16;
      }
      break;

    case "high-contrast-dark":
      if (role === "primary") {
        s = 100;
        l = 56; // punchy electric neon
      } else if (role === "secondary") {
        s = 95;
        l = 62;
      } else if (role === "bg") {
        s = Math.min(20, s * 0.2);
        l = 4; // near pitch black
      } else if (role === "surface") {
        s = Math.min(25, s * 0.3);
        l = 12;
      }
      break;
  }

  // 2. User Linear Overrides
  h = (h + hueShift + 360) % 360;
  s = Math.max(0, Math.min(100, s * satMultiplier));
  l = Math.max(2, Math.min(98, l + lightnessOffset * 50));

  return hslToHex(h, s, l);
}

const DynamicThemeContext = createContext<DynamicThemeContextType | null>(null);

export function DynamicThemeProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<DynamicThemeConfig>(() => {
    return {
      syncWithWallpaper: localStorage.getItem("nectar-dynamic-sync") === "true",
      preset: (localStorage.getItem("nectar-dynamic-preset") as DynamicPreset) || "deep-vibrant",
      hueShift: parseFloat(localStorage.getItem("nectar-dynamic-hue-shift") || "0"),
      saturationMultiplier: parseFloat(localStorage.getItem("nectar-dynamic-saturation") || "1.0"),
      lightnessOffset: parseFloat(localStorage.getItem("nectar-dynamic-lightness") || "0.0"),
    };
  });

  const [rawPalette, setRawPalette] = useState<WallpaperPalette>(() => {
    const cached = localStorage.getItem("nectar-cached-wallpaper-palette");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
    return DEFAULT_PALETTE;
  });

  const [isLoading, setIsLoading] = useState(false);
  const lastInjectedStyles = useRef<string>("");

  // Fetch palette from Tauri backend
  const refreshPalette = useCallback(async () => {
    setIsLoading(true);
    try {
      const palette = await invoke<WallpaperPalette>("fetch_wallpaper_palette");
      if (palette && palette.primary_accent) {
        setRawPalette(palette);
        localStorage.setItem("nectar-cached-wallpaper-palette", JSON.stringify(palette));
      }
    } catch (err) {
      console.warn("[DynamicTheme] Failed to fetch wallpaper palette, using fallback:", err);
      setRawPalette(DEFAULT_PALETTE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    refreshPalette();

    // Listen for wallpaper palette updates
    const unlistenPalette = listen<WallpaperPalette>("wallpaper-palette-updated", (event) => {
      if (event.payload) {
        setRawPalette(event.payload);
        localStorage.setItem("nectar-cached-wallpaper-palette", JSON.stringify(event.payload));
      }
    });

    // Listen for settings changed from other windows
    const unlistenSettings = listen<{ key: string; value: any }>("settings-changed", (event) => {
      const { key, value } = event.payload;
      if (key === "nectar-dynamic-sync") {
        setConfig((c) => ({ ...c, syncWithWallpaper: value === true || value === "true" }));
      } else if (key === "nectar-dynamic-preset" && value) {
        setConfig((c) => ({ ...c, preset: value as DynamicPreset }));
      } else if (key === "nectar-dynamic-hue-shift" && value !== null) {
        setConfig((c) => ({ ...c, hueShift: parseFloat(value) }));
      } else if (key === "nectar-dynamic-saturation" && value !== null) {
        setConfig((c) => ({ ...c, saturationMultiplier: parseFloat(value) }));
      } else if (key === "nectar-dynamic-lightness" && value !== null) {
        setConfig((c) => ({ ...c, lightnessOffset: parseFloat(value) }));
      }
    });

    return () => {
      unlistenPalette.then((fn) => fn());
      unlistenSettings.then((fn) => fn());
    };
  }, [refreshPalette]);

  // Compute final palette
  const computedColors = useMemo<DynamicColors>(() => {
    const anchor = hexToHsl(rawPalette.dominant_background).h;

    const primaryAccent = transformColor(
      rawPalette.primary_accent,
      "primary",
      config.preset,
      config.hueShift,
      config.saturationMultiplier,
      config.lightnessOffset,
      anchor
    );

    const secondaryAccent = transformColor(
      rawPalette.secondary_accent,
      "secondary",
      config.preset,
      config.hueShift,
      config.saturationMultiplier,
      config.lightnessOffset,
      anchor
    );

    const dominantBackground = transformColor(
      rawPalette.dominant_background,
      "bg",
      config.preset,
      config.hueShift,
      config.saturationMultiplier,
      config.lightnessOffset,
      anchor
    );

    const surfaces = transformColor(
      rawPalette.surfaces,
      "surface",
      config.preset,
      config.hueShift,
      config.saturationMultiplier,
      config.lightnessOffset,
      anchor
    );

    const highContrastText = transformColor(
      rawPalette.high_contrast_text,
      "text",
      config.preset,
      config.hueShift,
      config.saturationMultiplier,
      config.lightnessOffset,
      anchor
    );

    const textMuted = hexToRgba(highContrastText, 0.68);
    const border = hexToRgba(primaryAccent, 0.22);
    const shadow = hexToRgba(dominantBackground, 0.65);

    return {
      primaryAccent,
      secondaryAccent,
      dominantBackground,
      surfaces,
      highContrastText,
      textMuted,
      border,
      shadow,
    };
  }, [rawPalette, config]);

  // Conditionally inject CSS Custom Properties on root element
  useEffect(() => {
    const root = document.documentElement;
    const opacityStr = localStorage.getItem("nectar-theme-opacity");
    const currentOpacity = opacityStr !== null ? parseFloat(opacityStr) : 0.8;
    const currentOpacityExpanded = Math.min(1.0, currentOpacity + 0.12);

    const signature = JSON.stringify({
      sync: config.syncWithWallpaper,
      colors: computedColors,
      opacity: currentOpacity,
    });

    if (signature === lastInjectedStyles.current) {
      return; // Prevent duplicate DOM style thrashing
    }
    lastInjectedStyles.current = signature;

    const frameId = requestAnimationFrame(() => {
      // 1. Always inject dynamic theme tokens (for Tailwind and custom components)
      root.style.setProperty("--nectar-dynamic-primary", computedColors.primaryAccent);
      root.style.setProperty("--nectar-dynamic-secondary", computedColors.secondaryAccent);
      root.style.setProperty("--nectar-dynamic-bg", computedColors.dominantBackground);
      root.style.setProperty("--nectar-dynamic-surface", computedColors.surfaces);
      root.style.setProperty("--nectar-dynamic-text", computedColors.highContrastText);
      root.style.setProperty("--nectar-dynamic-text-muted", computedColors.textMuted);
      root.style.setProperty("--nectar-dynamic-border", computedColors.border);
      root.style.setProperty("--nectar-dynamic-shadow", computedColors.shadow);

      // 2. If syncWithWallpaper is enabled, override Nectar's active theme custom properties
      if (config.syncWithWallpaper) {
        root.style.setProperty("--nectar-bg", hexToRgba(computedColors.dominantBackground, currentOpacity));
        root.style.setProperty("--nectar-bg-expanded", hexToRgba(computedColors.surfaces, currentOpacityExpanded));
        root.style.setProperty("--nectar-text", computedColors.highContrastText);
        root.style.setProperty("--nectar-text-muted", computedColors.textMuted);
        root.style.setProperty("--nectar-border", computedColors.border);
        root.style.setProperty("--nectar-group-bg", hexToRgba(computedColors.surfaces, 0.35));
        root.style.setProperty("--nectar-accent", computedColors.primaryAccent);
        root.style.setProperty("--nectar-scrollbar-thumb", hexToRgba(computedColors.primaryAccent, 0.35));

        root.classList.add("theme-dynamic-wallpaper");
      } else {
        root.classList.remove("theme-dynamic-wallpaper");
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [config.syncWithWallpaper, computedColors]);

  // Actions
  const setSyncWithWallpaper = useCallback((sync: boolean) => {
    setConfig((prev) => ({ ...prev, syncWithWallpaper: sync }));
    localStorage.setItem("nectar-dynamic-sync", String(sync));
    invoke("save_setting", { key: "nectar-dynamic-sync", value: String(sync) }).catch(() => {});
  }, []);

  const setPreset = useCallback((preset: DynamicPreset) => {
    setConfig((prev) => ({ ...prev, preset }));
    localStorage.setItem("nectar-dynamic-preset", preset);
    invoke("save_setting", { key: "nectar-dynamic-preset", value: preset }).catch(() => {});
  }, []);

  const setHueShift = useCallback((hueShift: number) => {
    setConfig((prev) => ({ ...prev, hueShift }));
    localStorage.setItem("nectar-dynamic-hue-shift", String(hueShift));
    invoke("save_setting", { key: "nectar-dynamic-hue-shift", value: String(hueShift) }).catch(() => {});
  }, []);

  const setSaturationMultiplier = useCallback((sat: number) => {
    setConfig((prev) => ({ ...prev, saturationMultiplier: sat }));
    localStorage.setItem("nectar-dynamic-saturation", String(sat));
    invoke("save_setting", { key: "nectar-dynamic-saturation", value: String(sat) }).catch(() => {});
  }, []);

  const setLightnessOffset = useCallback((lightness: number) => {
    setConfig((prev) => ({ ...prev, lightnessOffset: lightness }));
    localStorage.setItem("nectar-dynamic-lightness", String(lightness));
    invoke("save_setting", { key: "nectar-dynamic-lightness", value: String(lightness) }).catch(() => {});
  }, []);

  const resetAdjustments = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      hueShift: 0,
      saturationMultiplier: 1.0,
      lightnessOffset: 0.0,
    }));
    localStorage.setItem("nectar-dynamic-hue-shift", "0");
    localStorage.setItem("nectar-dynamic-saturation", "1.0");
    localStorage.setItem("nectar-dynamic-lightness", "0.0");
    invoke("save_setting", { key: "nectar-dynamic-hue-shift", value: "0" }).catch(() => {});
    invoke("save_setting", { key: "nectar-dynamic-saturation", value: "1.0" }).catch(() => {});
    invoke("save_setting", { key: "nectar-dynamic-lightness", value: "0.0" }).catch(() => {});
  }, []);

  const cycleWallpaperMock = useCallback(async () => {
    try {
      const palette = await invoke<WallpaperPalette>("cycle_mock_wallpaper");
      if (palette) {
        setRawPalette(palette);
      }
    } catch {}
  }, []);

  return (
    <DynamicThemeContext.Provider
      value={{
        config,
        rawPalette,
        computedColors,
        isLoading,
        setSyncWithWallpaper,
        setPreset,
        setHueShift,
        setSaturationMultiplier,
        setLightnessOffset,
        resetAdjustments,
        refreshPalette,
        cycleWallpaperMock,
      }}
    >
      {children}
    </DynamicThemeContext.Provider>
  );
}

export function useDynamicTheme() {
  const context = useContext(DynamicThemeContext);
  if (!context) {
    throw new Error("useDynamicTheme must be used within a DynamicThemeProvider");
  }
  return context;
}
