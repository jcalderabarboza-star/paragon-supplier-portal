import React from 'react';
import { LucideIcon, Check } from 'lucide-react';

export type TimelineEventStatus = 'completed' | 'current' | 'pending';

export interface TimelineEvent {
  id: string;
  title: string;
  timestamp?: string;
  status: TimelineEventStatus;
  description?: string;
  icon?: LucideIcon;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const Timeline: React.FC<TimelineProps> = ({ events, className = '' }) => {
  return (
    <ol className={`relative ${className}`}>
      {events.map((event, i) => {
        const isLast = i === events.length - 1;
        const Icon = event.icon;
        const connectorClass =
          event.status === 'completed'
            ? 'bg-teal'
            : event.status === 'current'
              ? 'bg-gradient-to-b from-teal to-border-subtle'
              : 'bg-border-subtle';

        let marker: React.ReactNode;
        if (event.status === 'completed') {
          marker = (
            <span className="relative z-10 w-3 h-3 rounded-full bg-teal flex items-center justify-center">
              <Check size={8} className="text-white" strokeWidth={3} />
            </span>
          );
        } else if (event.status === 'current') {
          marker = (
            <span className="relative z-10 w-4 h-4 rounded-full bg-white border-2 border-teal flex items-center justify-center">
              {Icon ? (
                <Icon size={8} className="text-teal" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-teal" />
              )}
            </span>
          );
        } else {
          marker = (
            <span className="relative z-10 w-3 h-3 rounded-full bg-bg-surface border-2 border-border-subtle" />
          );
        }

        return (
          <li key={event.id} className="flex gap-4 pb-5 last:pb-0">
            <div className="relative flex flex-col items-center w-4 shrink-0">
              <div className="flex items-center justify-center h-5">
                {marker}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 ${connectorClass}`} />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`text-sm font-semibold ${
                    event.status === 'pending'
                      ? 'text-text-tertiary'
                      : 'text-text-primary'
                  }`}
                >
                  {event.title}
                </span>
                {event.timestamp && (
                  <span className="text-xs text-text-tertiary">
                    {event.timestamp}
                  </span>
                )}
              </div>
              {event.description && (
                <p className="text-sm text-text-secondary mt-1">
                  {event.description}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default Timeline;
