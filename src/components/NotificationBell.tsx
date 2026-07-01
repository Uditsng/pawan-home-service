"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { AppNotification } from "@/lib/types";

// ─── Icon Map ────────────────────────────────────────────
const typeIcons: Record<string, string> = {
  new_job_offer:    "campaign",
  booking_created:  "receipt_long",
  booking_confirmed:"check_circle",
  partner_assigned: "work",
  partner_reassigned:"swap_horiz",
  service_started:  "play_circle",
  service_completed:"task_alt",
  booking_cancelled:"cancel",
  extension_requested: "timer",
  general:          "info",
};

const typeColors: Record<string, string> = {
  new_job_offer:    "bg-secondary/15 text-primary",
  booking_created:  "bg-blue-500/10 text-blue-600",
  booking_confirmed:"bg-green-500/10 text-green-600",
  partner_assigned: "bg-indigo-500/10 text-indigo-600",
  partner_reassigned:"bg-amber-500/10 text-amber-600",
  service_started:  "bg-cyan-500/10 text-cyan-600",
  service_completed:"bg-emerald-500/10 text-emerald-600",
  booking_cancelled:"bg-red-500/10 text-red-600",
  extension_requested: "bg-orange-500/10 text-orange-600",
  general:          "bg-gray-500/10 text-gray-600",
};

// High-priority types that trigger in-app alert sound for partners
const HIGH_PRIORITY_TYPES = new Set(["new_job_offer", "partner_assigned", "extension_requested"]);

// Play an alert tone using Web Audio API (no external file needed)
function playAlertTone() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    // Bell-like tone: 880Hz then 660Hz, short envelope
    const frequencies = [880, 660, 880];
    let startTime = ctx.currentTime;
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
      osc.start(startTime);
      osc.stop(startTime + 0.25);
      startTime += i === 0 ? 0.3 : 0.28;
    });
    // Auto-close the audio context after tones finish
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // Ignore — Web Audio may not be available in all environments
  }
}


// ─── Time Ago ────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}

// ─── Notification Bell Component ────────────────────────────

const PAGE_SIZE = 15;

export default function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // ─── Fetch notifications ────────────────────────────────────
  const fetchNotifications = useCallback(
    async (pageNum: number, append = false) => {
      if (!userId) return;
      setLoading(true);
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (!error && data) {
        const typed = data as AppNotification[];
        setNotifications((prev) => (append ? [...prev, ...typed] : typed));
        setHasMore(typed.length === PAGE_SIZE);
      }
      setLoading(false);
    },
    [supabase, userId]
  );

  // ─── Fetch unread count ─────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  }, [supabase, userId]);

  // ─── Handle Auth State Changes ──────────────────────────────
  useEffect(() => {
    const getInitialUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getInitialUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // ─── Initial Load & Reload on Auth State Change ─────────────
  useEffect(() => {
    if (userId) {
      fetchUnreadCount();
      if (isOpen) {
        setPage(0);
        fetchNotifications(0);
      }
    }
  }, [userId, isOpen, fetchUnreadCount, fetchNotifications]);

  // ─── Realtime Postgres Changes Subscription ────────────────
  useEffect(() => {
    if (!userId) return;

    const isDev = process.env.NODE_ENV === "development";

    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (isDev) {
            console.log(`[Notification Pipeline] [3. REALTIME_EMIT] Event: ${payload.eventType}, User: ${userId}`, payload);
          }

          if (payload.eventType === "INSERT") {
            const newNotif = payload.new as AppNotification;
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((c) => c + 1);

            // ── In-app alert for high-priority partner notifications ──────────
            // When a new job offer or assignment arrives while the partner is
            // actively using the app (foreground), FCM suppresses the system
            // tray notification. We compensate with a Web Audio alert tone
            // and a brief visual flash on the bell button so they never miss a job.
            if (HIGH_PRIORITY_TYPES.has(newNotif.type)) {
              playAlertTone();
              const bellBtn = document.getElementById("notification-bell-trigger");
              if (bellBtn) {
                bellBtn.classList.add("ring-2", "ring-secondary", "ring-offset-1");
                setTimeout(() => bellBtn.classList.remove("ring-2", "ring-secondary", "ring-offset-1"), 2000);
              }
            }
          } else if (payload.eventType === "DELETE") {
            const oldNotif = payload.old as { id: string };
            setNotifications((prev) => prev.filter((n) => n.id !== oldNotif.id));
            fetchUnreadCount();
          } else if (payload.eventType === "UPDATE") {
            const updatedNotif = payload.new as AppNotification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
            );
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, fetchUnreadCount]);


  // ─── Click outside to close ─────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // ─── Actions ────────────────────────────────────────────────
  async function markAsRead(notifId: string) {
    console.log(`[Notification Pipeline] [8. READ_STATE] NotificationId: ${notifId}, Action: MARK_READ`);
    
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notifId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  }

  async function deleteNotification(e: React.MouseEvent, notifId: string) {
    e.stopPropagation(); // Avoid triggering navigation/markRead on item button
    console.log(`[Notification Pipeline] [8. READ_STATE] NotificationId: ${notifId}, Action: DELETE`);

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notifId);

    if (!error) {
      const deletedNotif = notifications.find((n) => n.id === notifId);
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      if (deletedNotif && !deletedNotif.is_read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    }
  }

  async function markAllAsRead() {
    if (!userId) return;
    console.log(`[Notification Pipeline] [8. READ_STATE] UserId: ${userId}, Action: MARK_ALL_READ`);

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    }
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, true);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-trigger"
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) {
            setPage(0);
            fetchNotifications(0);
          }
        }}
        className="relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant hover:bg-secondary hover:text-primary transition-all active:scale-95 cursor-pointer"
        aria-label="Notifications"
      >
        <span
          className="material-symbols-outlined text-[22px]"
          style={
            unreadCount > 0
              ? { fontVariationSettings: "'FILL' 1" }
              : undefined
          }
        >
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 shadow-lg animate-bounce">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          id="notification-dropdown"
          className="fixed md:absolute left-4 right-4 md:left-auto md:right-0 top-20 md:top-full mt-3 md:w-[360px] max-h-[480px] bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl z-100 flex flex-col overflow-hidden"
          style={{ animation: "slideDown 0.2s ease-out" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20">
            <h3 className="text-sm font-bold text-primary tracking-tight">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-bold text-secondary hover:text-primary transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-on-surface-variant hover:text-primary transition-colors rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {notifications.length === 0 && !loading ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">
                    notifications_off
                  </span>
                </div>
                <p className="text-sm font-bold text-on-surface-variant mb-1">
                  All caught up!
                </p>
                <p className="text-xs text-on-surface-variant/60">
                  No notifications yet. We&apos;ll let you know when something
                  happens.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const iconName = typeIcons[notif.type] || "info";
                const colorClass =
                  typeColors[notif.type] || "bg-gray-500/10 text-gray-600";

                return (
                  <div
                    key={notif.id}
                    className={`w-full flex items-start gap-3 px-5 py-3.5 border-b border-outline-variant/10 transition-colors hover:bg-surface-container-low/60 ${
                      !notif.is_read ? "bg-secondary/5" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5 ${colorClass} ${HIGH_PRIORITY_TYPES.has(notif.type) && !notif.is_read ? "ring-1 ring-secondary/40" : ""}`}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${HIGH_PRIORITY_TYPES.has(notif.type) && !notif.is_read ? "animate-pulse" : ""}`}
                        style={HIGH_PRIORITY_TYPES.has(notif.type) ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                        {iconName}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <button
                          onClick={async () => {
                            setIsOpen(false);
                            if (!notif.is_read) {
                              await markAsRead(notif.id);
                            }

                            // Navigate based on type & metadata
                            const bookingId = notif.booking_id || (notif.metadata?.booking_id as string | undefined);
                            
                            // Log structured pipeline stage 7 (User clicked notification/bell)
                            console.log(`[Notification Pipeline] [7. TAP_ACTION] Source: Bell, BookingId: ${bookingId}, Type: ${notif.type}`);

                            if (bookingId) {
                              const path = pathname || "";
                              if (path.startsWith("/partner")) {
                                router.push("/partner/jobs");
                              } else if (path.startsWith("/admin")) {
                                router.push("/admin/bookings");
                              } else {
                                router.push(`/customer/bookings/${bookingId}/tracking`);
                              }
                            }
                          }}
                          className="text-left font-bold text-[13px] truncate cursor-pointer hover:underline text-primary flex-1"
                        >
                          {notif.title}
                        </button>
                        <div className="flex items-center gap-1.5">
                          {!notif.is_read && (
                            <span className="shrink-0 w-2 h-2 rounded-full bg-secondary" />
                          )}
                          <button
                            onClick={(e) => deleteNotification(e, notif.id)}
                            className="p-1 text-on-surface-variant/40 hover:text-error hover:bg-error/5 rounded-lg transition-colors cursor-pointer"
                            title="Delete notification"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                      <p className="text-[12px] text-on-surface-variant/70 line-clamp-2 leading-relaxed">
                        {notif.body}
                      </p>
                      <p className="text-[10px] text-on-surface-variant/40 mt-1 font-bold uppercase tracking-wider">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}

            {/* Load More */}
            {hasMore && notifications.length > 0 && (
              <div className="px-5 py-3">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full py-2.5 text-[12px] font-bold text-secondary uppercase tracking-wider hover:bg-surface-container-low rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}

            {/* Inline Loading */}
            {loading && notifications.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

