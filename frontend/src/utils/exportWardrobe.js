// src/utils/exportWardrobe.js
//
// FIX (gap #4, partial): the plan wanted "Export wardrobe data (JSON
// download)". The backend has no export endpoint, but this doesn't need
// one - it's a legitimate frontend-only feature. Fetches every page of
// the user's real wardrobe (same GET /api/wardrobe already used
// everywhere else), writes it to a JSON file, and opens the native share
// sheet. Uses expo-file-system + expo-sharing, both already installed
// since Step 1.

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { wardrobeApi } from '@/api';

export async function exportWardrobeToJSON() {
  const allItems = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const result = await wardrobeApi.getWardrobe({ page, limit: 100 });
    allItems.push(...result.clothes);
    hasNext = result.pagination.hasNext;
    page += 1;
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    itemCount: allItems.length,
    items: allItems,
  };

  const fileUri = `${FileSystem.documentDirectory}outfitai-wardrobe-export-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Export Wardrobe Data' });
  }

  return { fileUri, itemCount: allItems.length };
}