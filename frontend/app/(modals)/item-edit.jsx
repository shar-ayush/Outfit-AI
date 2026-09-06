// app/(modals)/item-edit.jsx
//
// Every field here maps exactly to `allowedFields` in
// wardrobeService.updateCloth: name, brand, purchasePrice, notes,
// occasions, season, formality, isAvailable. Nothing extra, nothing
// fabricated - this is a direct mirror of what PATCH /api/wardrobe/:id
// actually accepts.

import React, { useState, useEffect } from 'react';
import { View, Pressable, TextInput, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '@/components/common/Screen';
import Text from '@/components/common/Text';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import Tag from '@/components/common/Tag';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useClothItem, useUpdateCloth } from '@/hooks/useWardrobe';
import { useUIStore } from '@/stores';
import { OCCASIONS, SEASONS, FORMALITY_FILTERS } from '@/constants/categories';
import { colors, spacing, radius, typography } from '@/theme';

export default function ItemEditModal() {
  const { clothId } = useLocalSearchParams();
  const router = useRouter();
  const showToast = useUIStore((s) => s.showToast);

  const { data: cloth, isLoading } = useClothItem(clothId);
  const updateCloth = useUpdateCloth(clothId);

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (cloth && !form) {
      setForm({
        name: cloth.name || '',
        brand: cloth.brand || '',
        purchasePrice: cloth.purchasePrice ? String(cloth.purchasePrice) : '',
        notes: cloth.notes || '',
        occasions: cloth.occasions || [],
        season: cloth.season || [],
        formality: cloth.formality || 'casual',
        isAvailable: cloth.isAvailable !== false,
      });
    }
  }, [cloth]);

  if (isLoading || !form) return <LoadingSpinner fullScreen />;

  const toggleArrayValue = (field, value) => {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value) ? f[field].filter((v) => v !== value) : [...f[field], value],
    }));
  };

  const handleSave = () => {
    updateCloth.mutate(
      {
        name: form.name || undefined,
        brand: form.brand || undefined,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
        notes: form.notes || undefined,
        occasions: form.occasions,
        season: form.season,
        formality: form.formality,
        isAvailable: form.isAvailable,
      },
      {
        onSuccess: () => {
          showToast('Item updated', 'success');
          router.back();
        },
        onError: () => showToast('Could not save changes', 'error'),
      }
    );
  };

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Close">
          <MaterialCommunityIcons name="close" size={24} color={colors.primary} />
        </Pressable>
        <Text variant="titleMd">Edit Item</Text>
        <Pressable onPress={handleSave} hitSlop={8} disabled={updateCloth.isPending} accessibilityLabel="Save changes">
          <Text variant="titleMd" color={updateCloth.isPending ? 'secondary' : 'primary'}>
            Save
          </Text>
        </Pressable>
      </View>

      <Input
        variant="outlined"
        placeholder="Nickname (optional)"
        value={form.name}
        onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
      />
      <Input
        variant="outlined"
        placeholder="Brand"
        value={form.brand}
        onChangeText={(v) => setForm((f) => ({ ...f, brand: v }))}
      />
      <Input
        variant="outlined"
        placeholder="Purchase price"
        value={form.purchasePrice}
        onChangeText={(v) => setForm((f) => ({ ...f, purchasePrice: v }))}
        keyboardType="decimal-pad"
      />

      <TextInput
        value={form.notes}
        onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
        placeholder="Notes"
        placeholderTextColor={colors.secondaryFixedDim}
        multiline
        style={styles.notesInput}
      />

      <Text variant="labelCaps" color="secondary" style={styles.fieldLabel}>Formality</Text>
      <View style={styles.chipRow}>
        {FORMALITY_FILTERS.filter((f) => f.value).map((f) => (
          <Tag
            key={f.value}
            label={f.label}
            active={form.formality === f.value}
            onPress={() => setForm((prev) => ({ ...prev, formality: f.value }))}
            style={styles.chipSpacing}
          />
        ))}
      </View>

      <Text variant="labelCaps" color="secondary" style={styles.fieldLabel}>Occasions</Text>
      <View style={styles.chipRow}>
        {OCCASIONS.map((occ) => (
          <Tag
            key={occ}
            label={occ}
            active={form.occasions.includes(occ)}
            onPress={() => toggleArrayValue('occasions', occ)}
            style={styles.chipSpacing}
          />
        ))}
      </View>

      <Text variant="labelCaps" color="secondary" style={styles.fieldLabel}>Season</Text>
      <View style={styles.chipRow}>
        {SEASONS.map((s) => (
          <Tag
            key={s}
            label={s}
            active={form.season.includes(s)}
            onPress={() => toggleArrayValue('season', s)}
            style={styles.chipSpacing}
          />
        ))}
      </View>

      <Pressable
        style={styles.availabilityRow}
        onPress={() => setForm((f) => ({ ...f, isAvailable: !f.isAvailable }))}
      >
        <Text variant="bodyLg">Available (not in laundry)</Text>
        <MaterialCommunityIcons
          name={form.isAvailable ? 'toggle-switch' : 'toggle-switch-off-outline'}
          size={32}
          color={form.isAvailable ? colors.primary : colors.secondary}
        />
      </Pressable>

      <Button onPress={handleSave} loading={updateCloth.isPending} style={styles.saveButton}>
        Save Changes
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.stackSm,
    marginBottom: spacing.stackMd,
  },
  notesInput: {
    ...typography.bodyLg,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: radius.sm,
    padding: spacing.stackMd,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.stackMd,
  },
  fieldLabel: { marginBottom: spacing.stackSm, marginTop: spacing.stackSm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.stackLg },
  chipSpacing: { marginRight: spacing.stackSm, marginBottom: spacing.stackSm },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.stackMd,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    marginBottom: spacing.stackLg,
  },
  saveButton: { marginBottom: spacing.stackXl },
});