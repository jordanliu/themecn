import type React from "react";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  weight: "400",
  subsets: ["latin"],
});

export const metadata = {
  title: "themecn - Theme Builder for shadcn/ui",
  description:
    "themecn makes it easy to create, visualize, and export custom themes for your shadcn/ui projects. Create your perfect theme in real-time with our intuitive interface.",
  openGraph: {
    title: "themecn",
    description:
      "themecn makes it easy to create, visualize, and export custom themes for your shadcn/ui projects. Create your perfect theme in real-time with our intuitive interface.",
    images: ["/og.png"],
    url: "https://themecn.dev",
    type: "website",
    siteName: "themecn",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={geist.className}>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
