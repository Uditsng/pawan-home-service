# PHS Service Image Design Language & Brand Consistency System

This system provides the single source of truth for creating and validating service showcase images on the PHS Cleaning Company platform.

---

## 1. Existing Image Style Audit

We analyzed the 19 service images under `public/assets/services/` to define the baseline design language.

### Visual Style
* **Type:** Real, high-quality photography. No illustrations, icons, vector art, or cartoon graphics are used.
* **Commercial Style:** Professional commercial marketplace listing style. It blends lifestyle authenticity with clean commercial aesthetics.
* **Tone:** Bright, clean, trustworthy, and premium.

### Color System
* **Primary Palette:** Neutral light gray, white, and soft wood tones in the backgrounds.
* **Accent Colors:** Teal, emerald green, and deep navy blue. The active service tools or professional uniforms (where visible) accent the scenes.
* **Contrast:** High visual contrast, ensuring subjects stand out clearly from the background without harsh artificial highlights.

### Composition Analysis
* **Camera Angle:** Eye-level or slightly high-angle looking down at the work surface (e.g., countertops, floors, cabinets).
* **Camera Distance:** Medium wide shot (MWS) or medium shot (MS) to capture both the professional's activity and the context of the room.
* **Framing & Cropping:** Clean horizontal/vertical alignment. The action is centered or aligned with the rule of thirds. No extreme close-ups or wide views.
* **Negative Space:** Structured negative space at the top or sides, avoiding clutter to keep the layout feeling airy and clean.

### Human Presence Analysis
* **Professionals:** Present and actively performing the service (e.g., hands wiping, scrubbing, folding). They wear clean, professional attire.
* **Customers:** No customers appear in the images to keep the focus purely on the service delivery and professional workmanship.
* **Action Focus:** Focused on the **process and action** (active cleaning/scrubbing/folding) rather than just the final static outcome.

### Environment Analysis
* **Setting:** Clean, modern, minimalist Indian residential interiors (kitchens, bathrooms, living spaces, wardrobes, balconies).
* **Lighting:** Bright, soft, natural daylight. No harsh spotlights, heavy shadows, or night lighting.
* **Cleanliness:** The background is extremely tidy, clutter-free, and organized, emphasizing cleanliness even before the service begins.

### Visual Consistency Score

| Asset Name | Dimensions | Aspect Ratio | Format | File Size | Style Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `after_party_clean.png` | 1024 × 1024 | 1:1 | PNG | 703.7 KB | **Consistent** |
| `balcony_cleaning.png` | 1024 × 1024 | 1:1 | PNG | 791.5 KB | **Consistent** |
| `bathroom_cleaning.png` | 1024 × 1024 | 1:1 | PNG | 660.4 KB | **Consistent** |
| `cabinet_cleaning.png` | 1024 × 1024 | 1:1 | PNG | 688.8 KB | **Consistent** |
| `car_cleaning.png` | 640 × 640 | 1:1 | PNG | 413.6 KB | **Deviates (Low Resolution)** |
| `dusting_wiping.png` | 1024 × 1024 | 1:1 | PNG | 718.5 KB | **Consistent** |
| `fan_cleaning.png` | 1024 × 1024 | 1:1 | PNG | 676.7 KB | **Consistent** |
| `fridge_cleaning.png` | 1024 × 1024 | 1:1 | PNG | 682.7 KB | **Consistent** |
| `ironing_folding.png` | 1024 × 1024 | 1:1 | PNG | 701.8 KB | **Consistent** |
| `kitchen_cleaning.png` | 1024 × 1024 | 1:1 | PNG | 688.8 KB | **Consistent** |
| `kitchen_prep.png` | 1024 × 1024 | 1:1 | PNG | 717.6 KB | **Consistent** |
| `laundry.png` | 1024 × 1024 | 1:1 | PNG | 727.9 KB | **Consistent** |
| `packing_unpacking.png` | 1024 × 1024 | 1:1 | PNG | 641.8 KB | **Consistent** |
| `plant_care.png` | 1024 × 1024 | 1:1 | PNG | 833.4 KB | **Consistent** |
| `pre_party_clean.png` | 1024 × 1024 | 1:1 | PNG | 813.2 KB | **Consistent** |
| `sweeping_mopping.png` | 1024 × 1024 | 1:1 | PNG | 669.1 KB | **Consistent** |
| `utensils.png` | 1024 × 1024 | 1:1 | PNG | 733.6 KB | **Consistent** |
| `wardrobe_cleaning.png` | 1024 × 1024 | 1:1 | PNG | 716.1 KB | **Consistent** |
| `window_cleaning.png` | 1024 × 1024 | 1:1 | PNG | 692.7 KB | **Consistent** |

#### Audit Recommendations
1. **Dimension Standardization:** All future assets must be strictly `1024 x 1024` pixels.
2. **Format Migration:** Future uploads should prefer `WebP` over `PNG` to reduce file sizes to `< 250 KB` (currently average file size is ~700 KB, which hurts page speed).
3. **Resolution Upgrade:** Re-generate/replace `car_cleaning.png` at `1024 x 1024` pixels to match the standard.

---

## 2. Standardized Service Image Specification

The following rules define the platform standards:

* **Style:** Premium Home Services Marketplace
* **Image Type:** Professional Commercial Photography
* **Aspect Ratio:** 1:1 (Square)
* **Dimensions:** 1024 × 1024 pixels (minimum 800 × 800)
* **Format:** WebP (preferred), PNG or JPEG (accepted)
* **Recommended Size:** < 250 KB
* **Lighting:** Bright, soft, natural daylight (no harsh shadows)
* **Environment:** Clean, modern Indian residential or commercial setting
* **Composition:** Service professional actively performing the service, clean framing, medium-wide shot, centered focus
* **Camera Angle:** Eye-level or slightly angled down
* **Visual Tone:** Premium, Trustworthy, Clean, Professional

---

## 3. AI Image Generation Framework

Use the master prompt template below to generate new service images with AI engines (Midjourney, ChatGPT, Gemini, Flux, Ideogram, etc.).

### Master Prompt Template

```text
Professional commercial marketplace service photograph. A trained professional actively performing [SERVICE_NAME] in a clean, modern Indian residential home interior. High-resolution realistic photography, premium home-service brand aesthetic, trustworthy atmosphere, bright natural daylight, clean composition, high-end advertising quality. Medium wide shot, eye-level camera angle. Minimalist clean background, no clutter, realistic textures. No text overlays, no watermarks, no illustration style, no cartoon style.
```

#### Example Prompt: Sofa Deep Cleaning
> *Professional commercial marketplace service photograph. A trained professional actively performing deep sofa shampooing and vacuuming in a clean, modern Indian residential home interior. High-resolution realistic photography, premium home-service brand aesthetic, trustworthy atmosphere, bright natural daylight, clean composition, high-end advertising quality. Medium wide shot, eye-level camera angle. Minimalist clean background, no clutter, realistic textures. No text overlays, no watermarks, no illustration style, no cartoon style.*

---

## 4. Admin Panel Image Guidelines & Validation

To enforce these guidelines programmatically, the service creation and edit screens will display these guidelines and validate image URLs in real-time.

### Validation Rules (Non-blocking Warnings):
1. **Aspect Ratio:** Warn if not 1:1 (i.e. aspect ratio deviates by more than 0.05).
2. **Resolution:** Warn if width or height is less than 800px (recommended 1024px).
3. **File Size:** Warn if file size is greater than 250 KB (retrieved via `Content-Length` HEAD request).
4. **Invalid URL:** Warn if the image fails to load.
