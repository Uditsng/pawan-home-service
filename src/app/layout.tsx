import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import MobileSetup from "@/components/MobileSetup";
import SplashLoader from "@/components/SplashLoader";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PHS Cleaning Company",
  description: "Premium Home Services at Your Doorstep",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
     <html lang="en" className={`${bricolage.variable}`} suppressHydrationWarning>
      <body className="bg-background font-body text-on-surface antialiased" suppressHydrationWarning>
        <MobileSetup />
        <SplashLoader />
        {children}
      </body>
    </html>
  );
}
