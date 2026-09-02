import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import SkipToContent from "@/components/SkipToContent";
import MobileSetup from "@/components/MobileSetup";
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
     <html lang="en" className={`${bricolage.variable}`} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="bg-background font-body text-on-surface antialiased" suppressHydrationWarning>
        <SkipToContent />
        <RefreshProvider>
          <GlobalNumberInputPolicy />
          <MobileSetup />
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
