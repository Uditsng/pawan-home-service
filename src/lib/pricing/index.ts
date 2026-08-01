/**
 * Pricing — Single Source of Truth for all pricing math in the platform.
 *
 * Pure functions only. No React, Supabase, Server Actions, or side effects.
 * Both the client (instant display) and the server (payment authority) must
 * compute prices through this module so totals always agree.
 */
export * from "./types";
export * from "./pricingEngine";
export * from "./taxEngine";
export * from "./discountEngine";
export * from "./payableEngine";
export * from "./validators";
export * from "./cartCatalog";
