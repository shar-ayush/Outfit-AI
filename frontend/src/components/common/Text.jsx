// src/components/common/Text.jsx
//
// Typography wrapper — every piece of text in the app should go through
// this instead of RN's raw <Text>, so type-scale changes happen in one
// place (src/theme/typography.js).
//
// Usage:
//   <Text variant="displayLg">OUTFIT AI</Text>
//   <Text variant="bodyMd" color="secondary">Not worn in 60 days</Text>
//   <Text variant="labelCaps" color="goldAccent">AI Suggested</Text>

import React from 'react';
import { Text as RNText } from 'react-native';
import { colors, typography } from '@/theme';

const Text = React.forwardRef(function Text(
  { variant = 'bodyLg', color = 'onSurface', style, children, ...rest },
  ref
) {
  const variantStyle = typography[variant] || typography.bodyLg;
  const resolvedColor = colors[color] || color; // allow raw hex fallback

  return (
    <RNText
      ref={ref}
      style={[variantStyle, { color: resolvedColor }, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
});

export default Text;
