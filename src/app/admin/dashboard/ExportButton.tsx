"use client";

import { exportFinancialCSV } from "./actions";
import { useState, useTransition } from "react";

export function ExportButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleExport = () => {
    setError(null);
    startTransition(async () => {
      try {
        const { csv, filename } = await exportFinancialCSV();
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err: unknown) {
        setError((err as Error).message || "Export failed");
      }
    });
  };

  return (
    <div className="relative">
      <button
        onClick={handleExport}
        disabled={isPending}
        className="w-8 h-8 rounded-xl bg-surface-container-high text-primary flex items-center justify-center hover:bg-secondary hover:text-primary transition-all shadow-sm disabled:opacity-40 cursor-pointer"
        title="Export Financial CSV"
      >
        <span className="material-symbols-outlined text-[18px]">
          {isPending ? "hourglass_empty" : "download"}
        </span>
      </button>
      {error && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-red-500/10 border border-red-500/20 text-red-700 text-[9px] font-bold p-2 rounded-lg z-10">
          {error}
        </div>
      )}
    </div>
  );
}
