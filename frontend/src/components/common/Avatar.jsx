import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Text from './Text';
import { colors, radius } from '@/theme';

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, imageUrl, size = 48, style }) {
  const dimension = { width: size, height: size, borderRadius: radius.full };

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[dimension, style]}
        contentFit="cover"
        transition={150}
      />
    );
  }

  return (
    <View style={[dimension, styles.initialsContainer, style]}>
      <Text
        variant="titleMd"
        color="onPrimary"
        style={{ fontSize: size * 0.36 }}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  initialsContainer: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
