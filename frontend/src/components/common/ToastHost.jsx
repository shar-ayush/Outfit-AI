// src/components/common/ToastHost.jsx
//
// Mount ONCE at the root layout (app/_layout.jsx), above the navigator:
//   <ToastHost />
//   <Slot />
//
// Reads uiStore.toast and renders the presentational <Toast>. Kept as a
// separate component (rather than baking the store into Toast.jsx
// directly) so Toast itself stays a pure, prop-driven, easily testable
// component — see Toast.jsx header comment.

import React from 'react';
import Toast from './Toast';
import useUIStore from '@/stores/uiStore';

export default function ToastHost() {
  const toast = useUIStore((state) => state.toast);
  const hideToast = useUIStore((state) => state.hideToast);

  return (
    <Toast
      visible={toast.visible}
      message={toast.message}
      type={toast.type}
      onHide={hideToast}
    />
  );
}
