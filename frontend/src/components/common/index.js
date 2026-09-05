// src/components/common/index.js
//
// Barrel export — lets other files do:
//   import { Button, Card, Text, Screen } from '@/components/common';
// instead of importing each file individually.

export { default as Text } from './Text';
export { default as Screen } from './Screen';
export { default as Button } from './Button';
export { default as Input } from './Input';
export { default as Card } from './Card';
export { default as Tag } from './Tag';
export { default as Badge } from './Badge';
export { default as Divider } from './Divider';
export { default as Avatar } from './Avatar';
export { default as EmptyState } from './EmptyState';
export { default as ErrorState } from './ErrorState';
export { default as LoadingSpinner } from './LoadingSpinner';
export { default as SkeletonLoader, SkeletonCard, SkeletonOutfitCard } from './SkeletonLoader';
export { default as ProgressBar } from './ProgressBar';
export { default as Toast } from './Toast';
export { default as ToastHost } from './ToastHost';
export { default as AuthHeader } from './AuthHeader';
export { default as OnboardingHeader } from './OnboardingHeader';
export { default as Modal } from './Modal';
export { default as BottomSheet, SheetOption } from './BottomSheet';
export { default as SwipeableRow } from './SwipeableRow';
