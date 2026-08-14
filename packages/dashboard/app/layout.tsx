import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { DM_Mono, DM_Sans, Space_Grotesk } from "next/font/google";
import { MockFailSwitch } from "@/components/shell/MockFailSwitch";
import { ToastProvider } from "@/components/ui";
import { THEME_BOOT_SCRIPT, ThemeProvider } from "@/lib/theme";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "CORTEX",
  description: "Your own context engine. Runs on your account, in your repo.",
};

/**
 * Without this, a mobile browser renders the page at a 980px virtual viewport
 * and scales the result down. Every `sm:` and `lg:` breakpoint in the app is
 * evaluated against that fake width, so the single-column layouts that already
 * exist never activate — the responsive CSS is written and unreachable, and the
 * phone gets a shrunken desktop instead.
 *
 * `maximumScale` is deliberately absent: capping zoom is an accessibility
 * regression, and the graph canvas handles its own gestures via `touch-action`
 * rather than by disabling the browser's.
 *
 * `viewportFit: "cover"` lets the layout reach under the notch; the safe-area
 * insets in globals.css are what keep content out from behind it.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f12" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${dmMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          Sets data-theme before first paint so there is no light flash, and so
          the attribute is ALWAYS concrete — that is what makes the toggle a
          one-click, one-change control. THEME_BOOT_SCRIPT is a module-level
          constant built from string literals; no user input reaches it.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="h-full">
        <ThemeProvider>
          <ToastProvider>
            <Suspense fallback={null}>
              <MockFailSwitch />
            </Suspense>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
