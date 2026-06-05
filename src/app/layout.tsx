import type { Metadata, Viewport } from "next";
import "./globals.css";
import MobileSetup from "@/components/MobileSetup";

export const metadata: Metadata = {
  title: "PHS Company",
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
     <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background font-body text-on-surface antialiased" suppressHydrationWarning>
        <MobileSetup />
        {children}
      </body>
    </html>
  );
}
