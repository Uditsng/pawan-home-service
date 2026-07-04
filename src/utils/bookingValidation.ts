import { PricingModel, Service } from "@/lib/types";

export interface BookingState {
  serviceId: string;
  pricingModel: PricingModel;
  selectedVariantId: string | null;
  selectedAddons: Record<string, number>;
  areaSqft: number | null;
  quantity: number | null;
  durationMinutes: number | null;
  distanceKm: number | null;
  date: string | null;
  time: string | null;
  addressId: string | null;
  formAnswers: Record<string, string>;
  meetingLocation?: string | null;
  destination?: string | null;
  expectedBags?: number | null;
}

export interface FormFieldConfig {
  name: string;
  label: string;
  type: "text" | "textarea" | "dropdown" | "radio" | "checkbox" | "number" | "file" | "image" | "date" | "time";
  required: boolean;
  options?: string[];
  validation_rules?: {
    min?: number;
    max?: number;
  };
}

/**
 * Centrally validates the booking state based on service configuration and pricing model rules.
 * Returns an object mapping error field names to error messages (empty if valid).
 */
export function validateBooking(
  state: BookingState,
  service: Service
): Record<string, string> {
  const errors: Record<string, string> = {};
  const config = (service.pricing_config || {}) as Record<string, unknown>;

  // 1. Pricing Model Specific Validation
  switch (state.pricingModel) {
    case "area": {
      if (state.areaSqft === null || isNaN(state.areaSqft)) {
        errors.areaSqft = "Please specify the service area size.";
      } else {
        const minArea = Number(config.min_area ?? 200);
        const maxArea = Number(config.max_area ?? 5000);
        if (state.areaSqft < minArea) {
          errors.areaSqft = `Area size cannot be less than ${minArea} Sqft.`;
        } else if (state.areaSqft > maxArea) {
          errors.areaSqft = `Area size cannot exceed ${maxArea} Sqft.`;
        }
      }
      break;
    }
    case "quantity": {
      if (state.quantity === null || isNaN(state.quantity)) {
        errors.quantity = "Please specify a valid quantity.";
      } else {
        const minQty = Number(config.min_qty ?? 1);
        const maxQty = Number(config.max_qty ?? 100);
        if (state.quantity < minQty) {
          errors.quantity = `Quantity cannot be less than ${minQty}.`;
        } else if (state.quantity > maxQty) {
          errors.quantity = `Quantity cannot exceed ${maxQty}.`;
        }
      }
      break;
    }
    case "hourly": {
      if (!state.durationMinutes || isNaN(state.durationMinutes)) {
        errors.durationMinutes = "Please specify service duration.";
      }
      break;
    }
    case "distance": {
      if (state.distanceKm === null || isNaN(state.distanceKm)) {
        errors.distanceKm = "Please select travel distance.";
      }
      break;
    }
    case "hybrid": {
      // Validate hybrid components if specified
      if (state.areaSqft !== null) {
        const minArea = Number(config.min_area ?? 100);
        const maxArea = Number(config.max_area ?? 2000);
        if (state.areaSqft < minArea || state.areaSqft > maxArea) {
          errors.areaSqft = `Area must be between ${minArea} and ${maxArea} Sqft.`;
        }
      }
      if (state.durationMinutes !== null) {
        const minHours = Number(config.min_hours ?? 1);
        const maxHours = Number(config.max_hours ?? 8);
        const hoursSelected = state.durationMinutes / 60;
        if (hoursSelected < minHours || hoursSelected > maxHours) {
          errors.durationMinutes = `Duration must be between ${minHours} and ${maxHours} hours.`;
        }
      }
      break;
    }
    case "fixed":
    case "inspection":
    default:
      break;
  }

  // 2. Schedule Validation
  if (state.date !== null) {
    if (!state.date.trim()) {
      errors.date = "Please select a service date.";
    }
  }

  if (state.time !== null) {
    if (!state.time.trim()) {
      errors.time = "Please select an arrival time slot.";
    }
  }

  if (state.addressId !== null) {
    if (!state.addressId.trim()) {
      errors.addressId = "Please select a service address.";
    }
  }

  // 3. Dynamic Form Field Validation
  const fields = (() => {
    if (Array.isArray(service.form_fields)) {
      return service.form_fields as unknown as FormFieldConfig[];
    }
    const fromContent = service.page_content?.form_fields;
    if (Array.isArray(fromContent)) {
      return fromContent as unknown as FormFieldConfig[];
    }
    return [];
  })();

  fields.forEach((f) => {
    if (f.required) {
      const val = state.formAnswers[f.name];
      if (!val || !val.trim()) {
        errors[f.name] = `${f.label} is required.`;
      }
    }
  });

  return errors;
}
