"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image"

export default function PartnerHeader() {
  const [isOnline, setIsOnline] = useState(true);

  return (
    <header className="bg-surface-dim sticky top-0 z-50 transition-colors border-b border-surface-variant/20">
      <div className="flex justify-between items-center px-6 py-4 w-full max-w-7xl mx-auto">
        {/* Platform Logo */}
        <Link href="/partner/dashboard" className="flex items-center gap-2">
          <Image
            src="/logo.jpg"
            alt="PavanHomeServices Logo"
            className="h-12 md:h-14 w-auto rounded-lg shadow-sm"
            width={40}
            height={40}
          />
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Status Toggle */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            className="flex items-center bg-surface-container-lowest border border-outline-variant/10 shadow-sm px-3 py-1.5 rounded-full gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <div className={`w-2.5 h-2.5 rounded-full transition-colors ${isOnline ? 'bg-secondary shadow-[0_0_8px_rgba(42,245,152,0.5)]' : 'bg-outline-variant'}`}></div>
            <span className="font-label text-[11px] font-bold tracking-widest uppercase text-primary">
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </button>

          {/* Notification icon */}
          <button className="h-10 w-10 flex flex-col justify-center items-center text-on-surface-variant hover:bg-surface-container-low rounded-full transition-colors active:scale-95 text-2xl">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </div>
    </header>
  );
}
