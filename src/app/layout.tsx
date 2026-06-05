import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });

export const metadata: Metadata = {
  title: "PHS Company",
  description: "Premium Home Services at Your Doorstep",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
     <html lang="en" className={bricolage.variable} suppressHydrationWarning>
      <head />
      <body className="bg-background font-body text-on-surface antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
