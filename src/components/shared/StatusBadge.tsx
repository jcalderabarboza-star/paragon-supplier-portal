import React from 'react';

interface StatusBadgeProps {
  status: string;
}

// bg, color pairs keyed by normalised status string
const STATUS_STYLES: Record<string, [string, string]> = {
  // Green — positive outcomes
  active:    ['#DCFCE7', '#166534'],
  delivered: ['#DCFCE7', '#166534'],
  approved:  ['#DCFCE7', '#166534'],
  closed:    ['#DCFCE7', '#166534'],
  success:   ['#DCFCE7', '#166534'],

  // Yellow — in-progress / needs attention
  onboarding:    ['#FEF9C3', '#854D0E'],
  acknowledged:  ['#FEF9C3', '#854D0E'],
  warning:       ['#FEF9C3', '#854D0E'],
  pending:       ['#FEF9C3', '#854D0E'],
  'in transit':  ['#FEF9C3', '#854D0E'],

  // Red — errors / suspended
  suspended: ['#FEE2E2', '#991B1B'],
  rejected:  ['#FEE2E2', '#991B1B'],
  error:     ['#FEE2E2', '#991B1B'],
  critical:  ['#FEE2E2', '#991B1B'],
  cancelled: ['#FEE2E2', '#991B1B'],
  overdue:   ['#FEE2E2', '#991B1B'],

  // Blue — confirmed / normal
  confirmed: ['#DBEAFE', '#1E40AF'],
  normal:    ['#DBEAFE', '#1E40AF'],

  // Slate — sent / neutral info
  sent:     ['#F1F5F9', '#475569'],
  open:     ['#F1F5F9', '#475569'],
  inactive: ['#F1F5F9', '#475569'],
  shipped:  ['#F1F5F9', '#475569'],
  info:     ['#F1F5F9', '#475569'],

  // Purple — excess
  excess: ['#EDE9FE', '#5B21B6'],
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
