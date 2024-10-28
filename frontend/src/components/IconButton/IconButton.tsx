import React from 'react';
import { Tooltip } from 'react-tooltip'; // Ensure you have the correct import for Tooltip
import { TToolTip } from '../../types/common';

type IconButtonProps = {
  icon: React.ReactNode;
  isActive?: boolean;
  tooltip?: TToolTip;
  onClick: () => void;
};

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  isActive,
  tooltip,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg fill-default-txt dark:fill-default-txt-dark hover:bg-interactive-secondary dark:hover:bg-interactive-tertiary-dark ${isActive ? 'bg-interactive-secondary dark:bg-interactive-tertiary-dark' : ''}`}
      {...(tooltip
        ? {
            'data-tooltip-id': 'icon-btn_tt',
            'data-tooltip-content': tooltip.content,
          }
        : {})}
    >
      {icon}
      <Tooltip id="icon-btn_tt" />
    </button>
  );
};

export default IconButton;
