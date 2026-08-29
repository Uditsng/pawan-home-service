"use client";

import { useEffect } from "react";

/**
 * Checks if the event target is an HTML <input type="number"> element.
 */
function isNumberInput(target: EventTarget | null): target is HTMLInputElement {
  return (
    target instanceof HTMLInputElement &&
    target.type === "number"
  );
}

/**
 * GlobalNumberInputPolicy
 * 
 * Enforces a application-wide policy for all <input type="number"> elements:
 * 1. Blocks mouse wheel / trackpad scrolling from incrementing or decrementing number input values.
 * 2. Blocks ArrowUp and ArrowDown keys from incrementing or decrementing number input values.
 * 3. Does not affect normal page scrolling, text/range inputs, textareas, or standard text typing/editing.
 */
export default function GlobalNumberInputPolicy() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Prevent wheel scrolling on number inputs from modifying their value
    const handleWheel = (e: WheelEvent) => {
      if (isNumberInput(e.target)) {
        e.preventDefault();
      }
    };

    // Prevent ArrowUp and ArrowDown keys on number inputs from modifying their value
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "ArrowUp" || e.key === "ArrowDown") &&
        isNumberInput(e.target)
      ) {
        e.preventDefault();
      }
    };

    // Attach non-passive wheel listener so preventDefault works, and keydown listener
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}
