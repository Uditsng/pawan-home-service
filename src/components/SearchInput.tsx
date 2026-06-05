"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchInput({ defaultValue = "" }: { defaultValue?: string }) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <section className="mb-10">
      <form onSubmit={handleSearch} className="relative group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
          <span className="material-symbols-outlined text-primary">search</span>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          name="search"
          id="global-services-search"
          suppressHydrationWarning={true}
          className="w-full h-16 pl-14 pr-6 bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-[0_8px_24px_rgba(15,23,42,0.04)] focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline text-on-surface font-medium outline-none"
          placeholder="Search AC repair, cleaning, plumber..."
          type="text"
        />
        <button 
          type="submit" 
          className="absolute right-2 top-2 bottom-2 px-4 bg-primary text-on-primary rounded-lg font-bold hover:opacity-90 transition-opacity"
        >
          Go
        </button>
      </form>
    </section>
  );
}
