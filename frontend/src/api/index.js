// src/api/index.js
//
// Barrel export — import { authApi, wardrobeApi } from '@/api';
// Namespaced (not flattened) since several modules share function names
// (e.g. wardrobe and outfits both could plausibly export a `getStats`).

import * as authApi from './auth';
import * as wardrobeApi from './wardrobe';
import * as outfitsApi from './outfits';
import * as plansApi from './plans';
import * as wearLogsApi from './wearLogs';
import * as stylistApi from './stylist';
import * as analyticsApi from './analytics';
import * as userApi from './user';

export {
  authApi,
  wardrobeApi,
  outfitsApi,
  plansApi,
  wearLogsApi,
  stylistApi,
  analyticsApi,
  userApi,
};

export { default as apiClient } from './client';
