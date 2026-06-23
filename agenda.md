# Pawan Pest Service - Agenda & Project Blueprint

*This document serves as the single source of truth for the Pawan Pest Service (PHS Cleaning Company) project. It contains the architecture blueprint, feature inventory, technical debt trackers, security concerns, and immediate roadmap to launch.*

---

## 1. Project Overview & Scope
**PHS Cleaning Company** (Pawan Home Services / Pawan Pest Service Company) is a premium, multi-sided marketplace web application built natively for the Indian market (focused on Kanpur and nearby regions). It connects residential and commercial **Customers** with skilled home service **Professionals** (referred to as **Pros**) specializing in deep cleaning, pest control, electrical work, plumbing, and appliance repair. 

### Key Business Models
- **Commission Split:** Platform takes a 20% commission on the total booking amount; Partners receive 80%.
- **Advance-Only Payments:** 100% advance digital payments (via Razorpay integration) are required for all standard doorstep bookings. No Cash on Delivery (COD).
- **Referral Rewards System:** Built-in dual-sided reward mechanisms for referring new customers.

---

## 2. Technical Stack & Architecture Summary
The application is structured as a modern, full-stack monorepo built using server-first patterns to minimize bundle sizes and maximize performance.

- **Frontend / Framework:** Next.js 16/19 (App Router) + React 19.2.4 (experimental/RSC-first).
- **Styling:** Tailwind CSS 4.0 using CSS variables (`globals.css`) for design tokens instead of hardcoded hex values. Heavy emphasis on glassmorphism panels, 3D card tilt hovers, and clean responsive flex grids.
- **Database & Backend-as-a-Service:** Supabase (PostgreSQL with RLS enabled on all tables).
- **Authentication & Security:** Cookie-based sessions via `@supabase/ssr` combined with Twilio Verify SMS OTP verification for secure login, registration, and high-security dispatch actions.
- **Auto-Assignment Dispatch Engine:** A customized **Open Dispatch & Partner Ranking** system. Jobs are broadcasted in tiers (using the `get_dispatch_batch` RPC) based on pincode match, service capability, and partner performance scores. Partners claim jobs atomically via the `claim_booking_offer` RPC.
- **Payment Gateway:** Razorpay integrations mapping webhook callbacks to complete bookings and trigger auto-assignment pipelines.
- **Notification Infrastructure:** Capacitor-based mobile notifications push setup combined with database-backed notification queues and Twilio SMS fallbacks.
- **Platform Invoicing:** Automatic invoice generation in PostgreSQL using an sequence trigger `tr_bookings_create_invoice` on booking completion, incorporating local GST/tax rates and applied wallet discounts.

---

## 3. User Roles & Ecosystem Route Rules
Access control is implemented in both database Row Level Security (RLS) policies and a Next.js server-side session guard mapping roles to distinct dashboards:

| User Role | Target Dashboard | Description |
| :--- | :--- | :--- |
| **Customer** | `/customer/dashboard` | Main marketplace catalog search, checkout, booking history, profile addresses, and support. |
| **Partner (Pro)** | `/partner/dashboard` | Jobs list/accept pipeline, earnings trackers, location route start, OTP arrival, and OTP completion. |
| **Admin** | `/admin/dashboard` | Platform metrics dashboard, bookings overrides, partner fleet verification, invoice records, and support disputes. |

---

## 4. Complete Feature Inventory & Status

| Feature / Component | Status | Main Files | Dependencies / Relational Data |
| :--- | :--- | :--- | :--- |
| **User Authentication** | ✅ Complete | `src/app/auth.actions.ts`, `src/lib/twilio.ts` | Profiles, Twilio Verify API, Rate Limiter |
| **Landing Page** | ✅ Complete | `src/app/page.tsx`, `LandingGridClient.tsx` | Services, Categories |
| **Service Detail Page** | ✅ Complete | `src/app/customer/services/[category]/[serviceId]/page.tsx` | Services, Subcategories, JSONB `page_content` |
| **Multi-Service Cart** | ✅ Complete | `src/lib/cart/CartContext.tsx`, `CartDrawer.tsx` | LocalStorage, React context |
| **Address Management** | ✅ Complete | `src/app/actions/address.ts` | User addresses table, Google Places API |
| **Checkout Flow** | ✅ Complete | `src/app/customer/checkout/` | Orders, Bookings, Payments |
| **Open Dispatch System** | ✅ Complete | `src/app/actions/dispatch.ts` | `booking_job_offers`, `claim_booking_offer` RPC |
| **OTP Arrival/Verify** | ✅ Complete | `src/app/partner/actions.ts` (reachLocation) | Bookings, Crypto random pin generation |
| **OTP Completion/Verify** | ✅ Complete | `src/app/partner/actions.ts` (verifyCompletionOtp) | Bookings, `complete_referral_reward` RPC |
| **Admin Partner Panel** | ✅ Complete | `src/app/admin/partners/` | Profiles, onboarding documents |
| **Automatic Invoices** | ✅ Complete | `supabase/migrations/20260620...` | Invoices table, bookings state change trigger |
| **Referral System** | ✅ Complete | `supabase/migrations/20260611000000...` | Profiles, referral codes |
| **Wallet Feature** | ⚠️ Partial | `src/app/customer/wallet/page.tsx` | Frontend skeleton exists; DB integration is minimal |
| **Push Notifications** | ⚠️ Partial | `src/lib/notifications.ts`, `src/components/MobileSetup.tsx` | FCM integration and Android custom sounds completed. iOS native asset bundling pending workspace setup. |
| **Middleware Guard** | 🚨 Broken | `src/proxy.ts` | Bypassed due to file naming convention mismatch |

---

## 5. Security Vulnerability Log

### 🚨 Critical Severity: Broken Next.js Middleware Route Protection
- **Vulnerability:** Next.js does not recognize `src/proxy.ts` as a middleware entry point. It only runs `middleware.ts`. Because `src/middleware.ts` was deleted, the session check, RBAC route guards, and account suspension checks are completely bypassed on the server-side route transit.
- **Impact:** Guests can enter `/admin/*` or `/partner/*` layouts. Suspended or blocked users can navigate the application freely until a specific database fetch rejects their query.
- **Remediation:** Rename/move `src/proxy.ts` back to `src/middleware.ts` in the `src/` directory.

### ⚠️ Medium Severity: Public Exposure of Twilio Bypass Flag
- **Vulnerability:** The environment variable `NEXT_PUBLIC_BYPASS_OTP` has the `NEXT_PUBLIC_` prefix, rendering it accessible in the client browser package.
- **Impact:** Users or automated scripts can discover this flag and craft registration payload calls directly to `verifyOtpAndRegister` or bypass OTP requirements.
- **Remediation:** Remove the `NEXT_PUBLIC_` prefix for server-only environment configurations.

### ⚠️ Medium Severity: Arbitrary Status/Role Downgrade for Suspensions
- **Vulnerability:** Blocking a partner currently switches their role in `profiles.role` from `partner` to `customer` to strip their dispatch eligibility.
- **Impact:** Role pollution in the database, side effects on historic bookings data, and confusion in partner dashboards.
- **Remediation:** Implement a proper `is_suspended` boolean flag on the `profiles` table rather than changing core user roles.

---

## 6. Technical Debt & Performance Concerns
1. **Sequential Authentication Queries:** The client-side header currently makes sequential checks to `supabase.auth.getUser()` and then queries the `profiles` table for the role. This causes an extra 100-200ms lag on every page load.
2. **Missing Global Error Boundaries:** There are no `error.tsx` file fallbacks in the `/customer`, `/partner`, or `/admin` routing groups, causing a blank screen if an unhandled query error occurs.
3. **No Administrative List Pagination:** CRM lists (customers, partners, bookings) limit fetches to 1000 rows without pagination offsets. This will crash or slow down once the fleet scale exceeds 1000 records.
4. **Unfiltered PostgreSQL Real-time subscriptions:** The partner jobs dashboard listens to all updates on `booking_job_offers` rather than filtering rows specifically by `partner_id` inside the channel subscription, causing unnecessary client-side CPU overhead.
5. **iOS Custom Notification Sounds:** The native `ios/` folder is not yet initialized in the workspace. Native bundling of `service_alert.wav` needs to be done once the iOS platform is created.

---

## 7. MVP Launch Checklist & Score
**Launch Readiness Score: 88%**

- [x] Tri-role ecosystem routing logic
- [x] Secure Twilio Verify OTP registration flow
- [x] Multi-service shopping cart checkout
- [x] Scored Open Dispatch round-robin matching & claiming
- [x] Dual OTP service safety verification (Arrival & Completion)
- [x] Automated post-verification invoice generation
- [x] Centralized partner notification custom sound channel (Android)
- [ ] Restore server-side Next.js route protection middleware (`src/middleware.ts`)
- [ ] Connect production Razorpay payment keys and remove sandbox bypasses
- [ ] Fully wire database backings for the user wallet and discount points

---

## 8. Decisions & Change Log
- **2026-06-11:** Transitioned from manual dispatch matching to an automated **Open Dispatch & Scored Ranking System** (Tiered broadcasts of 10 partners at a time).
- **2026-06-20:** Introduced automated tax calculation and invoice storage on `bookings.status = 'completed'` after Completion OTP validation.
- **2026-06-21:** Deployed performance fixes using parallelized database queries on dashboard landing states.
- **2026-06-22:** Identified critical middleware bypass bug (`src/proxy.ts` renaming issue). Prepared Agenda Reconstruction.
- **2026-06-22:** Implemented custom notification sound system for Android partner panel. Configured backend push payloads for custom sound routing (Android & iOS). iOS native resource setup logged as pending until iOS native project is added to workspace.
