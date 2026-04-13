import React from 'react';

interface StatusBadgeProps {
  status: string;
}

// bg, color pairs keyed by normalised status string
const STATUS_STYLES: Record<string, [string, string]> = {
  // Green — positive outcomes
  active:    ['#DCFCE7', '#107E3E'],
  delivered: ['#DCFCE7', '#107E3E'],
  approved:  ['#DCFCE7', '#107E3E'],
  closed:    ['#DCFCE7', '#107E3E'],
  success:   ['#DCFCE7', '#107E3E'],

  // Yellow — in-progress / needs attention
  onboarding:    ['#FEF9C3', '#E9730C'],
  acknowledged:  ['#FEF9C3', '#E9730C'],
  warning:       ['#FEF9C3', '#E9730C'],
  pending:       ['#FEF9C3', '#E9730C'],
  'in transit':  ['#FEF9C3', '#E9730C'],

  // Red — errors / suspended
  suspended: ['#FEE2E2', '#BB0000'],
  rejected:  ['#FEE2E2', '#BB0000'],
  error:     ['#FEE2E2', '#BB0000'],
  critical:  ['#FEE2E2', '#BB0000'],
  cancelled: ['#FEE2E2', '#BB0000'],
  overdue:   ['#FEE2E2', '#BB0000'],

  // Blue — confirmed / normal
  confirmed: ['#DBEAFE', '#0D1B2A'],
  normal:    ['#DBEAFE', '#0D1B2A'],

  // Slate — sent / neutral info
  sent:     ['#F1F5F9', '#475569'],
  open:     ['#F1F5F9', '#475569'],
  inactive: ['#F1F5F9', '#475569'],
  shipped:  ['#F1F5F9', '#475569'],
  info:     ['#F1F5F9', '#475569'],

  // Purple — excess
  excess: ['#EDE9FE', '#0D1B2A'],

  // Invoice statuses
  'payment released': ['#DCFCE7', '#107E3E'],
  'pending match':    ['#FEF9C3', '#E9730C'],
  'qty mismatch':     ['#FEE2E2', '#BB0000'],
  'pending gr':       ['#FEF9C3', '#E9730C'],
  disputed:           ['#FEE2E2', '#BB0000'],

  // Document statuses
  valid:             ['#DCFCE7', '#107E3E'],
  expired:           ['#FEE2E2', '#BB0000'],
  'expiring soon':   ['#FEF9C3', '#E9730C'],
  'awaiting upload': ['#F1F5F9', '#475569'],
  'under review':    ['#EFF6FF', '#0097A7'],

  // Qualification statuses
  'on track': ['#DCFCE7', '#107E3E'],
  'at risk':  ['#FEF9C3', '#E9730C'],
  blocked:    ['#FEE2E2', '#BB0000'],

  // Stock statuses
  low:      ['#FEF9C3', '#E9730C'],
  viewed:   ['#EFF6FF', '#0097A7'],
  'partially delivered': ['#FEF9C3', '#E9730C'],
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const key = status.toLowerCase();
  const [bg, color] = STATUS_STYLES[key] ?? ['#F1F5F9', '#475569'];

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: bg,
      color,
      borderRadius: '9999px',
      padding: '2px 10px',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
};

export default StatusBadge;
