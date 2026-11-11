import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CommandPalette } from "@/components/command-palette";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChoicesProvider } from "@/components/choices-provider";
import { DpdpConsentBanner } from "@/components/dpdp-consent-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TNEA Compass — Find the college that fits your rank",
    template: "%s · TNEA Compass",
  },
  description:
    "An independent, data-first guide to Tamil Nadu engineering admissions. Explore 478 colleges, seven years of TNEA cutoffs, seat data, and build a choice list you can defend.",
  keywords: [
    "TNEA",
    "Tamil Nadu engineering admissions",
    "TNEA cutoff",
    "TNEA rank predictor",
    "college choice filling",
    "TNEA counselling",
  ],
  openGraph: {
    title: "TNEA Compass — Find the college that fits your rank",
    description:
      "Explore 478 Tamil Nadu engineering colleges, seven years of cutoffs, and build a smarter choice list.",
    type: "website",
    locale: "en_IN",
    siteName: "TNEA Compass",
  },
  twitter: {
    card: "summary_large_image",
    title: "TNEA Compass",
    description:
      "An independent, data-first guide to Tamil Nadu engineering admissions.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} min-h-screen antialiased`}
      >
        {/*
          Reveal animations only run when JavaScript is available. Without this
          class the content stays visible, so a failed script or a strict CSP
          cannot leave the page blank.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: "document.documentElement.classList.add('js')",
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>
            <ChoicesProvider>
              <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
              >
                Skip to content
              </a>
              <div className="flex min-h-screen flex-col">
                <SiteHeader />
                <main id="main" className="flex-1">
                  {children}
                </main>
                <SiteFooter />
              </div>
              <CommandPalette />
              <DpdpConsentBanner />
              <Toaster position="top-center" richColors closeButton />
            </ChoicesProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
