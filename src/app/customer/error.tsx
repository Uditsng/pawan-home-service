"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function CustomerErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Customer route error encountered:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 font-body text-on-surface">
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 text-center space-y-6 shadow-[rgba(30,41,59,0.06)_0px_20px_40px]">
        {/* Error Icon */}
        <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mx-auto text-primary">
          <span className="material-symbols-outlined text-3xl font-bold">
            gpp_maybe
          </span>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-2">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-background">
            Something went wrong
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            An unexpected error occurred in your portal. Please try again or return to your dashboard.
          </p>
        </div>

        {/* Technical Error details (toggled) */}
        {error.message && (
          <div className="p-3 bg-surface-container rounded-xl text-left border border-outline-variant/10">
            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-1">
              Error Message
            </p>
            <p className="text-[11px] font-mono break-all text-on-surface opacity-80 line-clamp-2">
              {error.message}
            </p>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-3 px-6 rounded-xl font-headline font-bold text-sm bg-primary text-white hover:opacity-95 transition-all shadow-[rgba(30,41,59,0.06)_0px_12px_32px] cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/customer/dashboard"
            className="flex-1 py-3 px-6 rounded-xl font-headline font-bold text-sm bg-surface-container-high text-primary hover:bg-surface-container-highest transition-all border border-outline-variant/20 text-center cursor-pointer"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
