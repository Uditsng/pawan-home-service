"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

let hasShownSplash = false;

export default function SplashLoader() {
  const [show, setShow] = useState(!hasShownSplash);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    console.log("PHS SplashLoader: Component mounted client-side");
    if (hasShownSplash) {
      console.log("PHS SplashLoader: Already shown, skipping animation");
      return;
    }

    // Start fade out after initial mount
    const fadeTimer = setTimeout(() => {
      console.log("PHS SplashLoader: Triggering fade-out");
      setIsFading(true);
      
      // Completely remove from DOM after fade animation (500ms)
      const removeTimer = setTimeout(() => {
        console.log("PHS SplashLoader: Fading done, removing from DOM");
        setShow(false);
        hasShownSplash = true;
      }, 500);

      return () => clearTimeout(removeTimer);
    }, 1200); // Keep visible for 1.2s to look natural and let Next.js hydrate

    return () => clearTimeout(fadeTimer);
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-9999 flex flex-col items-center justify-center bg-primary transition-opacity duration-500 ease-in-out pb-safe pt-safe ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center space-y-6">
        {/* Animated Brand Logo Container */}
        <div className="relative w-32 h-32 rounded-3xl overflow-hidden shadow-lg">
          <Image
            src="/app-icon.png"
            alt="PHS Logo"
            fill
            sizes="128px"
            className="object-cover rounded-3xl"
            priority
          />
        </div>

        {/* Text Brand and Spinner */}
        <div className="flex flex-col items-center space-y-4">
          <h1 className="text-2xl font-bold text-on-primary tracking-wide">
            PHS Cleaning Company
          </h1>
          <p className="text-sm text-on-primary/60 font-medium">
            Premium Home Services
          </p>
          
          {/* Custom Atlantis Green Spinner */}
          <div className="mt-4 flex items-center justify-center">
            <span className="w-8 h-8 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
