"use client";

import React, { useState } from "react";
import { submitReview } from "@/app/actions/review";
import { Button } from "@/components/ui/Button";

interface RatingSectionProps {
  bookingId: string;
  existingReview?: {
    rating: number;
    comment: string | null;
    created_at?: string;
  } | null;
  onSuccess?: () => void;
}

export default function RatingSection({
  bookingId,
  existingReview = null,
  onSuccess,
}: RatingSectionProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // If there's an existing review, show it in a read-only UI
  if (existingReview || success) {
    const displayRating = existingReview?.rating ?? rating;
    const displayComment = existingReview?.comment ?? comment;

    return (
      <div className="glass-panel p-6 rounded-[20px] border border-outline-variant/10 bg-white/60 backdrop-blur-xl">
        <h3 className="text-base font-semibold text-primary mb-3">Your Review</h3>
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`material-symbols-outlined text-2xl ${
                star <= displayRating ? "text-secondary font-fill" : "text-on-surface-variant/20"
              }`}
            >
              star
            </span>
          ))}
          <span className="ml-2 text-sm font-bold text-primary">
            {displayRating} / 5
          </span>
        </div>
        {displayComment ? (
          <p className="text-sm text-on-surface-variant italic bg-surface-container-lowest/50 p-4 rounded-xl border border-outline-variant/5">
            &ldquo;{displayComment}&rdquo;
          </p>
        ) : (
          <p className="text-xs text-on-surface-variant/60 italic">No text feedback provided.</p>
        )}
        <div className="mt-4 flex items-center gap-2 text-xs text-secondary font-semibold">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>Review submitted successfully</span>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5 stars.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await submitReview(bookingId, rating, comment);
      if (res.success) {
        setSuccess(true);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(res.error || "Failed to submit review.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-[20px] border border-outline-variant/10 bg-white/60 backdrop-blur-xl transition-all duration-300">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-primary">Rate the Service</h3>
        <p className="text-xs text-on-surface-variant">
          Your feedback helps us maintain professional standards.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star Rating Selector */}
        <div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform active:scale-90 hover:scale-110 p-0.5"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              >
                <span
                  className={`material-symbols-outlined text-3xl select-none transition-colors duration-150 ${
                    star <= (hoverRating || rating)
                      ? "text-secondary font-fill"
                      : "text-on-surface-variant/20"
                  }`}
                >
                  star
                </span>
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-xs font-bold text-primary">
                {rating} Star{rating > 1 ? "s" : ""} Selected
              </span>
            )}
          </div>
        </div>

        {/* Comment Box */}
        <div className="space-y-1">
          <label htmlFor="comment" className="block text-xs font-semibold text-primary">
            Feedback (Optional)
          </label>
          <textarea
            id="comment"
            rows={3}
            maxLength={500}
            className="w-full text-sm bg-white/80 border border-outline-variant/20 rounded-xl p-3 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 placeholder:text-on-surface-variant/40"
            placeholder="Share details of your experience (e.g. professionalism, quality)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="text-right text-[10px] text-on-surface-variant/40 font-medium">
            {comment.length}/500 characters
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-xl flex items-start gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-sm mt-0.5">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Submit button */}
        <Button
          type="submit"
          variant="primary"
          className="w-full text-xs font-bold py-3 rounded-xl"
          disabled={rating === 0 || isSubmitting}
        >
          {isSubmitting ? "Submitting Review..." : "Submit Review"}
        </Button>
      </form>
    </div>
  );
}
