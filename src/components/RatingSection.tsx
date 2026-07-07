"use client";

import React, { useState } from "react";
import { submitReview } from "@/app/actions/review";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";

interface RatingSectionProps {
  bookingId: string;
  existingReview?: {
    rating: number;
    comment: string | null;
    quality_rating?: number | null;
    behaviour_rating?: number | null;
    timeliness_rating?: number | null;
    value_rating?: number | null;
    review_tags?: string[] | null;
    review_images?: string[] | null;
    created_at?: string;
  } | null;
  onSuccess?: () => void;
}

const PREDEFINED_TAGS = [
  "Professional",
  "On Time",
  "Friendly Staff",
  "Excellent Cleaning",
  "Value for Money",
  "Highly Recommended",
  "Great Communication",
  "Attention to Detail",
];

export default function RatingSection({
  bookingId,
  existingReview = null,
  onSuccess,
}: RatingSectionProps) {
  // Submission form state
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");

  const [qualityRating, setQualityRating] = useState<number>(0);
  const [hoverQuality, setHoverQuality] = useState<number>(0);

  const [behaviourRating, setBehaviourRating] = useState<number>(0);
  const [hoverBehaviour, setHoverBehaviour] = useState<number>(0);

  const [timelinessRating, setTimelinessRating] = useState<number>(0);
  const [hoverTimeliness, setHoverTimeliness] = useState<number>(0);

  const [valueRating, setValueRating] = useState<number>(0);
  const [hoverValue, setHoverValue] = useState<number>(0);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    if (images.length + files.length > 3) {
      setError("You can only upload up to 3 photos.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const supabase = createClient();
    const uploadedUrls: string[] = [...images];

    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          setError("Only image files are allowed.");
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          setError("Each image must be less than 5MB.");
          continue;
        }

        const timestamp = Date.now();
        const cleanName = file.name
          .toLowerCase()
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
        const ext = file.name.split(".").pop() || "jpg";
        const fileName = `reviews/${bookingId}/${cleanName}-${timestamp}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("services")
          .upload(fileName, file, {
            upsert: true,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("services").getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }
      setImages(uploadedUrls);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError("Please select an overall rating.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await submitReview(
        bookingId,
        rating,
        comment,
        {
          quality: qualityRating || undefined,
          behaviour: behaviourRating || undefined,
          timeliness: timelinessRating || undefined,
          value: valueRating || undefined,
        },
        selectedTags,
        images
      );
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

  const renderReadOnlyStars = (val: number | null | undefined, label: string) => {
    if (val === null || val === undefined || val === 0) return null;
    return (
      <div className="flex items-center justify-between py-1.5 border-b border-outline-variant/10">
        <span className="text-xs font-semibold text-on-surface-variant">{label}</span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`material-symbols-outlined text-base ${
                star <= val ? "text-secondary" : "text-on-surface-variant/20"
              }`}
              style={star <= val ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              star
            </span>
          ))}
          <span className="ml-1 text-[11px] font-bold text-primary">{val}</span>
        </div>
      </div>
    );
  };

  // If there's an existing review or we just submitted successfully
  if (existingReview || success) {
    const displayRating = existingReview?.rating ?? rating;
    const displayComment = existingReview?.comment ?? comment;
    const displayQuality = existingReview?.quality_rating ?? qualityRating;
    const displayBehaviour = existingReview?.behaviour_rating ?? behaviourRating;
    const displayTimeliness = existingReview?.timeliness_rating ?? timelinessRating;
    const displayValue = existingReview?.value_rating ?? valueRating;
    const displayTags = existingReview?.review_tags ?? selectedTags;
    const displayImages = existingReview?.review_images ?? images;

    return (
      <div className="glass-panel p-6 rounded-[20px] border border-outline-variant/10 bg-white/60 backdrop-blur-xl">
        <h3 className="text-base font-semibold text-primary mb-3">Your Review</h3>
        <div className="flex items-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`material-symbols-outlined text-2xl ${
                star <= displayRating ? "text-secondary" : "text-on-surface-variant/20"
              }`}
              style={star <= displayRating ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              star
            </span>
          ))}
          <span className="ml-2 text-sm font-bold text-primary">
            {displayRating} / 5
          </span>
        </div>

        {/* Category Ratings Summary */}
        {(displayQuality > 0 || displayBehaviour > 0 || displayTimeliness > 0 || displayValue > 0) && (
          <div className="bg-surface-container-lowest/40 rounded-xl p-3 mb-4 border border-outline-variant/5">
            {renderReadOnlyStars(displayQuality, "Quality of Work")}
            {renderReadOnlyStars(displayBehaviour, "Professional Behaviour")}
            {renderReadOnlyStars(displayTimeliness, "Timeliness")}
            {renderReadOnlyStars(displayValue, "Value for Money")}
          </div>
        )}

        {/* Selected Tags */}
        {displayTags && displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {displayTags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-bold bg-secondary/10 text-primary border border-secondary/20 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Comment Text */}
        {displayComment ? (
          <p className="text-sm text-on-surface-variant italic bg-surface-container-lowest/50 p-4 rounded-xl border border-outline-variant/5 mb-4">
            &ldquo;{displayComment}&rdquo;
          </p>
        ) : (
          <p className="text-xs text-on-surface-variant/60 italic mb-4">No text feedback provided.</p>
        )}

        {/* Photo Previews */}
        {displayImages && displayImages.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {displayImages.map((img, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-outline-variant/20">
                <Image
                  src={img}
                  alt={`Review attachment ${i + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-secondary font-semibold">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>Review submitted successfully (pending moderation)</span>
        </div>
      </div>
    );
  }

  const renderStarSelector = (
    val: number,
    setVal: React.Dispatch<React.SetStateAction<number>>,
    hoverVal: number,
    setHoverVal: React.Dispatch<React.SetStateAction<number>>,
    label: string
  ) => {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1">
        <span className="text-xs font-semibold text-primary">{label}</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="focus:outline-none transition-transform active:scale-90 hover:scale-110 p-0.5"
              onClick={() => setVal(star)}
              onMouseEnter={() => setHoverVal(star)}
              onMouseLeave={() => setHoverVal(0)}
            >
              <span
                className={`material-symbols-outlined text-xl select-none transition-colors duration-150 ${
                  star <= (hoverVal || val) ? "text-secondary" : "text-on-surface-variant/20"
                }`}
                style={star <= (hoverVal || val) ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                star
              </span>
            </button>
          ))}
          {val > 0 && (
            <span className="ml-1.5 text-[10px] font-extrabold text-primary bg-secondary/15 px-1.5 py-0.5 rounded-md">
              {val} / 5
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="glass-panel p-6 rounded-[20px] border border-outline-variant/10 bg-white/60 backdrop-blur-xl transition-all duration-300">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-primary">Rate the Service</h3>
        <p className="text-xs text-on-surface-variant">
          Your feedback helps us maintain professional standards.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Overall Rating Selector */}
        <div>
          <label className="block text-xs font-bold text-primary mb-1">Overall Rating *</label>
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
                    star <= (hoverRating || rating) ? "text-secondary" : "text-on-surface-variant/20"
                  }`}
                  style={star <= (hoverRating || rating) ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  star
                </span>
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-xs font-black text-primary">
                {rating} Star{rating > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Detailed Category Ratings */}
        <div className="bg-surface-container-lowest/30 rounded-xl p-3 border border-outline-variant/10 space-y-1">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-2">Category Ratings (Optional)</h4>
          {renderStarSelector(qualityRating, setQualityRating, hoverQuality, setHoverQuality, "Quality of Work")}
          {renderStarSelector(behaviourRating, setBehaviourRating, hoverBehaviour, setHoverBehaviour, "Professional Behaviour")}
          {renderStarSelector(timelinessRating, setTimelinessRating, hoverTimeliness, setHoverTimeliness, "Timeliness")}
          {renderStarSelector(valueRating, setValueRating, hoverValue, setHoverValue, "Value for Money")}
        </div>

        {/* Predefined Quick Tags */}
        <div>
          <label className="block text-xs font-bold text-primary mb-2">Select Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {PREDEFINED_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-full transition-all border ${
                    isSelected
                      ? "bg-secondary text-primary border-secondary shadow-sm"
                      : "bg-white/80 text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-low"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comment Box */}
        <div className="space-y-1">
          <label htmlFor="comment" className="block text-xs font-bold text-primary">
            Feedback (Optional)
          </label>
          <textarea
            id="comment"
            rows={3}
            maxLength={500}
            className="w-full text-sm bg-white/80 border border-outline-variant/20 rounded-xl p-3 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 placeholder:text-on-surface-variant/40"
            placeholder="Share details of your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="text-right text-[10px] text-on-surface-variant/40 font-medium">
            {comment.length}/500 characters
          </div>
        </div>

        {/* Image Upload Box */}
        <div>
          <label className="block text-xs font-bold text-primary mb-2">Upload Photos (Optional, Max 3)</label>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Clickable upload area */}
            {images.length < 3 && (
              <label className={`w-16 h-16 rounded-xl border border-dashed border-outline-variant/40 hover:border-secondary/60 hover:bg-secondary/5 transition-all flex flex-col items-center justify-center cursor-pointer ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isUploading}
                />
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant/60">add_a_photo</span>
                <span className="text-[8px] text-on-surface-variant/50 font-bold mt-1">Upload</span>
              </label>
            )}

            {/* List of uploaded files */}
            {images.map((img, i) => (
              <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-outline-variant/20 group">
                <Image
                  src={img}
                  alt={`Upload preview ${i + 1}`}
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                >
                  <span className="material-symbols-outlined text-white text-[18px]">delete</span>
                </button>
              </div>
            ))}
          </div>
          {isUploading && (
            <p className="text-[10px] text-secondary font-bold mt-1">Uploading images...</p>
          )}
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
          disabled={rating === 0 || isSubmitting || isUploading}
        >
          {isSubmitting ? "Submitting Review..." : "Submit Review"}
        </Button>
      </form>
    </div>
  );
}
