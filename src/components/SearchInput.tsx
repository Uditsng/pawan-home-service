"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ServiceIconComponent } from "@/utils/serviceIcon";
import ServiceCardThumbnail from "@/components/ServiceCardThumbnail";

interface SuggestionSubcategory {
  id: string;
  subcategory_name: string;
  icon_name: string;
  category_name: string;
  category_slug: string;
  score: number;
}

interface SuggestionService {
  id: string;
  title: string;
  base_price: number;
  original_price?: number | null;
  image_url?: string | null;
  status?: string;
  icon_name: string;
  category_name: string;
  category_slug: string;
  subcategory_name: string;
  subcategory_id: string;
  score: number;
}

export default function SearchInput({ defaultValue = "" }: { defaultValue?: string }) {
  const [query, setQuery] = useState(defaultValue);
  const [subcategories, setSubcategories] = useState<SuggestionSubcategory[]>([]);
  const [services, setServices] = useState<SuggestionService[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleInputChange = (val: string) => {
    setQuery(val);
    if (val.trim().length < 1) {
      setSubcategories([]);
      setServices([]);
      setIsOpen(false);
    }
  };

  // Debounced autocomplete suggestion fetch
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) return;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = (await res.json()) as {
            subcategories: SuggestionSubcategory[];
            services: SuggestionService[];
          };
          setSubcategories(data.subcategories || []);
          setServices(data.services || []);
          setIsOpen((data.subcategories?.length > 0 || data.services?.length > 0));
        }
      } catch (err) {
        console.error("Failed to fetch suggestions", err);
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  // Dismiss dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      router.push(`/customer/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const hasSuggestions = subcategories.length > 0 || services.length > 0;

  return (
    <section className="mb-6 relative" ref={containerRef}>
      <form onSubmit={handleSearch} className="relative group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
          <span className="material-symbols-outlined text-primary">search</span>
        </div>
        <input
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (hasSuggestions && query.trim().length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          autoComplete="off"
          name="search"
          id="global-services-search"
          suppressHydrationWarning={true}
          className="w-full h-14 md:h-16 pl-14 pr-20 bg-surface-container-lowest rounded-xl border border-outline-variant/20 shadow-xs focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40 text-on-surface font-medium outline-none text-sm md:text-base"
          placeholder="Search AC, sofa cleaning, plumber, electrician..."
          type="text"
        />

        {isLoading && (
          <div className="absolute right-16 top-0 bottom-0 flex items-center pr-2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        <button
          type="submit"
          className="absolute right-2 top-2 bottom-2 px-4 bg-primary text-on-primary rounded-lg font-bold hover:bg-primary/90 transition-all text-xs md:text-sm shadow-xs"
        >
          Go
        </button>
      </form>

      {/* Live Suggestions Dropdown */}
      {isOpen && hasSuggestions && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="max-h-105 overflow-y-auto divide-y divide-outline-variant/10">
            {/* 1. Matched Subcategories */}
            {subcategories.length > 0 && (
              <div className="p-3 bg-surface-container-low/40">
                <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 mb-2 px-2">
                  Matching Subcategories
                </div>
                <div className="space-y-1">
                  {subcategories.map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/customer/services/${sub.category_slug}/sub/${sub.id}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-container transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                          <ServiceIconComponent
                            iconName={sub.icon_name}
                            className="w-4 h-4 text-[#059669] drop-shadow-sm"
                          />
                        </div>
                        <div>
                          <div className="text-xs md:text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                            {sub.subcategory_name}
                          </div>
                          <div className="text-[10px] text-on-surface-variant">
                            in {sub.category_name}
                          </div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-sm text-on-surface-variant/40 group-hover:text-primary transition-colors">
                        arrow_forward
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Matched Services */}
            {services.length > 0 && (
              <div className="p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 mb-2 px-2">
                  Services
                </div>
                <div className="space-y-1">
                  {services.map((srv) => {
                    const isUpcoming = srv.status === "upcoming";
                    return (
                      <Link
                        key={srv.id}
                        href={`/customer/services/${srv.category_slug}/${srv.id}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-container transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <ServiceCardThumbnail
                            imageUrl={srv.image_url}
                            iconName={srv.icon_name}
                            alt={srv.title}
                            status={srv.status}
                            containerClassName="w-10 h-10 rounded-lg shrink-0"
                            iconClassName="w-4 h-4 text-[#059669] drop-shadow-sm"
                          />
                          <div className="min-w-0">
                            <div className="text-xs md:text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                              {srv.title}
                            </div>
                            <div className="text-[10px] text-on-surface-variant truncate">
                              {srv.subcategory_name || srv.category_name}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {isUpcoming ? (
                            <span className="text-[9px] text-secondary font-black tracking-tight uppercase bg-primary/90 px-1.5 py-0.5 rounded">
                              Soon
                            </span>
                          ) : (
                            <span className="font-bold text-xs md:text-sm text-primary">
                              ₹{srv.base_price}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* View all results button */}
            <div className="p-2 bg-surface-container-low/30 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push(`/customer/search?q=${encodeURIComponent(query.trim())}`);
                }}
                className="w-full py-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1"
              >
                <span>View all results for &quot;{query.trim()}&quot;</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
