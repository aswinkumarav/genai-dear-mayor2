import React from 'react';
import { Tooltip } from 'react-tooltip';
import { TToolTip } from '../../types/common';

type ButtonProps = {
  text: string;
  children?: React.ReactNode;
  type?: 'primary' | 'secondary';
  purpose?: 'submit' | 'reset' | 'button';
  size?: 'small' | 'medium';
  disabled?: boolean;
  tooltip?: TToolTip;
  onClick?: () => void;
};

const Button: React.FC<ButtonProps> = ({
  text,
  children = null,
  type = 'primary',
  purpose = 'button',
  size = 'medium',
  disabled = false,
  tooltip,
  onClick,
}) => {
  const baseClasses =
    'flex items-center leading-none rounded-lg cursor-pointer transition-all duration-300 hover:shadow-md disabled:cursor-not-allowed ';
  const activeClasses =
    'active:bg-interactive-tertiary active:text-chat-default';
  const disabledClasses =
    'disabled:bg-interactive-disabled-low disabled:text-interactive-disabled disabled:fill-interactive-disabled';
  const typeClasses =
    type === 'primary'
      ? 'bg-interactive-primary text-chat-default fill-chat-default hover:bg-interactive-primary-hover hover:text-chat-default'
      : 'bg-interactive-secondary text-default-txt fill-chat-default hover:bg-chat-default';

  const sizeClasses = size === 'small' ? 'py-2 px-3 gap-1' : 'py-3 px-4 gap-2';

  return (
    <button
      className={`${baseClasses} ${typeClasses} ${sizeClasses} ${activeClasses} ${disabledClasses}`}
      disabled={disabled}
      onClick={onClick}
      {...(tooltip
        ? {
            'data-tooltip-id': 'btn-tooltip',
            'data-tooltip-content': tooltip?.content,
          }
        : {})}
      type={purpose}
    >
      {text && <span className="text-nowrap">{text}</span>}
      {children && <span>{children}</span>}
      <Tooltip id="btn-tooltip" place={tooltip?.place} />
    </button>
  );
};

export default Button;