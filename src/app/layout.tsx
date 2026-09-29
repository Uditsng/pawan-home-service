import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import SkipToContent from "@/components/SkipToContent";
import MobileSetupLoader from "@/components/MobileSetupLoader";
import SplashLoader from "@/components/SplashLoader";
import GlobalNumberInputPolicy from "@/components/GlobalNumberInputPolicy";
import { RefreshProvider } from "@/lib/refresh/RefreshContext";
import VersionAlert from "@/components/VersionAlert";
import OfflineOverlay from "@/components/OfflineOverlay";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';


const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

// Material Symbols Outlined, subset by scripts/build-material-subset.py.
// next/font/local emits the file under /_next/static/media/ with a content
// hash, so regenerating the subset can never be served from an immutable
// cache under a stale URL (the old hand-maintained ?v= query could, and did).
// display:block hides the raw ligature text until the glyphs arrive, and
// adjustFontFallback is off because an Arial fallback would render the icon
// names as words.
const materialSymbols = localFont({
  src: "../../public/fonts/material-symbols-subset.woff2",
  weight: "100 700",
  style: "normal",
  display: "block",
  preload: true,
  adjustFontFallback: false,
  variable: "--font-material-symbols",
});

export const metadata: Metadata = {
  title: "PHS Cleaning Company",
  description: "Premium Home Services at Your Doorstep",
  manifest: "/manifest.json",
  metadataBase: new URL("https://www.phscleaningcompany.com"),
  openGraph: {
    title: "PHS Cleaning Company",
    description: "Premium Home Services at Your Doorstep",
    url: "https://www.phscleaningcompany.com",
    siteName: "PHS Cleaning Company",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PHS Cleaning Company",
    description: "Premium Home Services at Your Doorstep",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
     <html
       lang="en"
       className={`${bricolage.variable} ${materialSymbols.variable}`}
       suppressHydrationWarning
     >
      <body className="bg-background font-body text-on-surface antialiased" suppressHydrationWarning>
        <SkipToContent />
        <RefreshProvider>
          <GlobalNumberInputPolicy />
          <MobileSetupLoader />
          <SplashLoader />
          <VersionAlert />
          <OfflineOverlay />
          {children}
        </RefreshProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
