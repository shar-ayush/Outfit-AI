export const QUERY_KEYS = {
  ME: ['auth', 'me'],

  WARDROBE: (filters) => ['wardrobe', filters],
  CLOTH_ITEM: (id) => ['wardrobe', 'item', id],
  WARDROBE_STATS: ['wardrobe', 'stats'],

  SAVED_OUTFITS: (page) => ['outfits', 'saved', page],
  OUTFIT: (id) => ['outfits', id],
  DAILY_OUTFIT: (date) => ['outfits', 'daily', date],

  WEEK_PLAN: (date) => ['plans', 'week', date],
  PLANS: (filters) => ['plans', filters],

  WEAR_HISTORY: (page) => ['wear-logs', page],

  SESSIONS: (page) => ['stylist', 'sessions', page],
  SESSION: (id) => ['stylist', 'session', id],

  DASHBOARD: ['analytics', 'dashboard'],
  COST_PER_WEAR: ['analytics', 'cost-per-wear'],
  WEAR_FREQUENCY: (limit) => ['analytics', 'wear-frequency', limit],
  SLEEPING_ITEMS: ['analytics', 'sleeping-items'],
  UTILIZATION: ['analytics', 'utilization'],

  PROFILE: ['user', 'profile'],
  PREFERENCES: ['user', 'preferences'],

  TRY_ON_HISTORY: (page) => ['try-on', 'history', page],
};

export default QUERY_KEYS;
