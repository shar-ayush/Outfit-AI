import * as FileSystem from 'expo-file-system/legacy';
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