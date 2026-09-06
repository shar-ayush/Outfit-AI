// src/components/upload/MetadataForm.jsx
//
// Optional collapsible fields shown after image capture — per plan,
// "Skippable — most users won't fill these immediately." Kept as
// uncontrolled-friendly (parent owns state) simple inputs rather than a
// full react-hook-form instance since there's no validation need here
// (all fields optional, backend has no required-field constraints beyond
// the image itself).

import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import Input from '@/components/common/Input';
import { colors, spacing } from '@/theme';

export default function MetadataForm({ value, onChange }) {
  const [expanded, setExpanded] = useState(false);

  const setField = (field) => (text) => onChange({ ...value, [field]: text });

  return (
    <View style={styles.container}>
      <Pressable style={styles.toggle} onPress={() => setExpanded((e) => !e)}>
        <Text variant="titleMd">Add Details (Optional)</Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.onSurfaceVariant}
        />
      </Pressable>

      {expanded && (
        <View style={styles.fields}>
          <Input
            variant="outlined"
            placeholder="Item name (e.g. Navy Blazer)"
            value={value.name}
            onChangeText={setField('name')}
          />
          <Input
            variant="outlined"
            placeholder="Brand"
            value={value.brand}
            onChangeText={setField('brand')}
          />
          <Input
            variant="outlined"
            placeholder="Purchase price"
            value={value.purchasePrice}
            onChangeText={setField('purchasePrice')}
            keyboardType="decimal-pad"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    borderRadius: 12,
    padding: spacing.stackMd,
  },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fields: { marginTop: spacing.stackMd, gap: spacing.stackSm },
});
