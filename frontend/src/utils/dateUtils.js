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

/**
 * Parses a "YYYY-MM-DD" string into a local Date representing that calendar day at midnight.
 * Avoids UTC timezone conversion shifts caused by `new Date("YYYY-MM-DD")`.
 */
export function parseLocalDate(dateInput) {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  return new Date(dateInput);
}

