// src/components/common/ErrorBoundary.jsx
//
// FIX (gap #12): there was no error boundary anywhere in the app. Any
// unexpected render-time error (a null field from an API response, a
// third-party library throwing, etc.) would crash the entire app to a
// white/red screen with no recovery path. This is a standard React class
// component (error boundaries cannot be hooks) wrapping the whole app
// once, at the root layout.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from './Text';
import Button from './Button';
import { colors, spacing } from '@/theme';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // In a production app, report this to a crash-reporting service
    // (Sentry, Bugsnag, etc.) - logging is the honest minimum for now.
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text variant="displayMd" style={styles.title}>Something went wrong</Text>
          <Text variant="bodyLg" color="secondary" style={styles.message}>
            An unexpected error occurred. You can try continuing, or restart the app if this keeps happening.
          </Text>
          {__DEV__ && this.state.error && (
            <Text variant="caption" color="error" style={styles.devError}>
              {String(this.state.error?.message || this.state.error)}
            </Text>
          )}
          <Button onPress={this.handleReset} style={styles.button}>
            Try Again
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.stackLg,
    backgroundColor: colors.background,
  },
  title: { textAlign: 'center', marginBottom: spacing.stackSm },
  message: { textAlign: 'center', marginBottom: spacing.stackLg, maxWidth: 300 },
  devError: { marginBottom: spacing.stackLg, textAlign: 'center' },
  button: { paddingHorizontal: spacing.stackXl },
});