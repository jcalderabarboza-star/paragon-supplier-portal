import React from 'react';
import { ObjectStatus } from '@ui5/webcomponents-react';

type StatusType = 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'shipped' | 'delivered' | 'open' | 'closed';

interface StatusBadgeProps {
  status: StatusType | string;
}

const statusStateMap: Record<string, 'Positive' | 'Negative' | 'Critical' | 'Information' | 'None'> = {
  active: 'Positive',
  approved: 'Positive',
  delivered: 'Positive',
  closed: 'Positive',
  inactive: 'Negative',
  rejected: 'Negative',
  pending: 'Critical',
  shipped: 'Information',
  open: 'Information',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const state = statusStateMap[status.toLowerCase()] ?? 'None';
  return <ObjectStatus state={state}>{status}</ObjectStatus>;
};

export default StatusBadge;
