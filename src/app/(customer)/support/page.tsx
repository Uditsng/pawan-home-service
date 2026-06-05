import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import CustomerHeader from "@/components/CustomerHeader";
import SupportClient from "./SupportClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & Support | PHS Company",
  description: "Have questions or need assistance? Contact our team.",
};

export default function SupportPage() {
  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen pb-28 font-body">
      <CustomerHeader />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10">

        {/* Navigation & Header */}
        <div className="mb-6">
          <h1 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface">
            Help & Support
          </h1>
          <p className="text-on-surface-variant text-xs md:text-sm font-medium mt-1">
            Have questions or need assistance? Our team is here to help you.
          </p>
        </div>

        {/* Client-side bento layout */}
        <SupportClient />

      </main>

      <BottomNav />
    </div>
  );
}
