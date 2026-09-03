// frontend/src/shared/components/EmptyState.tsx
//
// Generic "nothing here" placeholder. Used wherever a list can be empty:
// no leave requests, no team items, no companies.

import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional call-to-action, e.g. { label: "Request leave", onClick } */
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
  className?: string;
  variant?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  variant,
}: EmptyStateProps) {
  return (
    <div className={className} data-variant={variant} role="status">
      {icon}
      <p>{title}</p>
      {description && <p>{description}</p>}
      {action && <button onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}
