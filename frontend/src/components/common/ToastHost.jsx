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
