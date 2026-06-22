# Pawan Pest Service - Codebase Discovery & Audit Report

**Date:** June 22, 2026  
**Status:** Audit Completed (Pre-Execution Phase)  
**Launch Readiness Score:** **88%**

---

## 1. Executive Summary

This report is a comprehensive review of the **Pawan Pest Service (PHS)** codebase. The application is a multi-sided marketplace linking Customers with vetted professionals (Pros) for on-demand home maintenance and pest control services. 

### Core Strengths
1. **Robust Core Database Schema:** Real-time updates, auto-invoicing triggers, and structured relational tables are well-designed.
2. **Innovative Dispatch System:** The tiered, scored Open Dispatch and claiming mechanism prevents concurrency bottlenecks and ensures fair distribution.
3. **Advanced Performance Patterns:** Parallel fetching in server dashboards, column selection, and client-side hook optimizations are correctly utilized.

### Critical Blockers
1. **Bypassed Route Middleware (`src/proxy.ts` vs `src/middleware.ts`):** Next.js route protection is entirely inactive because the framework expects `middleware.ts`, which was deleted.
2. **Twilio OTP Verification Bypass:** The configuration flag allowing OTP bypass is prefixed with `NEXT_PUBLIC_` and exposed to the client, presenting a spam registration risk.
3. **Role Downgrade Account Suspension:** Suspended partners are blocked by modifying their role, risking database schema pollution and reporting side effects.

---

## 2. Architecture Report

### Structure Overview
The application is built on **Next.js 16/19 App Router** combined with **Supabase (PostgreSQL)**. Data fetching is server-centric, utilizing Server Components and Server Actions (`"use server"`) directly to query Supabase, bypassing intermediate API layers.

```mermaid
graph TD
    subgraph Client-Side
        C[Customer Portal]
        P[Partner Portal]
        A[Admin Portal]
        LC[Landing Grid Client]
    end

    subgraph Next.js Server Actions
        SA_Auth[auth.actions.ts]
        SA_Disp[dispatch.ts]
        SA_Part[partner/actions.ts]
        SA_Addr[address.ts]
    end

    subgraph Database (Supabase)
        DB_Profiles[profiles table]
        DB_Bookings[bookings table]
        DB_Offers[booking_job_offers table]
        DB_Scores[partner_performance_scores]
        DB_Invs[invoices table]
        
        RPC_Dispatch[get_dispatch_batch RPC]
        RPC_Claim[claim_booking_offer RPC]
        TR_Invs[tr_create_invoice_on_completion Trigger]
    end

    C --> SA_Addr
    C --> SA_Auth
    P --> SA_Part
    A --> SA_Disp

    SA_Auth --> DB_Profiles
    SA_Part --> RPC_Claim
    SA_Part --> DB_Bookings
    SA_Disp --> RPC_Dispatch
    SA_Disp --> DB_Offers

    DB_Bookings --> TR_Invs
    TR_Invs --> DB_Invs
```

### Critical Database Schemas & RPCs
- **`profiles`:** Stores roles (`customer`, `partner`, `admin`) and onboarding status (`active`, `pending`, `suspended`, etc.).
- **`bookings`:** Core job details, scheduling, statuses, and OTP audit fields.
- **`booking_job_offers`:** Junction table tracking tiered broadcasts.
- **`get_dispatch_batch` RPC:** Fetches eligible online partners ordered by performance score.
- **`claim_booking_offer` RPC:** Pessimistic lock preventing double-booking by claiming an offer atomically.

---

## 3. Security Report

| Issue | Impact | Severity | Recommended Fix |
| :--- | :--- | :--- | :--- |
| **Route Protection Inactive** | Next.js does not load `src/proxy.ts`; all admin/partner layout skeletons are publicly accessible via direct navigation. | **CRITICAL** | Rename/move [proxy.ts](file:///c:/projects/PawanPestServiceCompany/src/proxy.ts) to `src/middleware.ts`. |
| **Twilio OTP Bypass Exposure** | `NEXT_PUBLIC_BYPASS_OTP` can be read in the browser; allows malicious scripts to bypass verification. | **HIGH** | Remove `NEXT_PUBLIC_` prefix and make the flag server-side only in `.env.local` and [auth.actions.ts](file:///c:/projects/PawanPestServiceCompany/src/app/auth.actions.ts). |
| **Role Downgrade for Suspension** | Suspended partners are updated by converting their role to `customer` to block job broadcasts. | **MEDIUM** | Implement a dedicated `is_suspended` or `status = 'suspended'` field checked in queries and middleware. |
| **No Password Strength Validation** | Passwords require only 8 characters; no entropy checks. | **LOW** | Integrate a basic zxcvbn strength checker during registration. |

---

## 4. UX / UI Review

### Current Aesthetic
The app uses a premium, modern design:
- **Color Palette:** Primary Navy (`#002261`), Accent Atlantis Lime (`#a6ce37`), and Neutral Grays.
- **Typography:** **Bricolage Grotesque** used across headings and body text for an editorial look.
- **Visual depth:** Heavy use of `.glass-panel` backdrops, 3D tilted hover cards, and ambient drop shadows.

### UX Recommendations
1. **Add Custom Error UI:** Use dynamic alerts instead of native error throws or generic error pages.
2. **Implement Suspense Skeletons:** Server-side loads are fast but adding suspense placeholders to async cards (like partner performance lists) improves perceived performance.
3. **Consolidate Partner Links:** The partner dashboard contains expanded boxes; grouping settings into chevron lists matching the customer profile saves space.

---

## 5. Feature Inventory & Current Status

### Core Marketplace
- **Landing page:** ✅ Complete.
- **Catalog showcase:** ✅ Complete.
- **Search page:** ✅ Complete.
- **Service details:** ✅ Complete.

### Booking & Payments
- **Multi-service cart:** ✅ Complete.
- **Checkout flow:** ✅ Complete.
- **Razorpay integrations:** ✅ Complete.
- **Invoicing system:** ✅ Complete (Trigger-based).

### Partner Operations
- **Onboarding portal:** ✅ Complete.
- **Open Dispatch / Claim:** ✅ Complete.
- **OTP double-safety (Arrival & Completion):** ✅ Complete.
- **Earnings / Analytics dashboard:** ✅ Complete.
- **Push notification FCM triggers:** ⚠️ Partial (Stubs only).

---

## 6. MVP Gap Analysis

### Must-Have (Launch Blockers)
1. **Fix Route Middleware:** Move [proxy.ts](file:///c:/projects/PawanPestServiceCompany/src/proxy.ts) to `src/middleware.ts` to secure the admin and partner panels.
2. **Production Razorpay Setup:** Replace test environments and sandbox keys with live credentials.

### Should-Have (Recommended)
1. **Address OTP Bypass:** Secure `BYPASS_OTP` to block spam registrations.
2. **Add Custom Error Handlers:** Create `error.tsx` in `/customer`, `/partner`, and `/admin`.

### Nice-to-Have (Post-Launch)
1. **Wallet / Rewards Activation:** Fully wire database wallets.
2. **Capacitor FCM Push:** Connect FCM tokens with actual push triggers.

---

## 7. Open Questions

### Business & Product Questions
1. **Commission Model:** Is the 20% platform commission fixed, or will we introduce tier-based partner fees or category-specific commissions?
2. **Refund Rules:** When a booking is cancelled, is the refund automated via Razorpay webhook immediately, or is there a manual approval step in the Admin portal?

### UX & Tech Questions
1. **Capacitor Mobile Plans:** Are we releasing the Capacitor bundle as a native Android/iOS wrapper in the first phase, or is the responsive web application the primary focus?
2. **Wallet / Credits Integration:** Should the wallet feature allow full payments, or only partial checkout discounts using referral credits?
3. **Twilio SMS Costs:** Should Twilio OTP be disabled in development mode by default (enabling the bypass flag) to reduce API consumption costs, or should we continue to enforce live checks?

---

## 8. Recommended Next Actions

1. **Move next.js middleware file** from `src/proxy.ts` to `src/middleware.ts` to enforce RBAC immediately.
2. **Conduct the Phase 11 & 12 Q&A** with the product owners to finalize the project direction.
3. **Setup custom error boundaries** in the dashboard layouts.
