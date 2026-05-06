import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Manrope, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage" });

export const metadata: Metadata = {
  title: "PavanHomeServices",
  description: "Premium Home Services at Your Doorstep",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
     <html lang="en" className={`${bricolage.variable} ${inter.variable} ${jakarta.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background font-body text-on-surface antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
