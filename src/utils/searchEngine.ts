/**
 * Search Engine & Relevance Scoring Utility
 * Handles tokenization, domain synonyms, acronym protection (e.g. "AC" vs "Facial"),
 * and multi-factor relevance ranking for services and subcategories.
 */

export interface ParsedSearchQuery {
  rawQuery: string;
  normalizedQuery: string;
  tokens: string[];
  expandedTerms: string[];
  shortTokens: string[]; // tokens with length <= 3 (e.g., 'ac', 'ro', 'tv', 'fan')
  longTokens: string[];  // tokens with length > 3
}

// Domain-specific synonym dictionary
export const SYNONYM_DICTIONARY: Record<string, string[]> = {
  ac: [
    "ac",
    "air conditioner",
    "air condition",
    "air cool",
    "cooling",
    "hvac",
    "split ac",
    "window ac",
  ],
  "air conditioner": ["ac", "air condition", "cooling", "split ac", "window ac"],
  service: [
    "service",
    "repair",
    "installation",
    "uninstallation",
    "maintenance",
    "cleaning",
    "servicing",
    "checkup",
    "jet service",
    "gas refill",
  ],
  repair: ["repair", "service", "fix", "breakdown", "maintenance", "installation"],
  cleaning: [
    "cleaning",
    "clean",
    "deep cleaning",
    "deep clean",
    "housekeeping",
    "maid",
    "wash",
    "sanitization",
    "mopping",
  ],
  clean: ["clean", "cleaning", "deep clean", "housekeeping", "maid", "wash"],
  pest: [
    "pest",
    "pest control",
    "cockroach",
    "termite",
    "bedbug",
    "mosquito",
    "ant",
    "rodent",
    "rat",
    "lizard",
    "spider",
    "fumigation",
  ],
  cockroach: ["cockroach", "roach", "pest", "pest control", "insects"],
  termite: ["termite", "wood pest", "pest control", "borer"],
  bedbug: ["bedbug", "bed bug", "pest control", "mattress cleaning"],
  mosquito: ["mosquito", "fogging", "spray", "pest control"],
  electrician: [
    "electrician",
    "electrical",
    "wiring",
    "fan",
    "switch",
    "socket",
    "light",
    "bulb",
    "mcb",
    "inverter",
    "fuse",
    "appliance",
  ],
  electrical: ["electrical", "electrician", "wiring", "fan", "switch", "socket", "light", "mcb"],
  fan: ["fan", "ceiling fan", "exhaust fan", "table fan", "electrician", "appliance"],
  plumber: [
    "plumber",
    "plumbing",
    "pipe",
    "tap",
    "faucet",
    "leakage",
    "drainage",
    "sink",
    "washbasin",
    "toilet",
    "bath",
    "water",
    "shower",
  ],
  plumbing: ["plumbing", "plumber", "pipe", "tap", "leakage", "drainage", "sink", "washbasin", "toilet"],
  carpenter: ["carpenter", "carpentry", "wood", "furniture", "door", "hinge", "lock", "handle", "chair", "table", "bed"],
  chimney: ["chimney", "kitchen chimney", "hood", "exhaust", "kitchen"],
  ro: ["ro", "water purifier", "filter", "membrane", "aquaguard", "kent"],
  purifier: ["water purifier", "ro", "filter", "membrane"],
  refrigerator: ["refrigerator", "fridge", "freezer", "cooling", "appliance"],
  fridge: ["fridge", "refrigerator", "freezer", "cooling", "appliance"],
  "washing machine": ["washing machine", "washer", "dryer", "laundry", "appliance"],
  geyser: ["geyser", "water heater", "heater", "electrician", "plumber"],
  salon: ["salon", "beauty", "spa", "facial", "massage", "waxing", "haircut", "pedicure", "manicure", "grooming"],
  grooming: ["grooming", "salon", "beauty", "spa", "haircut", "massage", "shave"],
  massage: ["massage", "spa", "therapy", "relaxation", "wellness"],
  facial: ["facial", "salon", "beauty", "skin care", "glow"],
  car: ["car", "vehicle", "car wash", "car cleaning", "car detailing"],
  painter: ["painter", "painting", "paint", "whitewash", "wall paint", "color"],
  painting: ["painting", "painter", "paint", "whitewash", "wall paint", "roller"],
};

/**
 * Parses user search query into normalized tokens and domain expansions.
 */
export function parseSearchTokens(rawInput: string): ParsedSearchQuery {
  const normalizedQuery = (rawInput || "").toLowerCase().trim();
  const rawTokens = normalizedQuery
    .split(/[\s,_\-+/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const tokens = Array.from(new Set(rawTokens));
  const shortTokens = tokens.filter((t) => t.length <= 3);
  const longTokens = tokens.filter((t) => t.length > 3);

  // Collect synonyms and expansions
  const termsSet = new Set<string>();
  termsSet.add(normalizedQuery);
  tokens.forEach((t) => termsSet.add(t));

  // Direct phrase lookup in synonyms
  if (SYNONYM_DICTIONARY[normalizedQuery]) {
    SYNONYM_DICTIONARY[normalizedQuery].forEach((term) => termsSet.add(term));
  }

  // Token-level lookup in synonyms
  tokens.forEach((token) => {
    if (SYNONYM_DICTIONARY[token]) {
      SYNONYM_DICTIONARY[token].forEach((term) => termsSet.add(term));
    }
  });

  return {
    rawQuery: rawInput,
    normalizedQuery,
    tokens,
    expandedTerms: Array.from(termsSet),
    shortTokens,
    longTokens,
  };
}

export interface ScoreTarget {
  title: string;
  description?: string | null;
  subcategoryName?: string | null;
  categoryName?: string | null;
}

/**
 * Checks if a string contains a token as a whole standalone word (word-boundary safe).
 */
function hasWholeWord(text: string, token: string): boolean {
  if (!text || !token) return false;
  try {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|\\b|\\s|[^a-zA-Z0-9])${escaped}(\\b|\\s|[^a-zA-Z0-9]|$)`, "i");
    return regex.test(text);
  } catch {
    return text.toLowerCase().includes(token.toLowerCase());
  }
}

/**
 * Checks if any word inside text starts with the token.
 */
function hasWordStartingWith(text: string, token: string): boolean {
  if (!text || !token) return false;
  try {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|\\b|\\s|[^a-zA-Z0-9])${escaped}`, "i");
    return regex.test(text);
  } catch {
    return text.toLowerCase().startsWith(token.toLowerCase());
  }
}

/**
 * Computes high-precision relevance score for a service or item.
 * Strictly prevents short acronyms like "AC" from falsely matching inside "Facial", "Vacuum", etc.
 */
export function calculateRelevanceScore(
  target: ScoreTarget,
  parsed: ParsedSearchQuery
): number {
  const { normalizedQuery, tokens, expandedTerms, shortTokens, longTokens } = parsed;

  const tLower = (target.title || "").toLowerCase().trim();
  const dLower = (target.description || "").toLowerCase().trim();
  const subLower = (target.subcategoryName || "").toLowerCase().trim();
  const catLower = (target.categoryName || "").toLowerCase().trim();

  let score = 0;

  // 1. Exact match bonuses
  if (tLower === normalizedQuery) {
    return 2000;
  }
  if (tLower.startsWith(normalizedQuery)) {
    score += 1000;
  } else if (hasWordStartingWith(tLower, normalizedQuery)) {
    score += 800;
  } else if (hasWholeWord(tLower, normalizedQuery)) {
    score += 600;
  }

  // 2. Subcategory Match Bonus (High relevance, e.g. "AC & Appliance Repair")
  if (subLower === normalizedQuery) {
    score += 800;
  } else if (hasWordStartingWith(subLower, normalizedQuery) || hasWholeWord(subLower, normalizedQuery)) {
    score += 500;
  }

  // 3. Category Match Bonus
  if (catLower === normalizedQuery || hasWholeWord(catLower, normalizedQuery)) {
    score += 250;
  }

  // 4. Token-level Scoring for Short Tokens (<= 3 chars, e.g. "AC", "RO", "TV", "FAN")
  // CRITICAL: Short tokens MUST strictly match word boundaries. Loose substring matching gets 0 score!
  for (const st of shortTokens) {
    if (hasWholeWord(tLower, st)) {
      score += 600;
      if (tLower.startsWith(st)) score += 200;
    } else if (hasWordStartingWith(tLower, st)) {
      score += 400;
    }

    if (hasWholeWord(subLower, st)) {
      score += 450;
    }

    if (hasWholeWord(catLower, st)) {
      score += 150;
    }
  }

  // 5. Token-level Scoring for Long Tokens (> 3 chars, e.g. "repair", "cleaning", "installation")
  for (const lt of longTokens) {
    if (hasWholeWord(tLower, lt)) {
      score += 300;
    } else if (hasWordStartingWith(tLower, lt)) {
      score += 200;
    } else if (tLower.includes(lt)) {
      score += 50;
    }

    if (hasWholeWord(subLower, lt)) {
      score += 250;
    } else if (subLower.includes(lt)) {
      score += 50;
    }

    if (hasWholeWord(catLower, lt)) {
      score += 100;
    }

    if (hasWholeWord(dLower, lt)) {
      score += 40;
    }
  }

  // 6. Expanded Domain Synonyms Scoring
  // (e.g., query "ac service" matching service "AC Repair" or "Split AC Foam Jet Service")
  for (const exp of expandedTerms) {
    if (tokens.includes(exp) || exp === normalizedQuery) continue; // already scored above

    if (hasWholeWord(tLower, exp)) {
      score += 250;
    } else if (hasWordStartingWith(tLower, exp)) {
      score += 150;
    }

    if (hasWholeWord(subLower, exp)) {
      score += 200;
    }
  }

  return score;
}
