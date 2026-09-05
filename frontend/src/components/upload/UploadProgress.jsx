// src/components/upload/UploadProgress.jsx
//
// IMPORTANT HONESTY NOTE: the backend's POST /wardrobe/upload is a single
// blocking request — background removal + Gemini metadata extraction both
// happen server-side before it responds (see wardrobeService.js). There is
// no server-sent progress event for "now removing background" / "now
// analyzing". This component shows a client-side SIMULATED step sequence
// (Uploading → Analyzing) that advances on a timer WHILE the real request
// is in flight, and only shows "Done" once the actual API response
// resolves — so the final state is always truthful even though the
// intermediate labels are a UX approximation of what's really a single
// black-box request.

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Text from '@/components/common/Text';
import { colors, spacing, radius } from '@/theme';

const STEPS = [
  { key: 'uploading', label: 'Uploading image' },
  { key: 'analyzing', label: 'Removing background & analyzing with AI' },
  { key: 'done', label: 'Saved to wardrobe' },
];

export default function UploadProgress({ status }) {
  // status: 'uploading' | 'analyzing' | 'done' | 'error'
  const [simulatedStep, setSimulatedStep] = useState('uploading');

  useEffect(() => {
    if (status !== 'uploading') return;
    const timer = setTimeout(() => setSimulatedStep('analyzing'), 1200);
    return () => clearTimeout(timer);
  }, [status]);

  const activeKey = status === 'done' ? 'done' : status === 'error' ? simulatedStep : simulatedStep;

  return (
    <View style={styles.container}>
      {STEPS.map((step, i) => {
        const isDone = STEPS.findIndex((s) => s.key === activeKey) > i || status === 'done';
        const isActive = step.key === activeKey && status !== 'done';
        const isError = status === 'error' && isActive;

        return (
          <View key={step.key} style={styles.row}>
            <View
              style={[
                styles.iconCircle,
                isDone && styles.iconCircleDone,
                isError && styles.iconCircleError,
              ]}
            >
              {isDone ? (
                <MaterialCommunityIcons name="check" size={14} color={colors.onPrimary} />
              ) : isError ? (
                <MaterialCommunityIcons name="alert" size={14} color={colors.onError} />
              ) : isActive ? (
                <MaterialCommunityIcons name="loading" size={14} color={colors.primary} />
              ) : (
                <View style={styles.iconDot} />
              )}
            </View>
            <Text
              variant="bodyMd"
              color={isDone || isActive ? 'onSurface' : 'secondary'}
              style={styles.label}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.stackMd },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.stackSm,
  },
  iconCircleDone: { backgroundColor: colors.success, borderColor: colors.success },
  iconCircleError: { backgroundColor: colors.error, borderColor: colors.error },
  iconDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.outlineVariant },
  label: { flex: 1 },
});
