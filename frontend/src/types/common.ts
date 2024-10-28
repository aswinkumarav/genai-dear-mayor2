import { ReactNode } from 'react';

export type TToolTip = {
  content: string;
  place?:
    | 'top'
    | 'top-start'
    | 'top-end'
    | 'right'
    | 'right-start'
    | 'right-end'
    | 'bottom'
    | 'bottom-start'
    | 'bottom-end'
    | 'left'
    | 'left-start'
    | 'left-end';
};

export type ListItemWithIcon = {
  icon: ReactNode;
  label: string;
  action: () => void;
};
