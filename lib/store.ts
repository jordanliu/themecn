import type {
  ColorHarmony,
  FontKey,
  ThemeColorKey,
  ThemeColors,
  ThemePreset,
  ThemeState,
} from "@/types/theme";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  formatToOklch,
  hexToOklchString,
  hexToHSL,
  hslToHex,
  getContrastHSL,
  calculateContrastingColor,
  getRandomHexColor,
} from "./color-utils";
import { getRegistryUrl } from "./theme-url";

// Ensure consistent dark mode colors derived from light mode colors
function deriveDarkModeColors(lightColors: ThemeColors): ThemeColors {
  const darkColors = { ...lightColors }; // Start with a copy

  // Extract color components from primary color
  const [primaryH, primaryS, primaryL] = lightColors.primary
    .split(" ")
    .map((part) => Number.parseFloat(part.replace("%", "")));

  // Extract color components from secondary color
  const [secondaryH, secondaryS, secondaryL] = lightColors.secondary
    .split(" ")
    .map((part) => Number.parseFloat(part.replace("%", "")));

  // Extract color components from accent color
  const [accentH, accentS, accentL] = lightColors.accent
    .split(" ")
    .map((part) => Number.parseFloat(part.replace("%", "")));

  // Create a dark background with the same hue as the primary
  darkColors.background = `${primaryH} 30% 8%`;

  // Card and popover slightly lighter than background
  darkColors.card = `${primaryH} 30% 12%`;
  darkColors.popover = darkColors.card;

  // Light foreground with slight tint from primary hue
  darkColors.foreground = `${primaryH} 10% 95%`;
  darkColors.cardForeground = darkColors.foreground;
  darkColors.popoverForeground = darkColors.foreground;

  // For primary color, preserve the original hue and saturation but adjust lightness
  // Keep primary vibrant in dark mode - don't dim it too much
  darkColors.primary = `${primaryH} ${Math.max(primaryS, 60)}% ${Math.min(
    Math.max(primaryL, 50),
    60
  )}%`;
  darkColors.ring = darkColors.primary;

  // Primary foreground should contrast with the bright primary
  darkColors.primaryForeground = calculateContrastingColor(darkColors.primary);

  // Secondary color - darker and more subdued
  darkColors.secondary = `${secondaryH} ${Math.max(secondaryS, 10)}% ${Math.max(
    15,
    Math.min(25, secondaryL - 70)
  )}%`;
  darkColors.secondaryForeground = calculateContrastingColor(
    darkColors.secondary
  );

  // Muted color based on secondary
  darkColors.muted = darkColors.secondary;
  darkColors.mutedForeground = `${secondaryH} 15% 65%`;

  // Accent color - preserve hue but adjust for dark mode
  darkColors.accent = `${accentH} ${Math.max(accentS, 60)}% ${Math.min(
    Math.max(accentL - 20, 40),
    60
  )}%`;
  darkColors.accentForeground = calculateContrastingColor(darkColors.accent);

  // Border colors
  darkColors.border = `${primaryH} 25% 18%`;
  darkColors.input = darkColors.border;

  // Sidebar colors
  darkColors.sidebar = darkColors.background;
  darkColors.sidebarForeground = darkColors.foreground;
  darkColors.sidebarPrimary = darkColors.primary;
  darkColors.sidebarPrimaryForeground = darkColors.primaryForeground;
  darkColors.sidebarAccent = darkColors.accent;
  darkColors.sidebarAccentForeground = darkColors.accentForeground;
  darkColors.sidebarBorder = darkColors.border;
  darkColors.sidebarRing = darkColors.ring;

  // Generate monochromatic chart colors for dark mode
  const chartColors = generateChartColors(
    darkColors.primary,
    darkColors.secondary,
    darkColors.accent,
    true
  );
  darkColors.chart1 = chartColors.chart1;
  darkColors.chart2 = chartColors.chart2;
  darkColors.chart3 = chartColors.chart3;
  darkColors.chart4 = chartColors.chart4;
  darkColors.chart5 = chartColors.chart5;

  return darkColors;
}

function generateChartColors(
  primary: string,
  secondary: string,
  accent: string,
  isDarkMode = false
): {
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
} {
  // Extract color components from primary color
  const [primaryH, primaryS, primaryL] = primary
    .split(" ")
    .map((part) => Number.parseFloat(part.replace("%", "")));

  // For monochromatic theme, use the same hue with different lightness/saturation levels
  // This ensures the chart colors are truly monochromatic
  if (isDarkMode) {
    // For dark mode, create more vibrant, higher contrast monochromatic colors
    return {
      chart1: primary, // Primary color as is
      chart2: `${primaryH} ${Math.min(primaryS + 5, 90)}% ${Math.min(
        primaryL + 15,
        70
      )}%`, // Lighter, more saturated
      chart3: `${primaryH} ${Math.min(primaryS + 10, 95)}% ${Math.min(
        primaryL + 25,
        80
      )}%`, // Even lighter
      chart4: `${primaryH} ${Math.max(primaryS - 10, 40)}% ${Math.max(
        primaryL - 15,
        30
      )}%`, // Darker, less saturated
      chart5: `${primaryH} ${Math.max(primaryS - 20, 30)}% ${Math.max(
        primaryL - 25,
        20
      )}%`, // Even darker
    };
  } else {
    // For light mode, create a monochromatic palette
    return {
      chart1: primary, // Primary color as is
      chart2: `${primaryH} ${Math.max(primaryS - 15, 30)}% ${Math.min(
        primaryL + 15,
        75
      )}%`, // Lighter, less saturated
      chart3: `${primaryH} ${Math.max(primaryS - 30, 20)}% ${Math.min(
        primaryL + 25,
        85
      )}%`, // Even lighter
      chart4: `${primaryH} ${Math.min(primaryS + 10, 90)}% ${Math.max(
        primaryL - 15,
        25
      )}%`, // Darker, more saturated
      chart5: `${primaryH} ${Math.min(primaryS + 5, 85)}% ${Math.max(
        primaryL - 25,
        20
      )}%`, // Even darker
    };
  }
}

// Apply CSS variables to the document
function applyCSSVariables(
  colors: ThemeColors,
  borderRadius: number,
  fonts: { heading: string; body: string }
) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  // Apply OKLCH values directly to CSS variables
  // Format the CSS variable names to match the OKLCH variables in globals.css

  // Map the theme colors to the correct CSS variables
  root.style.setProperty("--background", formatToOklch(colors.background));
  root.style.setProperty("--foreground", formatToOklch(colors.foreground));
  root.style.setProperty("--card", formatToOklch(colors.card));
  root.style.setProperty(
    "--card-foreground",
    formatToOklch(colors.cardForeground)
  );
  root.style.setProperty("--popover", formatToOklch(colors.popover));
  root.style.setProperty(
    "--popover-foreground",
    formatToOklch(colors.popoverForeground)
  );
  root.style.setProperty("--primary", formatToOklch(colors.primary));
  root.style.setProperty(
    "--primary-foreground",
    formatToOklch(colors.primaryForeground)
  );
  root.style.setProperty("--secondary", formatToOklch(colors.secondary));
  root.style.setProperty(
    "--secondary-foreground",
    formatToOklch(colors.secondaryForeground)
  );
  root.style.setProperty("--muted", formatToOklch(colors.muted));
  root.style.setProperty(
    "--muted-foreground",
    formatToOklch(colors.mutedForeground)
  );
  root.style.setProperty("--accent", formatToOklch(colors.accent));
  root.style.setProperty(
    "--accent-foreground",
    formatToOklch(colors.accentForeground)
  );
  root.style.setProperty("--destructive", formatToOklch(colors.destructive));
  root.style.setProperty("--border", formatToOklch(colors.border));
  root.style.setProperty("--input", formatToOklch(colors.input));
  root.style.setProperty("--ring", formatToOklch(colors.ring));

  // Chart colors
  root.style.setProperty("--chart-1", formatToOklch(colors.chart1));
  root.style.setProperty("--chart-2", formatToOklch(colors.chart2));
  root.style.setProperty("--chart-3", formatToOklch(colors.chart3));
  root.style.setProperty("--chart-4", formatToOklch(colors.chart4));
  root.style.setProperty("--chart-5", formatToOklch(colors.chart5));

  // Sidebar colors
  root.style.setProperty("--sidebar", formatToOklch(colors.sidebar));
  root.style.setProperty(
    "--sidebar-foreground",
    formatToOklch(colors.sidebarForeground)
  );
  root.style.setProperty(
    "--sidebar-primary",
    formatToOklch(colors.sidebarPrimary)
  );
  root.style.setProperty(
    "--sidebar-primary-foreground",
    formatToOklch(colors.sidebarPrimaryForeground)
  );
  root.style.setProperty(
    "--sidebar-accent",
    formatToOklch(colors.sidebarAccent)
  );
  root.style.setProperty(
    "--sidebar-accent-foreground",
    formatToOklch(colors.sidebarAccentForeground)
  );
  root.style.setProperty(
    "--sidebar-border",
    formatToOklch(colors.sidebarBorder)
  );
  root.style.setProperty("--sidebar-ring", formatToOklch(colors.sidebarRing));

  // Set border radius
  root.style.setProperty("--radius", `${borderRadius}rem`);

  // Set font families
  root.style.setProperty("--font-heading", fonts.heading);
  root.style.setProperty("--font-body", fonts.body);
}

// Find the defaultTheme object and replace the colors with these new values:

// Also update the defaultTheme to match the examples more closely:

// Updated default theme with a more vibrant primary color and neutral secondary/accent
const defaultTheme: ThemeState = {
  colors: {
    background: "0 0% 100%", // oklch(1.000 0.000 0)
    foreground: "291 10% 4%", // oklch(0.040 0.030 291)
    card: "0 0% 100%", // oklch(1.000 0.000 0)
    cardForeground: "291 10% 4%", // oklch(0.040 0.030 291)
    popover: "0 0% 100%", // oklch(1.000 0.000 0)
    popoverForeground: "291 10% 4%", // oklch(0.040 0.030 291)
    primary: "291 80% 45%", // oklch(0.450 0.255 291)
    primaryForeground: "291 10% 95%", // oklch(0.950 0.030 291)
    secondary: "291 30% 85%", // oklch(0.850 0.075 291)
    secondaryForeground: "291 30% 10%", // oklch(0.100 0.075 291)
    muted: "291 30% 85%", // oklch(0.850 0.075 291)
    mutedForeground: "291 30% 45%", // oklch(0.450 0.075 291)
    accent: "291 50% 75%", // oklch(0.750 0.165 291)
    accentForeground: "291 50% 10%", // oklch(0.100 0.165 291)
    destructive: "357.18 100% 45%", // oklch(0.577 0.245 27.325)
    border: "291 30% 80%", // oklch(0.800 0.075 291)
    input: "291 30% 80%", // oklch(0.800 0.075 291)
    ring: "291 80% 45%", // oklch(0.450 0.255 291)
    chart1: "291 80% 45%", // oklch(0.450 0.255 291)
    chart2: "291 70% 60%", // oklch(0.600 0.210 291)
    chart3: "291 60% 70%", // oklch(0.700 0.165 291)
    chart4: "291 85% 30%", // oklch(0.300 0.270 291)
    chart5: "291 85% 20%", // oklch(0.200 0.255 291)
    sidebar: "291 30% 85%", // oklch(0.850 0.075 291)
    sidebarForeground: "291 30% 10%", // oklch(0.100 0.075 291)
    sidebarPrimary: "291 80% 45%", // oklch(0.450 0.255 291)
    sidebarPrimaryForeground: "291 10% 95%", // oklch(0.950 0.030 291)
    sidebarAccent: "291 50% 75%", // oklch(0.750 0.165 291)
    sidebarAccentForeground: "291 50% 10%", // oklch(0.100 0.165 291)
    sidebarBorder: "291 30% 80%", // oklch(0.800 0.075 291)
    sidebarRing: "291 80% 45%", // oklch(0.450 0.255 291)
  },

  darkColors: {
    background: "291 40% 8%", // oklch(0.080 0.090 291)
    foreground: "291 10% 95%", // oklch(0.950 0.030 291)
    card: "291 40% 12%", // oklch(0.120 0.090 291)
    cardForeground: "291 10% 95%", // oklch(0.950 0.030 291)
    popover: "291 40% 12%", // oklch(0.120 0.090 291)
    popoverForeground: "291 10% 95%", // oklch(0.950 0.030 291)
    primary: "291 75% 50%", // oklch(0.500 0.225 291)
    primaryForeground: "291 10% 95%", // oklch(0.950 0.030 291)
    secondary: "291 30% 15%", // oklch(0.150 0.075 291)
    secondaryForeground: "291 30% 95%", // oklch(0.950 0.075 291)
    muted: "291 30% 15%", // oklch(0.150 0.075 291)
    mutedForeground: "291 15% 65%", // oklch(0.650 0.045 291)
    accent: "291 50% 25%", // oklch(0.250 0.165 291)
    accentForeground: "291 50% 95%", // oklch(0.950 0.165 291)
    destructive: "357.18 100% 45%", // oklch(0.577 0.245 27.325)
    border: "291 40% 25%", // oklch(0.250 0.090 291)
    input: "291 40% 25%", // oklch(0.250 0.090 291)
    ring: "291 75% 50%", // oklch(0.500 0.225 291)
    chart1: "291 75% 50%", // oklch(0.500 0.225 291)
    chart2: "291 80% 65%", // oklch(0.650 0.240 291)
    chart3: "291 85% 75%", // oklch(0.750 0.255 291)
    chart4: "291 65% 35%", // oklch(0.350 0.195 291)
    chart5: "291 50% 25%", // oklch(0.250 0.165 291)
    sidebar: "291 40% 8%", // oklch(0.080 0.090 291)
    sidebarForeground: "291 10% 95%", // oklch(0.950 0.030 291)
    sidebarPrimary: "291 75% 50%", // oklch(0.500 0.225 291)
    sidebarPrimaryForeground: "291 10% 95%", // oklch(0.950 0.030 291)
    sidebarAccent: "291 50% 25%", // oklch(0.250 0.165 291)
    sidebarAccentForeground: "291 50% 95%", // oklch(0.950 0.165 291)
    sidebarBorder: "291 40% 25%", // oklch(0.250 0.090 291)
    sidebarRing: "291 75% 50%", // oklch(0.500 0.225 291)
  },
  fonts: {
    heading: "Geist",
    body: "Geist",
  },
  borderRadius: 0.5,
  isDarkMode: false,
  selectedHarmony: "monochromatic",
  exportMenuOpen: false,
  shareMenuOpen: false,
  // Keep only the Default predefined theme
  predefinedThemes: [
    {
      name: "Default",
      colors: {
        background: "#ffffff", // oklch(1.000 0.000 0)
        foreground: "#0a090f", // oklch(0.040 0.030 291)
        primary: "#7a3be0", // oklch(0.450 0.255 291)
        secondary: "#dbd2f5", // oklch(0.850 0.075 291)
        accent: "#c48bea", // oklch(0.750 0.165 291)
        chart1: "#7a3be0", // oklch(0.450 0.255 291)
        chart2: "#9a50e5", // oklch(0.600 0.210 291)
        chart3: "#b972e8", // oklch(0.700 0.165 291)
        chart4: "#5524da", // oklch(0.300 0.270 291)
        chart5: "#300cbe", // oklch(0.200 0.255 291)
      },
      fonts: {
        heading: "Geist",
        body: "Geist",
      },
    },
  ],
  currentTheme: "Default",
};

const getShareableUrl = (themeState: ThemeState) => {
  if (typeof window === "undefined") return "";

  const baseUrl = window.location.origin + window.location.pathname;
  const themeParams = new URLSearchParams();

  // Add colors
  Object.entries(themeState.colors).forEach(([key, value]) => {
    themeParams.set(`color-${key}`, hexToOklchString(hslToHex(value)));
  });

  // Add fonts
  themeParams.set("font-heading", themeState.fonts.heading);
  themeParams.set("font-body", themeState.fonts.body);

  // Add border radius
  themeParams.set("borderRadius", themeState.borderRadius.toString());

  // Add dark mode
  themeParams.set("darkMode", themeState.isDarkMode.toString());

  // Construct the new URL
  const shareableUrl = `${baseUrl}?${themeParams.toString()}`;

  return shareableUrl;
};

// Add the missing export and initialization code at the end

export type ThemeStore = ThemeState & {
  updateThemeColor: (key: ThemeColorKey, value: string) => void;
  updateMultipleThemeColors: (colors: Partial<ThemeColors>) => void;
  updateBorderRadius: (value: number) => void;
  updateFont: (key: FontKey, value: string) => void;
  resetTheme: () => void;
  toggleDarkMode: () => void;
  setSelectedHarmony: (harmony: ColorHarmony) => void;
  generateHarmonyColors: () => void;
  setExportMenuOpen: (isOpen: boolean) => void;
  setShareMenuOpen: (isOpen: boolean) => void;
  getHexColor: (colorKey: ThemeColorKey) => string;
  generateCSSVariables: (useV3?: boolean) => string;
  getShareableUrl: () => string;
  getRegistryUrl: () => string;
  applyThemeState: (themeState: Partial<ThemeState>) => void;
  setCurrentTheme: (themeName: string) => void;
  addCustomTheme: (theme: ThemePreset) => void;
  saveCurrentAsTheme: (name: string) => void;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      ...defaultTheme,

      updateThemeColor: (key: ThemeColorKey, hexValue: string) => {
        // Convert hex to HSL
        const hslValue = hexToHSL(hexValue);

        set((state) => {
          // Create copies of both light and dark mode colors
          const lightColors = { ...state.colors };
          const darkColors = { ...state.darkColors };
          const isDarkMode = state.isDarkMode;

          // If it's primary color and dark mode, generate a complete dark theme
          if (key === "primary" && isDarkMode) {
            // Get primary HSL components
            const [hStr, sStr, lStr] = hslValue.split(" ");
            const h = Number.parseInt(hStr, 10);
            const s = Number.parseInt(sStr.replace("%", ""), 10);
            const l = Number.parseInt(lStr.replace("%", ""), 10);

            // Update primary and related colors
            darkColors.primary = hslValue;
            darkColors.ring = hslValue;
            darkColors.sidebarPrimary = hslValue;
            darkColors.chart1 = hslValue;

            // Calculate a contrasting foreground color
            const isPrimaryDark = l < 40;
            darkColors.primaryForeground = isPrimaryDark
              ? "0 0% 100%"
              : `${h} 10% 95%`;
            darkColors.sidebarPrimaryForeground = darkColors.primaryForeground;

            // Generate secondary color based on primary
            const darkSecondaryH = h;
            const darkSecondaryS = Math.max(Math.min(s - 40, 30), 7);
            const darkSecondaryL = Math.max(Math.min(l - 20, 30), 15);
            const darkSecondaryHSLValue = `${darkSecondaryH} ${darkSecondaryS}% ${darkSecondaryL}%`;

            darkColors.secondary = darkSecondaryHSLValue;
            darkColors.muted = darkSecondaryHSLValue;
            darkColors.secondaryForeground = `${darkSecondaryH} 10% 95%`;
            darkColors.mutedForeground = `${darkSecondaryH} 15% 65%`;

            // Generate accent color based on primary with a hue shift
            const darkAccentH = (h + 30) % 360;
            const darkAccentS = Math.min(s + 5, 80);
            const darkAccentL = Math.min(l + 15, 65);
            const darkAccentHSLValue = `${darkAccentH} ${darkAccentS}% ${darkAccentL}%`;

            darkColors.accent = darkAccentHSLValue;
            darkColors.accentForeground = `${darkAccentH} 50% 10%`;
            darkColors.sidebarAccent = darkAccentHSLValue;
            darkColors.sidebarAccentForeground = `${darkAccentH} 50% 10%`;

            // Update border colors
            darkColors.border = `${darkSecondaryH} ${
              darkSecondaryS + 5
            }% ${Math.min(darkSecondaryL + 10, 30)}%`;
            darkColors.input = darkColors.border;
            darkColors.sidebarBorder = darkColors.border;

            // Update chart colors for dark mode
            const darkChartColors = {
              chart1: hslValue, // Primary color as is
              chart2: `${h} ${Math.min(s + 5, 90)}% ${Math.min(l + 15, 75)}%`,
              chart3: `${h} ${Math.min(s + 10, 95)}% ${Math.min(l + 25, 85)}%`,
              chart4: `${h} ${Math.max(s - 10, 40)}% ${Math.max(l - 15, 25)}%`,
              chart5: `${h} ${Math.max(s - 20, 30)}% ${Math.max(l - 25, 15)}%`,
            };

            darkColors.chart1 = darkChartColors.chart1;
            darkColors.chart2 = darkChartColors.chart2;
            darkColors.chart3 = darkChartColors.chart3;
            darkColors.chart4 = darkChartColors.chart4;
            darkColors.chart5 = darkChartColors.chart5;

            // Create the new state
            const newState = {
              ...state,
              colors: lightColors,
              darkColors: darkColors,
            };

            // Apply CSS variables based on current mode
            applyCSSVariables(darkColors, state.borderRadius, state.fonts);

            // Apply chart colors directly to ensure they're visible in dark mode
            document.documentElement.style.setProperty(
              "--chart-1",
              darkColors.chart1
            );
            document.documentElement.style.setProperty(
              "--chart-2",
              darkColors.chart2
            );
            document.documentElement.style.setProperty(
              "--chart-3",
              darkColors.chart3
            );
            document.documentElement.style.setProperty(
              "--chart-4",
              darkColors.chart4
            );
            document.documentElement.style.setProperty(
              "--chart-5",
              darkColors.chart5
            );

            // Update URL with new theme
            updateThemeUrl(newState);

            return newState;
          } else if (key === "background") {
            lightColors.background = hslValue;
            lightColors.card = hslValue;
            lightColors.popover = hslValue;

            // If in dark mode, update the dark background
            if (isDarkMode) {
              darkColors.background = hslValue;
              darkColors.card = hslValue;
              darkColors.popover = hslValue;
              darkColors.sidebar = hslValue;
            }
          } else if (key === "foreground") {
            // Update all foreground colors to be derivatives of the main foreground
            lightColors.foreground = hslValue;
            lightColors.cardForeground = hslValue;
            lightColors.popoverForeground = hslValue;

            // Don't set component foregrounds to match the main foreground
            // Instead, we'll calculate contrasting colors for each component background

            // Update dark mode foreground colors
            darkColors.foreground = getContrastHSL(hslValue);
            darkColors.cardForeground = darkColors.foreground;
            darkColors.popoverForeground = darkColors.foreground;
          } else if (key === "primary") {
            lightColors.primary = hslValue;

            // Calculate a contrasting foreground color for primary
            lightColors.primaryForeground = calculateContrastingColor(hslValue);

            lightColors.ring = hslValue;
            lightColors.sidebarPrimary = hslValue;
            lightColors.sidebarPrimaryForeground =
              calculateContrastingColor(hslValue);
            lightColors.sidebarRing = hslValue;

            // Update chart colors based on primary, secondary, and accent
            const lightChartColors = generateChartColors(
              hslValue,
              lightColors.secondary,
              lightColors.accent,
              false
            );

            // Update light mode chart colors
            lightColors.chart1 = lightChartColors.chart1;
            lightColors.chart2 = lightChartColors.chart2;
            lightColors.chart3 = lightChartColors.chart3;
            lightColors.chart4 = lightChartColors.chart4;
            lightColors.chart5 = lightChartColors.chart5;

            // Only update dark mode colors if not in dark mode
            // (when in dark mode, the dedicated dark mode handler above takes care of it)
            if (!isDarkMode) {
              // Generate monochromatic chart colors for dark mode
              const darkChartColors = generateChartColors(
                darkColors.primary,
                darkColors.secondary,
                darkColors.accent,
                true
              );

              // Update dark mode chart colors
              darkColors.chart1 = darkChartColors.chart1;
              darkColors.chart2 = darkChartColors.chart2;
              darkColors.chart3 = darkChartColors.chart3;
              darkColors.chart4 = darkChartColors.chart4;
              darkColors.chart5 = darkChartColors.chart5;

              // Update dark mode primary
              darkColors.primary = hslValue;
              darkColors.primaryForeground =
                calculateContrastingColor(hslValue);
              darkColors.ring = hslValue;
              darkColors.sidebarPrimary = hslValue;
              darkColors.sidebarPrimaryForeground =
                calculateContrastingColor(hslValue);
              darkColors.sidebarRing = hslValue;
            }
          } else if (key === "secondary") {
            lightColors.secondary = hslValue;

            // Calculate a contrasting foreground color for secondary
            lightColors.secondaryForeground =
              calculateContrastingColor(hslValue);

            lightColors.muted = hslValue;
            lightColors.mutedForeground = calculateContrastingColor(
              hslValue,
              "mutedForeground"
            );
            lightColors.sidebar = hslValue;
            lightColors.sidebarForeground = calculateContrastingColor(hslValue);

            // Update chart colors when secondary changes
            const lightChartColors = generateChartColors(
              lightColors.primary,
              hslValue,
              lightColors.accent,
              false
            );

            // Update light mode chart colors
            lightColors.chart1 = lightChartColors.chart1;
            lightColors.chart2 = lightChartColors.chart2;
            lightColors.chart3 = lightChartColors.chart3;
            lightColors.chart4 = lightChartColors.chart4;
            lightColors.chart5 = lightChartColors.chart5;

            // If not in dark mode, update dark mode colors
            if (!isDarkMode) {
              // Generate monochromatic chart colors for dark mode
              const darkChartColors = generateChartColors(
                darkColors.primary,
                darkColors.secondary,
                darkColors.accent,
                true
              );

              // Update dark mode chart colors
              darkColors.chart1 = darkChartColors.chart1;
              darkColors.chart2 = darkChartColors.chart2;
              darkColors.chart3 = darkChartColors.chart3;
              darkColors.chart4 = darkChartColors.chart4;
              darkColors.chart5 = darkChartColors.chart5;

              // Update dark mode secondary
              const [h, s, l] = hslValue
                .split(" ")
                .map((part) => Number.parseFloat(part.replace("%", "")));
              const secondaryL = l;
              darkColors.secondary = `${h} ${Math.max(s - 20, 10)}% ${Math.max(
                15,
                Math.min(25, secondaryL - 70)
              )}%`;
              darkColors.secondaryForeground = calculateContrastingColor(
                darkColors.secondary
              );
              darkColors.muted = darkColors.secondary;
              darkColors.mutedForeground = calculateContrastingColor(
                darkColors.secondary,
                "mutedForeground"
              );
            }
          } else if (key === "accent") {
            lightColors.accent = hslValue;
            lightColors.accentForeground = calculateContrastingColor(hslValue);
            lightColors.sidebarAccent = hslValue;
            lightColors.sidebarAccentForeground =
              calculateContrastingColor(hslValue);

            // Update chart colors when accent changes
            const lightChartColors = generateChartColors(
              lightColors.primary,
              lightColors.secondary,
              hslValue,
              false
            );

            // Update light mode chart colors
            lightColors.chart1 = lightChartColors.chart1;
            lightColors.chart2 = lightChartColors.chart2;
            lightColors.chart3 = lightChartColors.chart3;
            lightColors.chart4 = lightChartColors.chart4;
            lightColors.chart5 = lightChartColors.chart5;

            // If not in dark mode, update dark mode colors
            if (!isDarkMode) {
              // Generate monochromatic chart colors for dark mode
              const darkChartColors = generateChartColors(
                darkColors.primary,
                darkColors.secondary,
                darkColors.accent,
                true
              );

              // Update dark mode chart colors
              darkColors.chart1 = darkChartColors.chart1;
              darkColors.chart2 = darkChartColors.chart2;
              darkColors.chart3 = darkChartColors.chart3;
              darkColors.chart4 = darkChartColors.chart4;
              darkColors.chart5 = darkChartColors.chart5;

              // Update dark mode accent
              darkColors.accent = hslValue;
              darkColors.accentForeground = calculateContrastingColor(hslValue);
              darkColors.sidebarAccent = hslValue;
              darkColors.sidebarAccentForeground =
                calculateContrastingColor(hslValue);
            }
          } else {
            lightColors[key] = hslValue;
            darkColors[key] = hslValue;
          }

          // Create the new state
          const newState = {
            ...state,
            colors: lightColors,
            darkColors: darkColors,
          };

          // Apply CSS variables based on current mode
          const colors = isDarkMode ? darkColors : lightColors;
          applyCSSVariables(colors, state.borderRadius, state.fonts);

          // If in dark mode, ensure dark mode chart colors are properly applied
          if (isDarkMode) {
            // Apply chart colors directly to ensure they're visible in dark mode
            document.documentElement.style.setProperty(
              "--chart-1",
              darkColors.chart1
            );
            document.documentElement.style.setProperty(
              "--chart-2",
              darkColors.chart2
            );
            document.documentElement.style.setProperty(
              "--chart-3",
              darkColors.chart3
            );
            document.documentElement.style.setProperty(
              "--chart-4",
              darkColors.chart4
            );
            document.documentElement.style.setProperty(
              "--chart-5",
              darkColors.chart5
            );
          }

          // Update URL with new theme
          updateThemeUrl(newState);

          return newState;
        });
      },

      updateMultipleThemeColors: (colors: Partial<ThemeColors>) => {
        set((state) => {
          const newState = {
            ...state,
            colors: { ...state.colors, ...colors },
            darkColors: { ...state.darkColors, ...colors },
          };

          // Apply CSS variables based on current mode
          const isDarkMode = state.isDarkMode;
          const currentColors = isDarkMode ? state.darkColors : state.colors;
          applyCSSVariables(currentColors, state.borderRadius, state.fonts);

          // Update URL with new theme
          updateThemeUrl(newState);

          return newState;
        });
      },

      updateBorderRadius: (value: number) => {
        set((state) => {
          // Update CSS variable
          document.documentElement.style.setProperty("--radius", `${value}rem`);

          const newState = {
            ...state,
            borderRadius: value,
          };

          // Update URL with new theme
          updateThemeUrl(newState);

          return newState;
        });
      },

      updateFont: (key: FontKey, value: string) => {
        set((state) => {
          const newFonts = {
            ...state.fonts,
            [key]: value,
          };

          // Update CSS variable
          document.documentElement.style.setProperty(`--font-${key}`, value);

          const newState = {
            ...state,
            fonts: newFonts,
          };

          // Update URL with new theme
          updateThemeUrl(newState);

          return newState;
        });
      },

      // Update the resetTheme function to ensure it applies the correct contrasting colors
      // Find the resetTheme function and update it to include this logic

      resetTheme: () => {
        // Simply use the default theme without modifications
        set(defaultTheme);

        // Apply default theme to CSS variables
        const colors = defaultTheme.isDarkMode
          ? defaultTheme.darkColors
          : defaultTheme.colors;
        applyCSSVariables(
          colors,
          defaultTheme.borderRadius,
          defaultTheme.fonts
        );

        // Toggle dark class
        if (defaultTheme.isDarkMode) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }

        // Set current theme to "Default"
        set((state) => ({
          ...state,
          currentTheme: "Default",
        }));
      },

      // Update the toggleDarkMode function to maintain color consistency
      toggleDarkMode: () => {
        set((state) => {
          const newIsDarkMode = !state.isDarkMode;

          // Toggle dark class
          if (newIsDarkMode) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }

          // Apply the appropriate colors to CSS variables
          // Use the existing darkColors without re-deriving them
          const colors = newIsDarkMode ? state.darkColors : state.colors;
          applyCSSVariables(colors, state.borderRadius, state.fonts);

          const newState = {
            ...state,
            isDarkMode: newIsDarkMode,
          };

          // Update URL with new theme
          updateThemeUrl(newState);

          return newState;
        });
      },

      setSelectedHarmony: (harmony: ColorHarmony) => {
        set((state) => ({
          ...state,
          selectedHarmony: harmony,
        }));
      },

      // Simplify the generateHarmonyColors function to only handle monochromatic
      // Find the generateHarmonyColors function and replace it with this simplified version:

      // Update the generateHarmonyColors function to ensure dark mode colors are consistent
      generateHarmonyColors: () => {
        // Generate a base color for the harmony
        const primaryHex = getRandomHexColor();

        // Convert to HSL for calculations
        const primaryHSL = hexToHSL(primaryHex);
        const [hStr, sStr, lStr] = primaryHSL.split(" ");
        const h = Number.parseInt(hStr, 10);
        const s = Number.parseInt(sStr.replace("%", ""), 10);
        const l = Number.parseInt(lStr.replace("%", ""), 10);

        // Get the current border radius (don't randomize it)
        const currentBorderRadius = get().borderRadius;

        // LIGHT MODE COLORS
        // -----------------

        // Primary: Make it vibrant and saturated
        const primaryH = h;
        const primaryS = Math.min(s + 20, 85); // Increase saturation for primary
        const primaryL = Math.max(Math.min(l, 60), 45); // Keep lightness in a good range
        const primaryHSLValue = `${primaryH} ${primaryS}% ${primaryL}%`;

        // Secondary: Lighter, less saturated version of primary
        const secondaryH = primaryH; // Same hue as primary
        const secondaryS = Math.max(Math.min(primaryS - 60, 25), 5); // Much less saturated
        const secondaryL = Math.min(primaryL + 40, 96); // Much lighter
        const secondaryHSLValue = `${secondaryH} ${secondaryS}% ${secondaryL}%`;

        // Accent: Lighter version of primary, medium-high saturation
        const accentH = primaryH; // Same hue as primary for better coordination
        const accentS = Math.max(Math.min(primaryS - 30, 55), 30); // Medium-low saturation
        const accentL = Math.min(primaryL + 30, 88); // Much lighter than primary
        const accentHSLValue = `${accentH} ${accentS}% ${accentL}%`;

        // Background: Pure white
        const bgHSLValue = "0 0% 100%";

        // Foreground: Near black
        const fgHSLValue = `${primaryH} 10% 4%`;

        // DARK MODE COLORS
        // ---------------

        // Dark Primary: Same hue, slightly less saturated, slightly lighter
        const darkPrimaryH = primaryH;
        const darkPrimaryS = Math.max(primaryS - 10, 60); // Slightly less saturated
        const darkPrimaryL = Math.min(primaryL + 5, 60); // Slightly lighter
        const darkPrimaryHSLValue = `${darkPrimaryH} ${darkPrimaryS}% ${darkPrimaryL}%`;

        // Dark Secondary: Same hue, low saturation, dark
        const darkSecondaryH = secondaryH;
        const darkSecondaryS = Math.max(secondaryS, 10); // Ensure some saturation
        const darkSecondaryL = Math.max(Math.min(secondaryL - 75, 25), 15); // Much darker
        const darkSecondaryHSLValue = `${darkSecondaryH} ${darkSecondaryS}% ${darkSecondaryL}%`;

        // Dark Accent: Same as light accent but darker
        const darkAccentH = accentH;
        const darkAccentS = accentS;
        const darkAccentL = Math.max(accentL - 50, 25); // Much darker
        const darkAccentHSLValue = `${darkAccentH} ${darkAccentS}% ${darkAccentL}%`;

        // Dark Background: Very dark, slight hue from primary
        const darkBgH = primaryH;
        const darkBgS = Math.max(Math.min(primaryS - 60, 40), 30);
        const darkBgL = Math.max(Math.min(primaryL - 35, 10), 8);
        const darkBgHSLValue = `${darkBgH} ${darkBgS}% ${darkBgL}%`;

        // Dark Foreground: Near white
        const darkFgHSLValue = `${primaryH} 10% 95%`;

        // Create a complete set of light and dark colors
        const lightColors = { ...get().colors };
        const darkColors = { ...get().darkColors };

        // CHART COLORS
        // --------------------------
        // Create monochromatic chart colors based on the primary color
        const lightChartColors = generateChartColors(
          primaryHSLValue,
          secondaryHSLValue,
          accentHSLValue,
          false
        );

        // Create monochromatic chart colors for dark mode
        const darkChartColors = generateChartColors(
          darkPrimaryHSLValue,
          darkSecondaryHSLValue,
          darkAccentHSLValue,
          true
        );

        // Update light mode colors
        lightColors.background = bgHSLValue;
        lightColors.foreground = fgHSLValue;
        lightColors.primary = primaryHSLValue;
        lightColors.secondary = secondaryHSLValue;
        lightColors.accent = accentHSLValue;
        lightColors.card = bgHSLValue;
        lightColors.popover = bgHSLValue;
        lightColors.muted = secondaryHSLValue;

        // Calculate contrasting foreground colors for light mode
        lightColors.primaryForeground =
          calculateContrastingColor(primaryHSLValue);
        lightColors.secondaryForeground =
          calculateContrastingColor(secondaryHSLValue);
        lightColors.accentForeground =
          calculateContrastingColor(accentHSLValue);
        lightColors.cardForeground = fgHSLValue;
        lightColors.popoverForeground = fgHSLValue;
        lightColors.mutedForeground = `${secondaryH} 30% 45%`; // Medium contrast for muted text

        // Border and input colors for light mode
        lightColors.border = `${secondaryH} ${secondaryS}% ${Math.max(
          secondaryL - 10,
          80
        )}%`;
        lightColors.input = lightColors.border;
        lightColors.ring = primaryHSLValue;

        // Sidebar colors for light mode
        lightColors.sidebar = secondaryHSLValue;
        lightColors.sidebarForeground =
          calculateContrastingColor(secondaryHSLValue);
        lightColors.sidebarPrimary = primaryHSLValue;
        lightColors.sidebarPrimaryForeground =
          calculateContrastingColor(primaryHSLValue);
        lightColors.sidebarAccent = accentHSLValue;
        lightColors.sidebarAccentForeground =
          calculateContrastingColor(accentHSLValue);
        lightColors.sidebarBorder = lightColors.border;
        lightColors.sidebarRing = primaryHSLValue;

        // Update chart colors for light mode
        lightColors.chart1 = lightChartColors.chart1;
        lightColors.chart2 = lightChartColors.chart2;
        lightColors.chart3 = lightChartColors.chart3;
        lightColors.chart4 = lightChartColors.chart4;
        lightColors.chart5 = lightChartColors.chart5;

        // Update dark mode colors
        darkColors.background = darkBgHSLValue;
        darkColors.foreground = darkFgHSLValue;
        darkColors.primary = darkPrimaryHSLValue;
        darkColors.secondary = darkSecondaryHSLValue;
        darkColors.accent = darkAccentHSLValue;
        darkColors.card = `${darkBgH} ${darkBgS}% ${Math.min(
          darkBgL + 4,
          20
        )}%`; // Slightly lighter than background
        darkColors.popover = darkColors.card;
        darkColors.muted = darkSecondaryHSLValue;

        // Calculate contrasting foreground colors for dark mode
        darkColors.primaryForeground =
          calculateContrastingColor(darkPrimaryHSLValue);
        darkColors.secondaryForeground = calculateContrastingColor(
          darkSecondaryHSLValue
        );
        darkColors.accentForeground =
          calculateContrastingColor(darkAccentHSLValue);
        darkColors.cardForeground = darkFgHSLValue;
        darkColors.popoverForeground = darkFgHSLValue;
        darkColors.mutedForeground = `${darkSecondaryH} 15% 65%`;

        // Border and input colors for dark mode
        darkColors.border = `${darkSecondaryH} ${
          darkSecondaryS + 5
        }% ${Math.min(darkSecondaryL + 10, 30)}%`;
        darkColors.input = darkColors.border;
        darkColors.ring = darkPrimaryHSLValue;

        // Sidebar colors for dark mode
        // Get the dark background HSL components
        const darkBgParts = darkBgHSLValue.split(" ");
        const darkBgSaturation = parseInt(darkBgParts[1]);
        const darkBgLightness = parseInt(darkBgParts[2]);
        darkColors.sidebar = `${darkBgH} ${darkBgSaturation}% ${Math.min(
          darkBgLightness + 12,
          25
        )}%`;
        darkColors.sidebarForeground = darkFgHSLValue;
        darkColors.sidebarPrimary = darkPrimaryHSLValue;
        darkColors.sidebarPrimaryForeground =
          calculateContrastingColor(darkPrimaryHSLValue);
        darkColors.sidebarAccent = darkAccentHSLValue;
        darkColors.sidebarAccentForeground =
          calculateContrastingColor(darkAccentHSLValue);
        darkColors.sidebarBorder = darkColors.border;
        darkColors.sidebarRing = darkPrimaryHSLValue;

        // Update chart colors for dark mode
        darkColors.chart1 = darkChartColors.chart1;
        darkColors.chart2 = darkChartColors.chart2;
        darkColors.chart3 = darkChartColors.chart3;
        darkColors.chart4 = darkChartColors.chart4;
        darkColors.chart5 = darkChartColors.chart5;

        // Apply the new color scheme and update CSS variables
        set((state) => {
          const newState = {
            ...state,
            colors: lightColors,
            darkColors: darkColors,
            borderRadius: currentBorderRadius,
          };
          const colors = state.isDarkMode ? darkColors : lightColors;
          applyCSSVariables(colors, currentBorderRadius, state.fonts);
          updateThemeUrl(newState);
          return newState;
        });
      },

      setExportMenuOpen: (isOpen: boolean) => {
        set((state) => ({
          ...state,
          exportMenuOpen: isOpen,
        }));
      },

      setShareMenuOpen: (isOpen: boolean) => {
        set((state) => ({
          ...state,
          shareMenuOpen: isOpen,
        }));
      },

      getHexColor: (colorKey: ThemeColorKey): string => {
        const state = get();
        const colors = state.isDarkMode ? state.darkColors : state.colors;

        switch (colorKey) {
          case "foreground":
            return hslToHex(colors.foreground);
          case "background":
            return hslToHex(colors.background);
          case "primary":
            return hslToHex(colors.primary);
          case "secondary":
            return hslToHex(colors.secondary);
          case "accent":
            return hslToHex(colors.accent);
          default:
            return "#000000";
        }
      },

      getShareableUrl: () => {
        const state = get();
        return getShareableUrl(state);
      },

      getRegistryUrl: () => {
        const state = get();
        return getRegistryUrl(state);
      },

      generateCSSVariables: (useV3 = false) => {
        const state = get();
        const { colors, darkColors, borderRadius } = state;

        // For Tailwind v3 format, use HSL values directly without conversion
        if (useV3) {
          return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: ${colors.background};
    --foreground: ${colors.foreground};
    --card: ${colors.card};
    --card-foreground: ${colors.cardForeground};
    --popover: ${colors.popover};
    --popover-foreground: ${colors.popoverForeground};
    --primary: ${colors.primary};
    --primary-foreground: ${colors.primaryForeground};
    --secondary: ${colors.secondary};
    --secondary-foreground: ${colors.secondaryForeground};
    --muted: ${colors.muted};
    --muted-foreground: ${colors.mutedForeground};
    --accent: ${colors.accent};
    --accent-foreground: ${colors.accentForeground};
    --destructive: ${colors.destructive};
    --destructive-foreground: ${colors.primaryForeground};
    --border: ${colors.border};
    --input: ${colors.input};
    --ring: ${colors.ring};
    --radius: ${borderRadius}rem;
    --chart-1: ${colors.chart1};
    --chart-2: ${colors.chart2};
    --chart-3: ${colors.chart3};
    --chart-4: ${colors.chart4};
    --chart-5: ${colors.chart5};
    --sidebar-background: ${colors.sidebar};
    --sidebar-foreground: ${colors.sidebarForeground};
    --sidebar-primary: ${colors.sidebarPrimary};
    --sidebar-primary-foreground: ${colors.sidebarPrimaryForeground};
    --sidebar-accent: ${colors.sidebarAccent};
    --sidebar-accent-foreground: ${colors.sidebarAccentForeground};
    --sidebar-border: ${colors.sidebarBorder};
    --sidebar-ring: ${colors.sidebarRing};
  }

  .dark {
    --background: ${darkColors.background};
    --foreground: ${darkColors.foreground};
    --card: ${darkColors.card};
    --card-foreground: ${darkColors.cardForeground};
    --popover: ${darkColors.popover};
    --popover-foreground: ${darkColors.popoverForeground};
    --primary: ${darkColors.primary};
    --primary-foreground: ${darkColors.primaryForeground};
    --secondary: ${darkColors.secondary};
    --secondary-foreground: ${darkColors.secondaryForeground};
    --muted: ${darkColors.muted};
    --muted-foreground: ${darkColors.mutedForeground};
    --accent: ${darkColors.accent};
    --accent-foreground: ${darkColors.accentForeground};
    --destructive: ${darkColors.destructive};
    --destructive-foreground: ${darkColors.primaryForeground};
    --border: ${darkColors.border};
    --input: ${darkColors.input};
    --ring: ${darkColors.ring};
    --sidebar-background: ${darkColors.sidebar};
    --sidebar-foreground: ${darkColors.sidebarForeground};
    --sidebar-primary: ${darkColors.sidebarPrimary};
    --sidebar-primary-foreground: ${darkColors.sidebarPrimaryForeground};
    --sidebar-accent: ${darkColors.sidebarAccent};
    --sidebar-accent-foreground: ${darkColors.sidebarAccentForeground};
    --sidebar-border: ${darkColors.sidebarBorder};
    --sidebar-ring: ${darkColors.sidebarRing};
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}`.trim();
        }

        // For Tailwind v4 format with OKLCH colors (existing format)
        return `@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: ${borderRadius}rem;
  --background: ${formatToOklch(colors.background)};
  --foreground: ${formatToOklch(colors.foreground)};
  --card: ${formatToOklch(colors.card)};
  --card-foreground: ${formatToOklch(colors.cardForeground)};
  --popover: ${formatToOklch(colors.popover)};
  --popover-foreground: ${formatToOklch(colors.popoverForeground)};
  --primary: ${formatToOklch(colors.primary)};
  --primary-foreground: ${formatToOklch(colors.primaryForeground)};
  --secondary: ${formatToOklch(colors.secondary)};
  --secondary-foreground: ${formatToOklch(colors.secondaryForeground)};
  --muted: ${formatToOklch(colors.muted)};
  --muted-foreground: ${formatToOklch(colors.mutedForeground)};
  --accent: ${formatToOklch(colors.accent)};
  --accent-foreground: ${formatToOklch(colors.accentForeground)};
  --destructive: ${formatToOklch(colors.destructive)};
  --border: ${formatToOklch(colors.border)};
  --input: ${formatToOklch(colors.input)};
  --ring: ${formatToOklch(colors.ring)};
  --chart-1: ${formatToOklch(colors.chart1)};
  --chart-2: ${formatToOklch(colors.chart2)};
  --chart-3: ${formatToOklch(colors.chart3)};
  --chart-4: ${formatToOklch(colors.chart4)};
  --chart-5: ${formatToOklch(colors.chart5)};
  --sidebar: ${formatToOklch(colors.sidebar)};
  --sidebar-foreground: ${formatToOklch(colors.sidebarForeground)};
  --sidebar-primary: ${formatToOklch(colors.sidebarPrimary)};
  --sidebar-primary-foreground: ${formatToOklch(
    colors.sidebarPrimaryForeground
  )};
  --sidebar-accent: ${formatToOklch(colors.sidebarAccent)};
  --sidebar-accent-foreground: ${formatToOklch(colors.sidebarAccentForeground)};
  --sidebar-border: ${formatToOklch(colors.sidebarBorder)};
  --sidebar-ring: ${formatToOklch(colors.sidebarRing)};
}

.dark {
  --background: ${formatToOklch(darkColors.background)};
  --foreground: ${formatToOklch(darkColors.foreground)};
  --card: ${formatToOklch(darkColors.card)};
  --card-foreground: ${formatToOklch(darkColors.cardForeground)};
  --popover: ${formatToOklch(darkColors.popover)};
  --popover-foreground: ${formatToOklch(darkColors.popoverForeground)};
  --primary: ${formatToOklch(darkColors.primary)};
  --primary-foreground: ${formatToOklch(darkColors.primaryForeground)};
  --secondary: ${formatToOklch(darkColors.secondary)};
  --secondary-foreground: ${formatToOklch(darkColors.secondaryForeground)};
  --muted: ${formatToOklch(darkColors.muted)};
  --muted-foreground: ${formatToOklch(darkColors.mutedForeground)};
  --accent: ${formatToOklch(darkColors.accent)};
  --accent-foreground: ${formatToOklch(darkColors.accentForeground)};
  --destructive: ${formatToOklch(darkColors.destructive)};
  --border: ${formatToOklch(darkColors.border)};
  --input: ${formatToOklch(darkColors.input)};
  --ring: ${formatToOklch(darkColors.ring)};
  --chart-1: ${formatToOklch(darkColors.chart1)};
  --chart-2: ${formatToOklch(darkColors.chart2)};
  --chart-3: ${formatToOklch(darkColors.chart3)};
  --chart-4: ${formatToOklch(darkColors.chart4)};
  --chart-5: ${formatToOklch(darkColors.chart5)};
  --sidebar: ${formatToOklch(darkColors.sidebar)};
  --sidebar-foreground: ${formatToOklch(darkColors.sidebarForeground)};
  --sidebar-primary: ${formatToOklch(darkColors.sidebarPrimary)};
  --sidebar-primary-foreground: ${formatToOklch(
    darkColors.sidebarPrimaryForeground
  )};
  --sidebar-accent: ${formatToOklch(darkColors.sidebarAccent)};
  --sidebar-accent-foreground: ${formatToOklch(
    darkColors.sidebarAccentForeground
  )};
  --sidebar-border: ${formatToOklch(darkColors.sidebarBorder)};
  --sidebar-ring: ${formatToOklch(darkColors.sidebarRing)};
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}`.trim();
      },

      applyThemeState: (themeState: Partial<ThemeState>) => {
        set((state) => {
          // Create a new state by merging the current state with the provided theme state
          const newState = {
            ...state,
            ...themeState,
            colors: themeState.colors
              ? { ...state.colors, ...themeState.colors }
              : state.colors,
            darkColors: themeState.darkColors
              ? { ...state.darkColors, ...themeState.darkColors }
              : state.darkColors,
            fonts: themeState.fonts
              ? { ...state.fonts, ...themeState.fonts }
              : state.fonts,
            isDarkMode:
              themeState.isDarkMode !== undefined
                ? themeState.isDarkMode
                : state.isDarkMode,
          };

          // Apply CSS variables based on the current mode
          const colors = newState.isDarkMode
            ? newState.darkColors
            : newState.colors;
          applyCSSVariables(colors, newState.borderRadius, newState.fonts);

          // Explicitly toggle dark class
          if (newState.isDarkMode) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }

          // Update URL with new theme - using the complete state to ensure all parameters are included
          updateThemeUrl(newState as ThemeState);

          return newState;
        });
      },

      // Add these functions to the store
      // Update the setCurrentTheme function to ensure it applies the correct contrasting colors
      // Find the setCurrentTheme function and update it to include this logic

      setCurrentTheme: (themeName: string) => {
        set((state) => {
          const theme = state.predefinedThemes.find(
            (t) => t.name === themeName
          );
          if (!theme) return state;

          // Create new color objects to avoid reference issues
          const newLightColors = { ...state.colors };
          const newDarkColors = { ...state.darkColors };

          // Apply theme colors
          if (theme.colors) {
            // First apply all background colors to light mode
            Object.entries(theme.colors).forEach(([key, value]) => {
              if (key in newLightColors && !key.includes("foreground")) {
                newLightColors[key as keyof ThemeColors] = hexToHSL(value);
              }
            });

            // Calculate contrasting foreground colors for light mode
            newLightColors.primaryForeground = calculateContrastingColor(
              newLightColors.primary
            );
            newLightColors.secondaryForeground = calculateContrastingColor(
              newLightColors.secondary
            );
            newLightColors.accentForeground = calculateContrastingColor(
              newLightColors.accent
            );
            newLightColors.mutedForeground = calculateContrastingColor(
              newLightColors.muted,
              "mutedForeground"
            );
            newLightColors.cardForeground = calculateContrastingColor(
              newLightColors.card
            );
            newLightColors.popoverForeground = calculateContrastingColor(
              newLightColors.popover
            );
            newLightColors.sidebarForeground = calculateContrastingColor(
              newLightColors.sidebar
            );
            newLightColors.sidebarPrimaryForeground = calculateContrastingColor(
              newLightColors.sidebarPrimary
            );
            newLightColors.sidebarAccentForeground = calculateContrastingColor(
              newLightColors.sidebarAccent
            );

            // Generate dark mode colors based on light mode
            const generatedDarkColors = deriveDarkModeColors(newLightColors);

            // Update dark colors
            Object.keys(newDarkColors).forEach((key) => {
              newDarkColors[key as keyof ThemeColors] =
                generatedDarkColors[key as keyof ThemeColors];
            });

            // Apply chart colors if provided
            if (theme.colors.chart1) {
              newLightColors.chart1 = hexToHSL(theme.colors.chart1);
              // Generate corresponding dark mode chart color
              const [h, s, l] = newLightColors.chart1
                .split(" ")
                .map((part) => Number.parseFloat(part.replace("%", "")));
              newDarkColors.chart1 = `${h} ${Math.max(s, 60)}% ${Math.min(
                Math.max(l, 50),
                60
              )}%`;
            }

            // Do the same for other chart colors
            if (theme.colors.chart2) {
              newLightColors.chart2 = hexToHSL(theme.colors.chart2);
              const [h, s, l] = newLightColors.chart2
                .split(" ")
                .map((part) => Number.parseFloat(part.replace("%", "")));
              newDarkColors.chart2 = `${h} ${Math.max(s, 60)}% ${Math.min(
                Math.max(l, 50),
                60
              )}%`;
            }

            if (theme.colors.chart3) {
              newLightColors.chart3 = hexToHSL(theme.colors.chart3);
              const [h, s, l] = newLightColors.chart3
                .split(" ")
                .map((part) => Number.parseFloat(part.replace("%", "")));
              newDarkColors.chart3 = `${h} ${Math.max(s, 60)}% ${Math.min(
                Math.max(l, 50),
                60
              )}%`;
            }

            if (theme.colors.chart4) {
              newLightColors.chart4 = hexToHSL(theme.colors.chart4);
              const [h, s, l] = newLightColors.chart4
                .split(" ")
                .map((part) => Number.parseFloat(part.replace("%", "")));
              newDarkColors.chart4 = `${h} ${Math.max(s, 60)}% ${Math.min(
                Math.max(l, 50),
                60
              )}%`;
            }

            if (theme.colors.chart5) {
              newLightColors.chart5 = hexToHSL(theme.colors.chart5);
              const [h, s, l] = newLightColors.chart5
                .split(" ")
                .map((part) => Number.parseFloat(part.replace("%", "")));
              newDarkColors.chart5 = `${h} ${Math.max(s, 60)}% ${Math.min(
                Math.max(l, 50),
                60
              )}%`;
            }
          }

          // Apply theme fonts if specified
          const newFonts = { ...state.fonts };
          if (theme.fonts) {
            if (theme.fonts.heading) newFonts.heading = theme.fonts.heading;
            if (theme.fonts.body) newFonts.body = theme.fonts.body;
          }

          // Apply border radius if specified
          const newBorderRadius =
            theme.borderRadius !== undefined
              ? theme.borderRadius
              : state.borderRadius;

          // Create the new state
          const newState = {
            ...state,
            colors: newLightColors,
            darkColors: newDarkColors,
            fonts: newFonts,
            borderRadius: newBorderRadius,
            currentTheme: themeName,
          };

          // Apply CSS variables based on current mode
          const colors = state.isDarkMode ? newDarkColors : newLightColors;
          applyCSSVariables(colors, newBorderRadius, newFonts);

          // Update URL with new theme
          updateThemeUrl(newState);

          return newState;
        });
      },

      addCustomTheme: (theme: ThemePreset) => {
        set((state) => {
          // Check if a theme with this name already exists
          const existingIndex = state.predefinedThemes.findIndex(
            (t) => t.name === theme.name
          );

          // Create a new array of themes
          const newThemes = [...state.predefinedThemes];

          if (existingIndex >= 0) {
            // Replace existing theme
            newThemes[existingIndex] = theme;
          } else {
            // Add new theme
            newThemes.push(theme);
          }

          return {
            ...state,
            predefinedThemes: newThemes,
          };
        });
      },

      // Fix the saveCurrentAsTheme function to use the generateChartColors function
      saveCurrentAsTheme: (name: string) => {
        set((state) => {
          // Get the current colors in HSL format
          const primaryHSL = hexToHSL(state.getHexColor("primary"));
          const secondaryHSL = hexToHSL(state.getHexColor("secondary"));
          const accentHSL = hexToHSL(state.getHexColor("accent"));

          // Generate chart colors using the proper function
          const chartColors = generateChartColors(
            primaryHSL,
            secondaryHSL,
            accentHSL,
            state.isDarkMode
          );

          const currentColors = {
            background: state.getHexColor("background"),
            foreground: state.getHexColor("foreground"),
            primary: state.getHexColor("primary"),
            secondary: state.getHexColor("secondary"),
            accent: state.getHexColor("accent"),
            chart1: hslToHex(chartColors.chart1),
            chart2: hslToHex(chartColors.chart2),
            chart3: hslToHex(chartColors.chart3),
            chart4: hslToHex(chartColors.chart4),
            chart5: hslToHex(chartColors.chart5),
          };

          const newTheme: ThemePreset = {
            name,
            colors: currentColors,
            fonts: { ...state.fonts },
            borderRadius: state.borderRadius,
          };

          // Add or update the theme
          state.addCustomTheme(newTheme);

          return {
            ...state,
            currentTheme: name,
          };
        });
      },
    }),
    {
      name: "theme-store",
      partialize: (state) => ({
        colors: state.colors,
        darkColors: state.darkColors,
        fonts: state.fonts,
        borderRadius: state.borderRadius,
        isDarkMode: state.isDarkMode,
        selectedHarmony: state.selectedHarmony,
        exportMenuOpen: state.exportMenuOpen,
        shareMenuOpen: state.shareMenuOpen,
        predefinedThemes: state.predefinedThemes,
        currentTheme: state.currentTheme,
      }),
    }
  )
);

// Initialize theme on client side
if (typeof window !== "undefined") {
  // Apply theme to CSS variables
  const state = useThemeStore.getState();
  const colors = state.isDarkMode ? state.darkColors : state.colors;
  applyCSSVariables(colors, state.borderRadius, state.fonts);

  // Toggle dark class
  if (state.isDarkMode) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

// Find the updateThemeUrl function at the end of the file and replace it with this implementation:
const updateThemeUrl = (themeState: ThemeState) => {
  if (typeof window === "undefined") return;

  try {
    // Create a base URL with just the origin and pathname
    const baseUrl = window.location.pathname;

    // Use the optimized encoding function from theme-url.ts
    const encodedTheme = encodeThemeState(themeState);

    // Create the new URL with the theme parameter
    const newUrl = `${baseUrl}?theme=${encodedTheme}`;

    // Update the URL without reloading the page
    window.history.replaceState({}, document.title, newUrl);

    console.log("URL updated with optimized theme parameter");
  } catch (error) {
    console.error("Error updating URL with theme:", error);
  }
};

// Add the encodeThemeState function for use in updateThemeUrl
function encodeThemeState(theme: ThemeState): string {
  // Create a minimal version of the theme state with only essential values
  // The rest will be derived during decoding
  const minimalTheme = {
    // Light mode essential colors (5 base colors)
    l: {
      bg: compactHSL(theme.colors.background),
      fg: compactHSL(theme.colors.foreground),
      p: compactHSL(theme.colors.primary),
      s: compactHSL(theme.colors.secondary),
      a: compactHSL(theme.colors.accent),
      d: compactHSL(theme.colors.destructive),
    },
    // Dark mode essential colors (only if custom dark mode colors are used)
    ...(theme.isDarkMode && {
      d: {
        bg: compactHSL(theme.darkColors.background),
        fg: compactHSL(theme.darkColors.foreground),
        p: compactHSL(theme.darkColors.primary),
        s: compactHSL(theme.darkColors.secondary),
        a: compactHSL(theme.darkColors.accent),
        d: compactHSL(theme.darkColors.destructive),
      },
    }),
    // Fonts (only if not default)
    ...((theme.fonts.heading !== "Geist" || theme.fonts.body !== "Geist") && {
      f: [
        theme.fonts.heading === "Geist" ? null : theme.fonts.heading,
        theme.fonts.body === "Geist" ? null : theme.fonts.body,
      ],
    }),
    // Border radius (only if not default)
    ...(theme.borderRadius !== 8 && { r: theme.borderRadius }),
    // Dark mode flag
    ...(theme.isDarkMode && { dm: 1 }),
  };

  // Remove null values from fonts array
  if (minimalTheme.f) {
    if (minimalTheme.f[0] === null && minimalTheme.f[1] === null) {
      delete minimalTheme.f;
    } else if (minimalTheme.f[0] === null) {
      minimalTheme.f = [null, minimalTheme.f[1]];
    } else if (minimalTheme.f[1] === null) {
      minimalTheme.f = [minimalTheme.f[0]];
    }
  }

  // Convert to JSON and encode to base64
  try {
    return btoa(JSON.stringify(minimalTheme));
  } catch (error) {
    console.error("Error encoding theme state:", error);
    return "";
  }
}

/**
 * Compresses an HSL color string to a more compact format
 * Input: "120 50% 75%"
 * Output: "120,50,75"
 */
function compactHSL(hsl: string): string {
  return hsl.replace(/\s+/g, ",").replace(/%/g, "");
}
