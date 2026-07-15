// Port of home-assistant/frontend
// src/common/dom/apply_themes_on_element.ts (20220802.0).
//
// Deviations from the original:
// - `themes`/`themeSettings` are typed against this repo's trimmed
//   HomeAssistant interface (Themes/ThemeSettings).
// - A fallback was added that sets/removes the CSS custom properties
//   directly on the element, since floorplan targets are plain SVG/HTML
//   elements without Polymer's `updateStyles()` or the ShadyCSS polyfill.

import { Theme, Themes, ThemeVars } from '../../data/ws-themes';
import { darkStyles, derivedStyles } from '../../resources/styles-data';
import { ThemeSettings } from '../../types';
import { hex2rgb, lab2hex, lab2rgb, rgb2hex, rgb2lab } from '../color/convert-color';
import { hexBlend } from '../color/hex';
import { labBrighten, labDarken } from '../color/lab';
import { rgbContrast } from '../color/rgb';

interface ProcessedTheme {
  keys: { [key: string]: '' };
  styles: Record<string, string>;
}

interface ThemedElement extends HTMLElement {
  _themes?: { cacheKey?: string; keys?: { [key: string]: '' } };
  updateStyles?: (styles: Record<string, string>) => void;
}

let PROCESSED_THEMES: Record<string, ProcessedTheme> = {};

/**
 * Apply a theme to an element by setting the CSS variables on it.
 *
 * element: Element to apply theme on.
 * themes: HASS theme information (e.g. active dark mode and globally active theme name).
 * selectedTheme: Selected theme (used to override the globally active theme for this element).
 * themeSettings: Additional settings such as selected colors.
 */
export const applyThemesOnElement = (
  element: Element,
  themes: Themes,
  selectedTheme?: string,
  themeSettings?: Partial<ThemeSettings>,
  main?: boolean
): void => {
  const el = element as ThemedElement;

  // If there is no explicitly desired theme provided, and the element is the main element we automatically
  // use the active one from `themes`.
  const themeToApply = selectedTheme || (main ? themes.theme : undefined);

  // If there is no explicitly desired dark mode provided, we automatically
  // use the active one from `themes`.
  const darkMode =
    themeSettings && themeSettings?.dark !== undefined
      ? themeSettings?.dark
      : themes.darkMode;

  let cacheKey = themeToApply;
  let themeRules: Partial<ThemeVars> = {};

  if (themeToApply && darkMode) {
    cacheKey = `${cacheKey}__dark`;
    themeRules = { ...darkStyles };
  }

  if (themeToApply === 'default') {
    // Determine the primary and accent colors from the current settings.
    // Fallbacks are implicitly the HA default blue and orange or the
    // derived "darkStyles" values, depending on the light vs dark mode.
    const primaryColor = themeSettings?.primaryColor;
    const accentColor = themeSettings?.accentColor;

    if (darkMode && primaryColor) {
      themeRules['app-header-background-color'] = hexBlend(
        primaryColor,
        '#121212',
        8
      );
    }

    if (primaryColor) {
      cacheKey = `${cacheKey}__primary_${primaryColor}`;
      const rgbPrimaryColor = hex2rgb(primaryColor);
      const labPrimaryColor = rgb2lab(rgbPrimaryColor);
      themeRules['primary-color'] = primaryColor;
      const rgbLightPrimaryColor = lab2rgb(labBrighten(labPrimaryColor));
      themeRules['light-primary-color'] = rgb2hex(rgbLightPrimaryColor);
      themeRules['dark-primary-color'] = lab2hex(labDarken(labPrimaryColor));
      themeRules['text-primary-color'] =
        rgbContrast(rgbPrimaryColor, [33, 33, 33]) < 6 ? '#fff' : '#212121';
      themeRules['text-light-primary-color'] =
        rgbContrast(rgbLightPrimaryColor, [33, 33, 33]) < 6
          ? '#fff'
          : '#212121';
      themeRules['state-icon-color'] = themeRules['dark-primary-color'];
    }
    if (accentColor) {
      cacheKey = `${cacheKey}__accent_${accentColor}`;
      themeRules['accent-color'] = accentColor;
      const rgbAccentColor = hex2rgb(accentColor);
      themeRules['text-accent-color'] =
        rgbContrast(rgbAccentColor, [33, 33, 33]) < 6 ? '#fff' : '#212121';
    }

    // Nothing was changed
    if (el._themes?.cacheKey === cacheKey) {
      return;
    }
  }

  // Custom theme logic (not relevant for default theme, since it would override
  // the derived calculations from above)
  if (
    themeToApply &&
    themeToApply !== 'default' &&
    themes.themes[themeToApply]
  ) {
    // Apply theme vars that are relevant for all modes (but extract the "modes" section first)
    const { modes, ...baseThemeRules } = themes.themes[themeToApply] as Theme;
    themeRules = { ...themeRules, ...baseThemeRules };

    // Apply theme vars for the specific mode if available
    if (modes) {
      if (darkMode) {
        themeRules = { ...themeRules, ...modes.dark };
      } else {
        themeRules = { ...themeRules, ...modes.light };
      }
    }
  }

  if (!el._themes?.keys && !Object.keys(themeRules).length) {
    // No styles to reset, and no styles to set
    return;
  }

  const newTheme =
    Object.keys(themeRules).length && cacheKey
      ? PROCESSED_THEMES[cacheKey] || processTheme(cacheKey, themeRules)
      : undefined;

  // Add previous set keys to reset them, and new theme
  const styles = { ...el._themes?.keys, ...newTheme?.styles };
  el._themes = { cacheKey, keys: newTheme?.keys };

  // Set and/or reset styles
  if (el.updateStyles) {
    el.updateStyles(styles);
  } else if (window.ShadyCSS) {
    // Implement updateStyles() method of Polymer elements
    (
      window.ShadyCSS as unknown as {
        styleSubtree: (el: Element, styles: Record<string, string>) => void;
      }
    ).styleSubtree(el, styles);
  } else {
    // Plain DOM element (e.g. an SVG element inside the floorplan):
    // set/remove the CSS custom properties directly on its style.
    const style = (element as HTMLElement | SVGElement).style;
    for (const [prop, value] of Object.entries(styles)) {
      if (value) {
        style.setProperty(prop, value);
      } else {
        style.removeProperty(prop);
      }
    }
  }
};

const processTheme = (
  cacheKey: string,
  theme: Partial<ThemeVars>
): ProcessedTheme | undefined => {
  if (!theme || !Object.keys(theme).length) {
    return undefined;
  }
  const combinedTheme: Partial<ThemeVars> = {
    ...derivedStyles,
    ...theme,
  };
  const styles: Record<string, string> = {};
  const keys: { [key: string]: '' } = {};
  for (const key of Object.keys(combinedTheme)) {
    const prefixedKey = `--${key}`;
    const value = String(combinedTheme[key]);
    styles[prefixedKey] = value;
    keys[prefixedKey] = '';

    // Try to create a rgb value for this key if it is not a var
    if (!value.startsWith('#')) {
      // Can't convert non hex value
      continue;
    }

    const rgbKey = `rgb-${key}`;
    if (combinedTheme[rgbKey] !== undefined) {
      // Theme has it's own rgb value
      continue;
    }
    try {
      const rgbValue = hex2rgb(value).join(',');
      const prefixedRgbKey = `--${rgbKey}`;
      styles[prefixedRgbKey] = rgbValue;
      keys[prefixedRgbKey] = '';
    } catch (err) {
      continue;
    }
  }
  PROCESSED_THEMES[cacheKey] = { styles, keys };
  return { styles, keys };
};

export const invalidateThemeCache = (): void => {
  PROCESSED_THEMES = {};
};
