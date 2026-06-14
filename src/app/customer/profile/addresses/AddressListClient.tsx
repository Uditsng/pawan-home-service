"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import AddAddressModal from "@/components/AddAddressModal";
import { deleteAddress, setDefaultAddress } from "@/app/actions/address";
import type { UserAddress } from "@/lib/types/address";

interface AddressListClientProps {
  addresses: UserAddress[];
}

const LABEL_ICONS: Record<string, string> = {
  Home: "home",
  Work: "work",
  Other: "location_on",
};

export default function AddressListClient({ addresses }: AddressListClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteAddress(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    router.refresh();
  };

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    await setDefaultAddress(id);
    setSettingDefaultId(null);
    router.refresh();
  };

  return (
    <>
      {/* Add Address button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full flex items-center gap-3 p-4 md:p-5 bg-surface-container-lowest rounded-xl shadow-sm mb-4 border border-dashed border-secondary/40 hover:border-secondary hover:bg-secondary/5 transition-all group"
      >
        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0 group-hover:bg-secondary/20 transition-colors">
          <span className="material-symbols-outlined text-secondary text-[22px]">add</span>
        </div>
        <span className="text-[14px] font-bold text-secondary">Add New Address</span>
      </button>

      {/* Addresses list */}
      {addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-surface-container-low flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[36px] text-on-surface-variant/40">
              location_off
            </span>
          </div>
          <h3 className="text-[16px] font-bold text-on-surface mb-1">No saved addresses</h3>
          <p className="text-[13px] text-on-surface-variant mb-4 max-w-[240px]">
            Add your first address to quickly book services
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-[13px] font-bold hover:bg-primary/90 transition-colors"
          >
            Add Address
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden transition-all
                ${address.is_default ? "ring-2 ring-secondary/40" : "border border-outline-variant/30"}`}
            >
              <div className="p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  {/* Icon + Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-secondary text-[20px]">
                        {LABEL_ICONS[address.label] || "location_on"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[14px] font-bold text-on-surface">
                          {address.label}
                        </span>
                        {address.is_default && (
                          <span className="text-[9px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full uppercase tracking-widest">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-on-surface-variant leading-relaxed line-clamp-2">
                        {address.formatted_address}
                      </p>
                      {address.address_line_2 && (
                        <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
                          {address.address_line_2}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions menu */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!address.is_default && (
                      <button
                        onClick={() => handleSetDefault(address.id)}
                        disabled={settingDefaultId === address.id}
                        className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-low hover:text-secondary transition-colors disabled:opacity-50"
                        title="Set as default"
                      >
                        {settingDefaultId === address.id ? (
                          <div className="w-4 h-4 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-[18px]">
                            check_circle
                          </span>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDeleteId(address.id)}
                      disabled={deletingId === address.id}
                      className="p-2 rounded-xl text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors disabled:opacity-50"
                      title="Delete address"
                    >
                      {deletingId === address.id ? (
                        <div className="w-4 h-4 border-2 border-error/30 border-t-error rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Delete confirmation */}
              {confirmDeleteId === address.id && (
                <div className="px-4 pb-4 flex items-center gap-2 animate-[slideDown_0.15s_ease-out]">
                  <p className="text-[12px] text-error font-medium flex-1">
                    Delete this address?
                  </p>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-on-surface-variant bg-surface-container-low hover:bg-surface-container transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    disabled={deletingId === address.id}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-on-primary bg-error hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {deletingId === address.id ? (
                      <div className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                    ) : (
                      "Delete"
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Portal: renders modal at document.body to escape parent stacking context */}
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
