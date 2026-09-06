// src/utils/dateUtils.js
//
// Small date helpers shared across Home (greeting, daily query construction),
// Planner (day labels), and Wear History (relative date formatting).
// Uses date-fns since it's already in the dependency list.

import { format, isToday, isYesterday, differenceInCalendarDays } from 'date-fns';

export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Matches backend's getSeason() in wearLogController.js exactly — keep in
// sync if that ever changes.
export function getSeason(date = new Date()) {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

export function getDayOfWeekLabel(date = new Date()) {
  return format(date, 'EEEE'); // 'Monday'
}

export function formatRelativeDate(date) {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE d MMM'); // 'Mon 12 Aug'
}

export function daysSince(date) {
  if (!date) return null;
  return differenceInCalendarDays(new Date(), new Date(date));
}

export function toISODateString(date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}
