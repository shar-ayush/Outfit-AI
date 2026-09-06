// src/components/planner/PlanStatusBadge.jsx
//
// Maps OutfitPlan.status ('planned'|'worn'|'skipped'|'cancelled') to a
// tone — thin wrapper over the common Badge component's `status` type.

import React from 'react';
import Badge from '@/components/common/Badge';

const STATUS_CONFIG = {
  planned: { label: 'Planned', tone: 'neutral' },
  worn: { label: 'Worn', tone: 'success' },
  skipped: { label: 'Skipped', tone: 'error' },
  cancelled: { label: 'Cancelled', tone: 'error' },
};

export default function PlanStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.planned;
  return <Badge type="status" label={config.label} tone={config.tone} />;
}
