import BottomNav from "@/components/BottomNav";
import SupportClient from "./SupportClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & Support | PHS Cleaning Company",
  description: "Have questions or need assistance? Contact our team.",
};

export default function SupportPage() {
  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-28 font-body">

      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="border-b border-outline-variant/15 pb-6">
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
            Help & Support
          </h1>
          <p className="text-on-surface-variant text-sm font-medium mt-1">
            Have questions or need assistance? Our team is here to help you.
          </p>
        </div>

        {/* Client-side layout */}
        <SupportClient />
      </main>

      <BottomNav />
    </div>
  );
}
