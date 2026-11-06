import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CommandPalette } from "@/components/command-palette";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

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
    "An independent, data-first guide to Tamil Nadu engineering admissions. Explore 447 colleges, six years of TNEA cutoffs, seat data, and build a choice list you can defend.",
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
      "Explore 447 Tamil Nadu engineering colleges, six years of cutoffs, and build a smarter choice list.",
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
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>
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
            <Toaster position="top-center" richColors closeButton />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
