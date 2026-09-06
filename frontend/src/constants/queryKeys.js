// src/constants/queryKeys.js
//
// Central TanStack Query cache keys — matches the shape from
// frontend-design-plan.md exactly. Keeping these as factory functions
// (not plain arrays) means passing different filters/pages produces
// distinct, independently-cached keys.

export const QUERY_KEYS = {
  // Auth
  ME: ['auth', 'me'],

  // Wardrobe
  WARDROBE: (filters) => ['wardrobe', filters],
  CLOTH_ITEM: (id) => ['wardrobe', 'item', id],
  WARDROBE_STATS: ['wardrobe', 'stats'],

  // Outfits
  SAVED_OUTFITS: (page) => ['outfits', 'saved', page],
  OUTFIT: (id) => ['outfits', id],

  // Plans
  WEEK_PLAN: (date) => ['plans', 'week', date],
  PLANS: (filters) => ['plans', filters],

  // Wear logs
  WEAR_HISTORY: (page) => ['wear-logs', page],

  // Stylist
  SESSIONS: (page) => ['stylist', 'sessions', page],
  SESSION: (id) => ['stylist', 'session', id],

  // Analytics
  DASHBOARD: ['analytics', 'dashboard'],
  COST_PER_WEAR: ['analytics', 'cost-per-wear'],
  WEAR_FREQUENCY: (limit) => ['analytics', 'wear-frequency', limit],
  SLEEPING_ITEMS: ['analytics', 'sleeping-items'],
  UTILIZATION: ['analytics', 'utilization'],

  // User
  PROFILE: ['user', 'profile'],
  PREFERENCES: ['user', 'preferences'],
};

export default QUERY_KEYS;
