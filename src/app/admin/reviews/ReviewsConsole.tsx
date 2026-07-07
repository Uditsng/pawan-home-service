"use client";

import React, { useState, useTransition } from "react";
import { SerializedReview } from "./page";
import { moderateReview } from "@/app/actions/review";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Image from "next/image";

interface ReviewsConsoleProps {
  initialReviews: SerializedReview[];
}

type TabType = "pending" | "approved" | "rejected" | "hidden";

export default function ReviewsConsole({ initialReviews }: ReviewsConsoleProps) {
  const [reviews, setReviews] = useState<SerializedReview[]>(initialReviews);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  // Tab counts
  const getTabCount = (tab: TabType) => {
    return reviews.filter((r) => r.status === tab).length;
  };

  // Filter & search reviews
  const filteredReviews = reviews.filter((r) => {
    if (r.status !== activeTab) return false;
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    const customerName = r.customer?.full_name?.toLowerCase() || "";
    const partnerName = r.partner?.full_name?.toLowerCase() || "";
    const serviceTitle = r.service?.title?.toLowerCase() || "";
    const comment = r.comment?.toLowerCase() || "";
    const tags = r.review_tags?.join(" ").toLowerCase() || "";

    return (
      customerName.includes(term) ||
      partnerName.includes(term) ||
      serviceTitle.includes(term) ||
      comment.includes(term) ||
      tags.includes(term)
    );
  });

  const handleModerate = (reviewId: string, newStatus: TabType) => {
    if (newStatus === "pending") return; // cannot set status back to pending directly

    setErrorMsg(null);
    setModeratingId(reviewId);

    startTransition(async () => {
      try {
        const res = await moderateReview(reviewId, newStatus, "");
        if (res.success) {
          setReviews((prev) =>
            prev.map((r) =>
              r.id === reviewId
                ? {
                    ...r,
                    status: newStatus,
                    updated_at: new Date().toISOString(),
                  }
                : r
            )
          );
        } else {
          setErrorMsg(res.error || "Failed to update review status.");
        }
      } catch (err) {
        console.error("Moderation error:", err);
        setErrorMsg("An unexpected error occurred. Please try again.");
      } finally {
        setModeratingId(null);
      }
    });
  };

  const renderStars = (rating: number, sizeClass = "text-base") => {
    return (
      <div className="flex gap-[1px]">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`material-symbols-outlined ${sizeClass} ${
              star <= rating ? "text-secondary" : "text-on-surface-variant/20"
            }`}
            style={star <= rating ? { fontVariationSettings: "'FILL' 1" } : {}}
          >
            star
          </span>
        ))}
      </div>
    );
  };

  const renderScoreBar = (val: number | null, label: string) => {
    if (val === null || val === undefined) return null;
    return (
      <div className="flex items-center justify-between text-xs gap-3">
        <span className="text-on-surface-variant/70 font-semibold">{label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full"
              style={{ width: `${(val / 5) * 100}%` }}
            ></div>
          </div>
          <span className="font-bold text-primary w-3 text-right">{val}</span>
        </div>
      </div>
    );
  };

  const tabs: { key: TabType; label: string; badgeVariant: "warning" | "success" | "danger" | "surface" }[] = [
    { key: "pending", label: "Pending Approval", badgeVariant: "warning" },
    { key: "approved", label: "Approved & Live", badgeVariant: "success" },
    { key: "rejected", label: "Rejected", badgeVariant: "danger" },
    { key: "hidden", label: "Hidden / Archived", badgeVariant: "surface" },
  ];

  return (
    <div className="space-y-6">
      {/* Error Alert Box */}
      {errorMsg && (
        <div className="p-4 bg-error/10 border border-error/20 text-error text-sm rounded-2xl flex items-start gap-3 animate-fade-in">
          <span className="material-symbols-outlined text-lg mt-0.5">error</span>
          <div className="flex-1">
            <h4 className="font-bold">Moderation Action Failed</h4>
            <p className="text-xs mt-0.5 opacity-90">{errorMsg}</p>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="p-1 hover:bg-error/15 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Search by customer, pro, service, comment, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs md:text-sm pl-11 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-on-surface-variant/40"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface p-0.5"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>

        {/* Tab Headers */}
        <div className="flex flex-wrap gap-1 bg-surface-container-low p-1 rounded-2xl self-start border border-outline-variant/10">
          {tabs.map((tab) => {
            const count = getTabCount(tab.key);
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "text-on-surface-variant hover:text-primary hover:bg-surface-container-high"
                }`}
              >
                <span>{tab.label}</span>
                <Badge
                  variant={tab.badgeVariant}
                  className={`text-[9px] px-1.5 py-0.5 font-black border-none tracking-normal leading-none ${
                    isActive ? "bg-white/20 text-white" : ""
                  }`}
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Reviews */}
      {filteredReviews.length === 0 ? (
        /* Empty State */
        <Card className="flex flex-col items-center justify-center text-center p-12 bg-surface-container-lowest">
          <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-on-surface-variant/40 text-3xl">
              rate_review
            </span>
          </div>
          <h3 className="text-base font-bold text-primary font-headline">No reviews found</h3>
          <p className="text-xs text-on-surface-variant max-w-sm mt-1">
            {searchTerm
              ? "No reviews match your current search terms. Try refining or clearing the input."
              : `There are currently no reviews in the "${
                  tabs.find((t) => t.key === activeTab)?.label
                }" status queue.`}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredReviews.map((review) => {
            const isSelfModerating = moderatingId === review.id;
            const formattedDate = new Date(review.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Card
                key={review.id}
                className="flex flex-col justify-between bg-surface-container-lowest relative overflow-hidden group hover:ring-2 hover:ring-primary/10 transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Card Header: Customer Info & Status Badge */}
                  <div className="flex justify-between items-start gap-4 pb-3 border-b border-outline-variant/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container flex items-center justify-center shrink-0 relative border border-outline-variant/10">
                        {review.customer?.avatar_url ? (
                          <Image
                            src={review.customer.avatar_url}
                            alt={review.customer.full_name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <span className="material-symbols-outlined text-on-surface-variant/50 text-xl">
                            person
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs md:text-sm font-bold text-primary leading-tight">
                          {review.customer?.full_name || "Customer"}
                        </h4>
                        <p className="text-[10px] text-on-surface-variant/60 font-semibold">
                          {review.customer?.email || "No email"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={tabs.find((t) => t.key === review.status)?.badgeVariant}>
                      {review.status}
                    </Badge>
                  </div>

                  {/* Rating Scores & Predefined Category Ratings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-container-low/20 rounded-2xl p-3.5 border border-outline-variant/5">
                    {/* Overall Rating & Service */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50 block">
                        Overall Score
                      </span>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating, "text-lg")}
                        <span className="text-xs font-black text-primary">({review.rating})</span>
                      </div>
                      <div className="pt-2 text-xs">
                        <span className="font-semibold text-on-surface-variant/70">Service: </span>
                        <span className="font-bold text-primary">
                          {review.service?.title ?? "Completed Job"}
                        </span>
                      </div>
                      <div className="text-[10px] text-on-surface-variant/60 font-medium">
                        Submitted: {formattedDate}
                      </div>
                    </div>

                    {/* Category breakdowns */}
                    <div className="space-y-1.5 border-t sm:border-t-0 sm:border-l border-outline-variant/10 sm:pl-4 pt-2 sm:pt-0">
                      {renderScoreBar(review.quality_rating, "Quality")}
                      {renderScoreBar(review.behaviour_rating, "Behaviour")}
                      {renderScoreBar(review.timeliness_rating, "Timeliness")}
                      {renderScoreBar(review.value_rating, "Value")}
                    </div>
                  </div>

                  {/* Professional (Provider) Assigned */}
                  {review.partner && (
                    <div className="flex items-center gap-2 text-xs bg-surface-container-low/40 px-3 py-2 rounded-xl border border-outline-variant/10">
                      <span className="text-on-surface-variant/70 font-semibold">Assigned Pro:</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-surface-container relative shrink-0">
                          {review.partner.avatar_url ? (
                            <Image
                              src={review.partner.avatar_url}
                              alt={review.partner.full_name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-[10px] text-on-surface-variant flex items-center justify-center">
                              person
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-primary">{review.partner.full_name}</span>
                      </div>
                    </div>
                  )}

                  {/* Review Tags */}
                  {review.review_tags && review.review_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {review.review_tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] font-bold bg-secondary/10 text-primary border border-secondary/15 px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Review Text */}
                  {review.comment ? (
                    <div className="text-xs md:text-sm text-on-surface-variant italic bg-surface-container-low/30 p-3.5 rounded-xl border border-outline-variant/10 leading-relaxed font-medium">
                      &ldquo;{review.comment}&rdquo;
                    </div>
                  ) : (
                    <div className="text-xs text-on-surface-variant/50 italic bg-surface-container-low/10 p-3 rounded-xl border border-dashed border-outline-variant/10 text-center font-medium">
                      No text feedback provided.
                    </div>
                  )}

                  {/* Uploaded Photos */}
                  {review.review_images && review.review_images.length > 0 && (
                    <div className="flex gap-2 flex-wrap pt-1">
                      {review.review_images.map((img, idx) => (
                        <a
                          key={idx}
                          href={img}
                          target="_blank"
                          rel="noreferrer"
                          className="relative w-14 h-14 rounded-lg overflow-hidden border border-outline-variant/20 shadow-xs hover:brightness-95 transition-all cursor-zoom-in"
                        >
                          <Image
                            src={img}
                            alt={`Attachment ${idx + 1}`}
                            fill
                            className="object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Moderation Actions Footer */}
                <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-outline-variant/10">
                  {review.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isSelfModerating || isPending}
                        onClick={() => handleModerate(review.id, "approved")}
                        className="gap-1 text-xs"
                      >
                        <span className="material-symbols-outlined text-sm">check</span>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isSelfModerating || isPending}
                        onClick={() => handleModerate(review.id, "rejected")}
                        className="gap-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                        Reject
                      </Button>
                    </>
                  )}

                  {review.status === "approved" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isSelfModerating || isPending}
                      onClick={() => handleModerate(review.id, "hidden")}
                      className="gap-1 text-xs"
                    >
                      <span className="material-symbols-outlined text-sm">visibility_off</span>
                      Hide Review
                    </Button>
                  )}

                  {(review.status === "rejected" || review.status === "hidden") && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSelfModerating || isPending}
                      onClick={() => handleModerate(review.id, "approved")}
                      className="gap-1 text-xs"
                    >
                      <span className="material-symbols-outlined text-sm">restore</span>
                      Restore & Approve
                    </Button>
                  )}

                  {isSelfModerating && (
                    <span className="text-[10px] text-secondary font-bold animate-pulse">
                      Updating...
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
