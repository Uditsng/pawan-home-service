"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import AddAddressModal from "./AddAddressModal";

interface HeaderLocationDisplayProps {
  defaultAddress: {
    label: string;
    city: string;
    formatted_address: string;
  } | null;
}

export default function HeaderLocationDisplay({ defaultAddress }: HeaderLocationDisplayProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  const displayText = defaultAddress
    ? `${defaultAddress.city || defaultAddress.label}`
    : "Add Address";

  const subText = defaultAddress
    ? defaultAddress.formatted_address
    : "Set your service location";

  return (
    <>
      <button
        onClick={() => {
          if (defaultAddress) {
            router.push("/customer/profile/addresses");
          } else {
            setIsModalOpen(true);
          }
        }}
        className="flex items-center gap-2 hover:opacity-80 transition-all group max-w-[180px] md:max-w-[260px]"
        title={defaultAddress?.formatted_address || "Add your address"}
      >
        <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">
          location_on
        </span>
        <div className="text-left min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-manrope text-xs md:text-sm font-bold tracking-tight text-on-surface truncate">
              {displayText}
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-[14px] shrink-0 group-hover:rotate-180 transition-transform">
              expand_more
            </span>
          </div>
          <p className="text-[10px] text-on-surface-variant/70 truncate leading-tight hidden md:block">
            {subText}
          </p>
        </div>
      </button>

      {/* Portal: renders modal at document.body to escape header's stacking context */}
      {mounted &&
        createPortal(
          <AddAddressModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSaved={() => router.refresh()}
          />,
          document.body
        )}
    </>
  );
}
