// app/(app)/planner/design.jsx
//
// 2-Step interactive outfit designer for the weekly planner:
// Step 1: Clothes selection grid with category filters (Tops, Bottoms,
//         Outerwear, Footwear, Accessories) with strict slot limits:
//         1 top, 1 bottom, 1 outerwear, 1 footwear, up to 3 accessories.
// Step 2: Visual design canvas interpreting the combination:
//         Top and Outerwear side-by-side on top (if outerwear selected),
//         Bottom centered underneath, Shoes centered at the bottom,
//         accessories accenting.
// Saves the outfit to the user's collection and assigns it to the selected day.

import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { parseLocalDate } from '@/utils/dateUtils';
import { useWardrobeList } from '@/hooks/useWardrobe';
import { useCreateOutfit } from '@/hooks/useOutfits';
import { useCreatePlan } from '@/hooks/usePlans';
import { COLOR_HEX_MAP, getClothColorHex } from '@/constants/categories';
import { colors, spacing, radius, shadows } from '@/theme';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = spacing.stackSm;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.gutter * 2 - GRID_GAP) / 2;

const CATEGORIES = [
  { value: null, label: 'All', icon: 'view-grid' },
  { value: 'top', label: 'Tops', icon: 'tshirt-crew-outline' },
  { value: 'bottom', label: 'Bottoms', icon: 'format-vertical-align-bottom' },
  { value: 'outerwear', label: 'Outerwear', icon: 'hanger' },
  { value: 'footwear', label: 'Shoes', icon: 'shoe-sneaker' },
  { value: 'accessory', label: 'Accessories', icon: 'watch' },
];

const OCCASION_CHIPS = [
  { label: 'Work', value: 'office', icon: 'briefcase-outline' },
  { label: 'Casual', value: 'casual', icon: 'coffee-outline' },
  { label: 'Formal', value: 'formal', icon: 'tie' },
  { label: 'Party', value: 'party', icon: 'party-popper' },
  { label: 'Date', value: 'date', icon: 'heart-outline' },
  { label: 'Travel', value: 'travel', icon: 'airplane' },
];

const MAX_ACCESSORIES = 3;

export default function DesignOutfitScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams();
  const showToast = useUIStore((s) => s.showToast);

  const dateObj = date ? parseLocalDate(date) : new Date();
  const dateLabel = format(dateObj, 'EEEE, MMM d');

  const [step, setStep] = useState('select'); // 'select' | 'canvas'
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState({
    top: null,
    bottom: null,
    outerwear: null,
    footwear: null,
    accessories: [],
  });

  const [outfitName, setOutfitName] = useState(`Look for ${dateLabel}`);
  const [occasion, setOccasion] = useState('casual');

  const createOutfit = useCreateOutfit();
  const createPlan = useCreatePlan();

  // Fetch user's wardrobe items
  const { data, isLoading } = useWardrobeList();
  const allClothes = useMemo(() => {
    const raw = data?.pages?.flatMap((p) => p.clothes) || [];
    return raw.filter((c) => c.isAvailable !== false && !c.isArchived);
  }, [data]);

  // Filtered clothes for display in step 1
  const displayedClothes = useMemo(() => {
    return allClothes.filter((c) => {
      if (categoryFilter && c.category !== categoryFilter) return false;
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const nameMatch = c.name?.toLowerCase().includes(query);
        const categoryMatch = c.category?.toLowerCase().includes(query);
        const colorMatch = c.color?.primary?.toLowerCase().includes(query);
        const subMatch = c.subCategory?.toLowerCase().includes(query);
        if (!nameMatch && !categoryMatch && !colorMatch && !subMatch) return false;
      }
      return true;
    });
  }, [allClothes, categoryFilter, search]);

  // Check if an item is selected
  const isItemSelected = (clothId) => {
    if (selected.top?._id === clothId) return true;
    if (selected.bottom?._id === clothId) return true;
    if (selected.outerwear?._id === clothId) return true;
    if (selected.footwear?._id === clothId) return true;
    return selected.accessories.some((a) => a._id === clothId);
  };

  // Handle tapping a clothing item with category constraints
  const handleItemPress = (cloth) => {
    const cat = cloth.category;

    if (cat === 'top' || cat === 'full_body') {
      if (selected.top?._id === cloth._id) {
        setSelected((s) => ({ ...s, top: null }));
      } else {
        setSelected((s) => ({ ...s, top: cloth }));
      }
    } else if (cat === 'bottom') {
      if (selected.bottom?._id === cloth._id) {
        setSelected((s) => ({ ...s, bottom: null }));
      } else {
        setSelected((s) => ({ ...s, bottom: cloth }));
      }
    } else if (cat === 'outerwear') {
      if (selected.outerwear?._id === cloth._id) {
        setSelected((s) => ({ ...s, outerwear: null }));
      } else {
        setSelected((s) => ({ ...s, outerwear: cloth }));
      }
    } else if (cat === 'footwear') {
      if (selected.footwear?._id === cloth._id) {
        setSelected((s) => ({ ...s, footwear: null }));
      } else {
        setSelected((s) => ({ ...s, footwear: cloth }));
      }
    } else if (cat === 'accessory') {
      const exists = selected.accessories.some((a) => a._id === cloth._id);
      if (exists) {
        setSelected((s) => ({
          ...s,
          accessories: s.accessories.filter((a) => a._id !== cloth._id),
        }));
      } else {
        if (selected.accessories.length >= MAX_ACCESSORIES) {
          showToast(`Accessory limit reached (max ${MAX_ACCESSORIES})`, 'info');
          return;
        }
        setSelected((s) => ({
          ...s,
          accessories: [...s.accessories, cloth],
        }));
      }
    }
  };

  const totalSelectedCount =
    (selected.top ? 1 : 0) +
    (selected.bottom ? 1 : 0) +
    (selected.outerwear ? 1 : 0) +
    (selected.footwear ? 1 : 0) +
    selected.accessories.length;

  const canProceedToCanvas =
    (selected.top && selected.bottom) ||
    (selected.top?.category === 'full_body') ||
    totalSelectedCount >= 2;

  // Save outfit and plan for day
  const handleSave = async () => {
    if (!totalSelectedCount) {
      showToast('Please select items for your outfit', 'error');
      return;
    }

    try {
      const items = [];
      if (selected.top) {
        items.push({ clothId: selected.top._id, role: selected.top.category === 'full_body' ? 'full_body' : 'top', position: 0 });
      }
      if (selected.outerwear) {
        items.push({ clothId: selected.outerwear._id, role: 'outerwear', position: 1 });
      }
      if (selected.bottom) {
        items.push({ clothId: selected.bottom._id, role: 'bottom', position: 2 });
      }
      if (selected.footwear) {
        items.push({ clothId: selected.footwear._id, role: 'footwear', position: 3 });
      }
      selected.accessories.forEach((acc, index) => {
        items.push({ clothId: acc._id, role: 'accessory', position: 4 + index });
      });

      const newOutfit = await createOutfit.mutateAsync({
        items,
        outfitName: outfitName.trim() || 'Custom Look',
        occasion,
        isSaved: true,
      });

      if (!newOutfit?._id) {
        throw new Error('Failed to create outfit');
      }

      if (date) {
        await createPlan.mutateAsync({
          outfitId: newOutfit._id,
          date,
          occasion,
        });
      }

      showToast(`Outfit planned for ${dateLabel}!`, 'success');
      router.back();
    } catch (err) {
      showToast(err?.message || 'Could not save outfit', 'error');
    }
  };

  const isSaving = createOutfit.isPending || createPlan.isPending;

  // Palette dots for visual canvas
  const allSelectedItems = [
    selected.top,
    selected.outerwear,
    selected.bottom,
    selected.footwear,
    ...selected.accessories,
  ].filter(Boolean);

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (step === 'canvas') {
              setStep('select');
            } else {
              router.back();
            }
          }}
          hitSlop={8}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text variant="titleMd">
            {step === 'select' ? 'Select Clothes' : 'Outfit Design'}
          </Text>
          <Text variant="caption" color="secondary">
            {step === 'select' ? `Step 1 of 2 • Planning ${dateLabel}` : `Step 2 of 2 • ${dateLabel}`}
          </Text>
        </View>

        {step === 'select' ? (
          <Pressable
            onPress={() => canProceedToCanvas && setStep('canvas')}
            disabled={!canProceedToCanvas}
            style={[styles.nextPill, !canProceedToCanvas && styles.nextPillDisabled]}
          >
            <Text
              variant="labelMd"
              color={canProceedToCanvas ? 'onPrimary' : 'secondary'}
            >
              Next
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={canProceedToCanvas ? colors.onPrimary : colors.secondary}
            />
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* STEP 1: CLOTHES SELECTION */}
      {step === 'select' && (
        <View style={styles.flex}>
          {/* Category Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScrollWrapper}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const active = categoryFilter === cat.value;
              return (
                <Pressable
                  key={cat.label}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setCategoryFilter(cat.value)}
                >
                  <MaterialCommunityIcons
                    name={cat.icon}
                    size={18}
                    color={active ? colors.onPrimary : colors.onSurface}
                  />
                  <Text
                    variant="bodyMd"
                    color={active ? 'onPrimary' : 'onSurface'}
                    style={styles.categoryLabel}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Search bar */}
          <View style={styles.searchWrap}>
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, color, or category..."
              style={styles.searchInput}
            />
          </View>

          {/* Grid of Clothes */}
          {isLoading ? (
            <LoadingSpinner fullScreen />
          ) : displayedClothes.length === 0 ? (
            <EmptyState
              title="No clothes found"
              message={
                categoryFilter
                  ? `No items in ${CATEGORIES.find((c) => c.value === categoryFilter)?.label || 'this category'}.`
                  : 'Add items to your wardrobe to design custom outfits.'
              }
            />
          ) : (
            <ScrollView
              contentContainerStyle={styles.gridContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.grid}>
                {displayedClothes.map((cloth) => {
                  const selectedCurrent = isItemSelected(cloth._id);
                  const colorHex = getClothColorHex(cloth.color, colors.surfaceContainerHigh);

                  return (
                    <Pressable
                      key={cloth._id}
                      style={[
                        styles.clothCard,
                        selectedCurrent && styles.clothCardSelected,
                        shadows.xs,
                      ]}
                      onPress={() => handleItemPress(cloth)}
                    >
                      <View style={styles.clothImageWrap}>
                        <Image
                          source={{ uri: cloth.imageUrl }}
                          style={styles.clothImage}
                          contentFit="contain"
                          transition={150}
                        />
                        {selectedCurrent && (
                          <View style={styles.selectedBadge}>
                            <MaterialCommunityIcons
                              name="check-circle"
                              size={22}
                              color={colors.primary}
                            />
                          </View>
                        )}
                      </View>

                      <View style={styles.clothMeta}>
                        <View style={styles.clothMetaRow}>
                          <Text variant="labelCaps" color="secondary" numberOfLines={1}>
                            {cloth.category}
                          </Text>
                          <View style={[styles.colorDot, { backgroundColor: colorHex }]} />
                        </View>
                        <Text variant="bodyMd" numberOfLines={1} style={styles.clothName}>
                          {cloth.name || cloth.subCategory || cloth.category}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Slot Tray at bottom */}
          <View style={styles.trayBar}>
            <View style={styles.slotRow}>
              {/* Top slot */}
              <Pressable
                style={[styles.slotItem, selected.top && styles.slotItemFilled]}
                onPress={() => setCategoryFilter('top')}
              >
                {selected.top ? (
                  <Image source={{ uri: selected.top.imageUrl }} style={styles.slotImage} contentFit="contain" />
                ) : (
                  <MaterialCommunityIcons name="tshirt-crew-outline" size={18} color={colors.secondary} />
                )}
                <Text variant="caption" numberOfLines={1} color={selected.top ? 'primary' : 'secondary'}>
                  {selected.top ? 'Top ✓' : 'Top'}
                </Text>
              </Pressable>

              {/* Outerwear slot */}
              <Pressable
                style={[styles.slotItem, selected.outerwear && styles.slotItemFilled]}
                onPress={() => setCategoryFilter('outerwear')}
              >
                {selected.outerwear ? (
                  <Image source={{ uri: selected.outerwear.imageUrl }} style={styles.slotImage} contentFit="contain" />
                ) : (
                  <MaterialCommunityIcons name="hanger" size={18} color={colors.secondary} />
                )}
                <Text variant="caption" numberOfLines={1} color={selected.outerwear ? 'primary' : 'secondary'}>
                  {selected.outerwear ? 'Outer ✓' : 'Outer'}
                </Text>
              </Pressable>

              {/* Bottom slot */}
              <Pressable
                style={[styles.slotItem, selected.bottom && styles.slotItemFilled]}
                onPress={() => setCategoryFilter('bottom')}
              >
                {selected.bottom ? (
                  <Image source={{ uri: selected.bottom.imageUrl }} style={styles.slotImage} contentFit="contain" />
                ) : (
                  <MaterialCommunityIcons name="format-vertical-align-bottom" size={18} color={colors.secondary} />
                )}
                <Text variant="caption" numberOfLines={1} color={selected.bottom ? 'primary' : 'secondary'}>
                  {selected.bottom ? 'Bottom ✓' : 'Bottom'}
                </Text>
              </Pressable>

              {/* Shoes slot */}
              <Pressable
                style={[styles.slotItem, selected.footwear && styles.slotItemFilled]}
                onPress={() => setCategoryFilter('footwear')}
              >
                {selected.footwear ? (
                  <Image source={{ uri: selected.footwear.imageUrl }} style={styles.slotImage} contentFit="contain" />
                ) : (
                  <MaterialCommunityIcons name="shoe-sneaker" size={18} color={colors.secondary} />
                )}
                <Text variant="caption" numberOfLines={1} color={selected.footwear ? 'primary' : 'secondary'}>
                  {selected.footwear ? 'Shoes ✓' : 'Shoes'}
                </Text>
              </Pressable>

              {/* Accessories slot */}
              <Pressable
                style={[styles.slotItem, selected.accessories.length > 0 && styles.slotItemFilled]}
                onPress={() => setCategoryFilter('accessory')}
              >
                {selected.accessories.length > 0 ? (
                  <Image
                    source={{ uri: selected.accessories[0].imageUrl }}
                    style={styles.slotImage}
                    contentFit="contain"
                  />
                ) : (
                  <MaterialCommunityIcons name="watch" size={18} color={colors.secondary} />
                )}
                <Text variant="caption" numberOfLines={1} color={selected.accessories.length > 0 ? 'primary' : 'secondary'}>
                  {selected.accessories.length > 0 ? `Acc (${selected.accessories.length})` : 'Acc'}
                </Text>
              </Pressable>
            </View>

            <Button
              onPress={() => setStep('canvas')}
              disabled={!canProceedToCanvas}
              style={styles.continueButton}
            >
              {canProceedToCanvas
                ? `Preview Look (${totalSelectedCount} items)`
                : 'Select Top & Bottom to Preview'}
            </Button>
          </View>
        </View>
      )}

      {/* STEP 2: DESIGN CANVAS */}
      {step === 'canvas' && (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.canvasContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Visual Outfit Canvas Board */}
          <View style={styles.boardCard}>
            <View style={styles.boardHeader}>
              <Text variant="labelCaps" color="secondary">
                VISUAL COMPOSITION
              </Text>
              <Pressable onPress={() => setStep('select')}>
                <Text variant="labelMd" color="primary" style={styles.editSelectionText}>
                  Edit Clothes
                </Text>
              </Pressable>
            </View>

            {/* TOP ROW: Top and Outerwear side-by-side if outerwear exists */}
            <View style={styles.canvasSection}>
              {selected.outerwear ? (
                <View>
                  <Text variant="caption" color="secondary" style={styles.sectionLabel}>
                    Top & Outerwear (Upper Layering)
                  </Text>
                  <View style={styles.sideBySideRow}>
                    {/* Top */}
                    <View style={styles.halfCard}>
                      <View style={styles.halfImageWrap}>
                        <Image
                          source={{ uri: selected.top?.imageUrl }}
                          style={styles.canvasImage}
                          contentFit="contain"
                        />
                        <Pressable
                          style={styles.removeIcon}
                          onPress={() => setSelected((s) => ({ ...s, top: null }))}
                        >
                          <MaterialCommunityIcons name="close" size={14} color={colors.primary} />
                        </Pressable>
                      </View>
                      <Text variant="caption" color="secondary" numberOfLines={1}>
                        Top: {selected.top?.name || selected.top?.subCategory || 'Selected'}
                      </Text>
                    </View>

                    {/* Outerwear */}
                    <View style={styles.halfCard}>
                      <View style={styles.halfImageWrap}>
                        <Image
                          source={{ uri: selected.outerwear?.imageUrl }}
                          style={styles.canvasImage}
                          contentFit="contain"
                        />
                        <Pressable
                          style={styles.removeIcon}
                          onPress={() => setSelected((s) => ({ ...s, outerwear: null }))}
                        >
                          <MaterialCommunityIcons name="close" size={14} color={colors.primary} />
                        </Pressable>
                      </View>
                      <Text variant="caption" color="secondary" numberOfLines={1}>
                        Outer: {selected.outerwear?.name || selected.outerwear?.subCategory || 'Selected'}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.singleItemSection}>
                  <Text variant="caption" color="secondary" style={styles.sectionLabel}>
                    Top
                  </Text>
                  <View style={styles.fullCard}>
                    <View style={styles.fullImageWrap}>
                      <Image
                        source={{ uri: selected.top?.imageUrl }}
                        style={styles.canvasImage}
                        contentFit="contain"
                      />
                      {selected.top && (
                        <Pressable
                          style={styles.removeIcon}
                          onPress={() => setSelected((s) => ({ ...s, top: null }))}
                        >
                          <MaterialCommunityIcons name="close" size={14} color={colors.primary} />
                        </Pressable>
                      )}
                    </View>
                    <Text variant="bodyMd" style={styles.cardItemTitle} numberOfLines={1}>
                      {selected.top?.name || selected.top?.subCategory || 'No top selected'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* ACCESSORIES ROW (if any) */}
            {selected.accessories.length > 0 && (
              <View style={styles.canvasSection}>
                <Text variant="caption" color="secondary" style={styles.sectionLabel}>
                  Accessories ({selected.accessories.length}/{MAX_ACCESSORIES})
                </Text>
                <View style={styles.accessoryRow}>
                  {selected.accessories.map((acc) => (
                    <View key={acc._id} style={styles.accessoryCard}>
                      <Image source={{ uri: acc.imageUrl }} style={styles.accessoryImage} contentFit="contain" />
                      <Text variant="caption" numberOfLines={1} style={styles.accessoryName}>
                        {acc.name || acc.subCategory || 'Accessory'}
                      </Text>
                      <Pressable
                        style={styles.accessoryRemove}
                        onPress={() =>
                          setSelected((s) => ({
                            ...s,
                            accessories: s.accessories.filter((a) => a._id !== acc._id),
                          }))
                        }
                      >
                        <MaterialCommunityIcons name="close" size={12} color={colors.primary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* MIDDLE ROW: Bottom */}
            <View style={styles.canvasSection}>
              <Text variant="caption" color="secondary" style={styles.sectionLabel}>
                Bottom
              </Text>
              <View style={styles.fullCard}>
                <View style={styles.fullImageWrap}>
                  <Image
                    source={{ uri: selected.bottom?.imageUrl }}
                    style={styles.canvasImage}
                    contentFit="contain"
                  />
                  {selected.bottom && (
                    <Pressable
                      style={styles.removeIcon}
                      onPress={() => setSelected((s) => ({ ...s, bottom: null }))}
                    >
                      <MaterialCommunityIcons name="close" size={14} color={colors.primary} />
                    </Pressable>
                  )}
                </View>
                <Text variant="bodyMd" style={styles.cardItemTitle} numberOfLines={1}>
                  {selected.bottom?.name || selected.bottom?.subCategory || 'No bottom selected'}
                </Text>
              </View>
            </View>

            {/* BOTTOM ROW: Footwear */}
            <View style={styles.canvasSection}>
              <Text variant="caption" color="secondary" style={styles.sectionLabel}>
                Shoes & Footwear
              </Text>
              <View style={styles.fullCard}>
                <View style={styles.fullImageWrap}>
                  <Image
                    source={{ uri: selected.footwear?.imageUrl }}
                    style={styles.canvasImage}
                    contentFit="contain"
                  />
                  {selected.footwear && (
                    <Pressable
                      style={styles.removeIcon}
                      onPress={() => setSelected((s) => ({ ...s, footwear: null }))}
                    >
                      <MaterialCommunityIcons name="close" size={14} color={colors.primary} />
                    </Pressable>
                  )}
                </View>
                <Text variant="bodyMd" style={styles.cardItemTitle} numberOfLines={1}>
                  {selected.footwear?.name || selected.footwear?.subCategory || 'No footwear selected'}
                </Text>
              </View>
            </View>

            {/* Color Palette harmony summary */}
            <View style={styles.paletteRow}>
              <Text variant="caption" color="secondary">
                Color Palette:
              </Text>
              <View style={styles.paletteDots}>
                {allSelectedItems.map((item, i) => {
                  const hex = getClothColorHex(item.color, colors.surfaceContainerHigh);
                  return (
                    <View
                      key={item._id || i}
                      style={[styles.paletteDot, { backgroundColor: hex }]}
                    />
                  );
                })}
              </View>
            </View>
          </View>

          {/* Outfit Meta Card */}
          <View style={styles.metaCard}>
            <Text variant="titleMd" style={styles.metaTitle}>
              Outfit Details
            </Text>

            <Text variant="labelCaps" color="secondary" style={styles.inputLabel}>
              OUTFIT NAME
            </Text>
            <Input
              value={outfitName}
              onChangeText={setOutfitName}
              placeholder="e.g. Elegant Workday, Weekend Casual"
              style={styles.nameInput}
            />

            <Text variant="labelCaps" color="secondary" style={styles.inputLabel}>
              OCCASION
            </Text>
            <View style={styles.occasionGrid}>
              {OCCASION_CHIPS.map((chip) => {
                const active = occasion === chip.value;
                return (
                  <Pressable
                    key={chip.value}
                    style={[styles.occasionChip, active && styles.occasionChipActive]}
                    onPress={() => setOccasion(chip.value)}
                  >
                    <MaterialCommunityIcons
                      name={chip.icon}
                      size={18}
                      color={active ? colors.onPrimary : colors.onSurface}
                    />
                    <Text
                      variant="bodyMd"
                      color={active ? 'onPrimary' : 'onSurface'}
                      style={styles.occasionLabel}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Button
              icon="calendar-check"
              onPress={handleSave}
              loading={isSaving}
              style={styles.saveButton}
            >
              Save & Plan for {dateLabel}
            </Button>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.stackSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
    backgroundColor: colors.background,
  },
  backButton: { padding: 4 },
  headerCenter: { alignItems: 'center' },
  nextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  nextPillDisabled: {
    backgroundColor: colors.surfaceContainerHigh,
  },

  // Category filter
  categoryScrollWrapper: {
    height: 52,
    marginBottom: spacing.stackSm,
  },
  categoryScroll: {
    paddingHorizontal: spacing.gutter,
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surfaceContainerLowest,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryLabel: {
    marginLeft: 6,
    fontFamily: 'Inter_500Medium',
  },

  // Search
  searchWrap: {
    paddingHorizontal: spacing.gutter,
    marginBottom: spacing.stackSm,
  },
  searchInput: { height: 42 },

  // Grid
  gridContainer: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: 150, // Space for tray bar
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  clothCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  clothCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerLow,
  },
  clothImageWrap: {
    width: '100%',
    height: CARD_WIDTH * 1.15,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  clothImage: {
    width: '88%',
    height: '88%',
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.full,
    padding: 1,
  },
  clothMeta: {
    padding: spacing.stackSm,
  },
  clothMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  clothName: {
    marginTop: 2,
  },

  // Slot Tray
  trayBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.stackSm,
    paddingBottom: spacing.stackMd,
    ...shadows.md,
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.stackSm,
  },
  slotItem: {
    width: (SCREEN_WIDTH - spacing.gutter * 2 - 32) / 5,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  slotItemFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerLowest,
  },
  slotImage: {
    width: 32,
    height: 32,
  },
  continueButton: {
    width: '100%',
  },

  // Canvas View
  canvasContainer: {
    padding: spacing.gutter,
    paddingBottom: spacing.stackXl * 2,
  },
  boardCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    marginBottom: spacing.stackLg,
    ...shadows.sm,
  },
  boardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.stackMd,
  },
  editSelectionText: {
    textDecorationLine: 'underline',
  },
  canvasSection: {
    marginBottom: spacing.stackMd,
  },
  sectionLabel: {
    marginBottom: 4,
  },
  sideBySideRow: {
    flexDirection: 'row',
    gap: spacing.stackSm,
  },
  halfCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.stackSm,
    alignItems: 'center',
  },
  halfImageWrap: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  singleItemSection: {
    alignItems: 'center',
  },
  fullCard: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.stackSm,
    alignItems: 'center',
  },
  fullImageWrap: {
    width: '100%',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  canvasImage: {
    width: '85%',
    height: '85%',
  },
  removeIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.full,
    padding: 3,
  },
  cardItemTitle: {
    marginTop: 4,
    fontWeight: '500',
  },

  // Accessories in canvas
  accessoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.stackSm,
  },
  accessoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  accessoryImage: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    marginRight: 6,
  },
  accessoryName: {
    maxWidth: 90,
  },
  accessoryRemove: {
    marginLeft: 6,
    padding: 2,
  },

  // Palette
  paletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.stackSm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    marginTop: spacing.stackSm,
  },
  paletteDots: {
    flexDirection: 'row',
    gap: 6,
  },
  paletteDot: {
    width: 14,
    height: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },

  // Meta Section
  metaCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.stackMd,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    ...shadows.sm,
  },
  metaTitle: {
    marginBottom: spacing.stackMd,
  },
  inputLabel: {
    marginBottom: 6,
  },
  nameInput: {
    marginBottom: spacing.stackMd,
  },
  occasionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.stackSm,
    marginBottom: spacing.stackLg,
  },
  occasionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    backgroundColor: colors.surfaceContainerLowest,
  },
  occasionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  occasionLabel: {
    marginLeft: 6,
    fontFamily: 'Inter_500Medium',
  },
  saveButton: {
    marginTop: spacing.stackSm,
  },
});
