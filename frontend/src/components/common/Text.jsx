import React from 'react';
import { Text as RNText } from 'react-native';
import { colors, typography } from '@/theme';

const Text = React.forwardRef(function Text(
  { variant = 'bodyLg', color = 'onSurface', style, children, ...rest },
  ref
) {
  const variantStyle = typography[variant] || typography.bodyLg;
  const resolvedColor = colors[color] || color;

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
