"use client";
import { useEffect, useState } from "react";
import LandingPage from "@/components/landing-page";
import ThemeDock from "@/components/theme-dock/theme-dock";
import { useThemeStore } from "@/lib/store";
import { getThemeFromUrl } from "@/lib/theme-url";

export default function Home() {
  const [themeLoaded, setThemeLoaded] = useState(false);

  // Apply theme from URL on client-side navigation
  useEffect(() => {
    let isMounted = true; // Track if component is mounted

    try {
      // Get theme from URL
      const urlTheme = getThemeFromUrl();

      if (urlTheme && isMounted) {
        console.log("Applying theme from URL");
        const store = useThemeStore.getState();

        // Apply the entire theme state at once
        store.applyThemeState(urlTheme);

        // Explicitly handle dark mode class
        if (urlTheme.isDarkMode) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } else if (isMounted) {
        // No theme in URL, explicitly apply the default theme
        console.log("No theme in URL, applying default theme");
        const store = useThemeStore.getState();
        store.resetTheme();
      }

      // Allow a brief delay for theme to be applied
      setThemeLoaded(true);
    } catch (error) {
      console.error("Error applying theme from URL:", error);
      setThemeLoaded(true);
    }

    // Cleanup function to prevent state updates after unmounting
    return () => {
      isMounted = false;
    };
  }, []);

  if (!themeLoaded) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        Loading theme...
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <LandingPage />
      <ThemeDock />
    </main>
  );
}
