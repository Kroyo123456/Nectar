import {
  Palette,
  Droplet,
  Contrast,
  Droplets,
  Sun,
  Square,
  Maximize2,
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
  RefreshCw,
  Image,
} from "lucide-react";
import { SettingRow } from "./SettingRow";
import { SettingSection } from "./SettingSection";
import { Dropdown } from "./Dropdown";
import { useT } from "../i18n";
import { useDynamicTheme, type DynamicPreset } from "../hooks/useDynamicTheme";

interface AppearanceTabProps {
  themeMode: string;
  handleThemeModeChange: (mode: string) => void;
  themeColor: string;
  handleThemeColorChange: (color: string) => void;
  themeOpacity: number;
  handleOpacityChange: (val: number) => void;
  themeSaturation: number;
  handleSaturationChange: (val: number) => void;
  themeBrightness: number;
  handleBrightnessChange: (val: number) => void;
  cornersEnabled: boolean;
  toggleCorners: () => void;
  scale: number;
  handleScaleChange: (val: number) => void;
}

export function AppearanceTab({
  themeMode,
  handleThemeModeChange,
  themeColor,
  handleThemeColorChange,
  themeOpacity,
  handleOpacityChange,
  themeSaturation,
  handleSaturationChange,
  themeBrightness,
  handleBrightnessChange,
  cornersEnabled,
  toggleCorners,
  scale,
  handleScaleChange,
}: AppearanceTabProps) {
  const t = useT();
  const showCustomColor = themeMode === "custom";
  const showAdvancedSliders = themeMode === "custom" || themeMode === "adaptive";

  const {
    config: dynamicConfig,
    rawPalette,
    computedColors,
    isLoading: isPaletteLoading,
    setSyncWithWallpaper,
    setPreset,
    setHueShift,
    setSaturationMultiplier,
    setLightnessOffset,
    resetAdjustments,
    refreshPalette,
    cycleWallpaperMock,
  } = useDynamicTheme();

  const presets: { id: DynamicPreset; labelKey: string }[] = [
    { id: "deep-vibrant", labelKey: "appearance.dynamicTheme.preset.deepVibrant" },
    { id: "muted-pastel", labelKey: "appearance.dynamicTheme.preset.mutedPastel" },
    { id: "monochromatic", labelKey: "appearance.dynamicTheme.preset.monochromatic" },
    { id: "high-contrast-dark", labelKey: "appearance.dynamicTheme.preset.highContrastDark" },
  ];

  return (
    <>
      {/* ── Dynamic Theme Controls ── */}
      <SettingSection
        id="appearance-dynamic-theme"
        title={t("appearance.dynamicTheme.group")}
        defaultOpen
      >
        <SettingRow
          icon={Sparkles}
          label={t("appearance.dynamicTheme.sync")}
          desc={t("appearance.dynamicTheme.sync.desc")}
          divider={true}
        >
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={dynamicConfig.syncWithWallpaper}
              onChange={(e) => setSyncWithWallpaper(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </SettingRow>

        {/* 5-Color Semantic Palette Swatches */}
        <SettingRow
          icon={Image}
          label="Extracted Wallpaper Palette"
          desc={rawPalette.wallpaper_path ? `Active: ${rawPalette.wallpaper_path.split("\\").pop()}` : "5-color harmonic quantization from active desktop background"}
          stacked
          divider={true}
        >
          <div className="dynamic-palette-row">
            <div className="dynamic-palette-swatches">
              <div className="dynamic-swatch-item" title={`Primary Accent: ${computedColors.primaryAccent}`}>
                <div
                  className="dynamic-swatch-circle"
                  style={{ backgroundColor: computedColors.primaryAccent }}
                />
                <span className="dynamic-swatch-role">Primary</span>
                <span className="dynamic-swatch-hex">{computedColors.primaryAccent.toUpperCase()}</span>
              </div>

              <div className="dynamic-swatch-item" title={`Secondary Accent: ${computedColors.secondaryAccent}`}>
                <div
                  className="dynamic-swatch-circle"
                  style={{ backgroundColor: computedColors.secondaryAccent }}
                />
                <span className="dynamic-swatch-role">Secondary</span>
                <span className="dynamic-swatch-hex">{computedColors.secondaryAccent.toUpperCase()}</span>
              </div>

              <div className="dynamic-swatch-item" title={`Dominant Background: ${computedColors.dominantBackground}`}>
                <div
                  className="dynamic-swatch-circle"
                  style={{ backgroundColor: computedColors.dominantBackground }}
                />
                <span className="dynamic-swatch-role">Background</span>
                <span className="dynamic-swatch-hex">{computedColors.dominantBackground.toUpperCase()}</span>
              </div>

              <div className="dynamic-swatch-item" title={`Surfaces: ${computedColors.surfaces}`}>
                <div
                  className="dynamic-swatch-circle"
                  style={{ backgroundColor: computedColors.surfaces }}
                />
                <span className="dynamic-swatch-role">Surfaces</span>
                <span className="dynamic-swatch-hex">{computedColors.surfaces.toUpperCase()}</span>
              </div>

              <div className="dynamic-swatch-item" title={`High-Contrast Text: ${computedColors.highContrastText}`}>
                <div
                  className="dynamic-swatch-circle"
                  style={{ backgroundColor: computedColors.highContrastText }}
                />
                <span className="dynamic-swatch-role">Text</span>
                <span className="dynamic-swatch-hex">{computedColors.highContrastText.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </SettingRow>

        {/* Preset Behavior Modes */}
        <SettingRow
          icon={Palette}
          label={t("appearance.dynamicTheme.preset")}
          desc={t("appearance.dynamicTheme.preset.desc")}
          stacked
          divider={true}
        >
          <div className="dynamic-preset-grid">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className={`dynamic-preset-card ${dynamicConfig.preset === preset.id ? "active" : ""}`}
                onClick={() => setPreset(preset.id)}
              >
                <span>{t(preset.labelKey)}</span>
                {dynamicConfig.preset === preset.id && <div className="dynamic-preset-indicator" />}
              </div>
            ))}
          </div>
        </SettingRow>

        {/* Linear Sliders: Hue Shift */}
        <SettingRow
          icon={SlidersHorizontal}
          label={t("appearance.dynamicTheme.hueShift")}
          desc={t("appearance.dynamicTheme.hueShift.desc", {
            deg: dynamicConfig.hueShift > 0 ? `+${dynamicConfig.hueShift}` : `${dynamicConfig.hueShift}`,
          })}
          divider={true}
        >
          <div className="dynamic-slider-row">
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={dynamicConfig.hueShift}
              onChange={(e) => setHueShift(parseInt(e.target.value, 10))}
              className="settings-slider"
            />
            <span className="dynamic-slider-badge">
              {dynamicConfig.hueShift > 0 ? `+${dynamicConfig.hueShift}°` : `${dynamicConfig.hueShift}°`}
            </span>
          </div>
        </SettingRow>

        {/* Linear Sliders: Global Saturation Multiplier */}
        <SettingRow
          icon={Droplets}
          label={t("appearance.dynamicTheme.saturation")}
          desc={t("appearance.dynamicTheme.saturation.desc", {
            percent: Math.round(dynamicConfig.saturationMultiplier * 100),
          })}
          divider={true}
        >
          <div className="dynamic-slider-row">
            <input
              type="range"
              min="0.0"
              max="2.0"
              step="0.02"
              value={dynamicConfig.saturationMultiplier}
              onChange={(e) => setSaturationMultiplier(parseFloat(e.target.value))}
              className="settings-slider"
            />
            <span className="dynamic-slider-badge">
              {Math.round(dynamicConfig.saturationMultiplier * 100)}%
            </span>
          </div>
        </SettingRow>

        {/* Linear Sliders: Lightness Offset */}
        <SettingRow
          icon={Sun}
          label={t("appearance.dynamicTheme.lightness")}
          desc={t("appearance.dynamicTheme.lightness.desc", {
            percent: dynamicConfig.lightnessOffset > 0
              ? `+${Math.round(dynamicConfig.lightnessOffset * 100)}`
              : `${Math.round(dynamicConfig.lightnessOffset * 100)}`,
          })}
          divider={true}
        >
          <div className="dynamic-slider-row">
            <input
              type="range"
              min="-0.5"
              max="0.5"
              step="0.02"
              value={dynamicConfig.lightnessOffset}
              onChange={(e) => setLightnessOffset(parseFloat(e.target.value))}
              className="settings-slider"
            />
            <span className="dynamic-slider-badge">
              {dynamicConfig.lightnessOffset > 0
                ? `+${Math.round(dynamicConfig.lightnessOffset * 100)}%`
                : `${Math.round(dynamicConfig.lightnessOffset * 100)}%`}
            </span>
          </div>
        </SettingRow>

        {/* Actions row: Refresh & Reset */}
        <SettingRow icon={RefreshCw} label="Palette Operations" desc="Refresh or reset color customization profile" divider={false}>
          <div className="dynamic-actions-group">
            <button
              onClick={() => refreshPalette()}
              disabled={isPaletteLoading}
              className="dynamic-btn"
              title={t("appearance.dynamicTheme.refresh")}
            >
              <RefreshCw size={12} className={isPaletteLoading ? "animate-spin" : ""} />
              <span>{isPaletteLoading ? "Extracting..." : t("appearance.dynamicTheme.refresh")}</span>
            </button>

            {cycleWallpaperMock && (
              <button
                onClick={() => cycleWallpaperMock()}
                className="dynamic-btn"
                title="Simulate next desktop wallpaper palette"
              >
                <Image size={12} />
                <span>Cycle Wallpaper</span>
              </button>
            )}

            <button
              onClick={() => resetAdjustments()}
              className="dynamic-btn"
              title={t("appearance.dynamicTheme.reset")}
            >
              <RotateCcw size={12} />
              <span>{t("appearance.dynamicTheme.reset")}</span>
            </button>
          </div>
        </SettingRow>
      </SettingSection>

      {/* ── Standard Theme Section ── */}
      <SettingSection id="appearance-theme" title={t("appearance.theme.group")}>
        <SettingRow icon={Palette} label={t("appearance.mode")} desc={t("appearance.mode.desc")}>
          <Dropdown
            value={themeMode}
            onChange={handleThemeModeChange}
            options={[
              { value: "dark", label: t("appearance.mode.dark") },
              { value: "light", label: t("appearance.mode.light") },
              { value: "custom", label: t("appearance.mode.custom") },
              { value: "adaptive", label: t("appearance.mode.adaptive") },
            ]}
          />
        </SettingRow>

        {showCustomColor && (
          <SettingRow icon={Droplet} label={t("appearance.color")} desc={t("appearance.color.desc")}>
            <div className="color-picker-row">
              <input
                type="color"
                value={themeColor}
                onChange={(e) => handleThemeColorChange(e.target.value)}
                className="color-picker-input"
              />
              <span className="color-picker-label">{themeColor.toUpperCase()}</span>
            </div>
          </SettingRow>
        )}

        <SettingRow
          icon={Contrast}
          label={t("appearance.opacity")}
          desc={t("appearance.opacity.desc", { percent: Math.round(themeOpacity * 100) })}
          divider={showAdvancedSliders}
        >
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={themeOpacity}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            className="settings-slider"
          />
        </SettingRow>

        {showAdvancedSliders && (
          <>
            <SettingRow
              icon={Droplets}
              label={t("appearance.saturation")}
              desc={t("appearance.saturation.desc", { percent: Math.round(themeSaturation * 100) })}
            >
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.02"
                value={themeSaturation}
                onChange={(e) => handleSaturationChange(parseFloat(e.target.value))}
                className="settings-slider"
              />
            </SettingRow>

            <SettingRow
              icon={Sun}
              label={t("appearance.brightness")}
              desc={t("appearance.brightness.desc", { percent: Math.round(themeBrightness * 100) })}
              divider={false}
            >
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.02"
                value={themeBrightness}
                onChange={(e) => handleBrightnessChange(parseFloat(e.target.value))}
                className="settings-slider"
              />
            </SettingRow>
          </>
        )}
      </SettingSection>

      <SettingSection id="appearance-display" title={t("appearance.display.group")}>
        <SettingRow icon={Square} label={t("appearance.corners")} desc={t("appearance.corners.desc")}>
          <label className="toggle-switch">
            <input type="checkbox" checked={cornersEnabled} onChange={toggleCorners} />
            <span className="slider"></span>
          </label>
        </SettingRow>

        <SettingRow
          icon={Maximize2}
          label={t("appearance.scale")}
          desc={t("appearance.scale.desc", { percent: Math.round(scale * 100) })}
          divider={false}
        >
          <div className="scale-button-container">
            <button
              onClick={() => handleScaleChange(Math.max(0.8, parseFloat((scale - 0.1).toFixed(1))))}
              disabled={scale <= 0.8}
              className="scale-adjust-btn"
              title={t("appearance.scale.decrease")}
            >
              —
            </button>
            <span className="scale-display-value">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => handleScaleChange(Math.min(1.3, parseFloat((scale + 0.1).toFixed(1))))}
              disabled={scale >= 1.3}
              className="scale-adjust-btn"
              title={t("appearance.scale.increase")}
            >
              +
            </button>
          </div>
        </SettingRow>
      </SettingSection>
    </>
  );
}
